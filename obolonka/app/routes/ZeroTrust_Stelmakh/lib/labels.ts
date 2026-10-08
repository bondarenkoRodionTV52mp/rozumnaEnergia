// Людськочитні підписи для кодів, які повертає бекенд

export const MFA_REASONS: Record<string, string> = {
  suspicious_context: "Виявлено незвичний контекст входу: нова IP-адреса, геолокація або пристрій.",
  unknown_context: "Типовий контекст входу ще не сформовано. Потрібна верифікація.",
  new_ip_address: "Вхід з нової IP-адреси.",
  new_location: "Вхід з нової географічної локації.",
  new_device: "Вхід з нового пристрою.",
  unusual_time: "Вхід у незвичний час.",
  biometric_anomaly: "Виявлено аномалію пасивної біометрії. Ваша поведінка при вході відрізняється від типової.",
  biometric_anomaly_after_totp: "Після TOTP виявлено аномалію поведінки. Потрібна додаткова верифікація.",
  first_login: "Перший вхід у систему. Підтвердьте email кодом, після чого налаштуйте TOTP.",
  totp_setup_required: "Для безпеки облікового запису необхідно налаштувати TOTP.",
  no_biometric_profile: "Поведінковий профіль ще не сформовано.",
  no_biometric_data: "Не отримано біометричні дані при вході.",
  no_matching_biometric_type: "Відсутній профіль для цього типу пристрою.",
  no_profile_for_device: "Профіль для цього типу пристрою ще не сформовано.",
  verification_required: "Потрібна додаткова верифікація.",
};

export type Tone = "green" | "red" | "amber" | "blue" | "slate" | "violet";

export function mfaReasonTone(reason: string): Tone {
  if (reason.includes("biometric_anomaly")) return "red";
  if (["suspicious_context", "unknown_context", "new_ip_address", "new_location", "new_device", "unusual_time"].includes(reason))
    return "amber";
  if (["first_login", "totp_setup_required"].includes(reason)) return "blue";
  return "slate";
}

export const EVENT_LABELS: Record<string, { text: string; tone: Tone }> = {
  LOGIN_SUCCESS: { text: "Вхід", tone: "green" },
  LOGIN_FAILED: { text: "Невдалий вхід", tone: "red" },
  LOGOUT: { text: "Вихід", tone: "slate" },
  MFA_TRIGGERED: { text: "Запит MFA", tone: "amber" },
  MFA_SUCCESS: { text: "MFA успішно", tone: "green" },
  MFA_FAILED: { text: "MFA невдало", tone: "red" },
  ANOMALY_DETECTED: { text: "Аномалія", tone: "red" },
  BIOMETRIC_ANOMALY: { text: "Біометрична аномалія", tone: "red" },
  PASSWORD_RESET_REQUESTED: { text: "Запит скидання пароля", tone: "amber" },
  PASSWORD_RESET_COMPLETED: { text: "Пароль змінено", tone: "green" },
  EMAIL_VERIFIED: { text: "Email підтверджено", tone: "green" },
  ACCOUNT_LOCKED: { text: "Акаунт заблоковано", tone: "red" },
  ACCOUNT_UNLOCKED: { text: "Акаунт розблоковано", tone: "green" },
  SESSION_EXPIRED: { text: "Сесія завершилась", tone: "slate" },
  TRUST_SCORE_LOW: { text: "Низький trust score", tone: "red" },
  CONTEXT_SUSPICIOUS: { text: "Підозрілий контекст", tone: "amber" },
  CONTEXT_SAFE: { text: "Контекст типовий", tone: "green" },
  TOTP_REQUIRED: { text: "Запит TOTP", tone: "amber" },
  EMAIL_CODE_SENT: { text: "Надіслано email-код", tone: "blue" },
  EMAIL_CODE_VERIFIED: { text: "Email-код підтверджено", tone: "green" },
  EMAIL_CODE_FAILED: { text: "Хибний email-код", tone: "red" },
  OPERATION_EXECUTED: { text: "Операцію виконано", tone: "green" },
  OPERATION_DENIED: { text: "Операцію відхилено", tone: "red" },
  REAUTH_REQUIRED: { text: "Потрібна реаутентифікація", tone: "amber" },
  TRUST_TOKEN_ISSUED: { text: "Видано токен", tone: "violet" },
  TRUST_TOKEN_USED: { text: "Використано токен", tone: "violet" },
  TRUST_TOKEN_REVOKED: { text: "Токен відкликано", tone: "slate" },
  TRUST_TOKEN_EXPIRED: { text: "Токен прострочено", tone: "slate" },
  ROLE_CHANGED: { text: "Змінено роль", tone: "violet" },
};

export const ROLES = ["STUDENT", "STAFF", "SENIOR_STAFF", "SUPER_ADMIN"] as const;

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Студент",
  STAFF: "Співробітник",
  SENIOR_STAFF: "Старший співробітник",
  SUPER_ADMIN: "Суперадміністратор",
};

export const OP_TYPES: Record<string, { label: string; tone: Tone; threshold: number; own: string; delegated: string }> = {
  TYPE_A: { label: "A · Базові", tone: "green", threshold: 0.3, own: "STUDENT", delegated: "STUDENT" },
  TYPE_B: { label: "B · Просунуті", tone: "blue", threshold: 0.5, own: "STAFF", delegated: "STAFF" },
  TYPE_C: { label: "C · Критичні", tone: "amber", threshold: 0.7, own: "SENIOR_STAFF", delegated: "STAFF" },
  TYPE_D: { label: "D · Адміністративні", tone: "red", threshold: 0.85, own: "SUPER_ADMIN", delegated: "SENIOR_STAFF" },
};

export const DECISION_REASONS: Record<string, string> = {
  insufficient_role: "Недостатня роль для самостійного виконання. Потрібен токен делегування від старшої ролі.",
  insufficient_role_for_delegation: "Навіть із токеном ваша роль нижча за мінімальну для делегування цієї операції.",
  invalid_user_role: "Невідома роль користувача.",
  token_exhausted: "Токен делегування вже використано максимальну кількість разів.",
  token_expired: "Термін дії токена минув.",
  token_revoked: "Токен відкликано.",
  token_not_found: "Токен не знайдено.",
  token_wrong_operation: "Токен видано на іншу операцію.",
  token_wrong_recipient: "Токен видано іншому користувачу.",
  operation_not_found: "Операцію не знайдено.",
  operation_disabled: "Операція вимкнена в довіднику.",
  invalid_operation_type: "Некоректний тип операції в довіднику.",
  trust_below_threshold: "Trust score сесії нижчий за поріг цієї операції.",
};

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).toLocaleString("uk-UA") : "—";

export const fmtPercent = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;
