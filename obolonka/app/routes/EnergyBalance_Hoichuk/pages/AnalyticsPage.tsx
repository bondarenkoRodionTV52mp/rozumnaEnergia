import { useState } from "react";
import { Line } from "react-chartjs-2";
import { getAccuracy, getAnalytics, getForecast } from "../api";
import { baseLineOptions, COLORS } from "../components/chartSetup";
import { ACCENT, ChartCard, ErrorAlert, PageHeader, Spinner, StatCard } from "../components/ui";
import { formatNumber, formatShortDate, formatShortTime } from "../format";
import { useLoad } from "../hooks";
import type { ForecastPeriod, HistoryPeriod } from "../types";

const HISTORY_PERIODS: { value: HistoryPeriod; label: string }[] = [
  { value: "24h", label: "24 години" },
  { value: "7d", label: "7 днів" },
  { value: "30d", label: "30 днів" },
  { value: "all", label: "Увесь час" },
];

const FORECAST_PERIODS: { value: ForecastPeriod; label: string }[] = [
  { value: "day", label: "День" },
  { value: "week", label: "Тиждень" },
  { value: "month", label: "Місяць" },
];

export function meta() {
  return [{ title: "EnergyBalance — Аналітика" }];
}

export default function AnalyticsPage() {
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("7d");
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>("day");

  // Точність перераховується на бекенді щоразу, коли змінюється період прогнозу
  const accuracy = useLoad(() => getAccuracy(forecastPeriod), [forecastPeriod]);
  const analytics = useLoad(() => getAnalytics(historyPeriod), [historyPeriod]);
  const forecast = useLoad(() => getForecast(forecastPeriod), [forecastPeriod]);

  // Для довгих періодів показуємо середні за добу, щоб графіки лишались читабельними
  const useDaily = historyPeriod === "30d" || historyPeriod === "all";
  const history = analytics.data ? (useDaily ? analytics.data.daily_history : analytics.data.hourly_history) : [];
  const historyLabels = history.map((r) => (useDaily ? formatShortDate(r.timestamp) : formatShortTime(r.timestamp, true)));
  const forecastRecords = forecast.data?.records ?? [];
  const forecastLabels = forecastRecords.map((r) => formatShortTime(r.timestamp, true));
  const stats = analytics.data?.stats;

  const dataset = (label: string, values: number[], color: string) => ({
    label,
    data: values,
    borderColor: color,
    backgroundColor: color,
  });

  return (
    <>
      <PageHeader title="Аналітичні дані" subtitle="Підсумки за період, історія та прогноз на основі моделей машинного навчання" />

      <div className="eb-card mb-3">
        <div className="card-body d-flex flex-wrap gap-4">
          <div>
            <label htmlFor="history-period" className="form-label">Період історії</label>
            <select id="history-period" className="form-select" value={historyPeriod} onChange={(e) => setHistoryPeriod(e.target.value as HistoryPeriod)}>
              {HISTORY_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="forecast-period" className="form-label">Період прогнозу</label>
            <select id="forecast-period" className="form-select" value={forecastPeriod} onChange={(e) => setForecastPeriod(e.target.value as ForecastPeriod)}>
              {FORECAST_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <ErrorAlert message={forecast.error} />
      <h2 className="eb-section-title">Точність прогнозування</h2>
      <p className="text-muted small mb-2">
        {accuracy.loading
          ? "Розрахунок точності для обраного періоду…"
          : accuracy.data
            ? `Модель перевірена на останніх ${accuracy.data.holdout_hours} год історії, яких вона не бачила під час навчання.`
            : ""}
      </p>
      <ErrorAlert message={accuracy.error} />
      <div className="row g-3 mb-4" style={{ opacity: accuracy.loading ? 0.5 : 1 }}>
        <div className="col-12 col-md-4"><StatCard label="Сонячна генерація (R²)" value={formatNumber(accuracy.data?.solar_power)} unit="%" accent={ACCENT.solar} icon="☀️" /></div>
        <div className="col-12 col-md-4"><StatCard label="Вітрова генерація (R²)" value={formatNumber(accuracy.data?.wind_power)} unit="%" accent={ACCENT.wind} icon="💨" /></div>
        <div className="col-12 col-md-4"><StatCard label="Споживання (R²)" value={formatNumber(accuracy.data?.consumption)} unit="%" accent={ACCENT.load} icon="🏠" /></div>
      </div>

      <h2 className="eb-section-title">Підсумки за обраний період</h2>
      <ErrorAlert message={analytics.error} />
      {analytics.loading && !analytics.data && <Spinner />}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-4"><StatCard label="Вироблено" value={formatNumber(stats.total_produced_kwh)} unit="кВт·год" accent={ACCENT.grid} icon="🌱" /></div>
          <div className="col-6 col-lg-4"><StatCard label="Спожито" value={formatNumber(stats.total_consumed_kwh)} unit="кВт·год" accent={ACCENT.load} icon="🏠" /></div>
          <div className="col-6 col-lg-4"><StatCard label="Покриття споживання генерацією" value={formatNumber(stats.renewable_coverage_percent)} unit="%" accent={ACCENT.neutral} icon="📈" /></div>
          <div className="col-6 col-lg-4"><StatCard label="Макс. сонячна потужність" value={formatNumber(stats.max_solar_w)} unit="Вт" accent={ACCENT.solar} icon="☀️" /></div>
          <div className="col-6 col-lg-4"><StatCard label="Макс. вітрова потужність" value={formatNumber(stats.max_wind_w)} unit="Вт" accent={ACCENT.wind} icon="💨" /></div>
          <div className="col-6 col-lg-4"><StatCard label="Мін. заряд акумулятора" value={formatNumber(stats.min_battery_percent)} unit="%" accent={ACCENT.battery} icon="🔋" /></div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <ChartCard title={`Історія генерації, Вт (${useDaily ? "середнє за добу, лише повні доби" : "середнє за годину"})`}>
            <Line options={baseLineOptions} data={{ labels: historyLabels, datasets: [
              dataset("Сонячна", history.map((r) => r.solar_power), COLORS.solar),
              dataset("Вітрова", history.map((r) => r.wind_power), COLORS.wind),
            ] }} />
          </ChartCard>
        </div>
        <div className="col-12 col-xl-6">
          <ChartCard title="Прогноз генерації, Вт">
            <Line options={baseLineOptions} data={{ labels: forecastLabels, datasets: [
              dataset("Сонячна", forecastRecords.map((r) => r.solar_power), COLORS.solar),
              dataset("Вітрова", forecastRecords.map((r) => r.wind_power), COLORS.wind),
            ] }} />
          </ChartCard>
        </div>
        <div className="col-12 col-xl-6">
          <ChartCard title="Історія споживання, Вт">
            <Line options={baseLineOptions} data={{ labels: historyLabels, datasets: [
              dataset("Споживання", history.map((r) => r.consumption), COLORS.consumption),
            ] }} />
          </ChartCard>
        </div>
        <div className="col-12 col-xl-6">
          <ChartCard title="Прогноз споживання, Вт">
            <Line options={baseLineOptions} data={{ labels: forecastLabels, datasets: [
              dataset("Споживання", forecastRecords.map((r) => r.consumption), COLORS.consumption),
            ] }} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}
