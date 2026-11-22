import axios from "axios";
import { ENERGY_API_URL } from "./local_consts";
import type {
  Accuracy,
  AnalyticsResponse,
  CurrentData,
  ForecastPeriod,
  ForecastResponse,
  HistoryPeriod,
  HistoryResponse,
  LiveRecord,
  Settings,
} from "./types";

const api = axios.create({ baseURL: ENERGY_API_URL, timeout: 30000 });

export const getCurrent = () => api.get<CurrentData>("/current").then((r) => r.data);

export const getLive = (limit = 60) =>
  api.get<{ records: LiveRecord[] }>("/live", { params: { limit } }).then((r) => r.data.records);

export const getHistory = (page: number, perPage: number, period: HistoryPeriod) =>
  api
    .get<HistoryResponse>("/history", { params: { page, per_page: perPage, period } })
    .then((r) => r.data);

export const getAnalytics = (period: HistoryPeriod) =>
  api.get<AnalyticsResponse>("/analytics", { params: { period } }).then((r) => r.data);

export const getForecast = (period: ForecastPeriod) =>
  api.get<ForecastResponse>("/forecast", { params: { period } }).then((r) => r.data);

export const getAccuracy = (period: ForecastPeriod) =>
  api.get<Accuracy>("/accuracy", { params: { period } }).then((r) => r.data);

export const getSettings = () => api.get<Settings>("/settings").then((r) => r.data);

export const saveSettings = (settings: Settings) =>
  api.post<Settings>("/settings", settings).then((r) => r.data);

/** Помилки валідації з бекенду: { error, details: { поле: повідомлення } } */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { details?: Record<string, string> } | undefined)?.details ?? {};
  }
  return {};
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Бекенд недоступний. Перевірте, що сервіс запущено.";
    const message = (error.response.data as { error?: string } | undefined)?.error;
    return message ?? `Помилка сервера (${error.response.status})`;
  }
  return "Невідома помилка";
}
