interface Node {
  id: string;
  name: string;
  location: string;
  status: string;
  last_seen: string | null;
}

interface LatestReading {
  node_id: string;
  temperature: number;
  voltage: number;
  current_a: number;
  power: number;
  energy: number;
  frequency: number;
}

interface Props {
  nodes: Node[];
  latest: LatestReading[];
  loading?: boolean;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uk", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NodesTable({ nodes, latest, loading }: Props) {
  const readingMap = Object.fromEntries(latest.map((r) => [r.node_id, r]));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
            <th className="px-4 py-3 text-left rounded-tl-xl">Вузол</th>
            <th className="px-4 py-3 text-left">Локація</th>
            <th className="px-4 py-3 text-center">Статус</th>
            <th className="px-4 py-3 text-right">Темп. (°C)</th>
            <th className="px-4 py-3 text-right">Напруга (В)</th>
            <th className="px-4 py-3 text-right">Струм (А)</th>
            <th className="px-4 py-3 text-right">Потужн. (Вт)</th>
            <th className="px-4 py-3 text-right">Енергія (кВт·год)</th>
            <th className="px-4 py-3 text-right rounded-tr-xl">Частота (Гц)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {nodes.map((node) => {
            const r = readingMap[node.id];
            const online = node.status === "online";
            return (
              <tr key={node.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-800">{node.name}</td>
                <td className="px-4 py-3 text-gray-500">{node.location}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      online
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                    {online ? "Онлайн" : "Офлайн"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {r ? (
                    <span className={r.temperature > 35 ? "text-red-600 font-semibold" : ""}>
                      {r.temperature}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{r ? r.voltage : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{r ? r.current_a : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{r ? r.power.toFixed(1) : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{r ? r.energy.toFixed(4) : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{r ? r.frequency : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
