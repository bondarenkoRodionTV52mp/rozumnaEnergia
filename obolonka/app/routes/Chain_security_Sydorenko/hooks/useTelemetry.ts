import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TelemetryData } from "../types/telemetry";
import { API_BASE_URL } from "../../../../consts.ts"

interface UseTelemetryResult {
  data: TelemetryData[];
  latest: TelemetryData | null;
  anomalyLog: AnomalyLogEntry[];
  hasManipulation: boolean;
  attackCount: number;
  isLoading: boolean;
  error: string | null;
  source: "mock" | "api";
  verified: boolean;
  ledgerHash: string | null;
  dbHash: string | null;
  fabricHash: string | null;
  tamperedTimestamp: string | null;
  securityLog: SecurityLogEntry[];
  isIsolating: boolean;
  attackStartTime: number | null;
  acknowledgeAnomaly: (timestamp: string, parameter: string) => void;
  isolateCompromisedData: (timestamp: string) => Promise<boolean>;
  resetIntegrity: () => Promise<void>;
}

export interface AnomalyLogEntry {
  id: string;
  timestamp: string;
  parameter: string;
  value: string;
  recommendation: string;
  graphSnapshot: TelemetryData[];
  acknowledged: boolean;
}

export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  message: string;
}

const SAMPLE_SIZE = 48;
const BASE_URL = `${API_BASE_URL}:6009`;
const API_URL = `${BASE_URL}/api/telemetry`;
const VERIFY_URL = `${BASE_URL}/api/verify`;
const VERIFY_RESET_URL = `${BASE_URL}/api/verify/reset`;
const ISOLATE_URL = `${BASE_URL}/api/telemetry/isolate`;
const ANOMALY_LOG_STORAGE_KEY = "anomalyLog";
const SECURITY_LOG_STORAGE_KEY = "smartenergy-security-log";

const TELEMETRY_POLL_INTERVAL_MS = 3000;
const TELEMETRY_TIMEOUT_MS = 3000;

const VERIFY_POLL_INTERVAL_MS = 8000;
const VERIFY_TIMEOUT_MS = 15000;

function loadSecurityLog(): SecurityLogEntry[] {
  try {
    const storedLog = window.localStorage.getItem(SECURITY_LOG_STORAGE_KEY);
    if (!storedLog) {
      return [];
    }

    const parsed: unknown = JSON.parse(storedLog);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is SecurityLogEntry =>
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        typeof entry.id === "string" &&
        "timestamp" in entry &&
        typeof entry.timestamp === "string" &&
        "message" in entry &&
        typeof entry.message === "string",
    );
  } catch {
    return [];
  }
}

function loadAnomalyLog(): AnomalyLogEntry[] {
  try {
    const storedLog = window.localStorage.getItem(ANOMALY_LOG_STORAGE_KEY);
    if (!storedLog) {
      return [];
    }

    const parsed: unknown = JSON.parse(storedLog);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const anomalies = parsed
      .filter(
        (entry): entry is AnomalyLogEntry =>
          typeof entry === "object" &&
          entry !== null &&
          "id" in entry &&
          typeof entry.id === "string" &&
          "timestamp" in entry &&
          typeof entry.timestamp === "string" &&
          "parameter" in entry &&
          typeof entry.parameter === "string" &&
          "value" in entry &&
          typeof entry.value === "string" &&
          "recommendation" in entry &&
          typeof entry.recommendation === "string",
      )
      .map((entry) => ({
        ...entry,
        graphSnapshot: Array.isArray(entry.graphSnapshot)
          ? entry.graphSnapshot
          : [],
        acknowledged: entry.acknowledged === true,
      }));
    const unacknowledged = anomalies.filter((entry) => !entry.acknowledged);
    const acknowledged = anomalies.filter((entry) => entry.acknowledged);

    return [...unacknowledged, ...acknowledged.slice(0, 50)];
  } catch {
    return [];
  }
}

function getAnomalyRecommendations(
  point: TelemetryData,
  telemetrySnapshot: TelemetryData[],
): AnomalyLogEntry[] {
  const anomalies: AnomalyLogEntry[] = [];
  const addAnomaly = (
    parameter: string,
    value: string,
    condition: string,
    recommendation: string,
  ) => {
    anomalies.push({
      id: `${point.id}-${condition}`,
      timestamp: point.timestamp,
      parameter,
      value,
      recommendation,
      graphSnapshot: telemetrySnapshot.map((record) => ({ ...record })),
      acknowledged: false,
    });
  };

  if (point.voltage > 15.0) {
    addAnomaly(
      "Напруга",
      `${point.voltage.toFixed(2)} V`,
      "voltage-high",
      "Рекомендація: Негайно знизити генерацію на вузлі та перевірити регулятори напруги й охолодження трансформатора.",
    );
  } else if (point.voltage < 10.0) {
    addAnomaly(
      "Напруга",
      `${point.voltage.toFixed(2)} V`,
      "voltage-low",
      "Рекомендація: Перевірити цілісність лінії та з'єднань, локалізувати просідання й за потреби підключити резервне живлення.",
    );
  }

  if (point.current > 18.0) {
    addAnomaly(
      "Струм",
      `${point.current.toFixed(3)} A`,
      "current-high",
      "Рекомендація: Перевірити перевантаження фідера й захисні реле; за потреби перерозподілити навантаження або відключити некритичні споживачі.",
    );
  } else if (point.current < -0.5) {
    addAnomaly(
      "Струм",
      `${point.current.toFixed(3)} A`,
      "current-reverse",
      "Рекомендація: Перевірити напрямок зворотного потоку, полярність датчика струму та налаштування релейного захисту.",
    );
  }

  if (point.power > 250.0) {
    addAnomaly(
      "Потужність",
      `${point.power.toFixed(2)} W`,
      "power-surge",
      "Рекомендація: Перевірити стрибок навантаження та стан перетворювача; за потреби перемкнути частину споживачів на резервний фідер.",
    );
  } else if (point.power < -10.0) {
    addAnomaly(
      "Потужність",
      `${point.power.toFixed(2)} W`,
      "power-reverse",
      "Рекомендація: Перевірити зворотний потік активної потужності, схему підключення вимірювача та напрямок роботи інвертора.",
    );
  }

  return anomalies;
}

function buildMockSeries(): TelemetryData[] {
  const now = Date.now();
  let energyAccumulator = 0;

  return Array.from({ length: SAMPLE_SIZE }, (_, index) => {
    const id = index + 1;
    const timestamp = new Date(
      now - (SAMPLE_SIZE - index - 1) * 2000,
    ).toISOString();

    const isAttack = (index + 1) % 15 === 0;
    const voltage = isAttack
      ? Number((14.6 + Math.random() * 0.9).toFixed(2))
      : Number((11.6 + Math.random() * 1.8).toFixed(2));

    const current =
      Math.random() < 0.1
        ? Number((-0.001 + Math.random() * 0.0005).toFixed(3))
        : Number((1 + Math.random() * 14).toFixed(3));

    const power = Number((voltage * current).toFixed(2));
    energyAccumulator += power * (2 / 3600);

    return {
      id,
      timestamp,
      voltage,
      current,
      power,
      energy: Number(energyAccumulator.toFixed(4)),
      is_manipulated: isAttack,
    };
  });
}

export function useTelemetry(): UseTelemetryResult {
  const fallbackData = useMemo(() => buildMockSeries(), []);
  const [data, setData] = useState<TelemetryData[]>(fallbackData);
  const [anomalyLog, setAnomalyLog] =
    useState<AnomalyLogEntry[]>(loadAnomalyLog);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"mock" | "api">("mock");
  const [verified, setVerified] = useState<boolean>(true);
  const [ledgerHash, setLedgerHash] = useState<string | null>(null);
  const [dbHash, setDbHash] = useState<string | null>(null);
  const [fabricHash, setFabricHash] = useState<string | null>(null);
  const [tamperedTimestamp, setTamperedTimestamp] = useState<string | null>(
    null,
  );
  const [securityLog, setSecurityLog] =
    useState<SecurityLogEntry[]>(loadSecurityLog);
  const securityLogRef = useRef(securityLog);
  const [isIsolating, setIsIsolating] = useState(false);
  const [attackStartTime, setAttackStartTime] = useState<number | null>(null);

  const acknowledgeAnomaly = useCallback(
    (timestamp: string, parameter: string) => {
      setAnomalyLog((existingAnomalies) => {
        const updatedAnomalies = existingAnomalies.map((anomaly) =>
          anomaly.timestamp === timestamp && anomaly.parameter === parameter
            ? { ...anomaly, acknowledged: true }
            : anomaly,
        );
        const unacknowledged = updatedAnomalies.filter(
          (anomaly) => !anomaly.acknowledged,
        );
        const acknowledged = updatedAnomalies.filter(
          (anomaly) => anomaly.acknowledged,
        );

        return [...unacknowledged, ...acknowledged.slice(0, 50)];
      });
    },
    [],
  );

  const frozenRef = useRef(false);
  const isMountedRef = useRef(true);
  const verifyTimeoutRef = useRef<number | undefined>(undefined);
  const telemetryTimeoutRef = useRef<number | undefined>(undefined);

  const fetchVerification = useCallback(() => {
    if (frozenRef.current || !isMountedRef.current) {
      return;
    }

    axios
      .get<{
        verified: boolean;
        hash?: string;
        db_hash?: string;
        fabric_hash?: string;
        tampered_timestamp?: string;
      }>(VERIFY_URL, {
        timeout: VERIFY_TIMEOUT_MS,
      })
      .then((response) => {
        if (!isMountedRef.current) {
          return;
        }

        setVerified(response.data.verified);
        setLedgerHash(response.data.hash ?? null);

        if (!response.data.verified) {
          setDbHash(response.data.db_hash ?? null);
          setFabricHash(response.data.fabric_hash ?? null);
          setTamperedTimestamp(response.data.tampered_timestamp ?? null);
          setAttackStartTime((startTime) => startTime ?? Date.now());
          frozenRef.current = true;
          if (telemetryTimeoutRef.current !== undefined) {
            window.clearTimeout(telemetryTimeoutRef.current);
          }
          return;
        }

        setDbHash(null);
        setFabricHash(null);
        setTamperedTimestamp(null);
      })
      .catch(() => {
      })
      .finally(() => {
        if (isMountedRef.current && !frozenRef.current) {
          verifyTimeoutRef.current = window.setTimeout(
            fetchVerification,
            VERIFY_POLL_INTERVAL_MS,
          );
        }
      });
  }, []);

  const fetchTelemetry = useCallback(() => {
    if (frozenRef.current || !isMountedRef.current) {
      return;
    }

    axios
      .get<TelemetryData[]>(API_URL, { timeout: TELEMETRY_TIMEOUT_MS })
      .then((response) => {
        if (!isMountedRef.current) {
          return;
        }

        if (Array.isArray(response.data) && response.data.length > 0) {
          setData(response.data);
          setSource("api");
          setError(null);
        } else {
          setData(fallbackData);
          setSource("mock");
          setError("API returned an empty payload; using mock telemetry.");
        }
      })
      .catch(() => {
        if (!isMountedRef.current) {
          return;
        }
        setData(fallbackData);
        setSource("mock");
        setError("API unavailable; using local mock telemetry.");
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        if (isMountedRef.current && !frozenRef.current) {
          telemetryTimeoutRef.current = window.setTimeout(
            fetchTelemetry,
            TELEMETRY_POLL_INTERVAL_MS,
          );
        }
      });
  }, [fallbackData]);

  const resetIntegrity = useCallback(async () => {
    try {
      await axios.post(VERIFY_RESET_URL, null, { timeout: VERIFY_TIMEOUT_MS });
    } catch {
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    frozenRef.current = false;
    setVerified(true);
    setLedgerHash(null);
    setDbHash(null);
    setFabricHash(null);
    setTamperedTimestamp(null);
    fetchVerification();
    fetchTelemetry();
  }, [fetchVerification, fetchTelemetry]);

  const isolateCompromisedData = useCallback(
    async (timestamp: string): Promise<boolean> => {
      if (!timestamp || isIsolating) {
        return false;
      }

      setIsIsolating(true);
      const recoveryTimeSeconds =
        attackStartTime === null
          ? "0.0"
          : ((Date.now() - attackStartTime) / 1000).toFixed(1);

      try {
        await axios.delete(ISOLATE_URL, {
          params: { timestamp },
          timeout: VERIFY_TIMEOUT_MS,
        });

        const auditEntry: SecurityLogEntry = {
          id: `${Date.now()}-${timestamp}`,
          timestamp,
          message: `Кіберінцидент: Ізольовано підробку даних. Час відновлення (MTTR): ${recoveryTimeSeconds} сек.`,
        };
        const updatedSecurityLog = [auditEntry, ...securityLogRef.current];
        securityLogRef.current = updatedSecurityLog;
        setSecurityLog(updatedSecurityLog);
        try {
          window.localStorage.setItem(
            SECURITY_LOG_STORAGE_KEY,
            JSON.stringify(updatedSecurityLog),
          );
        } catch {
        }

        frozenRef.current = false;
        fetchTelemetry();
        fetchVerification();
        setAttackStartTime(null);
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `Не вдалося ізолювати запис: ${cause.message}`
            : "Не вдалося ізолювати скомпрометований запис.",
        );
        return false;
      } finally {
        setIsIsolating(false);
      }
    },
    [attackStartTime, fetchTelemetry, fetchVerification, isIsolating],
  );

  useEffect(() => {
    if (source !== "api" || data.length === 0) {
      return;
    }

    const telemetrySnapshot = data.map((record) => ({ ...record }));
    const detectedAnomalies = [...data]
      .reverse()
      .flatMap((point) => getAnomalyRecommendations(point, telemetrySnapshot));

    if (detectedAnomalies.length === 0) {
      return;
    }

    setAnomalyLog((prevLog) => {
      let updatedLog = prevLog;

      for (const newAnomaly of detectedAnomalies) {
        const exists = updatedLog.some(
          (item) =>
            item.timestamp === newAnomaly.timestamp &&
            item.parameter === newAnomaly.parameter,
        );
        if (exists) {
          continue;
        }

        const unacknowledged = updatedLog.filter((item) => !item.acknowledged);
        const acknowledged = updatedLog.filter((item) => item.acknowledged);

        unacknowledged.unshift(newAnomaly);
        const limitedAcknowledged = acknowledged.slice(0, 50);
        updatedLog = [...unacknowledged, ...limitedAcknowledged];
      }

      return updatedLog;
    });
  }, [data, source]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ANOMALY_LOG_STORAGE_KEY,
        JSON.stringify(anomalyLog),
      );
    } catch {
    }
  }, [anomalyLog]);

  useEffect(() => {
    securityLogRef.current = securityLog;
    try {
      window.localStorage.setItem(
        SECURITY_LOG_STORAGE_KEY,
        JSON.stringify(securityLog),
      );
    } catch {
    }
  }, [securityLog]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchVerification();
    fetchTelemetry();

    return () => {
      isMountedRef.current = false;
      if (verifyTimeoutRef.current !== undefined) {
        window.clearTimeout(verifyTimeoutRef.current);
      }
      if (telemetryTimeoutRef.current !== undefined) {
        window.clearTimeout(telemetryTimeoutRef.current);
      }
    };
  }, [fetchVerification, fetchTelemetry]);

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const attackCount = data.filter((point) => point.is_manipulated).length;
  const hasManipulation = attackCount > 0;

  return {
    data,
    latest,
    anomalyLog,
    hasManipulation,
    attackCount,
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
    attackStartTime,
    acknowledgeAnomaly,
    isolateCompromisedData,
    resetIntegrity,
  };
}
