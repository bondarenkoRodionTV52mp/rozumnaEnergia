import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw, Users } from "lucide-react";
import { api, type AdminUser, type SecurityEventItem } from "../lib/api";
import { useRequireUser } from "../lib/context";
import { EVENT_LABELS, ROLES, ROLE_LABELS, fmtDateTime, fmtPercent, type Tone } from "../lib/labels";
import { Alert, Badge, Button, Card, Spinner, errorText } from "../components/ui";

type Stats = Awaited<ReturnType<typeof api.adminDashboard>>;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function Admin() {
  const user = useRequireUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, u, e] = await Promise.all([api.adminDashboard(), api.adminUsers(), api.adminEvents(1, 40)]);
      setStats(s);
      setUsers(u.users);
      setEvents(e.events);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") void load();
  }, [user?.role]);

  const changeRole = async (u: AdminUser, role: string) => {
    setNotice(null);
    try {
      await api.changeRole(u.id, role);
      setNotice(`Роль користувача ${u.username} змінено на «${ROLE_LABELS[role]}».`);
      void load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (!user) return <Spinner label="Перевірка сесії…" />;
  if (user.role !== "SUPER_ADMIN") return <Alert tone="red">Розділ доступний лише суперадміністратору.</Alert>;

  const usernameById = Object.fromEntries(users.map((u) => [u.id, u.username]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Адміністрування</h1>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Оновити
        </Button>
      </div>
      {error && <Alert tone="red">{error}</Alert>}
      {notice && <Alert tone="green">{notice}</Alert>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Користувачів" value={stats.total_users} />
          <Stat label="Активних сесій" value={stats.active_sessions} />
          <Stat label="Подій сьогодні" value={stats.events_today} />
          <Stat label="Аномалій сьогодні" value={stats.anomalies_today} />
          <Stat label="Середній trust score" value={fmtPercent(stats.average_trust_score)} />
        </div>
      )}

      <Card title="Користувачі та ролі" icon={<Users className="h-4 w-4 text-indigo-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="pb-1 font-medium">Логін</th>
                <th className="pb-1 font-medium">Email</th>
                <th className="pb-1 font-medium">TOTP</th>
                <th className="pb-1 font-medium">Ідентифікатор</th>
                <th className="pb-1 font-medium">Роль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-1.5 font-medium">{u.username}</td>
                  <td className="py-1.5 text-slate-600">{u.email}</td>
                  <td className="py-1.5">
                    <Badge tone={u.totp_enabled ? "green" : "slate"}>{u.totp_enabled ? "так" : "ні"}</Badge>
                  </td>
                  <td className="py-1.5 font-mono text-xs text-slate-500" title={u.id}>
                    {u.id}
                  </td>
                  <td className="py-1.5">
                    <select
                      value={u.role}
                      disabled={u.id === user.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:bg-slate-100"
                      title={u.id === user.id ? "Власну роль змінити не можна" : undefined}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Журнал подій безпеки" icon={<Activity className="h-4 w-4 text-indigo-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="pb-1 font-medium">Час</th>
                <th className="pb-1 font-medium">Подія</th>
                <th className="pb-1 font-medium">IP</th>
                <th className="pb-1 font-medium">Деталі</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev) => {
                const l = EVENT_LABELS[ev.event_type] ?? { text: ev.event_type, tone: "blue" as Tone };
                const d = ev.details ?? {};
                const who = typeof d.user_id === "string" ? usernameById[d.user_id] : undefined;
                const summary = Object.entries(d)
                  .filter(([k]) => ["reason", "operation_name", "operation_type", "new_role", "old_role", "note"].includes(k))
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · ");
                return (
                  <tr key={ev.id}>
                    <td className="whitespace-nowrap py-1.5 text-slate-500">{fmtDateTime(ev.timestamp)}</td>
                    <td className="py-1.5">
                      <Badge tone={l.tone}>{l.text}</Badge>
                      {who && <span className="ml-1 text-xs text-slate-500">{who}</span>}
                    </td>
                    <td className="py-1.5 font-mono text-xs">{ev.ip_address ?? "—"}</td>
                    <td className="py-1.5 text-xs text-slate-600">{summary || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
