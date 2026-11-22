import type { LiveRecord } from "./types";

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("uk-UA", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Дата й час із секундами — для «живих» показників. */
export function formatDateTimeSeconds(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
}

export function formatShortTime(iso: string, withDate = false): string {
  return new Date(iso).toLocaleString("uk-UA", {
    ...(withDate ? { day: "2-digit", month: "2-digit" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    ...(withDate ? {} : { second: "2-digit" }),
  });
}

export function describeBatteryAction(power: number): string {
  if (power > 0.5) return `Заряджання акумулятора: ${formatNumber(power, 0)} Вт`;
  if (power < -0.5) return `Розряджання акумулятора: ${formatNumber(-power, 0)} Вт`;
  return "Акумулятор у режимі очікування";
}

export function describeGrid(record: LiveRecord): string {
  if (record.curtailed_power > 0.5) return `Надлишок ${formatNumber(record.curtailed_power, 0)} Вт обмежено (експорт вимкнено)`;
  if (record.unserved_power > 0.5) return `Дефіцит ${formatNumber(record.unserved_power, 0)} Вт не покрито (імпорт вимкнено)`;
  if (record.grid_power > 0.5) return `Віддача в мережу: ${formatNumber(record.grid_power, 0)} Вт`;
  if (record.grid_power < -0.5) return `Споживання з мережі: ${formatNumber(-record.grid_power, 0)} Вт`;
  return "Обмін з мережею відсутній";
}
