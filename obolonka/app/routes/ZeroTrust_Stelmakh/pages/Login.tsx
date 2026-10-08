import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { LogIn, ShieldAlert } from "lucide-react";
import { api, type LoginResponse } from "../lib/api";
import { useZt } from "../lib/context";
import { ztPath } from "../lib/config";
import { MFA_REASONS, mfaReasonTone, fmtPercent } from "../lib/labels";
import { Alert, AuthCard, Button, Field, errorText } from "../components/ui";

interface MfaState {
  token: string;
  method: string | null;
  reason: string | null;
  trustScore: number | null;
}

export default function Login() {
  const { collector, completeLogin } = useZt();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfa, setMfa] = useState<MfaState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Уже увійшли — одразу на панель
  useEffect(() => {
    if (api.getToken()) navigate(ztPath("dashboard"), { replace: true });
  }, []);

  const finish = (res: LoginResponse) => {
    completeLogin(res.access_token, res.user);
    // Перший вхід: після email-коду обов'язкове налаштування TOTP
    navigate(ztPath(res.user.totp_enabled ? "dashboard" : "dashboard?setupTotp=1"));
  };

  const toMfa = (res: LoginResponse) => {
    setMfa({
      token: res.mfa_token ?? "",
      method: res.mfa_method,
      reason: res.mfa_reason,
      trustScore: res.trust_score,
    });
    setCode("");
  };

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Динаміка введення пароля йде разом із запитом входу
      const biometric = collector?.takeLoginData() ?? null;
      const res = await api.login(username, password, biometric);
      if (res.requires_mfa) toMfa(res);
      else finish(res);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const onMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await api.verifyMfa(mfa.token, code.trim());
      if (res.requires_mfa) {
        // Наступний рівень (email-код після TOTP при біометричній аномалії)
        toMfa(res);
        setInfo("Потрібна додаткова верифікація. Перевірте email.");
      } else {
        finish(res);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (mfa) {
    const isEmail = mfa.method === "EMAIL_CODE";
    return (
      <AuthCard title="Додаткова верифікація" icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}>
        <div className="space-y-4">
          {mfa.reason && (
            <Alert tone={mfaReasonTone(mfa.reason)}>
              <strong>Причина: </strong>
              {MFA_REASONS[mfa.reason] ?? mfa.reason}
              {mfa.trustScore !== null && mfa.reason.includes("biometric") && (
                <div className="mt-1 text-xs">Trust score: {fmtPercent(mfa.trustScore)}</div>
              )}
            </Alert>
          )}
          <p className="text-sm text-slate-600">
            {isEmail
              ? "Введіть 6-значний код, надісланий на вашу email-адресу."
              : "Введіть код із застосунку-автентифікатора або резервний код."}
          </p>
          <form onSubmit={onMfa} className="space-y-3">
            <Field
              label="Код"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              inputMode={isEmail ? "numeric" : "text"}
              maxLength={isEmail ? 6 : 9}
              placeholder="000000"
              className="text-center text-lg tracking-widest"
              autoComplete="one-time-code"
            />
            {info && <Alert tone="blue">{info}</Alert>}
            {error && <Alert tone="red">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={busy}>
              Підтвердити
            </Button>
          </form>
          <button className="text-sm text-indigo-700 hover:underline" onClick={() => setMfa(null)}>
            ← Повернутися до входу
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Вхід" icon={<LogIn className="h-4 w-4 text-indigo-600" />}>
      <form onSubmit={onLogin} className="space-y-3">
        <Field label="Логін" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        <Field
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => collector?.start()}
          required
          autoComplete="current-password"
        />
        {error && <Alert tone="red">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={busy}>
          Увійти
        </Button>
      </form>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
        <Link to={ztPath("register")} className="text-indigo-700 hover:underline">
          Зареєструватися
        </Link>
        <Link to={ztPath("forgot-password")} className="text-indigo-700 hover:underline">
          Забули пароль?
        </Link>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Система аналізує контекст входу та динаміку введення пароля. Залежно від ризику може знадобитися TOTP-код або код з
        email.
      </p>
    </AuthCard>
  );
}
