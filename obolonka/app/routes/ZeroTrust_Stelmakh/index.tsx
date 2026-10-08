import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { ShieldCheck, LogOut, Home } from "lucide-react";
import { api, AUTH_EXPIRED_EVENT, type User } from "./lib/api";
import { BiometricCollector } from "./lib/biometrics";
import { ZtContext, type ZtContextValue } from "./lib/context";
import { ztPath } from "./lib/config";
import { ROLE_LABELS } from "./lib/labels";

export function meta() {
  return [{ title: "Zero Trust контроль доступу | Smart Energy Lab" }];
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? "bg-white/15 text-white" : "text-indigo-100 hover:bg-white/10 hover:text-white"
  }`;

export default function ZeroTrustLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [collector, setCollector] = useState<BiometricCollector | null>(null);
  const [liveKeystrokes, setLiveKeystrokes] = useState(0);

  // Збирач створюється лише в браузері й зупиняється, коли користувач іде з модуля
  useEffect(() => {
    const c = new BiometricCollector();
    c.onCountUpdate = (counts) => setLiveKeystrokes(counts.keystroke);
    setCollector(c);
    return () => c.stop();
  }, []);

  // Після входу — безперервне надсилання біометрії (профіль формується під час роботи)
  useEffect(() => {
    if (!collector) return;
    if (user) {
      collector.onDataReady = (batch) => api.collectBiometric(batch.data_type, batch.data, batch.device_category);
      collector.start();
    } else {
      collector.onDataReady = null;
    }
  }, [user, collector]);

  // Токен протух — назад на вхід
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      collector?.stop();
      navigate(ztPath("login"), { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [collector]);

  const completeLogin = useCallback((token: string, u: User) => {
    api.setToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    collector?.stop();
    try {
      await api.logout();
    } catch {
      /* токен міг уже протухнути */
    }
    setUser(null);
    navigate(ztPath("login"));
  }, [collector]);

  const ctx: ZtContextValue = useMemo(
    () => ({ user, setUser, collector, liveKeystrokes, completeLogin, logout }),
    [user, collector, liveKeystrokes, completeLogin, logout],
  );

  return (
    <ZtContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <header className="bg-indigo-700 text-white shadow">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link to={ztPath()} className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5" />
              Zero Trust контроль доступу
            </Link>

            {user && (
              <nav className="flex flex-wrap gap-1">
                <NavLink to={ztPath("dashboard")} className={navClass}>
                  Панель
                </NavLink>
                <NavLink to={ztPath("operations")} className={navClass}>
                  Операції та делегування
                </NavLink>
                {user.role === "SUPER_ADMIN" && (
                  <NavLink to={ztPath("admin")} className={navClass}>
                    Адміністрування
                  </NavLink>
                )}
              </nav>
            )}

            <div className="ml-auto flex items-center gap-3 text-sm">
              {user && (
                <>
                  <span className="text-indigo-100">
                    {user.username} · {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1 hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4" /> Вийти
                  </button>
                </>
              )}
              <Link to="/" className="inline-flex items-center gap-1 text-indigo-100 hover:text-white" title="На головну оболонки">
                <Home className="h-4 w-4" /> Головна
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Магістерська дисертація студента групи ТВ-52мп Стельмаха Дмитра Юрійовича
          <br />
          «Розробка та впровадження моделі багаторівневого контролю доступу в Smart Energy Lab на основі принципів Zero Trust»
        </footer>
      </div>
    </ZtContext.Provider>
  );
}
