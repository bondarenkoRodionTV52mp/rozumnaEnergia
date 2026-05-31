import { useState, useEffect } from "react";

const API = "http://localhost:6010";

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
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""} ${value === true ? "text-emerald-600" : ""}`}>
        {String(value)}
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
    fetch(`${API}/api/config/network`).then(r => r.json()).then(setConfig).catch(() => {});
    loadThresholds();
  }, []);

  function loadThresholds() {
    fetch(`${API}/api/config/thresholds`).then(r => r.json()).then(setThresholds).catch(() => {});
  }

  async function saveThreshold(id: number) {
    await fetch(`${API}/api/config/thresholds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ min_value: parseFloat(editMin), max_value: parseFloat(editMax) }),
    });
    setEditId(null);
    loadThresholds();
  }

  const globalThresholds = thresholds.filter(t => t.node_id === null);

  return (
    <div className="space-y-6">
      {/* MQTT */}
      {config && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">📡</span> MQTT Брокер
            </h3>
            <InfoRow label="Хост"     value={config.mqtt.host} mono />
            <InfoRow label="Порт"     value={config.mqtt.port} mono />
            <InfoRow label="Протокол" value={config.mqtt.protocol} />
            <InfoRow label="Користувач" value={config.mqtt.username} mono />
            <InfoRow label="Топік"    value={config.mqtt.topic_pattern} mono />
            <InfoRow label="QoS"      value={config.mqtt.qos} />
            <InfoRow label="Авторизація" value={config.mqtt.auth_enabled} />
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">🗄️</span> База даних
            </h3>
            <InfoRow label="Рушій"    value={config.database.engine} />
            <InfoRow label="Хост"     value={config.database.host} mono />
            <InfoRow label="Порт"     value={config.database.port} mono />
            <InfoRow label="БД"       value={config.database.name} mono />
            <InfoRow label="Користувач" value={config.database.user} mono />
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-xl">⚙️</span> Симуляція
            </h3>
            <InfoRow label="Вузлів"   value={config.simulation.nodes} />
            <InfoRow label="Інтервал" value={`${config.simulation.interval_seconds} с`} />
            <InfoRow label="Транспорт" value={config.simulation.protocol} />
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Метрики</p>
              <div className="flex flex-wrap gap-1">
                {config.simulation.metrics.map(m => (
                  <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-mono">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thresholds */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🎚️</span> Порогові значення (глобальні)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Якщо показник виходить за ці межі — система генерує сповіщення.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-2 text-left rounded-tl-lg">Метрика</th>
              <th className="px-4 py-2 text-right">Мінімум</th>
              <th className="px-4 py-2 text-right">Максимум</th>
              <th className="px-4 py-2 text-center rounded-tr-lg">Дії</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {globalThresholds.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{METRIC_UA[t.metric] ?? t.metric}</td>
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
  );
}
