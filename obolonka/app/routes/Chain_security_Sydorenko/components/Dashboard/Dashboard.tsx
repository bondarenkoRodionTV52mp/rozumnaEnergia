import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Database,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { useTelemetry } from "../../hooks/useTelemetry";
import type { AnomalyLogEntry } from "../../hooks/useTelemetry";
import styles from "./Dashboard.module.scss";

function toClockLabel(iso: string): string {
  const normalizedIso = iso.endsWith("Z") ? iso : `${iso}Z`;
  const date = new Date(normalizedIso);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function Dashboard() {
  const [selectedAnomaly, setSelectedAnomaly] =
    useState<AnomalyLogEntry | null>(null);
  const {
    data,
    latest,
    anomalyLog,
    isLoading,
    error,
    source,
    verified,
    ledgerHash,
    dbHash,
    fabricHash,
    tamperedTimestamp,
    securityLog,
    isIsolating,
    isolateCompromisedData,
    acknowledgeAnomaly,
  } = useTelemetry();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const unacknowledgedCount = anomalyLog.filter(
    (anomaly) => !anomaly.acknowledged,
  ).length;

  const chartData = data.map((point) => ({
    ...point,
    timeLabel: toClockLabel(point.timestamp),
  }));

  const attackWindows = chartData.filter((point) => point.is_manipulated);
  const snapshotChartData = selectedAnomaly?.graphSnapshot.map((point) => ({
    ...point,
    timeLabel: toClockLabel(point.timestamp),
  }));
  const snapshotDataKey =
    selectedAnomaly?.parameter === "Струм"
      ? "current"
      : selectedAnomaly?.parameter === "Потужність"
        ? "power"
        : "voltage";
  const snapshotLineColor =
    snapshotDataKey === "current"
      ? "#1fd1a5"
      : snapshotDataKey === "power"
        ? "#ffc857"
        : "#5ab0ff";
  
  if (!isMounted) return <main className={styles.dashboard} />;

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Панель безпеки SmartEnergy</h1>
          <p className={styles.subtitle}>
            Моніторинг стійкості енергомережі на базі блокчейн-верифікації
          </p>
        </div>
        <span
          className={clsx(styles.badge, styles.alarmBadge, {
            [styles.alarmBadgePending]: unacknowledgedCount > 0,
            [styles.alarmBadgeCalm]: unacknowledgedCount === 0,
          })}
        >
          <ShieldAlert size={16} />
          Фізичні аномалії: {unacknowledgedCount}
        </span>
      </header>

      <section className={styles.statusRow}>
        <span
          className={clsx(styles.badge, {
            [styles.badgeLoading]: isLoading,
          })}
        >
          <Database size={16} />
          Джерело: {source.toUpperCase()}
        </span>
        {error && <span className={styles.badgeError}>{error}</span>}
      </section>

      {latest && (
        <section className={styles.metrics} aria-label="Поточні показники">
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>ПОТОЧНА НАПРУГА</p>
            <p className={styles.metricValue}>{latest.voltage.toFixed(2)} V</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>ПОТОЧНИЙ СТРУМ</p>
            <p className={styles.metricValue}>{latest.current.toFixed(3)} A</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>ПОТОЧНА ПОТУЖНІСТЬ</p>
            <p className={styles.metricValue}>{latest.power.toFixed(2)} W</p>
          </article>
          <article className={styles.metricCard}>
            <p className={styles.metricLabel}>НАКОПИЧЕНА ЕНЕРГІЯ</p>
            <p className={styles.metricValue}>{latest.energy.toFixed(4)} Wh</p>
          </article>
        </section>
      )}

      <section className={styles.workspaceGrid}>
        <div
          className={clsx(styles.chartColumn, {
            [styles.gridCompromised]: !verified,
          })}
        >
          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>Напруга та Струм</h2>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="telemetry-sync">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                    }}
                  />
                  <Legend />
                  {attackWindows.map((point) => (
                    <ReferenceArea
                      key={`attack-vc-${point.id}`}
                      x1={point.timeLabel}
                      x2={point.timeLabel}
                      stroke="#ff5d73"
                      strokeOpacity={0.95}
                      label={{
                        value: "FDIA",
                        fill: "#ff8b9a",
                        position: "insideTopRight",
                      }}
                    />
                  ))}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="voltage"
                    name="Voltage (V)"
                    stroke="#5ab0ff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="current"
                    name="Current (A)"
                    stroke="#1fd1a5"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={styles.panel}>
            <h2 className={styles.panelTitle}>Потужність та Енергія</h2>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="telemetry-sync">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                    }}
                  />
                  <Legend />
                  {attackWindows.map((point) => (
                    <ReferenceArea
                      key={`attack-pe-${point.id}`}
                      x1={point.timeLabel}
                      x2={point.timeLabel}
                      stroke="#ff5d73"
                      strokeOpacity={0.95}
                      label={{
                        value: "FDIA",
                        fill: "#ff8b9a",
                        position: "insideTopRight",
                      }}
                    />
                  ))}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="power"
                    name="Power (W)"
                    stroke="#ffc857"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="energy"
                    name="Energy (Wh)"
                    stroke="#ff5d73"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>

        <aside className={styles.operationsColumn}>
          {verified ? (
            <section className={styles.integrityOk}>
              <ShieldCheck size={20} />
              <div className={styles.integrityBody}>
                <strong>Цілісність підтверджено</strong>
                <span>Дані відповідають криптографічному реєстру.</span>
                {ledgerHash && (
                  <dl className={styles.ledgerMeta}>
                    <div className={styles.ledgerMetaRow}>
                      <dt>Network</dt>
                      <dd>Hyperledger Fabric</dd>
                    </div>
                    <div className={styles.ledgerMetaRow}>
                      <dt>Chaincode</dt>
                      <dd>smartenergy_cc</dd>
                    </div>
                    <div className={styles.ledgerMetaRow}>
                      <dt>TxID</dt>
                      <dd className={styles.txId}>{ledgerHash}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </section>
          ) : (
            <section className={styles.integrityCritical}>
              <ShieldX size={22} />
              <div>
                <strong>КРИТИЧНО: Порушення цілісності даних</strong>
                <p>
                  Виявлено підробку телеметрії
                  {tamperedTimestamp &&
                    ` (час запису: ${toClockLabel(tamperedTimestamp)})`}
                  .
                </p>
                {(dbHash || fabricHash) && (
                  <div className={styles.hashEvidence}>
                    {dbHash && (
                      <div className={styles.hashEvidenceItem}>
                        <span className={styles.hashEvidenceLabel}>
                          Локальний хеш (Скомпрометовано)
                        </span>
                        <code className={styles.dbHash}>{dbHash}</code>
                      </div>
                    )}
                    {fabricHash && (
                      <div className={styles.hashEvidenceItem}>
                        <span className={styles.hashEvidenceLabel}>
                          Еталонний хеш (Блокчейн)
                        </span>
                        <code className={styles.fabricHash}>{fabricHash}</code>
                      </div>
                    )}
                  </div>
                )}
                {tamperedTimestamp && (
                  <button
                    className={styles.isolateButton}
                    type="button"
                    onClick={() =>
                      void isolateCompromisedData(tamperedTimestamp)
                    }
                    disabled={isIsolating}
                  >
                    <AlertTriangle size={16} aria-hidden="true" />
                    {isIsolating
                      ? "Ізоляція запису..."
                      : "Ізолювати скомпрометовані дані"}
                  </button>
                )}
              </div>
            </section>
          )}

          <section
            className={styles.anomalyPanel}
            aria-labelledby="anomaly-log-title"
          >
            <h2 className={styles.panelTitle} id="anomaly-log-title">
              Журнал фізичних аномалій
            </h2>
            {anomalyLog.length > 0 ? (
              <ul className={styles.anomalyList}>
                {anomalyLog.map((anomaly) => (
                  <li
                    className={clsx(styles.anomalyEntry, {
                      [styles.anomalyAcknowledged]: anomaly.acknowledged,
                    })}
                    key={anomaly.id}
                  >
                    <button
                      className={styles.anomalyButton}
                      type="button"
                      onClick={() => setSelectedAnomaly(anomaly)}
                      aria-label={`Переглянути знімок: ${anomaly.parameter}, ${toClockLabel(anomaly.timestamp)}`}
                    >
                      <div className={styles.anomalyHeader}>
                        <strong>{anomaly.parameter}</strong>
                        <span className={styles.anomalyValue}>
                          {anomaly.value}
                        </span>
                        <time dateTime={anomaly.timestamp}>
                          {toClockLabel(anomaly.timestamp)}
                        </time>
                      </div>
                      <p className={styles.anomalyRecommendation}>
                        <Info size={15} aria-hidden="true" />
                        <span>{anomaly.recommendation}</span>
                      </p>
                    </button>
                    {!anomaly.acknowledged && (
                      <button
                        className={styles.acknowledgeButton}
                        type="button"
                        onClick={() =>
                          acknowledgeAnomaly(
                            anomaly.timestamp,
                            anomaly.parameter,
                          )
                        }
                      >
                        Квитувати
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.anomalyEmpty}>
                Фізичних аномалій у поточному вікні телеметрії не виявлено.
              </p>
            )}
          </section>

          {securityLog.length > 0 && (
            <section
              className={styles.securityLogPanel}
              aria-labelledby="security-log-title"
            >
              <h2 className={styles.panelTitle} id="security-log-title">
                Журнал кіберінцидентів
              </h2>
              <ul className={styles.securityLogList}>
                {securityLog.map((entry) => (
                  <li className={styles.securityLogEntry} key={entry.id}>
                    <time dateTime={entry.timestamp}>
                      {toClockLabel(entry.timestamp)}
                    </time>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </section>

      {selectedAnomaly && snapshotChartData && (
        <div
          className={styles.snapshotOverlay}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAnomaly(null);
            }
          }}
        >
          <section
            className={styles.snapshotModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-title"
          >
            <header className={styles.snapshotHeader}>
              <div>
                <p className={styles.snapshotEyebrow}>Знімок інциденту</p>
                <h2 className={styles.panelTitle} id="snapshot-title">
                  {selectedAnomaly.parameter} · {selectedAnomaly.value}
                </h2>
                <time
                  className={styles.snapshotTimestamp}
                  dateTime={selectedAnomaly.timestamp}
                >
                  {toClockLabel(selectedAnomaly.timestamp)}
                </time>
              </div>
              <button
                className={styles.snapshotClose}
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                aria-label="Закрити знімок інциденту"
              >
                Закрити
              </button>
            </header>

            <p className={styles.snapshotRecommendation}>
              {selectedAnomaly.recommendation}
            </p>

            <div className={styles.snapshotChartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshotChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                    }}
                  />
                  <ReferenceLine
                    x={toClockLabel(selectedAnomaly.timestamp)}
                    stroke="#fb7185"
                    strokeWidth={2}
                    label={{
                      value: "Подія",
                      fill: "#fda4af",
                      position: "insideTopRight",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={snapshotDataKey}
                    name={selectedAnomaly.parameter}
                    stroke={snapshotLineColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className={styles.snapshotFootnote}>
              Незмінний знімок телеметрії, збережений під час фіксації аномалії.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
