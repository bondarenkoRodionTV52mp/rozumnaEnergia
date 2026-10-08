import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { KeyRound } from "lucide-react";
import { api } from "../lib/api";
import { ztPath } from "../lib/config";
import { Alert, AuthCard, Button, Field, errorText } from "../components/ui";

/** Сторінка з посилання в листі: …/reset-password?token=… */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) return setError("Паролі не співпадають");
    if (!token) return setError("Невалідне посилання для скидання пароля");
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate(ztPath("login")), 3000);
    } catch (err) {
      setError(errorText(err) || "Помилка скидання пароля. Можливо, посилання застаріло.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Новий пароль" icon={<KeyRound className="h-4 w-4 text-amber-600" />}>
      {!token && <Alert tone="red">Посилання не містить токена скидання.</Alert>}
      <form onSubmit={onSubmit} className="mt-2 space-y-3">
        <Field
          label="Новий пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          hint="Мінімум 8 символів, велика літера, цифра, спецсимвол"
        />
        <Field
          label="Підтвердження пароля"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
          autoComplete="new-password"
        />
        {error && <Alert tone="red">{error}</Alert>}
        {done && <Alert tone="green">Пароль змінено. Зараз ви перейдете до входу.</Alert>}
        <Button type="submit" className="w-full" disabled={busy || done}>
          Змінити пароль
        </Button>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-3 text-center text-sm">
        <Link to={ztPath("login")} className="text-indigo-700 hover:underline">
          До входу
        </Link>
      </div>
    </AuthCard>
  );
}
