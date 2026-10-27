import { API_CONFIG } from "./config";
import {
  DocumentSessionExpiredError,
  expireDocumentSession,
  getDocumentAccessToken,
} from "./documentAuth";

export class DocumentApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "DocumentApiError";
    this.status = status;
    this.details = details;
  }
}

function checkRequestContext(token, signal) {
  signal?.throwIfAborted();
  if (token !== getDocumentAccessToken()) {
    throw new DocumentSessionExpiredError();
  }
}

// Спільний клієнт для документів, профілю та адміністрування користувачів.
export async function documentRequest(path, options = {}) {
  const token = getDocumentAccessToken();

  if (!token) {
    throw new Error("Спочатку необхідно авторизуватися в Document API");
  }

  options.signal?.throwIfAborted();
  const response = await fetch(`${API_CONFIG.document}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  checkRequestContext(token, options.signal);

  if (response.status === 401) {
    expireDocumentSession(token);
    const error = new DocumentSessionExpiredError();
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    let message = `Помилка Document API (${response.status})`;
    let details;

    try {
      const errorData = await response.json();
      details = Array.isArray(errorData.detail)
        ? errorData.detail.map((item) => Object.fromEntries(
          ["loc", "msg", "type"].filter((field) => item[field] !== undefined)
            .map((field) => [field, item[field]]),
        ))
        : errorData.detail ?? errorData.message;
      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail.map((item) => {
          const field = item.loc?.filter((part) => part !== "body").join(".");
          return item.msg ? `${field ? `${field}: ` : ""}${item.msg}` : "";
        }).filter(Boolean).join("; ") || message;
      } else if (typeof errorData.message === "string") {
        message = errorData.message;
      }
    } catch {
      // Зберігаємо HTTP-статус і для відповідей без JSON.
    }

    checkRequestContext(token, options.signal);
    throw new DocumentApiError(message, response.status, details);
  }

  const result = await response.json();
  checkRequestContext(token, options.signal);

  return result;
}

export function documentPageParams(page = 1, pageSize = 10) {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Номер сторінки має бути додатним цілим числом");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error("Кількість записів на сторінці має бути від 1 до 500");
  }
  return new URLSearchParams({ page: String(page), page_size: String(pageSize) });
}

export function documentPageResult(result, message) {
  if (!Array.isArray(result?.data)) throw new Error(message);
  return {
    data: result.data,
    meta: result.meta && typeof result.meta === "object" && !Array.isArray(result.meta)
      ? result.meta
      : {},
  };
}
