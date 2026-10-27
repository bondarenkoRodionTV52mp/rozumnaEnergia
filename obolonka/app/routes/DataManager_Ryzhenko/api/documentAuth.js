
import { API_CONFIG } from "./config";

const BASE_URL = API_CONFIG.document;

const TOKEN_KEY = "smartenergy_document_access_token";

// React Router also imports this module on the server. Tokens stay in the browser.
function browserSessionStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}
const sessionExpiredListeners = new Set();

export class DocumentSessionExpiredError extends Error {
  constructor() {
    super("Сесія недійсна або термін дії токена завершився. Увійдіть повторно.");
    this.name = "DocumentSessionExpiredError";
  }
}

export function subscribeToDocumentSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function expireDocumentSession(requestToken) {
  // Запізнілий 401 попередньої сесії не повинен завершувати нову.
  if (!requestToken || requestToken !== getDocumentAccessToken()) return;

  logoutDocumentApi();
  sessionExpiredListeners.forEach((listener) => listener());
}

export async function loginDocumentApi(username, password, { signal } = {}) {
  const storage = browserSessionStorage();
  if (!storage) throw new Error("Авторизація доступна лише у браузері.");
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Неправильний логін або пароль"
        : "Помилка авторизації Document API"
    );
  }

  const result = await response.json();
  signal?.throwIfAborted();

  if (!result.data?.access_token) {
    throw new Error("Сервер не повернув токен доступу");
  }

  storage.setItem(TOKEN_KEY, result.data.access_token);

  return {
    username: result.data.username,
    role: result.data.role,
  };
}

export function getDocumentAccessToken() {
  return browserSessionStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function logoutDocumentApi() {
  browserSessionStorage()?.removeItem(TOKEN_KEY);
}
