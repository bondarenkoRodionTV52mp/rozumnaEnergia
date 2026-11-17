import { useEffect, useRef, useState } from "react";
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

const ACTIVE_WINDOW_MS = 15000;

const EVENT_FILTERS = [
  ["all", "Усі"],
  ["accepted", "Прийняті"],
  ["rejected", "Відхилені"],
];

const METER_PROFILE = {
  id: "power-meter",
  title: "Лічильник електроенергії",
  fields: [
    { name: "voltage", label: "Напруга", unit: "В", state: false },
    { name: "current", label: "Струм", unit: "А", state: false },
    { name: "power", label: "Потужність", unit: "Вт", state: false },
    { name: "temperature", label: "Температура", unit: "°C", state: false },
  ],
};

function fromLegacy(status, telemetry, events) {
  const ids = new Set(status.connectedDevices);
  telemetry.forEach((p) => ids.add(p.device));
  const devices = [...ids].map((id) => {
    const own = telemetry.filter((p) => p.device === id);
    const ownEvents = events.filter((e) => e.device === id);
    return {
      id,
      profile: METER_PROFILE.id,
      accepted: ownEvents.filter((e) => e.status === "accepted").length,
      rejected: ownEvents.filter((e) => e.status === "rejected").length,
      lastSeen: own.length ? own[own.length - 1].t : 0,
    };
  });
  const readings = telemetry.map((p) => ({
    t: p.t,
    device: p.device,
    profile: METER_PROFILE.id,
    seq: p.seq,
    values: { voltage: p.U, current: p.I, power: p.P, temperature: p.T },
  }));
  return { devices, readings, profiles: [METER_PROFILE] };
}

function formatNumber(v) {
  if (Number.isInteger(v)) return String(v);
  return Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
}

function ago(ms) {
  if (!ms) return "ще не виходив на зв'язок";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s} с тому` : `${Math.round(s / 60)} хв тому`;
}

function isActive(device) {
  return device.lastSeen > 0 && Date.now() - device.lastSeen < ACTIVE_WINDOW_MS;
}

function StatTile({ label, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{children}</div>
    </div>
  );
}

function DeviceCard({ device, profile, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`text-left bg-white rounded-lg shadow p-3 border-2 ${
        selected ? "border-gray-800" : "border-transparent hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
        <span className={`w-2.5 h-2.5 rounded-full ${isActive(device) ? "bg-emerald-500" : "bg-gray-300"}`} />
        {device.id}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {profile ? profile.title : device.profile} · {ago(device.lastSeen)}
      </div>
      <div className="text-xs mt-2">
        <span className="text-emerald-600 mr-3">прийнято {device.accepted}</span>
        <span className="text-red-600">відхилено {device.rejected}</span>
      </div>
    </button>
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

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TelemetrySecurity() {
  const [status, setStatus] = useState({ totalAccepted: 0, totalRejected: 0 });
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [connected, setConnected] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [eventFilter, setEventFilter] = useState("all");
  const [resetting, setResetting] = useState(false);
  const profilesLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [s, e] = await Promise.all([
          api.get("/status").then((r) => r.data),
          api.get("/events").then((r) => r.data),
        ]);
        let view;
        let legacy = false;
        try {
          const [d, r] = await Promise.all([
            api.get("/devices").then((x) => x.data),
            api.get("/readings").then((x) => x.data),
          ]);
          view = { devices: d, readings: r, profiles: null };
          if (!profilesLoaded.current) {
            view.profiles = await api.get("/profiles").then((x) => x.data);
          }
        } catch (err) {
          if (!err.response || err.response.status !== 404) throw err;
          const t = await api.get("/telemetry").then((x) => x.data);
          view = fromLegacy(s, t, e);
          profilesLoaded.current = false;
          legacy = true;
        }
        if (cancelled) return;
        if (view.profiles) {
          setProfiles(Object.fromEntries(view.profiles.map((p) => [p.id, p])));
          profilesLoaded.current = !legacy;
        }
        setStatus(s);
        setDevices(view.devices);
        setReadings(view.readings);
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

  async function handleReset() {
    setResetting(true);
    try {
      await api.post("/reset");
    } catch {
      setConnected(false);
    } finally {
      setResetting(false);
    }
  }

  function handleExport(format) {
    const data = events.slice().reverse();
    if (format === "csv") {
      const header = "time,status,device,seq,detail";
      const rows = data.map((e) =>
        [
          e.t ? new Date(e.t).toISOString() : "",
          e.status,
          e.device,
          e.seq,
          `"${(e.detail || "").replace(/"/g, '""')}"`,
        ].join(",")
      );
      downloadBlob([header, ...rows].join("\n"), "text/csv;charset=utf-8", "telemetry-events.csv");
    } else {
      downloadBlob(JSON.stringify(data, null, 2), "application/json", "telemetry-events.json");
    }
  }

  const activeDeviceId = devices.some((d) => d.id === selectedDevice)
    ? selectedDevice
    : (devices.find((d) => readings.some((p) => p.device === d.id)) || devices[0] || {}).id || null;
  const device = devices.find((d) => d.id === activeDeviceId) || null;
  const profile = device ? profiles[device.profile] || (device.profile === METER_PROFILE.id ? METER_PROFILE : null) : null;
  const points = device ? readings.filter((p) => p.device === device.id) : [];
  const last = points.length ? points[points.length - 1].values : null;
  const field =
    profile && profile.fields.length
      ? profile.fields.find((f) => f.name === selectedField) || profile.fields[0]
      : null;
  const filteredEvents = events.filter((e) => eventFilter === "all" || e.status === eventFilter);

  const chartTitle = field ? field.label + (field.unit ? `, ${field.unit}` : "") : "";
  const chartData = {
    labels: points.map((p) => new Date(p.t).toLocaleTimeString("uk-UA")),
    datasets: [
      {
        label: chartTitle,
        data: field ? points.map((p) => p.values[field.name]) : [],
        borderColor: "#0d9488",
        backgroundColor: "rgba(13,148,136,0.1)",
        stepped: field ? field.state : false,
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white rounded-full shadow px-4 py-1.5 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
          {connected ? "Підключено до шлюзу" : "Немає з'єднання з шлюзом"}
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Пристрої: <strong>{devices.length}</strong>
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Активні: <strong>{devices.filter(isActive).length}</strong>
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Прийнято: <strong className="text-emerald-600">{status.totalAccepted}</strong>
        </div>
        <div className="bg-white rounded-full shadow px-4 py-1.5 text-sm">
          Відхилено: <strong className="text-red-600">{status.totalRejected}</strong>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="ml-auto bg-white rounded-full shadow px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {resetting ? "Скидання..." : "Скинути лічильники"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {devices.length === 0 ? (
          <div className="text-gray-400 text-sm col-span-full">Немає зареєстрованих пристроїв</div>
        ) : (
          devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              profile={profiles[d.profile] || (d.profile === METER_PROFILE.id ? METER_PROFILE : null)}
              selected={d.id === activeDeviceId}
              onSelect={() => {
                setSelectedDevice(d.id);
                setSelectedField(null);
              }}
            />
          ))
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(profile ? profile.fields : []).map((f) => {
          const v = last ? last[f.name] : undefined;
          return (
            <StatTile key={f.name} label={f.label}>
              {v === undefined ? (
                "—"
              ) : f.state ? (
                <span className={v >= 0.5 ? "text-emerald-600" : "text-gray-500"}>{v >= 0.5 ? f.on : f.off}</span>
              ) : (
                <>
                  {formatNumber(v)} <span className="text-base font-normal text-gray-400">{f.unit}</span>
                </>
              )}
            </StatTile>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="font-semibold text-gray-700">{chartTitle ? `${chartTitle} у часі` : "Графік"}</h2>
            {profile && (
              <select
                value={field ? field.name : ""}
                onChange={(e) => setSelectedField(e.target.value)}
                className="text-xs rounded bg-gray-100 text-gray-700 px-2 py-1"
              >
                {profile.fields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="h-64">
            <Line data={chartData} options={{ animation: false, responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="font-semibold text-gray-700">Стрічка подій</h2>
            <div className="flex gap-1 items-center flex-wrap">
              {EVENT_FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setEventFilter(key)}
                  className={`px-2 py-1 text-xs rounded ${
                    eventFilter === key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-gray-300 mx-1">|</span>
              <button
                onClick={() => handleExport("csv")}
                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                JSON
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="text-gray-400 text-sm">
                {events.length === 0 ? "Очікування даних від пристрою..." : "Немає подій за цим фільтром"}
              </div>
            ) : (
              filteredEvents
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
