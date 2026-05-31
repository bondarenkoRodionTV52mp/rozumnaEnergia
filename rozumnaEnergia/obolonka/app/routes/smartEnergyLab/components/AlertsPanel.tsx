import { useState } from "react";

const API = "http://localhost:6010";

interface Alert {
  id: number;
  node_id: string;
  node_name: string;
  metric: string;
  value: number;
  threshold_min: number | null;
  threshold_max: number | null;
  severity: "warning" | "critical";
  timestamp: string;
  acknowledged: boolean;
}

const METRIC_UA: Record<string, string> = {
  temperature: "Температура",
  voltage:     "Напруга",
  current_a:   "Струм",
  power:       "Потужність",
  energy:      "Енергія",
  frequency:   "Частота",
};

const METRIC_UNIT: Record<string, string> = {
  temperature: "°C",
  voltage:     "В",
  current_a:   "А",
  power:       "Вт",
  energy:      "кВт·год",
  frequency:   "Гц",
};

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString("uk"); } catch { return iso; }
}

interface Props {
  alerts: Alert[];
  onRefresh: () => void;
}

export default function AlertsPanel({ alerts, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);

  async function acknowledgeOne(id: number) {
    await fetch(`${API}/api/alerts/${id}/acknowledge`, { method: "POST" });
    onRefresh();
  }

  async function acknowledgeAll() {
    setLoading(true);
    await fetch(`${API}/api/alerts/acknowledge-all`, { method: "POST" });
    onRefresh();
    setLoading(false);
  }

  if (!alerts.length) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-emerald-700 font-medium">Активних сповіщень немає</p>
        <p className="text-emerald-500 text-sm mt-1">Усі показники вузлів у нормі</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{alerts.length} активних сповіщень</p>
        <button
          onClick={acknowledgeAll}
          disabled={loading}
          className="px-4 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          Підтвердити всі
        </button>
      </div>

      {alerts.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
            a.severity === "critical"
              ? "bg-red-50 border-red-300"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div className="flex gap-3 items-start">
            <span className="text-2xl mt-0.5">
              {a.severity === "critical" ? "🚨" : "⚠️"}
            </span>
            <div>
              <div className="font-semibold text-gray-900">
                {a.node_name} — {METRIC_UA[a.metric] ?? a.metric}
              </div>
              <div className="text-sm text-gray-700 mt-0.5">
                Поточне значення:{" "}
                <span className={`font-bold ${a.severity === "critical" ? "text-red-600" : "text-amber-700"}`}>
                  {a.value} {METRIC_UNIT[a.metric] ?? ""}
                </span>
                {a.threshold_max !== null && a.value > a.threshold_max && (
                  <span className="text-gray-500 ml-2">(макс: {a.threshold_max})</span>
                )}
                {a.threshold_min !== null && a.value < a.threshold_min && (
                  <span className="text-gray-500 ml-2">(мін: {a.threshold_min})</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">{formatTime(a.timestamp)}</div>
            </div>
          </div>
          <button
            onClick={() => acknowledgeOne(a.id)}
            className="shrink-0 px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-white"
          >
            Підтвердити
          </button>
        </div>
      ))}
    </div>
  );
}
