import { useState } from "react";

// Динамічний хост, щоб запити йшли на сервер викладача
const API = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:6010` 
  : "http://localhost:6010";

interface Alert {
  id: number; node_id: string; node_name: string; metric: string;
  value: number; threshold_min: number | null; threshold_max: number | null;
  severity: "warning" | "critical"; timestamp: string; acknowledged: boolean;
}

const METRIC_UA: Record<string, string> = {
  temperature: "Температура", voltage: "Напруга", current_a: "Струм",
  power: "Потужність", energy: "Енергія", frequency: "Частота",
};

const METRIC_UNIT: Record<string, string> = {
  temperature: "°C", voltage: "В", current_a: "А",
  power: "Вт", energy: "кВт·год", frequency: "Гц",
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
    try {
      await fetch(`${API}/api/alerts/${id}/acknowledge`, { method: "POST" });
      onRefresh();
    } catch (e) { console.error(e); }
  }

  async function acknowledgeAll() {
    setLoading(true);
    try {
      await fetch(`${API}/api/alerts/acknowledge-all`, { method: "POST" });
      onRefresh();
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-500">
        🎉 Активних критичних сповіщень немає. Система працює в штатному режимі.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={acknowledgeAll}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-xl shadow transition-colors disabled:opacity-50"
        >
          {loading ? "Обробка..." : "✓ Підтвердити всі тривоги"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white flex justify-between items-center ${
              a.severity === "critical" ? "border-red-500" : "border-amber-500"
            }`}
          >
            <div className="flex gap-3 items-start">
              <span className="text-2xl mt-0.5">{a.severity === "critical" ? "🚨" : "⚠️"}</span>
              <div>
                <div className="font-semibold text-gray-900">{a.node_name} — {METRIC_UA[a.metric] ?? a.metric}</div>
                <div className="text-sm text-gray-700 mt-0.5">
                  Значення: <span className={`font-bold ${a.severity === "critical" ? "text-red-600" : "text-amber-700"}`}>{a.value} {METRIC_UNIT[a.metric] ?? ""}</span>
                  {a.threshold_max !== null && a.value > a.threshold_max && <span className="text-gray-400 text-xs ml-2">(макс: {a.threshold_max})</span>}
                  {a.threshold_min !== null && a.value < a.threshold_min && <span className="text-gray-400 text-xs ml-2">(мін: {a.threshold_min})</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">{formatTime(a.timestamp)}</div>
              </div>
            </div>
            <button
              onClick={() => acknowledgeOne(a.id)}
              className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
              title="Підтвердити"
            >
              ✓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
