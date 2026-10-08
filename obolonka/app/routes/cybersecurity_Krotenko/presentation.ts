const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Kyiv",
});

export const numberFormatter = new Intl.NumberFormat("uk-UA", {
  maximumFractionDigits: 2,
});

const statusLabels: Record<string, string> = {
  active: "Активний",
  applied: "Застосовано",
  available: "Доступний",
  blocked: "Заблоковано",
  connected: "Підключено",
  critical: "Критичний",
  degraded: "Деградація",
  detected: "Виявлено",
  disconnected: "Немає зв'язку",
  down: "Не працює",
  failed: "Помилка",
  high: "Високий",
  healthy: "Штатний",
  history: "Історія",
  isolated: "Ізольовано",
  low: "Низький",
  manual: "Ручний",
  medium: "Середній",
  offline: "Недоступний",
  online: "Працює",
  partial: "Частково",
  no_data: "Немає даних",
  not_configured: "Не налаштовано",
  not_detected: "Не виявлено",
  read_only: "Лише читання",
  ready: "Готовий",
  rate_limited: "Трафік обмежено",
  recommended: "Сформовано",
  resolved: "Завершено",
  shadow: "Тіньовий",
  stale: "Застарілі дані",
  streaming: "Надходять дані",
  unchecked: "Не перевірено",
  unavailable: "Недоступний",
  unsupported: "Не підтримується",
  unknown: "Невідомий",
  waiting: "Очікування даних",
  warning: "Попередження",
};

const statusStyles = {
  positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  critical: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  neutral: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const positiveStatuses = new Set([
  "available",
  "healthy",
  "online",
  "ready",
  "connected",
  "success",
  "applied",
  "streaming",
]);
const warningStatuses = new Set(["degraded", "detected", "partial", "warning", "recommended", "medium"]);
const criticalStatuses = new Set([
  "offline",
  "unavailable",
  "disconnected",
  "down",
  "critical",
  "failed",
  "unsupported",
  "high",
]);

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

export function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function statusPresentation(status: string) {
  const normalized = status.toLowerCase();

  if (positiveStatuses.has(normalized)) {
    return { label: statusLabel(normalized), className: statusStyles.positive };
  }
  if (warningStatuses.has(normalized)) {
    return { label: statusLabel(normalized), className: statusStyles.warning };
  }
  if (criticalStatuses.has(normalized)) {
    return { label: statusLabel(normalized), className: statusStyles.critical };
  }
  return { label: statusLabel(normalized), className: statusStyles.neutral };
}

export function protectionStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "healthy") {
    return { label: "Захист працює", tone: "positive" as const };
  }
  if (normalized === "degraded") {
    return { label: "Активне стримування", tone: "warning" as const };
  }
  if (["disconnected", "down", "failed", "unavailable"].includes(normalized)) {
    return { label: "Захист недоступний", tone: "critical" as const };
  }
  return { label: "Стан не визначено", tone: "neutral" as const };
}

export function integrationModeLabel(mode: string) {
  const labels: Record<string, string> = {
    active: "Активний захист",
    shadow: "Спостереження",
    "dry-run": "Перевірка без виконання",
  };

  return labels[mode] ?? statusLabel(mode);
}

export function optionalNumber(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined
    ? "—"
    : `${numberFormatter.format(value)}${suffix}`;
}

export function quarantineReason(reason: string) {
  const labels: Record<string, string> = {
    abrupt_value_change: "різкий стрибок",
    invalid_numeric_value: "некоректне число",
    low_current: "понижений струм",
    outside_physical_bounds: "вихід за фізичні межі",
  };

  return labels[reason] ?? reason;
}
