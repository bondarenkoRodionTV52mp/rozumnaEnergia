import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/index";
import StatsGrid from "./components/StatsGrid";
import TelemetryChart, { METRIC_LABELS } from "./components/TelemetryChart";
import NodesTable from "./components/NodesTable";
import AlertsPanel from "./components/AlertsPanel";
import ConfigPanel from "./components/ConfigPanel";

export function meta({}: Route.MetaArgs) {
  return [{ title: "SmartEnergy Lab — IoT Моніторинг" }];
}

const API = "http://localhost:6010";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Summary {
  online_nodes: number; total_nodes: number;
  avg_temperature: number; avg_voltage: number; avg_current: number;
  total_power_kw: number; total_energy_kwh: number; total_readings: number;
}
interface NodeInfo {
  id: string; name: string; location: string; status: string; last_seen: string | null;
}
interface LatestReading {
  node_id: string; temperature: number; voltage: number;
  current_a: number; power: number; energy: number; frequency: number;
}
interface AlertItem {
  id: number; node_id: string; node_name: string; metric: string;
  value: number; threshold_min: number | null; threshold_max: number | null;
  severity: "warning" | "critical"; timestamp: string; acknowledged: boolean;
}
type ChartPoint = Record<string, string | number>;
type Tab = "dashboard" | "nodes" | "analytics" | "alerts" | "config";

const METRICS = Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartEnergyLab() {
  const [activeTab, setActiveTab]   = useState<Tab>("dashboard");
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [nodes, setNodes]           = useState<NodeInfo[]>([]);
  const [latest, setLatest]         = useState<LatestReading[]>([]);
  const [chartMetric, setChartMetric] = useState<string>("temperature");
  const [chartData, setChartData]   = useState<ChartPoint[]>([]);
  const [alerts, setAlerts]         = useState<AlertItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, n, l, c, cnt] = await Promise.all([
        fetchJson<Summary>("/api/stats/summary"),
        fetchJson<NodeInfo[]>("/api/nodes/"),
        fetchJson<LatestReading[]>("/api/telemetry/latest"),
        fetchJson<ChartPoint[]>(`/api/telemetry/multi-chart?metric=${chartMetric}&limit=60`),
        fetchJson<{ count: number }>("/api/alerts/count"),
      ]);
      setSummary(s); setNodes(n); setLatest(l); setChartData(c);
      setAlertCount(cnt.count);
      setError(null);
      setLastUpdate(new Date().toLocaleTimeString("uk"));
    } catch {
      setError("Не вдалося підключитися до бекенду.");
    } finally {
      setLoading(false);
    }
  }, [chartMetric]);

  const refreshAlerts = useCallback(async () => {
    try {
      const data = await fetchJson<AlertItem[]>("/api/alerts/");
      setAlerts(data);
      const cnt = await fetchJson<{ count: number }>("/api/alerts/count");
      setAlertCount(cnt.count);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (activeTab === "alerts") refreshAlerts();
  }, [activeTab, refreshAlerts]);

  // ─── Tabs config ────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: "dashboard",  label: "Дашборд",      icon: "📊" },
    { key: "nodes",      label: "Вузли",         icon: "📡" },
    { key: "analytics",  label: "Аналітика",     icon: "📈" },
    { key: "alerts",     label: "Сповіщення",    icon: "🔔", badge: alertCount },
    { key: "config",     label: "Налаштування",  icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">SmartEnergy Lab</h1>
              <p className="text-slate-300 text-xs">Моніторинг IoT-вузлів у реальному часі</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {alertCount > 0 && (
              <button onClick={() => setActiveTab("alerts")}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full text-xs font-semibold transition-colors">
                🔔 {alertCount} сповіщень
              </button>
            )}
            <span className={`flex items-center gap-1 text-slate-300 ${error ? "text-red-400" : ""}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${error ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
              {error ? "Немає з'єднання" : `Оновлено: ${lastUpdate}`}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 px-6 py-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(({ key, label, icon, badge }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              {icon} {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-0.5 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && (
          <>
            <StatsGrid summary={summary} />
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  {METRIC_LABELS[chartMetric as keyof typeof METRIC_LABELS] ?? chartMetric}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {METRICS.map(m => (
                    <button key={m} onClick={() => setChartMetric(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        chartMetric === m ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}>
                      {METRIC_LABELS[m as keyof typeof METRIC_LABELS]}
                    </button>
                  ))}
                </div>
              </div>
              <TelemetryChart data={chartData} metric={chartMetric} loading={loading} />
              <p className="text-xs text-gray-400 mt-2">Останні 60 вимірювань · оновлення кожні 5 секунд</p>
            </div>
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Поточні показники вузлів</h2>
              <NodesTable nodes={nodes} latest={latest} loading={loading} />
            </div>
          </>
        )}

        {/* ── Nodes ── */}
        {activeTab === "nodes" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Список IoT-вузлів</h2>
            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {nodes.map(node => {
                  const r = latest.find(l => l.node_id === node.id);
                  const online = node.status === "online";
                  return (
                    <div key={node.id} className="bg-white rounded-2xl shadow p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{node.name}</h3>
                          <p className="text-gray-500 text-sm">{node.location} · {node.id}</p>
                        </div>
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          online ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                          {online ? "Онлайн" : "Офлайн"}
                        </span>
                      </div>
                      {r && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Темп.",   value: `${r.temperature} °C`,         warn: r.temperature > 35 },
                            { label: "Напруга", value: `${r.voltage} В` },
                            { label: "Струм",   value: `${r.current_a} А` },
                            { label: "Потужн.", value: `${r.power.toFixed(0)} Вт` },
                            { label: "Енергія", value: `${r.energy.toFixed(3)} кВт·год` },
                            { label: "Частота", value: `${r.frequency} Гц` },
                          ].map(({ label, value, warn }) => (
                            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                              <div className="text-xs text-gray-400">{label}</div>
                              <div className={`text-sm font-semibold ${warn ? "text-red-600" : "text-gray-800"}`}>{value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics ── */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Аналітика по метриках</h2>
            {(["temperature", "power", "voltage", "current_a"] as const).map(metric => (
              <AnalyticsCard key={metric} metric={metric} />
            ))}
          </div>
        )}

        {/* ── Alerts ── */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Сповіщення</h2>
              <button onClick={refreshAlerts}
                className="text-sm text-blue-500 hover:underline">↻ Оновити</button>
            </div>
            <AlertsPanel alerts={alerts} onRefresh={refreshAlerts} />
          </div>
        )}

        {/* ── Config ── */}
        {activeTab === "config" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Конфігурація мережевого з'єднання</h2>
            <ConfigPanel />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Per-metric analytics card ────────────────────────────────────────────────
function AnalyticsCard({ metric }: { metric: string }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  useEffect(() => {
    const load = () =>
      fetchJson<ChartPoint[]>(`/api/telemetry/multi-chart?metric=${metric}&limit=100`)
        .then(setData).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [metric]);
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">
        {METRIC_LABELS[metric as keyof typeof METRIC_LABELS] ?? metric}
      </h3>
      <TelemetryChart data={data} metric={metric} />
    </div>
  );
}
