import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { MailCheck } from "lucide-react";
import { api } from "../lib/api";
import { ztPath } from "../lib/config";
import { Alert, AuthCard, Spinner } from "../components/ui";

/** Сторінка з посилання в листі: …/verify-email/:token */
export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) return setState("error");
    api
      .verifyEmail(token)
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <AuthCard title="Підтвердження email" icon={<MailCheck className="h-4 w-4 text-emerald-600" />}>
      {state === "loading" && <Spinner label="Перевірка посилання…" />}
      {state === "ok" && <Alert tone="green">Email успішно підтверджено. Тепер ви можете увійти.</Alert>}
      {state === "error" && <Alert tone="red">Помилка підтвердження. Посилання недійсне або застаріло.</Alert>}
      {state !== "loading" && (
        <div className="mt-4 text-center text-sm">
          <Link to={ztPath("login")} className="text-indigo-700 hover:underline">
            Перейти до входу
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
