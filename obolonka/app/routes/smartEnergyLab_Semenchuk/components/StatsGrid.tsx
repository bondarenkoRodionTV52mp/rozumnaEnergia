interface Summary {
  online_nodes: number;
  total_nodes: number;
  avg_temperature: number;
  avg_voltage: number;
  avg_current: number;
  total_power_kw: number;
  total_energy_kwh: number;
  total_readings: number;
}

interface CardProps {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  icon: string;
}

function StatCard({ label, value, unit, color, icon }: CardProps) {
  return (
    <div className={`rounded-2xl p-5 shadow-md ${color} flex flex-col gap-2`}>
      <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
        <span className="text-xl">{icon}</span>
        {label}
      </div>
      <div className="text-white text-3xl font-bold">
        {value}
        {unit && <span className="text-lg font-normal ml-1 text-white/80">{unit}</span>}
      </div>
    </div>
  );
}

export default function StatsGrid({ summary }: { summary: Summary | null }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 bg-gray-200 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const cards: CardProps[] = [
    {
      label: "Вузли онлайн",
      value: `${summary.online_nodes}/${summary.total_nodes}`,
      color: summary.online_nodes > 0 ? "bg-emerald-500" : "bg-gray-500",
      icon: "📡",
    },
    {
      label: "Середня температура",
      value: summary.avg_temperature,
      unit: "°C",
      color: summary.avg_temperature > 35 ? "bg-red-500" : "bg-orange-400",
      icon: "🌡️",
    },
    {
      label: "Поточна потужність",
      value: summary.total_power_kw,
      unit: "кВт",
      color: "bg-blue-500",
      icon: "⚡",
    },
    {
      label: "Загальна енергія",
      value: summary.total_energy_kwh,
      unit: "кВт·год",
      color: "bg-violet-500",
      icon: "🔋",
    },
    {
      label: "Середня напруга",
      value: summary.avg_voltage,
      unit: "В",
      color: "bg-cyan-500",
      icon: "🔌",
    },
    {
      label: "Середній струм",
      value: summary.avg_current,
      unit: "А",
      color: "bg-indigo-500",
      icon: "〰️",
    },
    {
      label: "Всього вимірювань",
      value: summary.total_readings.toLocaleString("uk"),
      color: "bg-slate-500",
      icon: "📊",
    },
    {
      label: "Статус системи",
      value: "Активна",
      color: "bg-teal-500",
      icon: "✅",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
