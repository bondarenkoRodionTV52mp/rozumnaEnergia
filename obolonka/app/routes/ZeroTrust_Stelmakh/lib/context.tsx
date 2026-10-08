import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, type User } from "./api";
import type { BiometricCollector } from "./biometrics";
import { ztPath } from "./config";

export interface ZtContextValue {
  user: User | null;
  setUser: (u: User | null) => void;
  /** Екземпляр збирача; null під час SSR та до монтування. */
  collector: BiometricCollector | null;
  /** Кількість натискань у поточній сесії (для тренувальної зони). */
  liveKeystrokes: number;
  completeLogin: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
}

export const ZtContext = createContext<ZtContextValue | null>(null);

export function useZt(): ZtContextValue {
  const ctx = useContext(ZtContext);
  if (!ctx) throw new Error("useZt() поза модулем ZeroTrust_Stelmakh");
  return ctx;
}

/**
 * Для сторінок, що потребують входу: без токена — на сторінку входу,
 * з токеном — підвантажує профіль, якщо його ще немає.
 */
export function useRequireUser(): User | null {
  const { user, setUser } = useZt();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!api.getToken()) {
      navigate(ztPath("login"), { replace: true });
      return;
    }
    if (user) {
      setChecked(true);
      return;
    }
    api
      .me()
      .then((u) => {
        setUser(u);
        setChecked(true);
      })
      .catch(() => {
        api.setToken(null);
        navigate(ztPath("login"), { replace: true });
      });
  }, [user]);

  return checked ? user : null;
}
