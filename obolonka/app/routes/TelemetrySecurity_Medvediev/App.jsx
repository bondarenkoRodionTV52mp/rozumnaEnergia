import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import api from "./services/api";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

function StatTile({ label, value, unit }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800">
        {value} <span className="text-base font-normal text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const accepted = event.status === "accepted";
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
        accepted ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      <div>
        <span className="font-semibold">{accepted ? "ПРИЙНЯТО" : "ВІДХИЛЕНО"}</span> #{event.seq} —{" "}
        {event.device}
        {!accepted && event.detail && <div className="text-xs opacity-75">{event.detail}</div>}
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
        {event.t ? new Date(event.t).toLocaleTimeString("uk-UA") : ""}
      </div>
    </div>
  );
}

export default function TelemetrySecurity() {
  const [status, setStatus] = useState({ connectedDevices: [], totalAccepted: 0, totalRejected: 0 });
  const [telemetry, setTelemetry] = useState([]);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [s, t, e] = await Promise.all([
          api.get("/status").then((r) => r.data),
          api.get("/telemetry").then((r) => r.data),
          api.get("/events").then((r) => r.data),
        ]);
        if (cancelled) return;
        setStatus(s);
        setTelemetry(t);
        setEvents(e);
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    poll();
    const id = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const last = telemetry[telemetry.length - 1];

  const chartData = {
    labels: telemetry.map((p) => new Date(p.t).toLocaleTimeString("uk-UA")),
    datasets: [
      {
        label: "Потужність (Вт)",
        data: telemetry.map((p) => p.P),
        borderColor: "#0d9488",
        backgroundColor: "rgba(13,148,136,0.1)",
        tension: 0.25,
        fill: true,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">Захист телеметрії — панель моніторингу</h1>
      <p className="text-gray-500 mb-4">
        ECDH (P-256) + AES-256-GCM + ECDSA-SHA256 · криптографічний захист телеметричних даних
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-full shadow px-4 py-1.5 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
          {connected ? "Підключено до шлюзу" : "Немає з'єднання з шлюзом"}
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Пристрої: <strong>{status.connectedDevices.length}</strong>
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Прийнято: <strong className="text-emerald-600">{status.totalAccepted}</strong>
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Відхилено: <strong className="text-red-600">{status.totalRejected}</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile label="Напруга" value={last ? last.U.toFixed(1) : "—"} unit="В" />
        <StatTile label="Струм" value={last ? last.I.toFixed(2) : "—"} unit="А" />
        <StatTile label="Потужність" value={last ? last.P.toFixed(1) : "—"} unit="Вт" />
        <StatTile label="Температура" value={last ? last.T.toFixed(1) : "—"} unit="°C" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-2">Потужність у часі</h2>
          <div className="h-64">
            <Line data={chartData} options={{ animation: false, responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-2">Стрічка подій</h2>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-400 text-sm">Очікування даних від пристрою...</div>
            ) : (
              events
                .slice()
                .reverse()
                .map((e, i) => <EventRow key={i} event={e} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
