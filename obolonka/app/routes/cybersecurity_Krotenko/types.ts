export type ServiceStatus = "online" | "degraded" | "offline" | "unchecked";
export type AdapterStatus = "ready" | "partial" | "stale" | "unavailable";
export type SignalLevel = "normal" | "warning" | "critical";
export type MetricsStatus = "ready" | "no_data";
export type PolicyStatus = "detected" | "partial" | "not_detected" | "no_data";

export interface CybersecurityBackend {
  status: string;
  coreProtectionStatus?: string;
  externalAvailabilityStatus?: string;
  integrationHealth: string;
  integrationMode: string;
  publicPort: number;
  apiBasePath: string;
  snapshotEndpoint: string;
  source: string;
  externalReadsEnabled: boolean;
  externalSources: number;
  generatedAt: string;
}

export interface ComponentSummary {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  unchecked: number;
  criticalOffline: number;
}

export interface GatewayRateLimit {
  enabled: boolean;
  ratePerSecond: number;
  burstCapacity: number;
  actionId: string;
}

export interface GatewayMetrics {
  uptimeSec?: number;
  totalRequests?: number;
  outcomes?: Record<string, number>;
  statusCodes?: Record<string, number>;
  actions?: Record<string, number>;
  availabilityPct?: number;
  trafficTimeline?: {
    bucketSec: number;
    windowSec: number;
    points: Array<{
      timestamp: string;
      requests: number;
      requestsPerSecond: number;
      forwarded: number;
      limited: number;
      blocked: number;
      errors: number;
    }>;
  };
}

export interface ServiceResult {
  service: {
    id: string;
    name: string;
    owner: string;
    port: number;
    protocol: string;
    url: string;
    method: string;
    timeoutMs: number;
    critical: boolean;
    description: string;
  };
  status: ServiceStatus;
  checkedAt: string;
  latencyMs: number | null;
  statusCode: number | null;
  detail: string;
  corsLimited: boolean;
  mitigation?: {
    blocking?: boolean;
    isolation?: boolean;
    circuitOpen?: boolean;
    rateLimitHardened?: boolean;
  };
  gatewayState?: {
    serviceId: string;
    blockedCount: number;
    isolation: {
      enabled: boolean;
      reason: string;
    };
    rateLimit: GatewayRateLimit;
    baselineRateLimit?: GatewayRateLimit;
    circuit: {
      mode: string;
      failureCount?: number;
    };
    cache: {
      entries: number;
      ttlSec: number;
    };
    metrics?: GatewayMetrics;
  } | null;
}

export interface AdapterMetric {
  label: string;
  value: string | number | boolean | null;
  level: SignalLevel;
  unit?: string;
}

export interface AdapterSignal {
  level: SignalLevel;
  title: string;
  description: string;
}

export interface AdapterResult {
  source: {
    id: string;
    name: string;
    owner: string;
    component?: string;
    protocol?: string;
    port: number;
    endpoint: string;
    timeoutMs: number;
    description: string;
  };
  status: AdapterStatus;
  checkedAt: string;
  latencyMs: number | null;
  statusCode: number | null;
  metrics: AdapterMetric[];
  signals: AdapterSignal[];
  rawPreview: unknown;
}

export interface MetricsSummary {
  policies: number;
  detectedByPolicies: number;
  selectedPolicy?: string;
  availabilityPct?: number | null;
  mttdMin?: number | null;
  mttrMin?: number | null;
  avgAvailabilityPct: number | null;
  avgMttdMin: number | null;
  avgMttrMin: number | null;
  totalIncidents: number;
  totalActions: number;
}

export interface PolicyMetrics {
  policy: string;
  status?: PolicyStatus;
  detected?: boolean;
  availability_pct: number | null;
  total_downtime_hr: number | null;
  mean_mttd_min: number | null;
  mean_mttr_min: number | null;
  incidents_total: number;
  scenarios_total?: number;
  incidents_missed?: number;
  detection_rate_pct?: number;
  incidents_critical: number;
  incidents_high: number;
  incidents_medium: number;
  incidents_low: number;
  by_availability_attack: number;
  by_integrity_attack: number;
  by_outage: number;
}

export interface MetricsScope {
  status?: MetricsStatus;
  selectedPolicy?: string;
  startedAt?: string | null;
  summary: MetricsSummary;
  byPolicy: PolicyMetrics[];
}

export interface Incident {
  id: string;
  ruleId: string;
  severity: "critical" | "warning";
  status?: "active" | "resolved";
  title: string;
  description: string;
  affectedComponents: string[];
  serviceId?: string | null;
  source?: string | null;
  policies?: string[];
  incidentIds?: string[];
  evidence: string[];
  createdAt: string;
}

export interface DispatchAction {
  id: string;
  decisionId: string;
  mode: "applied" | "recommended" | "failed" | "unsupported";
  title: string;
  description: string;
  targetComponents: string[];
  serviceId?: string | null;
  reason: string;
  createdAt: string;
}

export interface TelemetryEvent {
  timestamp: string;
  source: string;
  component: string;
  key: string;
  value: string;
  unit: string;
  analyzed: boolean;
}

export interface QuarantinedTelemetryEvent {
  quarantinedAt: string;
  reasons: string[];
  timestamp: string;
  source: string;
  component: string;
  key: string;
  value: string;
  unit: string;
}

export interface CybersecuritySnapshot {
  generatedAt: string;
  backend: CybersecurityBackend;
  api: {
    generatedAt: string;
    component: {
      component_id: string;
      component_type: string;
      status: string;
      details: ComponentSummary;
      last_updated: string;
    };
    results: ServiceResult[];
  };
  readOnly: {
    generatedAt: string;
    summary: {
      total: number;
      ready: number;
      partial: number;
      stale: number;
      unavailable: number;
      warningSignals: number;
      criticalSignals: number;
    };
    adapters: AdapterResult[];
  };
  metrics: MetricsScope & {
    generatedAt: string;
    session?: MetricsScope;
  };
  telemetry?: {
    generatedAt: string;
    status: "streaming" | "waiting";
    mode: "near-real-time";
    topic: string;
    analyzedKeys: string[];
    summary: {
      visible: number;
      analyzed: number;
      collectedOnly: number;
      quarantined: number;
    };
    events: TelemetryEvent[];
    quarantine: {
      status: "active" | "history" | "empty";
      visible: number;
      active?: number;
      activeWindowSec?: number;
      lastQuarantinedAt?: string | null;
      events: QuarantinedTelemetryEvent[];
    };
  };
  incidents: {
    generatedAt: string;
    summary: {
      totalIncidents: number;
      activeIncidents?: number;
      recentlyResolved?: number;
      criticalIncidents: number;
      warningIncidents: number;
    };
    incidents: Incident[];
    recentlyResolved?: Incident[];
  };
  actions: {
    generatedAt: string;
    summary: {
      total: number;
      applied: number;
      recommended: number;
      failed: number;
      unsupported: number;
    };
    actions: DispatchAction[];
  };
}

export interface CybersecurityDashboardData {
  snapshot: CybersecuritySnapshot | null;
  error: string | null;
  fetchedAt: string;
}
