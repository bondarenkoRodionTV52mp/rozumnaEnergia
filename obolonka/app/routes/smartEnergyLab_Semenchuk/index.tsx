import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/index";
import StatsGrid from "./components/StatsGrid";
import TelemetryChart from "./components/TelemetryChart";
import NodesTable from "./components/NodesTable";
import AlertsPanel from "./components/AlertsPanel";
import ConfigPanel from "./components/ConfigPanel";

export function meta({}: Route.MetaArgs) {
  return [{ title: "SmartEnergy Lab — IoT Моніторинг" }];
}

// Автоматичне визначення хоста: якщо запущено на сервері викладача — бере його IP, якщо локально — localhost
const API = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:6010` 
  : "http://localhost:6010";

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
interface ChartPoint {
  timestamp: string;
  [nodeId: string]: string | number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmartEnergyDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "nodes" | "alerts" | "config">("dashboard");

  // Global data states
  const [summary, setSummary] = useState<Summary | null>(null);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [latestReadings, setLatestReadings] = useState<LatestReading[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Partial refreshers
  const refreshDashboard = useCallback(() => {
    Promise.all([
      fetchJson<Summary>("/api/telemetry/summary"),
      fetchJson<LatestReading[]>("/api/telemetry/latest")
    ]).then(([s, l]) => {
      setSummary(s);
      setLatestReadings(l);
    }).catch(console.error);
  }, []);

  const refreshNodes = useCallback(() => {
    fetchJson<NodeInfo[]>("/api/nodes").then(setNodes).catch(console.error);
  }, []);

  const refreshAlerts = useCallback(() => {
    fetchJson<AlertItem[]>("/api/alerts?active_only=true").then(setAlerts).catch(console.error);
  }, []);

  // Initial full load & global interval ticker
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchJson<Summary>("/api/telemetry/summary"),
      fetchJson<NodeInfo[]>("/api/nodes"),
      fetchJson<LatestReading[]>("/api/telemetry/latest"),
      fetchJson<AlertItem[]>("/api/alerts?active_only=true")
    ]).then(([s, n, l, a]) => {
      setSummary(s);
      setNodes(n);
      setLatestReadings(l);
      setAlerts(a);
    }).catch(console.error).finally(() => setLoading(false));

    const id = setInterval(() => {
      refreshDashboard();
      if (activeTab === "nodes") refreshNodes();
      if (activeTab === "alerts") refreshAlerts();
    }, 5000);

    return () => clearInterval(id);
  }, [activeTab, refreshDashboard, refreshNodes, refreshAlerts]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏭</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SmartEnergy Lab</h1>
              <p className="text-xs text-gray-500">Система IoT моніторингу телеметрії промислових об'єктів</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            {(["dashboard", "nodes", "alerts", "config"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "dashboard" && "Панель управління"}
                {tab === "nodes" && "Вузли мережі"}
                {tab === "alerts" && `Сповіщення (${alerts.length})`}
                {tab === "config" && "Налаштування"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content viewports */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Dashboard (Charts & KPIs) ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <StatsGrid summary={summary} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsCard metric="power" />
              <AnalyticsCard metric="temperature" />
            </div>
          </div>
        )}

        {/* ── Nodes Table ── */}
        {activeTab === "nodes" && (
          <div className="bg-white rounded-2xl shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Підключені IoT пристрої</h2>
                <p className="text-xs text-gray-400 mt-0.5">Перелік активних контролерів обліку</p>
              </div>
              <button onClick={refreshNodes}
                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
                ↻ Оновити таблицю
              </button>
            </div>
            <NodesTable nodes={nodes} latest={latestReadings} loading={loading} />
          </div>
        )}

        {/* ── Alerts Panel ── */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Журнал тривог та сповіщень</h2>
                <p className="text-xs text-gray-400 mt-0.5">Порушення критичних лімітів вимірювань</p>
              </div>
              <button onClick={refreshAlerts}
                className="text-sm text-blue-500 hover:underline">↻ Оновити</button>
            </div>
            <AlertsPanel alerts={alerts} onRefresh={refreshAlerts} />
          </div>
        )}

        {/* ── Config ── */}
        {activeTab === "config" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Конфігурація мережевого з'єднання</h2>
              <p className="text-xs text-gray-400 mt-0.5">Параметри підключення до MQTT та реляційної СКБД</p>
            </div>
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
        .then(setData)
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [metric]);

  const labels: Record<string, string> = {
    power: "Сумарна споживана потужність вузлів (Вт)",
    temperature: "Температурні тренди модулів (°C)"
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{labels[metric] ?? metric}</h3>
      <TelemetryChart data={data} metric={metric} />
    </div>
  );
}
