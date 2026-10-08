import type {
  CybersecurityDashboardData,
  CybersecuritySnapshot,
} from "./types";

const SNAPSHOT_TIMEOUT_MS = 8_000;
const DEFAULT_CYBERSECURITY_API_URL = "http://cybersecurity-api:8000/api";

/**
 * Завантажує агрегований snapshot на серверній стороні React Router.
 * Використовує внутрішню адресу сервісу з Docker Compose. За потреби адресу
 * можна перевизначити через CYBERSECURITY_API_URL; у браузер вона не передається.
 */
export async function loadCybersecurityDashboard(): Promise<CybersecurityDashboardData> {
  const fetchedAt = new Date().toISOString();
  const apiBaseUrl = (
    process.env.CYBERSECURITY_API_URL ?? DEFAULT_CYBERSECURITY_API_URL
  ).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${apiBaseUrl}/cybersecurity/snapshot?incident_limit=20&action_limit=20`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        snapshot: null,
        error: `Cybersecurity API повернув HTTP ${response.status}.`,
        fetchedAt,
      };
    }

    return {
      snapshot: (await response.json()) as CybersecuritySnapshot,
      error: null,
      fetchedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Cybersecurity API не відповів протягом 8 секунд."
        : "Не вдалося підключитися до Cybersecurity API.";

    return { snapshot: null, error: message, fetchedAt };
  } finally {
    clearTimeout(timeout);
  }
}
