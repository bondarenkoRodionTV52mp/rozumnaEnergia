import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { ztPath } from "../lib/config";
import { Alert, AuthCard, Button, Field, errorText } from "../components/ui";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.password2) {
      setError("Паролі не співпадають");
      return;
    }
    setBusy(true);
    try {
      await api.register(form.username, form.email, form.password);
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Реєстрація" icon={<UserPlus className="h-4 w-4 text-emerald-600" />}>
        <Alert tone="green">
          Обліковий запис створено з роллю «Студент». Під час першого входу на ваш email надійде код підтвердження.
        </Alert>
        <Button className="mt-4 w-full" onClick={() => navigate(ztPath("login"))}>
          Перейти до входу
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Реєстрація" icon={<UserPlus className="h-4 w-4 text-emerald-600" />}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Логін" value={form.username} onChange={set("username")} required minLength={3} autoComplete="username" />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
        <Field
          label="Пароль"
          type="password"
          value={form.password}
          onChange={set("password")}
          required
          minLength={8}
          autoComplete="new-password"
          hint="Мінімум 8 символів, велика літера, цифра, спецсимвол"
        />
        <Field
          label="Підтвердження пароля"
          type="password"
          value={form.password2}
          onChange={set("password2")}
          required
          autoComplete="new-password"
        />
        {error && <Alert tone="red">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={busy}>
          Зареєструватися
        </Button>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-3 text-center text-sm">
        <Link to={ztPath("login")} className="text-indigo-700 hover:underline">
          Вже маєте акаунт? Увійти
        </Link>
      </div>
    </AuthCard>
  );
}
