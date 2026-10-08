import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Mail } from "lucide-react";
import { api } from "../lib/api";
import { ztPath } from "../lib/config";
import { Alert, AuthCard, Button, Field } from "../components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.requestPasswordReset(email);
    } catch {
      /* однакова відповідь, щоб не розкривати, чи існує акаунт */
    } finally {
      setSent(true);
      setEmail("");
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Відновлення пароля" icon={<Mail className="h-4 w-4 text-sky-600" />}>
      <p className="mb-3 text-sm text-slate-600">
        Введіть email, на який зареєстровано акаунт. Ми надішлемо посилання для скидання пароля.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {sent && <Alert tone="green">Якщо акаунт із такою адресою існує, ми надіслали посилання для скидання пароля.</Alert>}
        <Button type="submit" className="w-full" disabled={busy}>
          Надіслати посилання
        </Button>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-3 text-center text-sm">
        <Link to={ztPath("login")} className="text-indigo-700 hover:underline">
          Повернутися до входу
        </Link>
      </div>
    </AuthCard>
  );
}
