import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const NODE_COLORS: Record<string, string> = {
  "node-001": "#10b981",
  "node-002": "#3b82f6",
  "node-003": "#f59e0b",
  "node-004": "#8b5cf6",
};

const NODE_LABELS: Record<string, string> = {
  "node-001": "Офіс",
  "node-002": "Серверна",
  "node-003": "Виробничий цех",
  "node-004": "Склад",
};

const METRIC_LABELS: Record<string, string> = {
  temperature: "Температура (°C)",
  voltage: "Напруга (В)",
  current_a: "Струм (А)",
  power: "Потужність (Вт)",
  energy: "Енергія (кВт·год)",
  frequency: "Частота (Гц)",
};

type ChartPoint = Record<string, string | number>;

interface Props {
  data: ChartPoint[];
  metric: string;
  loading?: boolean;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return ts.slice(11, 19);
  }
}

export default function TelemetryChart({ data, metric, loading }: Props) {
  const nodes = Object.keys(NODE_LABELS);

  const formatted = data.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp as string),
  }));

  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
        Очікування даних...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={55} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          labelFormatter={(l) => `Час: ${l}`}
        />
        <Legend formatter={(value) => NODE_LABELS[value] ?? value} />
        {nodes.map((nid) => (
          <Line
            key={nid}
            type="monotone"
            dataKey={nid}
            stroke={NODE_COLORS[nid]}
            dot={false}
            strokeWidth={2}
            connectNulls
            name={nid}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export { METRIC_LABELS };
