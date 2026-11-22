import { getCurrent, getLive } from "../api";
import { ACCENT, ErrorAlert, PageHeader, Spinner, StatCard } from "../components/ui";
import { describeBatteryAction, describeGrid, formatDateTimeSeconds, formatNumber } from "../format";
import { usePolling } from "../hooks";
import { LIVE_POLL_MS } from "../local_consts";

const fetchCurrent = () => Promise.all([getCurrent(), getLive(10)]);

export function meta() {
  return [{ title: "EnergyBalance — Поточні дані" }];
}

export default function CurrentPage() {
  const { data, error } = usePolling(fetchCurrent, LIVE_POLL_MS);

  if (!data) return error ? <ErrorAlert message={error} /> : <Spinner />;

  const [current, recent] = data;
  const events = [...recent].reverse();

  return (
    <>
      <PageHeader title="Поточний стан системи" subtitle={`Показники на ${formatDateTimeSeconds(current.timestamp)}`} />
      <ErrorAlert message={error} />
      {current.low_battery && (
        <div className="alert alert-warning" role="alert">
          Увага: заряд акумулятора нижчий за поріг {current.alert_threshold}%.
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-4"><StatCard label="Сонячна генерація" value={formatNumber(current.solar_power)} unit="Вт" accent={ACCENT.solar} icon="☀️" /></div>
        <div className="col-6 col-lg-4"><StatCard label="Вітрова генерація" value={formatNumber(current.wind_power)} unit="Вт" accent={ACCENT.wind} icon="💨" /></div>
        <div className="col-6 col-lg-4"><StatCard label="Споживання" value={formatNumber(current.consumption)} unit="Вт" accent={ACCENT.load} icon="🏠" /></div>
        <div className="col-6 col-lg-4"><StatCard label="Заряд акумулятора" value={formatNumber(current.battery_level)} unit="%" accent={ACCENT.battery} icon="🔋" /></div>
        <div className="col-6 col-lg-4">
          <StatCard
            label="Потік у мережу"
            value={formatNumber(current.grid_power)}
            unit="Вт"
            tone={current.grid_power >= 0 ? "positive" : "negative"}
            accent={ACCENT.grid}
            icon="🔌"
          />
        </div>
        <div className="col-6 col-lg-4">
          <StatCard
            label="Акумулятор (дія)"
            value={formatNumber(current.battery_action)}
            unit="Вт"
            tone={current.battery_action >= 0 ? "positive" : "negative"}
            accent={ACCENT.battery}
            icon="⚡"
          />
        </div>
      </div>

      <h2 className="eb-section-title">Останні події</h2>
      <div className="eb-card overflow-hidden">
        {events.map((r) => (
          <div className="eb-event" key={r.timestamp}>
            <span className="eb-event-time">{new Date(r.timestamp).toLocaleTimeString("uk-UA")}</span>
            <span>{describeBatteryAction(r.battery_action)}; {describeGrid(r).toLowerCase()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
