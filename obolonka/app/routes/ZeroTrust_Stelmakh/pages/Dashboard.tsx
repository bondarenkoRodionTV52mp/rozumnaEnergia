import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Copy, Fingerprint, Gauge, History, Keyboard, Laptop, Monitor, Shield, Smartphone } from "lucide-react";
import { api, type DeviceStatus, type TrustScore, type UserDashboard } from "../lib/api";
import { useRequireUser, useZt } from "../lib/context";
import { EVENT_LABELS, ROLE_LABELS, fmtDateTime, fmtPercent, type Tone } from "../lib/labels";
import { Alert, Badge, Button, Card, Field, Modal, Progress, Spinner, errorText } from "../components/ui";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type TrustView = { score: number; status: string; note?: string };

function toTrustView(score: number, hasProfile: boolean): TrustView {
  const status = score >= 0.85 ? "normal" : score >= 0.7 ? "warning" : "critical";
  return { score, status, note: hasProfile ? undefined : "no_profile" };
}

// ---------- Trust score ----------

function TrustCard({ trust }: { trust: TrustView }) {
  const map: Record<string, { tone: Tone; text: string; ring: string }> = {
    normal: { tone: "green", text: "Нормальний", ring: "ring-emerald-300" },
    warning: { tone: "amber", text: "Увага", ring: "ring-amber-300" },
    critical: { tone: "red", text: "Критичний", ring: "ring-rose-300" },
  };
  const s = map[trust.status] ?? map.critical;
  let text = s.text;
  if (trust.status === "normal" && trust.note === "no_profile") text = "Профіль не сформовано";
  if (trust.status === "normal" && trust.note === "no_recent_data") text = "Очікування даних";

  return (
    <Card title="Trust score" icon={<Gauge className="h-4 w-4 text-indigo-600" />}>
      <div className="flex flex-col items-center gap-2 py-2">
        <div className={`flex h-28 w-28 items-center justify-center rounded-full bg-slate-50 ring-8 ${s.ring}`}>
          <span className="text-2xl font-bold tabular-nums">{fmtPercent(trust.score)}</span>
        </div>
        <Badge tone={trust.note ? "slate" : s.tone}>{text}</Badge>
        <p className="text-center text-xs text-slate-500">Оновлюється кожні 10 с за даними пасивної біометрії</p>
      </div>
    </Card>
  );
}

// ---------- Біометричний профіль ----------

function DeviceProfile({
  title,
  icon,
  status,
  channels,
  min,
}: {
  title: string;
  icon: ReactNode;
  status: DeviceStatus;
  channels: { label: string; count: number }[];
  min: number;
}) {
  const anyData = channels.some((c) => c.count > 0);
  const partial = status.keystroke_trained || status.mouse_trained || status.touch_trained;
  const badge = status.trained
    ? { tone: "green" as Tone, text: "✓ Готово" }
    : partial
      ? { tone: "amber" as Tone, text: "Частково" }
      : anyData
        ? { tone: "amber" as Tone, text: "Збір даних…" }
        : { tone: "slate" as Tone, text: "Немає даних" };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {icon} {title}
        </span>
        <Badge tone={badge.tone}>{badge.text}</Badge>
      </div>
      <div className={`grid gap-3 ${channels.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {channels.map((c) => (
          <div key={c.label}>
            <div className="mb-1 text-xs text-slate-500">{c.label}</div>
            <Progress value={c.count} max={min} done={c.count >= min} />
            <div className="mt-0.5 text-xs tabular-nums text-slate-500">
              {c.count}/{min}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: UserDashboard["profile_status"] }) {
  const min = profile.min_required || 30;
  const desktop = profile.device_status?.desktop ?? {};
  const mobile = profile.device_status?.mobile ?? {};

  let message = "Продовжуйте користуватися системою для формування профілю. Потрібно 30+ зразків.";
  let tone: Tone = "blue";
  if (desktop.trained && mobile.trained) {
    message = "Обидва профілі готові! MFA пропускатиметься, якщо поведінка відповідає типовій.";
    tone = "green";
  } else if (desktop.trained) {
    message = "Профіль ПК готовий! MFA пропускатиметься при вході з ПК.";
    tone = "green";
  } else if (mobile.trained) {
    message = "Мобільний профіль готовий! MFA пропускатиметься при вході з телефону.";
    tone = "green";
  }

  return (
    <Card title="Біометричний профіль" icon={<Fingerprint className="h-4 w-4 text-indigo-600" />}>
      <div className="space-y-4">
        <DeviceProfile
          title="Профіль ПК"
          icon={<Monitor className="h-4 w-4" />}
          status={desktop}
          min={min}
          channels={[
            { label: "Клавіатура", count: desktop.keystroke_samples || 0 },
            { label: "Миша", count: desktop.mouse_samples || 0 },
          ]}
        />
        <DeviceProfile
          title="Мобільний профіль"
          icon={<Smartphone className="h-4 w-4" />}
          status={mobile}
          min={min}
          channels={[
            { label: "Клавіатура", count: mobile.keystroke_samples || 0 },
            { label: "Дотики", count: mobile.touch_samples || 0 },
            { label: "Сенсори", count: mobile.sensor_samples || 0 },
          ]}
        />
        <Alert tone={tone}>{message}</Alert>
      </div>
    </Card>
  );
}

// ---------- Безпека: TOTP ----------

function SecurityCard({
  userId,
  role,
  totpEnabled,
  autoSetup,
  onChanged,
}: {
  userId: string;
  role: string;
  totpEnabled: boolean;
  autoSetup: boolean;
  onChanged: () => void;
}) {
  const [setup, setSetup] = useState<{ secret: string; qr_code: string; backup_codes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoOpened = useRef(false);

  const startSetup = useCallback(async () => {
    setError(null);
    try {
      setSetup(await api.setupTotp());
      setCode("");
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    if (autoSetup && !totpEnabled && !autoOpened.current) {
      autoOpened.current = true;
      setNotice("Для безпеки облікового запису необхідно налаштувати двофакторну автентифікацію (TOTP).");
      void startSetup();
    }
  }, [autoSetup, totpEnabled]);

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!setup) return;
    setError(null);
    try {
      await api.confirmTotp(code.trim(), setup.backup_codes);
      setSetup(null);
      setNotice("TOTP успішно налаштовано.");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const disable = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.disableTotp(code.trim());
      setDisableOpen(false);
      setNotice("TOTP вимкнено.");
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* буфер обміну недоступний (не HTTPS) — ID видно на екрані */
    }
  };

  return (
    <Card title="Безпека" icon={<Shield className="h-4 w-4 text-indigo-600" />}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Роль</span>
          <Badge tone="violet">{ROLE_LABELS[role] ?? role}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>TOTP</span>
          <Badge tone={totpEnabled ? "green" : "slate"}>{totpEnabled ? "Увімкнено" : "Вимкнено"}</Badge>
        </div>
        {totpEnabled ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              setCode("");
              setError(null);
              setDisableOpen(true);
            }}
          >
            Вимкнути TOTP
          </Button>
        ) : (
          <Button size="sm" className="w-full" onClick={startSetup}>
            Налаштувати TOTP
          </Button>
        )}
        {notice && <Alert tone="blue">{notice}</Alert>}
        {error && !setup && !disableOpen && <Alert tone="red">{error}</Alert>}

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-1 text-xs text-slate-500">Ваш ідентифікатор (для отримання токенів делегування)</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs">{userId}</code>
            <button onClick={copyId} className="rounded p-1 text-slate-500 hover:bg-slate-100" title="Копіювати">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copied && <div className="mt-1 text-xs text-emerald-700">Скопійовано</div>}
        </div>
      </div>

      <Modal open={!!setup} title="Налаштування TOTP" onClose={() => setSetup(null)}>
        {setup && (
          <div className="space-y-3 text-center text-sm">
            <p>Скануйте QR-код у застосунку-автентифікаторі (Google Authenticator, Authy тощо):</p>
            <img src={`data:image/png;base64,${setup.qr_code}`} alt="QR-код TOTP" className="mx-auto w-48" />
            <p className="text-xs text-slate-500">Або введіть ключ вручну:</p>
            <code className="block break-all rounded bg-slate-100 px-2 py-1 text-xs">{setup.secret}</code>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2">
              <p className="mb-1 text-xs font-medium text-rose-800">Збережіть резервні коди — їх показано лише один раз:</p>
              <div className="flex flex-wrap justify-center gap-1 font-mono text-xs">
                {setup.backup_codes.map((c) => (
                  <code key={c} className="rounded bg-white px-1.5 py-0.5">
                    {c}
                  </code>
                ))}
              </div>
            </div>
            <form onSubmit={confirm} className="space-y-2 text-left">
              <Field
                label="Код із застосунку"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                className="text-center tracking-widest"
              />
              {error && <Alert tone="red">{error}</Alert>}
              <Button type="submit" className="w-full">
                Підтвердити
              </Button>
            </form>
          </div>
        )}
      </Modal>

      <Modal open={disableOpen} title="Вимкнення TOTP" onClose={() => setDisableOpen(false)}>
        <form onSubmit={disable} className="space-y-3">
          <Field
            label="Поточний TOTP-код"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={6}
            inputMode="numeric"
            placeholder="000000"
          />
          {error && <Alert tone="red">{error}</Alert>}
          <Button type="submit" variant="danger" className="w-full">
            Вимкнути
          </Button>
        </form>
      </Modal>
    </Card>
  );
}

// ---------- Сторінка ----------

export default function Dashboard() {
  const user = useRequireUser();
  const { liveKeystrokes, setUser } = useZt();
  const [params] = useSearchParams();
  const [data, setData] = useState<UserDashboard | null>(null);
  const [trust, setTrust] = useState<TrustView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.userDashboard();
      setData(d);
      setUser(d.user);
      const ds = d.profile_status?.device_status;
      setTrust(toTrustView(d.current_trust_score, !!(ds?.desktop?.trained || ds?.mobile?.trained)));
      setError(null);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [!!user]);

  // Періодичне оновлення trust score
  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      try {
        const t: TrustScore = await api.trustScore();
        setTrust({ score: t.current_score, status: t.status, note: t.note });
      } catch {
        /* мовчки: наступна спроба за 10 с */
      }
    }, 10000);
    return () => clearInterval(id);
  }, [!!user]);

  if (!user) return <Spinner label="Перевірка сесії…" />;
  if (error && !data) return <Alert tone="red">{error}</Alert>;
  if (!data || !trust) return <Spinner label="Завантаження панелі…" />;

  const history = data.trust_score_history ?? [];
  const chartData = {
    labels: history.map((h) =>
      new Date(h.timestamp.endsWith("Z") ? h.timestamp : `${h.timestamp}Z`).toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    datasets: [
      {
        label: "Trust score, %",
        data: history.map((h) => h.score * 100),
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Панель керування</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <TrustCard trust={trust} />
        <ProfileCard profile={data.profile_status ?? {}} />
        <SecurityCard
          userId={data.user.id}
          role={data.user.role}
          totpEnabled={data.user.totp_enabled}
          autoSetup={params.get("setupTotp") === "1"}
          onChanged={load}
        />
      </div>

      <Card title="Тренувальна зона біометрії" icon={<Keyboard className="h-4 w-4 text-indigo-600" />}>
        <p className="mb-2 text-sm text-slate-500">
          Друкуйте будь-який текст для збору зразків динаміки натискань. Рухайте мишею — збирається динаміка руху. Дані
          надсилаються кожні 5 секунд.
        </p>
        <textarea
          value={training}
          onChange={(e) => setTraining(e.target.value)}
          rows={3}
          placeholder="Введіть будь-який текст для тренування біометричного профілю…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            <b className="tabular-nums">{liveKeystrokes}</b> натискань у цій сесії
          </span>
          <Button variant="ghost" size="sm" onClick={() => setTraining("")}>
            Очистити
          </Button>
        </div>
      </Card>

      <Card title="Історія trust score (24 год)" icon={<History className="h-4 w-4 text-indigo-600" />}>
        {history.length ? (
          <div className="h-56">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Даних ще немає — вони з'являться після аналізу поведінки.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Останні події" icon={<History className="h-4 w-4 text-indigo-600" />}>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.recent_events.map((ev, i) => {
                const l = EVENT_LABELS[ev.event_type] ?? { text: ev.event_type, tone: "blue" as Tone };
                return (
                  <tr key={i}>
                    <td className="py-1.5">
                      <Badge tone={l.tone}>{l.text}</Badge>
                    </td>
                    <td className="py-1.5 text-right text-slate-500">{fmtDateTime(ev.timestamp)}</td>
                  </tr>
                );
              })}
              {!data.recent_events.length && (
                <tr>
                  <td className="py-2 text-slate-500">Подій немає</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card title="Активні сесії" icon={<Laptop className="h-4 w-4 text-indigo-600" />}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="pb-1 font-medium">IP</th>
                <th className="pb-1 font-medium">Trust</th>
                <th className="pb-1 text-right font-medium">Остання активність</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.active_sessions.map((s, i) => (
                <tr key={i}>
                  <td className="py-1.5 font-mono text-xs">{s.ip_address || "—"}</td>
                  <td
                    className={`py-1.5 tabular-nums ${
                      s.trust_score >= 0.85 ? "text-emerald-700" : s.trust_score >= 0.7 ? "text-amber-700" : "text-rose-700"
                    }`}
                  >
                    {fmtPercent(s.trust_score, 0)}
                  </td>
                  <td className="py-1.5 text-right text-slate-500">{fmtDateTime(s.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
