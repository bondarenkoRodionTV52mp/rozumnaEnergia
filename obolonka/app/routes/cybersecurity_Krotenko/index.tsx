import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  History,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { NavLink, useLoaderData, useRevalidator } from "react-router";

import type { Route } from "./+types/index";
import { loadCybersecurityDashboard } from "./api.server";
import {
  ActionRow,
  AdapterCard,
  GatewayTrafficChart,
  IncidentCard,
  MetricCard,
  PolicyComparisonChart,
  ProtectionBadge,
  QuarantineRow,
  Section,
  ServiceCard,
  StatusBadge,
  TelemetryRow,
} from "./components";
import {
  formatDate,
  integrationModeLabel,
  optionalNumber,
  protectionStatus,
} from "./presentation";
import type {
  CybersecuritySnapshot,
  QuarantinedTelemetryEvent,
  TelemetryEvent,
} from "./types";

const EXPECTED_POLICIES = ["minimal", "baseline", "standard"] as const;

function hasCompletePolicies(
  scope: CybersecuritySnapshot["metrics"] | NonNullable<CybersecuritySnapshot["metrics"]["session"]>,
): boolean {
  if (scope.status !== "ready") return true;
  const policies = new Set(scope.byPolicy.map((policy) => policy.policy));
  return EXPECTED_POLICIES.every((policy) => policies.has(policy));
}

function isCompleteSnapshot(
  snapshot: CybersecuritySnapshot,
): boolean {
  if (!hasCompletePolicies(snapshot.metrics)) return false;

  if (snapshot.metrics.session && !hasCompletePolicies(snapshot.metrics.session)) {
    return false;
  }

  return true;
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "SECMS | Smart Energy Lab" },
    {
      name: "description",
      content: "Smart Energy Cybersecurity Monitoring System",
    },
  ];
}

export async function loader(_: Route.LoaderArgs) {
  return loadCybersecurityDashboard();
}

const emptyTelemetry = {
  status: "waiting" as const,
  topic: "sensor/data",
  analyzedKeys: ["current_a", "power_kw", "voltage"],
  summary: { visible: 0, analyzed: 0, collectedOnly: 0, quarantined: 0 },
  events: [] as TelemetryEvent[],
  quarantine: {
    status: "empty" as const,
    visible: 0,
    active: 0,
    activeWindowSec: 60,
    lastQuarantinedAt: null,
    events: [] as QuarantinedTelemetryEvent[],
  },
};

export default function CybersecurityDashboard() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const lastValidSnapshot = useRef<CybersecuritySnapshot | null>(null);
  const [comparisonPeriod, setComparisonPeriod] = useState<"experiment" | "session">("session");

  const incomingSnapshot = loaderData.snapshot;
  const incomingComplete =
    incomingSnapshot !== null &&
    isCompleteSnapshot(incomingSnapshot);
  if (incomingComplete) {
    lastValidSnapshot.current = incomingSnapshot;
  }

  const snapshot = incomingComplete
    ? incomingSnapshot
    : lastValidSnapshot.current;
  const error =
    loaderData.error ??
    (incomingSnapshot && !incomingComplete
      ? "Отримано неповний snapshot політик; показано останні коректні дані."
      : null);
  const fetchedAt = loaderData.fetchedAt;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [revalidator]);

  const refreshing = revalidator.state !== "idle";

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/25 bg-rose-400/[0.07] p-8">
          <TriangleAlert className="h-10 w-10 text-rose-300" />
          <h1 className="mt-5 text-3xl font-semibold">Cybersecurity API недоступний</h1>
          <p className="mt-3 text-slate-300">{error ?? "Не вдалося отримати стан системи."}</p>
          <p className="mt-2 text-sm text-slate-500">Остання спроба: {formatDate(fetchedAt)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => revalidator.revalidate()}
              className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Повторити
            </button>
            <NavLink to="/" className="rounded-xl border border-white/15 px-4 py-2 hover:bg-white/5">
              На головну
            </NavLink>
          </div>
        </div>
      </main>
    );
  }

  const telemetry = snapshot.telemetry ?? emptyTelemetry;
  const sessionMetricsReady = snapshot.metrics.session?.status === "ready";
  const topMetricsScope = sessionMetricsReady
    ? snapshot.metrics.session!
    : snapshot.metrics;
  const metrics = topMetricsScope.summary;
  const standardMetrics = topMetricsScope.byPolicy.find(
    (policy) => policy.policy === "standard",
  );
  const standardDetected = standardMetrics?.detected ??
    (standardMetrics?.incidents_total ?? 0) > 0;
  const standardAvailability = metrics.availabilityPct ??
    standardMetrics?.availability_pct;
  const standardMttd = metrics.mttdMin ?? standardMetrics?.mean_mttd_min;
  const standardMttr = metrics.mttrMin ?? standardMetrics?.mean_mttr_min;
  const metricsReady = topMetricsScope.status === "ready" && standardDetected;
  const metricsPeriodHint = sessionMetricsReady
    ? "усі інциденти поточної сесії"
    : "останній завершений інцидент";
  const comparisonScope =
    comparisonPeriod === "session" && sessionMetricsReady
      ? snapshot.metrics.session!
      : snapshot.metrics;
  const protection = protectionStatus(
    snapshot.backend.coreProtectionStatus ??
      snapshot.backend.integrationHealth ??
      snapshot.backend.status,
  );
  const gatewayResults = snapshot.api.results.filter((result) => Boolean(result.gatewayState));
  const availableGateways = gatewayResults.filter(
    (result) => result.status === "online" || result.status === "degraded",
  ).length;
  const activeIncidentCount =
    snapshot.incidents.summary.activeIncidents ??
    snapshot.incidents.summary.totalIncidents;
  const recentlyResolved = snapshot.incidents.recentlyResolved ?? [];
  const quarantineWindowMs = (telemetry.quarantine.activeWindowSec ?? 60) * 1_000;
  const snapshotTime = new Date(snapshot.generatedAt).getTime();
  const inferredActiveQuarantine = telemetry.quarantine.events.filter((event) => {
    const eventTime = new Date(event.quarantinedAt).getTime();
    return Number.isFinite(eventTime) && Number.isFinite(snapshotTime) && snapshotTime - eventTime <= quarantineWindowMs;
  }).length;
  const activeQuarantineCount = telemetry.quarantine.active ?? inferredActiveQuarantine;
  const quarantineStatus =
    activeQuarantineCount > 0
      ? "active"
      : telemetry.quarantine.visible > 0
        ? "history"
        : "empty";
  const externalAdapters = snapshot.readOnly.adapters.filter(
    (adapter) => adapter.source.owner === "Зовнішній сервіс SmartEnergy",
  );
  const externalAdapterCounts = externalAdapters.reduce(
    (counts, adapter) => {
      counts[adapter.status] += 1;
      return counts;
    },
    { ready: 0, partial: 0, stale: 0, unavailable: 0 },
  );
  const visibleActions = snapshot.actions.actions.slice(0, 3);
  const archivedActions = snapshot.actions.actions.slice(3);

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%)] px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-white/10 bg-slate-900/75 px-5 py-5 shadow-xl shadow-slate-950/20 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavLink
              to="/"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Smart Energy Lab
            </NavLink>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">Оновлено {formatDate(snapshot.generatedAt)}</span>
              <button
                type="button"
                onClick={() => revalidator.revalidate()}
                disabled={refreshing}
                aria-label="Оновити дані"
                title="Оновити дані"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={["h-4 w-4", refreshing ? "animate-spin" : ""].join(" ")} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-2.5 text-cyan-300">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  SECMS
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Smart Energy Cybersecurity Monitoring System
                </p>
              </div>
            </div>
            <ProtectionBadge label={protection.label} tone={protection.tone} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-xs">
            <span className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-slate-300">
              Режим: {integrationModeLabel(snapshot.backend.integrationMode)}
            </span>
            <span className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-slate-300">
              Gateway: {availableGateways}/{gatewayResults.length}
            </span>
            <span className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-slate-300">
              Активні інциденти: {activeIncidentCount}
            </span>
            <span className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-slate-300">
              Зовнішні компоненти: {externalAdapterCounts.ready}/{externalAdapters.length}
            </span>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            icon={<Gauge className="h-4 w-4" />}
            label="Доступність · standard"
            value={metricsReady ? optionalNumber(standardAvailability, "%") : "Немає даних"}
            hint={metricsPeriodHint}
          />
          <MetricCard
            icon={<Clock3 className="h-4 w-4" />}
            label="MTTD · standard"
            value={metricsReady ? optionalNumber(standardMttd, " хв") : "—"}
            hint={metricsPeriodHint}
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="MTTR · standard"
            value={metricsReady ? optionalNumber(standardMttr, " хв") : "—"}
            hint={metricsPeriodHint}
          />
          <MetricCard
            icon={<TriangleAlert className="h-4 w-4" />}
            label="Активні інциденти"
            value={String(activeIncidentCount)}
            hint="поточний стан Gateway і MQTT"
          />
          <MetricCard
            icon={<LockKeyhole className="h-4 w-4" />}
            label="Дії захисту"
            value={String(snapshot.actions.summary.total)}
            hint="фактичні дії Analyzer і Control"
          />
          <MetricCard
            icon={<Radio className="h-4 w-4" />}
            label="Зовнішні компоненти"
            value={externalAdapters.length ? externalAdapterCounts.ready + "/" + externalAdapters.length : "—"}
            hint="read-only перевірки доступності"
          />
        </section>

        <div className="mt-6">
          <Section
            title="Захищені HTTP-контури"
            description="Кожен Gateway застосовує rate limiting, блокування, circuit breaker та кешовану відповідь для свого backend."
          >
            {gatewayResults.length ? (
              <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
                {gatewayResults.map((result) => <ServiceCard key={result.service.id} result={result} />)}
              </div>
            ) : (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
                Активні Gateway не налаштовані.
              </p>
            )}
          </Section>
        </div>

        <div className="mt-6">
          <Section
            title="Динаміка HTTP-навантаження"
            description="Реальна інтенсивність запитів за останні п’ять хвилин. Різкий підйом до rate limit і поява заблокованих запитів показують API flood."
          >
            <GatewayTrafficChart gateways={gatewayResults} />
          </Section>
        </div>

        <div className="mt-6">
          <Section title="MQTT-телеметрія" description={"Останні повідомлення з MQTT-топіка " + telemetry.topic + "."}>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={telemetry.status} />
              <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-cyan-200">
                Аналізуються: {telemetry.summary.analyzed}
              </span>
              <span className="rounded-lg bg-white/5 px-2.5 py-1 text-slate-400">
                Лише збираються: {telemetry.summary.collectedOnly}
              </span>
              <span className="rounded-lg bg-rose-400/10 px-2.5 py-1 text-rose-200">
                Активний карантин: {activeQuarantineCount}
              </span>
            </div>
            {telemetry.events.length ? (
              <ul className="grid gap-x-5 md:grid-cols-2">
                {telemetry.events.map((event, index) => (
                  <TelemetryRow key={[event.timestamp, event.source, event.key, index].join("-")} event={event} />
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <Radio className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 font-medium text-white">Очікуємо MQTT-телеметрію</p>
                <p className="mt-1 text-sm text-slate-500">Перевірте broker і публікацію в topic {telemetry.topic}.</p>
              </div>
            )}

            <details className="group mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-white/[0.05] p-2 text-slate-300">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-white">Історія карантину</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {telemetry.quarantine.visible
                        ? `Збережено записів: ${telemetry.quarantine.visible}`
                        : "Аномальних значень не зафіксовано"}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={quarantineStatus} />
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="border-t border-white/10 px-4 pb-4 pt-3">
                <p className="max-w-3xl text-xs leading-5 text-slate-500">
                  Аномальні voltage, power_kw і current_a вилучаються з довіреного аналітичного потоку цього модуля. MQTT broker та інші сервіси Smart Energy не блокуються.
                </p>
                {telemetry.quarantine.events.length ? (
                  <ul className="mt-3 grid gap-x-5 md:grid-cols-2">
                    {telemetry.quarantine.events.map((event, index) => (
                      <QuarantineRow key={[event.quarantinedAt, event.source, event.key, index].join("-")} event={event} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-200">
                    Карантин порожній — аномальних voltage, power_kw або current_a не виявлено.
                  </p>
                )}
              </div>
            </details>
          </Section>
        </div>

        <div className="mt-6">
          <Section
            title="Доступність зовнішніх компонентів"
            description="Read-only перевірки показують лише доступність і час відповіді; вони не змінюють стан чужих сервісів."
          >
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-emerald-300">Готові: {externalAdapterCounts.ready}</span>
              <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-amber-300">Частково: {externalAdapterCounts.partial}</span>
              <span className="rounded-lg bg-slate-400/10 px-2.5 py-1 text-slate-300">Застарілі: {externalAdapterCounts.stale}</span>
              <span className="rounded-lg bg-rose-400/10 px-2.5 py-1 text-rose-300">Недоступні: {externalAdapterCounts.unavailable}</span>
            </div>
            <div className="grid auto-rows-fr gap-3 md:grid-cols-2 lg:grid-cols-3">
              {externalAdapters.map((adapter) => <AdapterCard key={adapter.source.id} adapter={adapter} />)}
            </div>
          </Section>
        </div>

        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <Section title="Інциденти">
              {snapshot.incidents.incidents.length ? (
                <div className="grid auto-rows-fr gap-3">
                  {snapshot.incidents.incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" />
                  <p className="mt-3 font-medium text-white">Активних інцидентів немає</p>
                  <p className="mt-1 text-sm text-slate-400">Gateway і MQTT-потік продовжують аналізуватися.</p>
                </div>
              )}
              {recentlyResolved.length ? (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold text-slate-300">Нещодавно завершені</h3>
                  <div className="mt-3 grid auto-rows-fr gap-3">
                    {recentlyResolved.map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
                  </div>
                </div>
              ) : null}
            </Section>
          </div>

          <div className="min-w-0">
            <Section title="Журнал дій">
              <ul className="min-w-0">
                {visibleActions.length ? (
                  visibleActions.map((action) => <ActionRow key={action.id} action={action} />)
                ) : (
                  <li className="py-8 text-center text-sm text-slate-500">Дій реагування ще немає.</li>
                )}
              </ul>
              {archivedActions.length ? (
                <details className="group mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                    <span>Історія — ще {archivedActions.length}</span>
                    <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="border-t border-white/10 px-4">
                    {archivedActions.map((action) => <ActionRow key={action.id} action={action} />)}
                  </ul>
                </details>
              ) : null}
            </Section>
          </div>
        </div>

        <div className="mt-6">
          <Section
            title="Порівняння політик стійкості"
            description={
              comparisonPeriod === "session" && sessionMetricsReady
                ? "Накопичувальні метрики за всіма інцидентами поточної сесії."
                : "Розрахункові метрики останнього завершеного інциденту."
            }
          >
            <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-slate-950/45 p-1 text-sm">
              <button
                type="button"
                onClick={() => setComparisonPeriod("experiment")}
                className={[
                  "rounded-lg px-3 py-2 transition",
                  comparisonPeriod === "experiment"
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                Останній інцидент
              </button>
              <button
                type="button"
                onClick={() => setComparisonPeriod("session")}
                disabled={!sessionMetricsReady}
                className={[
                  "rounded-lg px-3 py-2 transition",
                  comparisonPeriod === "session" && sessionMetricsReady
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "text-slate-400 hover:text-slate-200",
                  !sessionMetricsReady ? "cursor-not-allowed opacity-40" : "",
                ].join(" ")}
              >
                Поточна сесія
              </button>
            </div>
            {comparisonScope.byPolicy.length ? (
              <PolicyComparisonChart policies={comparisonScope.byPolicy} />
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                Для вибраного періоду ще немає інцидентів.
              </p>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}
