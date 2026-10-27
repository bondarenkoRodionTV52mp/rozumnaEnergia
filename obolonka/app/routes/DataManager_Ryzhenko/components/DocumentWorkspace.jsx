import { useCallback, useEffect, useRef, useState } from "react";
import {
  DocumentSessionExpiredError,
  getDocumentAccessToken,
  loginDocumentApi,
  logoutDocumentApi,
  subscribeToDocumentSessionExpired,
} from "../api/documentAuth";
import {
  createDocumentData,
  deleteDocumentData,
  getDocumentData,
  updateDocumentData,
} from "../api/documentApi";
import { getDocumentProfile } from "../api/documentUsersApi";
import { ui } from "../styles/ui";
import DeleteModal from "./DeleteModal";
import DocumentAddModal from "./DocumentAddModal";
import DocumentEditModal from "./DocumentEditModal";
import DocumentFilters from "./DocumentFilters";
import DocumentProfile from "./DocumentProfile";
import DocumentTable from "./DocumentTable";
import DocumentUsersPanel from "./DocumentUsersPanel";
import ViewModal from "./ViewModal";

const actionButton = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50";
const initialQuery = () => ({ page: 1, pageSize: 10, filters: {} });

export default function DocumentWorkspace() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getDocumentAccessToken()));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileRevision, setProfileRevision] = useState(0);
  const [showUsers, setShowUsers] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [adding, setAdding] = useState(false);
  const mounted = useRef(false);
  const loginController = useRef(null);
  const deleting = useRef(false);
  const isAdmin = profile?.role === "admin" && profile.is_active !== false;

  const closeDialogs = useCallback(() => {
    setSelectedRow(null);
    setEditingRow(null);
    setDeletingRow(null);
    setAdding(false);
  }, []);

  const endSession = useCallback((message = "") => {
    loginController.current?.abort();
    logoutDocumentApi();
    setAuthenticated(false);
    setPassword("");
    setLoginLoading(false);
    setLoginError(message);
    setProfile(null);
    setProfileError("");
    setProfileLoading(false);
    setShowUsers(false);
    setRows([]);
    setMeta({});
    setError("");
    setMutationError("");
    setLoading(false);
    setQuery(initialQuery());
    closeDialogs();
  }, [closeDialogs]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loginController.current?.abort();
    };
  }, []);

  useEffect(() => subscribeToDocumentSessionExpired(() => {
    endSession(new DocumentSessionExpiredError().message);
  }), [endSession]);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      try {
        const result = await getDocumentProfile({ signal: controller.signal });
        if (controller.signal.aborted) return;
        if (result.is_active === false) {
          endSession("Ваш обліковий запис вимкнено. Зверніться до адміністратора.");
          return;
        }
        setProfile(result);
      } catch (err) {
        if (controller.signal.aborted || err instanceof DocumentSessionExpiredError) return;
        setProfile(null);
        setProfileError(err.message);
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [authenticated, profileRevision, endSession]);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    async function loadPage() {
      setLoading(true);
      setError("");
      setRows([]);
      setMeta({});
      try {
        const result = await getDocumentData({
          ...query.filters,
          page: query.page,
          page_size: query.pageSize,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        // Після видалення останнього запису повертаємося на доступну сторінку.
        if (result.data.length === 0 && query.page > 1) {
          const lastPage = Number.isInteger(result.meta.pages) && result.meta.pages > 0
            ? result.meta.pages : query.page - 1;
          setQuery((current) => ({ ...current, page: Math.max(1, Math.min(lastPage, query.page - 1)) }));
          return;
        }
        setRows(result.data);
        setMeta(result.meta);
      } catch (err) {
        if (controller.signal.aborted || err instanceof DocumentSessionExpiredError) return;
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPage();
    return () => controller.abort();
  }, [authenticated, query, revision]);

  async function handleLogin(event) {
    event.preventDefault();
    if (loginController.current && !loginController.current.signal.aborted) return;
    const controller = new AbortController();
    loginController.current = controller;
    setLoginLoading(true);
    setLoginError("");
    try {
      await loginDocumentApi(username.trim(), password, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      setPassword("");
      setAuthenticated(true);
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) setLoginError(err.message);
    } finally {
      if (loginController.current === controller) {
        loginController.current = null;
        if (mounted.current) setLoginLoading(false);
      }
    }
  }

  function applyFilters(filters) {
    closeDialogs();
    setMutationError("");
    setQuery((current) => ({ ...current, page: 1, filters }));
  }

  async function handleCreate(document) {
    await createDocumentData(document);
    if (!mounted.current) return;
    setAdding(false);
    setMutationError("");
    setRevision((value) => value + 1);
  }

  async function handleSave(changes) {
    const id = editingRow?.id ?? editingRow?._id;
    if (!id) throw new Error("Сервер не повернув ідентифікатор документа");
    await updateDocumentData(id, changes);
    if (!mounted.current) return;
    setEditingRow(null);
    setMutationError("");
    setRevision((value) => value + 1);
  }

  async function handleDelete(row) {
    if (deleting.current) return;
    deleting.current = true;
    setMutationError("");
    try {
      const id = row.id ?? row._id;
      if (!id) throw new Error("Сервер не повернув ідентифікатор документа");
      await deleteDocumentData(id);
      if (!mounted.current) return;
      setDeletingRow(null);
      setRevision((value) => value + 1);
    } catch (err) {
      if (!mounted.current || err instanceof DocumentSessionExpiredError) return;
      setDeletingRow(null);
      setMutationError(err.message);
    } finally {
      deleting.current = false;
    }
  }

  function handleCurrentUserUpdated(updatedUser) {
    if (updatedUser.is_active === false) {
      endSession("Ваш обліковий запис вимкнено. Зверніться до адміністратора.");
      return;
    }
    if (updatedUser.role !== profile?.role) {
      endSession("Вашу роль змінено. Увійдіть повторно, щоб застосувати нові права доступу.");
      return;
    }
    // До повторної перевірки /auth/me адміністративні дії недоступні.
    setProfile(null);
    setShowUsers(false);
    setProfileRevision((value) => value + 1);
  }

  return (
    <main className={ui.layout.section}>
      <div className={ui.layout.contentPanel}>
        <div className={ui.misc.topRow}>
          <div>
            <h2 className={ui.text.sectionTitle}>Область відображення даних</h2>
            <p className={ui.text.muted}>Документи SmartEnergy: серверні фільтри та завантаження по сторінках.</p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {authenticated && !showUsers && (
            <button type="button" onClick={() => setAdding(true)} className={actionButton}>+ Додати документ</button>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className={ui.text.infoText}>Поточний режим: <span className={ui.text.infoStrong}>Документоорієнтовані дані</span></p>
            {authenticated && <button type="button" onClick={() => endSession()} className={actionButton}>Завершити сесію</button>}
          </div>
        </div>

        {!authenticated ? (
          <div className="mx-auto my-6 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Авторизація Document API</h3>
            <p className="mb-5 text-sm text-slate-500">Увійдіть, щоб отримати доступ до документоорієнтованих даних SmartEnergy.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="document-login-username" className="mb-1 block text-sm font-medium">Логін</label>
                <input id="document-login-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required disabled={loginLoading} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label htmlFor="document-login-password" className="mb-1 block text-sm font-medium">Пароль</label>
                <input id="document-login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loginLoading} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              {loginError && <p role="alert" className="text-sm text-red-600">{loginError}</p>}
              <button type="submit" disabled={loginLoading} className={`${actionButton} w-full`}>{loginLoading ? "Виконується вхід..." : "Увійти"}</button>
            </form>
          </div>
        ) : (
          <>
            <DocumentProfile profile={profile} loading={profileLoading} error={profileError} isAdmin={isAdmin} onRetry={() => setProfileRevision((value) => value + 1)} onManageUsers={() => { closeDialogs(); setShowUsers(true); }} />
            {showUsers && isAdmin ? (
              <DocumentUsersPanel currentUser={profile} onClose={() => setShowUsers(false)} onCurrentUserUpdated={handleCurrentUserUpdated} />
            ) : (
              <>
                <DocumentFilters filters={query.filters} onApply={applyFilters} onReset={() => applyFilters({})} />
                {mutationError && <p role="alert" className="my-3 text-sm text-red-600">{mutationError}</p>}
                {error && (
                  <div role="alert" className="my-3 text-sm text-red-600">
                    {error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="underline">Повторити завантаження</button>
                  </div>
                )}
                {!error && <DocumentTable rows={rows} meta={meta} page={query.page} pageSize={query.pageSize} loading={loading} onPageChange={(page) => setQuery((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setQuery((current) => ({ ...current, page: 1, pageSize }))} onView={setSelectedRow} onEdit={setEditingRow} onDelete={setDeletingRow} />}
              </>
            )}
            <ViewModal row={selectedRow} onClose={() => setSelectedRow(null)} />
            {adding && <DocumentAddModal onClose={() => setAdding(false)} onSave={handleCreate} />}
            {editingRow && <DocumentEditModal row={editingRow} onClose={() => setEditingRow(null)} onSave={handleSave} />}
            {deletingRow && <DeleteModal row={deletingRow} onClose={() => { if (!deleting.current) setDeletingRow(null); }} onConfirm={handleDelete} />}
          </>
        )}
      </div>
    </main>
  );
}
