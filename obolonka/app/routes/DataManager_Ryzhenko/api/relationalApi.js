import { API_CONFIG } from "./config";

const recordsPath = "/api/temp-control/records";

export class RelationalApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "RelationalApiError";
    this.status = status;
  }
}

function isSensorId(value) {
  return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
}

function timestamp(value) {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error("Укажіть дату й час у форматі ISO 8601 із часовим поясом");
  }
  const date = new Date(value);
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isFinite(date.getTime()) || month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new Error("Укажіть коректну дату й час");
  }
  return date.toISOString();
}

function record(result) {
  if (!result || typeof result !== "object" || Array.isArray(result) ||
    !Number.isInteger(result.id) || !isSensorId(result.sensorId) ||
    result.parameter !== "TEMPERATURE" ||
    typeof result.value !== "number" || !Number.isFinite(result.value)) {
    throw new RelationalApiError("API повернув некоректний запис вимірювання");
  }
  try {
    timestamp(result.timestamp);
  } catch {
    throw new RelationalApiError("API повернув некоректний час вимірювання");
  }
  return result;
}

async function request(path, { signal, body } = {}) {
  signal?.throwIfAborted();
  if (!API_CONFIG.relational) {
    throw new RelationalApiError("Налаштуйте адресу VITE_RELATIONAL_API_URL для реляційного API");
  }
  let response;
  try {
    response = await fetch(`${API_CONFIG.relational.replace(/\/+$/, "")}${path}`, {
      method: body === undefined ? "GET" : "POST",
      signal,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    signal?.throwIfAborted();
    if (error.name === "AbortError") throw error;
    throw new RelationalApiError("Не вдалося з’єднатися з реляційним API. Перевірте адресу та доступність сервера.");
  }
  signal?.throwIfAborted();
  if (!response.ok) {
    let message = response.status === 400
      ? "API відхилив параметри запиту або дані вимірювання"
      : response.status === 404
        ? "Вимірювання не знайдено"
        : `Помилка реляційного API (${response.status})`;
    try {
      const error = await response.json();
      if (typeof error.detail === "string") message = error.detail;
      else if (typeof error.message === "string") message = error.message;
    } catch {
    }
    signal?.throwIfAborted();
    throw new RelationalApiError(message, response.status);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    signal?.throwIfAborted();
    throw new RelationalApiError("API повернув відповідь у некоректному форматі JSON", response.status);
  }
  signal?.throwIfAborted();
  return result;
}

export async function getTemperatureRecords({ after, before, signal } = {}) {
  const start = timestamp(after);
  const end = timestamp(before);
  if (new Date(start) >= new Date(end)) {
    throw new Error("Початок діапазону має бути раніше за його завершення");
  }
  const params = new URLSearchParams({ after: start, before: end });
  const result = await request(`${recordsPath}?${params}`, { signal });
  if (!Array.isArray(result)) {
    throw new RelationalApiError("API повернув некоректний список вимірювань");
  }
  return result.map(record);
}

export async function getLatestTemperatureRecord(sensorId, { signal } = {}) {
  if (!isSensorId(sensorId)) throw new Error("ID датчика має бути цілим числом у межах int32");
  const params = new URLSearchParams({ sensorId: String(sensorId) });
  return record(await request(`${recordsPath}/latest?${params}`, { signal }));
}

export async function createTemperatureRecord(data, { signal } = {}) {
  if (!data || !isSensorId(data.sensorId)) throw new Error("ID датчика має бути цілим числом у межах int32");
  if (data.parameter !== "TEMPERATURE") throw new Error("Підтримується лише параметр TEMPERATURE");
  if (typeof data.value !== "number" || !Number.isFinite(data.value)) {
    throw new Error("Значення вимірювання має бути скінченним числом");
  }
  const payload = {
    sensorId: data.sensorId,
    parameter: "TEMPERATURE",
    value: data.value,
    timestamp: timestamp(data.timestamp),
  };
  const result = await request(recordsPath, { signal, body: payload });
  return record(result?.record);
}
