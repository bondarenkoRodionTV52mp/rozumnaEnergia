import { useEffect } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { ztPath } from "../lib/config";
import { Spinner } from "../components/ui";

/** Вхідна точка модуля: з токеном — на панель, без — на вхід. */
export default function Entry() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(ztPath(api.getToken() ? "dashboard" : "login"), { replace: true });
  }, []);
  return <Spinner label="Завантаження…" />;
}
