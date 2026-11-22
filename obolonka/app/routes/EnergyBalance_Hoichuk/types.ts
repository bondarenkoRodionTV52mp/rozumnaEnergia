export type HistoryPeriod = "24h" | "7d" | "30d" | "all";
export type ForecastPeriod = "day" | "week" | "month";

export interface LiveRecord {
  timestamp: string;
  solar_power: number;
  wind_power: number;
  consumption: number;
  battery_level: number; // %
  grid_power: number; // > 0 — віддача в мережу, < 0 — споживання з мережі
  battery_action: number; // > 0 — заряджання, < 0 — розряджання
  curtailed_power: number;
  unserved_power: number;
}

export interface CurrentData extends LiveRecord {
  alert_threshold: number;
  alerts_enabled: boolean;
  low_battery: boolean;
}

export interface HistoryRecord {
  timestamp: string;
  solar_power: number;
  wind_power: number;
  consumption: number;
  battery_level: number;
}

export interface HistoryResponse {
  records: HistoryRecord[];
  total: number;
  page: number;
  per_page: number;
}

export interface AnalyticsStats {
  total_produced_kwh: number;
  total_consumed_kwh: number;
  renewable_coverage_percent: number;
  max_solar_w: number;
  max_wind_w: number;
  min_battery_percent: number;
}

export interface AnalyticsResponse {
  hourly_history: HistoryRecord[];
  daily_history: HistoryRecord[];
  stats: AnalyticsStats;
}

export interface ForecastRecord {
  timestamp: string;
  solar_power: number;
  wind_power: number;
  consumption: number;
}

export interface ForecastResponse {
  period: ForecastPeriod;
  records: ForecastRecord[];
}

export interface Accuracy {
  period: ForecastPeriod;
  /** Скільки останніх годин історії використано для перевірки */
  holdout_hours: number;
  solar_power: number;
  wind_power: number;
  consumption: number;
}

export interface Settings {
  battery_capacity: number;
  max_charge_rate: number;
  max_discharge_rate: number;
  algorithm: string;
  alerts_enabled: boolean;
  alert_threshold: number;
  grid_export_enabled: boolean;
  grid_import_enabled: boolean;
}
