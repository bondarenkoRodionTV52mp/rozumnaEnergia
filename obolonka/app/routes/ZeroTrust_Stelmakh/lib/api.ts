import { ZT_API_URL } from "./config";

// Оболонка — спільний origin для всіх модулів, тому ключ має власний префікс,
// щоб не перетинатися з токенами інших учасників.
const TOKEN_KEY = "zt_stelmakh_access_token";

export const AUTH_EXPIRED_EVENT = "zt-stelmakh:auth-expired";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const isBrowser = () => typeof window !== "undefined";

function readToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  if (!isBrowser()) return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* сховище недоступне — токен житиме лише до перезавантаження */
  }
}

// ---------- Типи відповідей бекенду ----------

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_verified: boolean;
  totp_enabled: boolean;
}

export interface LoginResponse {
  access_token: string;
  requires_mfa: boolean;
  mfa_token: string | null;
  mfa_reason: string | null;
  mfa_method: string | null;
  trust_score: number | null;
  user: User;
}

export interface TrustScore {
  current_score: number;
  threshold: number;
  status: "normal" | "warning" | "critical" | string;
  note?: string;
  note_message?: string;
}

export interface DeviceStatus {
  trained?: boolean;
  keystroke_samples?: number;
  mouse_samples?: number;
  touch_samples?: number;
  sensor_samples?: number;
  keystroke_trained?: boolean;
  mouse_trained?: boolean;
  touch_trained?: boolean;
}

export interface UserDashboard {
  user: User;
  current_trust_score: number;
  trust_score_threshold: number;
  trust_score_history: { timestamp: string; score: number }[];
  recent_events: { event_type: string; timestamp: string }[];
  active_sessions: { ip_address: string | null; trust_score: number; last_activity: string }[];
  profile_status: {
    min_required?: number;
    device_status?: { desktop?: DeviceStatus; mobile?: DeviceStatus };
  };
}

export interface Operation {
  id: string;
  operation_name: string;
  operation_type: string;
  description: string | null;
  is_active: boolean;
}

export interface ExecuteResult {
  execution_id: string;
  operation_name: string | null;
  operation_type: string | null;
  status: "ALLOWED" | "DENIED" | "REAUTH_REQUIRED" | string;
  allowed: boolean;
  reason: string | null;
  role_path: string | null;
  requires_reauth: boolean;
  reauth_method: string | null;
  details: Record<string, unknown>;
}

export interface TrustTokenInfo {
  id: string;
  operation_id: string;
  operation_name: string | null;
  operation_type: string | null;
  issued_by_user_id: string;
  issued_to_user_id: string;
  created_at: string;
  valid_until: string;
  is_revoked: boolean;
  revoked_at: string | null;
  revoke_reason: string | null;
  max_uses: number;
  usage_count: number;
  notes: string | null;
}

export interface IssuedToken extends Omit<TrustTokenInfo, "is_revoked" | "revoked_at" | "revoke_reason" | "usage_count"> {
  raw_token: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  totp_enabled: boolean;
  created_at: string | null;
}

export interface SecurityEventItem {
  id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
}

// ---------- Клієнт ----------

class ZtApi {
  getToken() {
    return readToken();
  }

  setToken(token: string | null) {
    writeToken(token);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    const token = readToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(`${ZT_API_URL}${endpoint}`, { ...options, headers });
    } catch {
      throw new ApiError("Сервер контролю доступу недоступний", 0);
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      /* порожня відповідь */
    }

    if (!response.ok) {
      const detail = data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg).join("; ")
            : `Помилка запиту (${response.status})`;

      if (response.status === 401 && token) {
        writeToken(null);
        if (isBrowser()) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
      throw new ApiError(message, response.status);
    }
    return data as T;
  }

  // Автентифікація
  register(username: string, email: string, password: string) {
    return this.request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  login(username: string, password: string, biometricData: Record<string, unknown> | null) {
    const body: Record<string, unknown> = { username, password };
    if (biometricData) body.biometric_data = biometricData;
    return this.request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) });
  }

  verifyMfa(mfaToken: string, code: string) {
    return this.request<LoginResponse>("/auth/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    });
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      writeToken(null);
    }
  }

  me() {
    return this.request<User>("/auth/me");
  }

  setupTotp() {
    return this.request<{ secret: string; qr_code: string; backup_codes: string[] }>("/auth/setup-totp", {
      method: "POST",
    });
  }

  confirmTotp(code: string, backupCodes: string[]) {
    return this.request("/auth/confirm-totp", {
      method: "POST",
      body: JSON.stringify({ code, backup_codes: backupCodes }),
    });
  }

  disableTotp(code: string) {
    return this.request("/auth/disable-totp", {
      method: "POST",
      body: JSON.stringify({ code, backup_codes: [] }),
    });
  }

  requestPasswordReset(email: string) {
    return this.request("/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) });
  }

  resetPassword(token: string, newPassword: string) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  verifyEmail(token: string) {
    return this.request(`/auth/verify-email/${encodeURIComponent(token)}`);
  }

  // Біометрія
  collectBiometric(dataType: string, data: unknown[], deviceCategory: string) {
    return this.request("/biometric/collect", {
      method: "POST",
      body: JSON.stringify({ data_type: dataType, data, device_category: deviceCategory }),
    });
  }

  trustScore() {
    return this.request<TrustScore>("/biometric/trust-score");
  }

  // Панелі
  userDashboard() {
    return this.request<UserDashboard>("/dashboard/user");
  }

  adminDashboard() {
    return this.request<{
      total_users: number;
      active_sessions: number;
      events_today: number;
      anomalies_today: number;
      average_trust_score: number;
    }>("/dashboard/admin");
  }

  adminEvents(page = 1, pageSize = 30) {
    return this.request<{ events: SecurityEventItem[]; total: number }>(
      `/dashboard/admin/events?page=${page}&page_size=${pageSize}`,
    );
  }

  adminUsers() {
    return this.request<{ users: AdminUser[]; total: number }>("/dashboard/admin/users");
  }

  changeRole(userId: string, role: string) {
    return this.request(`/dashboard/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  // Операції та токени делегування
  operations() {
    return this.request<{ operations: Operation[]; total: number }>("/auth/operations");
  }

  executeOperation(operationId: string, trustToken?: string) {
    const body: Record<string, unknown> = { operation_id: operationId };
    if (trustToken) body.trust_token = trustToken;
    return this.request<ExecuteResult>("/auth/operations/execute", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  issueToken(payload: {
    recipient_id: string;
    operation_id: string;
    valid_for_minutes: number;
    max_uses: number;
    notes?: string;
  }) {
    return this.request<IssuedToken>("/auth/trust-tokens/issue", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  revokeToken(tokenId: string, reason?: string) {
    return this.request(`/auth/trust-tokens/${tokenId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || null }),
    });
  }

  myIssuedTokens() {
    return this.request<{ tokens: TrustTokenInfo[]; total: number }>(
      "/auth/trust-tokens/my-issued?include_invalid=true",
    );
  }

  tokensIssuedToMe() {
    return this.request<{ tokens: TrustTokenInfo[]; total: number }>(
      "/auth/trust-tokens/issued-to-me?include_invalid=true",
    );
  }
}

export const api = new ZtApi();
