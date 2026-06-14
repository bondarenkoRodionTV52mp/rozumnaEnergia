import { useState, useEffect } from "react";

const API = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:6010` 
  : "http://localhost:6010";

interface NetworkConfig {
  mqtt: {
    host: string;
    port: number;
    username: string;
    topic_pattern: string;
    qos: number;
    auth_enabled: boolean;
    protocol: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    engine: string;
  };
  simulation: {
    nodes: number;
    interval_seconds: number;
    protocol: string;
    metrics: string[];
  };
}

interface Threshold {
  id: number;
  node_id: string | null;
  metric: string;
  min_value: number | null;
  max_value: number | null;
}

const METRIC_UA: Record<string, string> = {
  temperature: "Температура (°C)",
  voltage:     "Напруга (В)",
  current_a:   "Струм (А)",
  power:       "Потужність (Вт)",
  energy:      "Енергія (кВт·год)",
  frequency:   "Частота (Гц)",
};

function InfoRow({ label, value, mono = false }: { label: string; value: string | number | boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-gray-800 text-sm font-medium ${mono ? "font-mono bg-gray-50 px-1.5 py-0.5 rounded" : ""}`}>
        {typeof value === "boolean" ? (value ? "Ввімкнено" : "Вимкнено") : value}
      </span>
    </div>
  );
}

export default function ConfigPanel() {
  const [config, setConfig] = useState<NetworkConfig | null>(null);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);

  const [editId, setEditId] = useState<number | null>(null);
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");

  useEffect(() => {
    fetch(`${API}/api/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);

    fetch(`${API}/api/config/thresholds`)
      .then(res => res.json())
      .then(setThresholds)
      .catch(console.error);
  }, []);

  async function saveThreshold(id: number) {
    const body = {
      min_value: editMin === "" ? null : Number(editMin),
      max_value: editMax === "" ? null : Number(editMax)
    };

    try {
      const res = await fetch(`${API}/api/config/thresholds/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setThresholds(thresholds.map(t => t.id === id ? { ...t, min_value: body.min_value, max_value: body.max_value } : t));
        setEditId(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">⚙️ Конфігурація MQTT</h3>
        {config ? (
          <div className="flex flex-col">
            <InfoRow label="Брокер" value={config.mqtt.host} mono />
            <InfoRow label="Порт" value={config.mqtt.port} mono />
            <InfoRow label="Користувач" value={config.mqtt.username} />
            <InfoRow label="Топік" value={config.mqtt.topic_pattern} mono />
            <InfoRow label="QoS" value={config.mqtt.qos} />
            <InfoRow label="Авторизація" value={config.mqtt.auth_enabled} />
          </div>
        ) : (
          <div className="h-32 bg-gray-50 animate-pulse rounded-xl" />
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">🗄️ База даних</h3>
        {config ? (
          <div className="flex flex-col">
            <InfoRow label="СКБД" value={config.database.engine} />
            <InfoRow label="Хост" value={config.database.host} mono />
            <InfoRow label="Порт" value={config.database.port} mono />
            <InfoRow label="Назва БД" value={config.database.name} />
            <InfoRow label="Користувач" value={config.database.user} />
          </div>
        ) : (
          <div className="h-32 bg-gray-50 animate-pulse rounded-xl" />
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100 lg:col-span-2">
        <h3 className="font-bold text-gray-800 mb-4">🚨 Налаштування порогових значень тривог</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2">Метрика</th>
                <th className="px-4 py-2 text-right">Мінімум</th>
                <th className="px-4 py-2 text-right">Максимум</th>
                <th className="px-4 py-2 text-center">Дія</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{METRIC_UA[t.metric] ?? t.metric}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {editId === t.id
                      ? <input type="number" value={editMin} onChange={e => setEditMin(e.target.value)}
                          className="w-20 border rounded px-1 py-0.5 text-right font-mono text-sm" />
                      : t.min_value ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {editId === t.id
                      ? <input type="number" value={editMax} onChange={e => setEditMax(e.target.value)}
                          className="w-20 border rounded px-1 py-0.5 text-right font-mono text-sm" />
                      : t.max_value ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editId === t.id ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => saveThreshold(t.id)}
                          className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">Зберегти</button>
                        <button onClick={() => setEditId(null)}
                          className="px-2 py-0.5 bg-gray-200 text-xs rounded">Скасувати</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(t.id); setEditMin(String(t.min_value ?? "")); setEditMax(String(t.max_value ?? "")); }}
                        className="px-2 py-0.5 border text-xs rounded hover:bg-gray-100">Змінити</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
