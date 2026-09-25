import type { ReactNode } from "react";

import {
  formatDate,
  numberFormatter,
  optionalNumber,
  quarantineReason,
  statusPresentation,
} from "./presentation";
import type {
  AdapterResult,
  DispatchAction,
  GatewayMetrics,
  Incident,
  PolicyMetrics,
  QuarantinedTelemetryEvent,
  ServiceResult,
  TelemetryEvent,
} from "./types";

export function StatusBadge({ status }: { status: string }) {
  const presentation = statusPresentation(status);
  return (
    <span className={["inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold", presentation.className].join(" ")}>
      {presentation.label}
    </span>
  );
}

export function ProtectionBadge({
  label,
  tone,
}: {
  label: string;
  tone: "positive" | "warning" | "critical" | "neutral";
}) {
  const styles = {
    positive: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    critical: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    neutral: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  };
  return (
    <span className={["inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold", styles[tone]].join(" ")}>
      <span className="mr-2 h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="h-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20 backdrop-blur sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="flex h-full min-h-32 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm leading-5 text-slate-400">
        <span className="shrink-0 text-cyan-300">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-auto pt-3 text-xs leading-5 text-slate-500">{hint}</p>
    </article>
  );
}

export function ServiceCard({ result }: { result: ServiceResult }) {
  const gatewayState = result.gatewayState;
  const mitigationActive = result.mitigation && Object.values(result.mitigation).some(Boolean);
  return (
    <article className="flex h-full min-h-48 flex-col rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">{result.service.name}</p>
          <p className="mt-1 text-xs text-slate-500">Захищений сервіс: {result.service.id}</p>
        </div>
        <StatusBadge status={result.status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{result.service.description}</p>
      {gatewayState ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs text-slate-300">
          <span className="rounded-lg bg-white/5 px-2 py-1">
            Ліміт {gatewayState.rateLimit.ratePerSecond}/с · burst {gatewayState.rateLimit.burstCapacity}
          </span>
          <span className="rounded-lg bg-white/5 px-2 py-1">Заблоковано: {gatewayState.blockedCount}</span>
          <span className="rounded-lg bg-white/5 px-2 py-1">Circuit: {gatewayState.circuit.mode}</span>
          <span className="rounded-lg bg-white/5 px-2 py-1">Кеш: {gatewayState.cache.entries}</span>
          {mitigationActive ? <span className="rounded-lg bg-amber-400/10 px-2 py-1 text-amber-200">Стримування активне</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export function AdapterCard({ adapter }: { adapter: AdapterResult }) {
  const protocol = adapter.source.protocol?.toUpperCase() ?? "Стан";
  const connectionLabel =
    adapter.status === "unavailable"
      ? "Немає з’єднання"
      : adapter.source.protocol === "tcp"
        ? "Порт доступний"
        : adapter.statusCode !== null
          ? "HTTP " + adapter.statusCode
          : "Сервіс відповідає";
  return (
    <article className="flex h-full min-h-48 flex-col rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">{adapter.source.name}</p>
          <p className="mt-1 text-xs text-slate-500">{protocol} · порт {adapter.source.port}</p>
        </div>
        <StatusBadge status={adapter.status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{adapter.source.description}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs text-slate-300">
        {adapter.latencyMs !== null ? <span className="rounded-lg bg-white/5 px-2 py-1">{adapter.latencyMs} мс</span> : null}
        <span className="rounded-lg bg-white/5 px-2 py-1">{connectionLabel}</span>
      </div>
    </article>
  );
}

export function TelemetryRow({ event }: { event: TelemetryEvent }) {
  return (
    <li className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/5 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{event.key}</p>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
            {event.analyzed ? "аналізується" : "лише збір"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{event.source} · {event.component} · {formatDate(event.timestamp)}</p>
      </div>
      <p className="text-right text-lg font-semibold text-cyan-200">
        {event.value}
        {event.unit ? <span className="ml-1 text-xs font-normal text-slate-500">{event.unit}</span> : null}
      </p>
    </li>
  );
}

export function QuarantineRow({ event }: { event: QuarantinedTelemetryEvent }) {
  return (
    <li className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-rose-400/10 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{event.key}</p>
          {event.reasons.map((reason) => (
            <span key={reason} className="rounded-md bg-rose-400/10 px-2 py-0.5 text-[11px] text-rose-200">
              {quarantineReason(reason)}
            </span>
          ))}
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{event.source} · ізольовано {formatDate(event.quarantinedAt)}</p>
      </div>
      <p className="text-right text-lg font-semibold text-rose-200">
        {event.value}
        {event.unit ? <span className="ml-1 text-xs font-normal text-slate-500">{event.unit}</span> : null}
      </p>
    </li>
  );
}

export function IncidentCard({ incident }: { incident: Incident }) {
  const resolved = incident.status === "resolved";
  const cardStyle = resolved ? "border-white/10 bg-white/[0.03]" : "border-rose-400/20 bg-rose-400/[0.06]";
  return (
    <article className={["flex h-full min-h-44 min-w-0 flex-col overflow-hidden rounded-2xl border p-4", cardStyle].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">{incident.title}</p>
          <p className="mt-1 text-xs text-slate-500">{incident.ruleId}</p>
        </div>
        <StatusBadge status={resolved ? "resolved" : incident.severity} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{incident.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {incident.serviceId ? <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-cyan-200">{incident.serviceId}</span> : null}
        {(incident.policies ?? []).map((policy) => <span key={policy} className="rounded-md bg-white/5 px-2 py-1 text-slate-400">{policy}</span>)}
      </div>
      <p className="mt-auto pt-4 text-xs text-slate-500">Виявлено: {formatDate(incident.createdAt)}</p>
    </article>
  );
}

export function ActionRow({ action }: { action: DispatchAction }) {
  return (
    <li className="flex min-h-24 min-w-0 flex-col gap-3 overflow-hidden border-b border-white/5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-white">{action.title}</p>
        <p className="mt-1 break-words text-sm leading-6 text-slate-400">{action.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          {action.targetComponents.join(" · ")}{action.serviceId ? " · " + action.serviceId : ""} · {formatDate(action.createdAt)}
        </p>
      </div>
      <StatusBadge status={action.mode} />
    </li>
  );
}

function Bar({ value, maximum, color }: { value: number; maximum: number; color: string }) {
  const width = maximum > 0 ? Math.max(3, Math.min(100, (value / maximum) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div className={["h-full rounded-full", color].join(" ")} style={{ width: String(width) + "%" }} />
    </div>
  );
}

export function PolicyComparisonChart({ policies }: { policies: PolicyMetrics[] }) {
  const isDetected = (policy: PolicyMetrics) => policy.detected ?? policy.incidents_total > 0;
  const hasScenarioData = (policy: PolicyMetrics) =>
    (policy.scenarios_total ?? policy.incidents_total) > 0;
  const policyStatus = (policy: PolicyMetrics) =>
    policy.status ?? (isDetected(policy) ? "detected" : "no_data");
  const comparable = policies.filter(hasScenarioData);
  const maxMttd = Math.max(...comparable.map((policy) => policy.mean_mttd_min ?? 0), 1);
  const maxMttr = Math.max(...comparable.map((policy) => policy.mean_mttr_min ?? 0), 1);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {policies.map((policy) => {
        const scenarioCount = policy.scenarios_total ?? policy.incidents_total;
        const missedCount = policy.incidents_missed ?? Math.max(0, scenarioCount - policy.incidents_total);
        return (
          <article key={policy.policy} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold capitalize text-white">{policy.policy}</p>
              <StatusBadge status={policyStatus(policy)} />
            </div>
            {hasScenarioData(policy) ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-400">
                    <span>Доступність</span><span>{optionalNumber(policy.availability_pct, "%")}</span>
                  </div>
                  <Bar value={policy.availability_pct ?? 0} maximum={100} color="bg-emerald-400" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-400">
                    <span>Порівняльний MTTD</span><span>{optionalNumber(policy.mean_mttd_min, " хв")}</span>
                  </div>
                  <Bar value={policy.mean_mttd_min ?? 0} maximum={maxMttd} color="bg-cyan-400" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-400">
                    <span>Порівняльний MTTR</span><span>{optionalNumber(policy.mean_mttr_min, " хв")}</span>
                  </div>
                  <Bar value={policy.mean_mttr_min ?? 0} maximum={maxMttr} color="bg-amber-400" />
                </div>
                <p className="text-xs text-slate-500">
                  Виявлено: {policy.incidents_total} із {scenarioCount}
                  {missedCount > 0 ? " · пропущено: " + missedCount : ""}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-500">
                {policyStatus(policy) === "no_data" ? "Для вибраного періоду ще немає даних." : "Ця політика не виявила інцидентів у вибраному періоді."}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

type TrafficPoint = NonNullable<GatewayMetrics["trafficTimeline"]>["points"][number];

const trafficTimeFormatter = new Intl.DateTimeFormat("uk-UA", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Kyiv",
});

function chartCoordinates(
  points: TrafficPoint[],
  value: (point: TrafficPoint) => number,
  maximum: number,
) {
  const width = 900;
  const height = 210;
  const left = 54;
  const right = 16;
  const top = 16;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  return points.map((point, index) => {
    const x = left + (index / Math.max(1, points.length - 1)) * chartWidth;
    const y = top + chartHeight - (value(point) / maximum) * chartHeight;
    return [x, y] as const;
  });
}

function pointsAttribute(points: ReadonlyArray<readonly [number, number]>) {
  return points.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join(" ");
}

function formatTrafficTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "—" : trafficTimeFormatter.format(date);
}

export function GatewayTrafficChart({ gateways }: { gateways: ServiceResult[] }) {
  return (
    <div className="space-y-4">
      {gateways.map((gateway) => {
        const timeline = gateway.gatewayState?.metrics?.trafficTimeline;
        const points = timeline?.points ?? [];
        const bucketSec = timeline?.bucketSec ?? 5;
        const limit = gateway.gatewayState?.rateLimit.ratePerSecond ?? 0;
        const peakRps = Math.max(...points.map((point) => point.requestsPerSecond), 0);
        const maximum = Math.max(peakRps * 1.15, limit * 1.15, 1);
        const requestCoordinates = chartCoordinates(
          points,
          (point) => point.requestsPerSecond,
          maximum,
        );
        const mitigationCoordinates = chartCoordinates(
          points,
          (point) => (point.blocked + point.limited) / bucketSec,
          maximum,
        );
        const limitedAndBlocked = points.reduce(
          (total, point) => total + point.limited + point.blocked,
          0,
        );
        const errors = points.reduce((total, point) => total + point.errors, 0);
        const currentRps = points.at(-1)?.requestsPerSecond ?? 0;
        const thresholdY = 16 + 160 - (limit / maximum) * 160;
        const firstTimestamp = points.at(0)?.timestamp ?? "";
        const middleTimestamp = points.at(Math.floor(points.length / 2))?.timestamp ?? "";
        const lastTimestamp = points.at(-1)?.timestamp ?? "";
        return (
          <article key={gateway.service.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-white">{gateway.service.name}</p>
              <StatusBadge status={gateway.status} />
            </div>
            {points.length ? (
              <div className="mt-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-slate-500">Зараз</p>
                    <p className="mt-1 font-semibold text-cyan-200">{numberFormatter.format(currentRps)} зап/с</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-slate-500">Пік за 5 хв</p>
                    <p className="mt-1 font-semibold text-white">{numberFormatter.format(peakRps)} зап/с</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-slate-500">Стримано за 5 хв</p>
                    <p className="mt-1 font-semibold text-rose-200">{limitedAndBlocked}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-slate-500">Помилки upstream</p>
                    <p className="mt-1 font-semibold text-violet-200">{errors}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-slate-950/60 p-2">
                  <svg viewBox="0 0 900 210" className="h-auto w-full" role="img" aria-label={"Динаміка запитів " + gateway.service.name}>
                    {[0, 0.5, 1].map((ratio) => {
                      const y = 16 + ratio * 160;
                      const value = maximum * (1 - ratio);
                      return (
                        <g key={ratio}>
                          <line x1="54" x2="884" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" />
                          <text x="46" y={y + 4} textAnchor="end" fill="rgb(100,116,139)" fontSize="11">
                            {numberFormatter.format(value)}
                          </text>
                        </g>
                      );
                    })}
                    {limit > 0 ? (
                      <g>
                        <line x1="54" x2="884" y1={thresholdY} y2={thresholdY} stroke="rgb(251,191,36)" strokeDasharray="7 6" opacity="0.8" />
                        <text x="878" y={Math.max(12, thresholdY - 5)} textAnchor="end" fill="rgb(251,191,36)" fontSize="11">
                          ліміт {limit}/с
                        </text>
                      </g>
                    ) : null}
                    <polyline fill="none" stroke="rgb(34,211,238)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={pointsAttribute(requestCoordinates)} />
                    <polyline fill="none" stroke="rgb(251,113,133)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={pointsAttribute(mitigationCoordinates)} />
                    <text x="54" y="201" fill="rgb(100,116,139)" fontSize="11">{formatTrafficTime(firstTimestamp)}</text>
                    <text x="469" y="201" textAnchor="middle" fill="rgb(100,116,139)" fontSize="11">{formatTrafficTime(middleTimestamp)}</text>
                    <text x="884" y="201" textAnchor="end" fill="rgb(100,116,139)" fontSize="11">{formatTrafficTime(lastTimestamp)}</text>
                  </svg>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-cyan-400" />Усі запити, зап/с</span>
                  <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-rose-400" />Заблоковані та обмежені, зап/с</span>
                  <span className="inline-flex items-center gap-2"><span className="w-5 border-t border-dashed border-amber-400" />Поточний rate limit</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-sm text-amber-200">
                Цей Gateway ще не віддає часовий ряд. Після оновлення його контейнера тут з’явиться жива динаміка за останні п’ять хвилин.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
