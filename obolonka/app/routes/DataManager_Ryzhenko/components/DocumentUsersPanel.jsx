import { useEffect, useRef, useState } from "react";
import { DocumentSessionExpiredError } from "../api/documentAuth";
import {
  createDocumentUser,
  getDocumentUsers,
  updateDocumentUser,
} from "../api/documentUsersApi";
import DocumentUserForm from "./DocumentUserForm";

const pageSize = 10;
const roleLabels = {
  sensor: "Сенсор",
  researcher: "Дослідник",
  admin: "Адміністратор",
};
const secondaryButton = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 disabled:opacity-50";

export default function DocumentUsersPanel({ currentUser, onClose, onCurrentUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(null);
  const [mutationPending, setMutationPending] = useState(false);
  const active = useRef(true);
  const mutationLock = useRef(false);
  const isAdmin = currentUser?.role === "admin" && currentUser?.is_active !== false;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let current = true;
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const result = await getDocumentUsers({ page, page_size: pageSize, role, signal: controller.signal });
        if (!current) return;
        if (result.data.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setUsers(result.data);
        setMeta(result.meta ?? {});
      } catch (err) {
        if (!current || err.name === "AbortError" || err instanceof DocumentSessionExpiredError) return;
        setUsers([]);
        setMeta({});
        setError(err.status === 403
          ? "Немає дозволу на перегляд користувачів."
          : err.message || "Не вдалося завантажити користувачів.");
      } finally {
        if (current) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      current = false;
      controller.abort();
    };
  }, [isAdmin, page, role, revision]);

  async function handleSave(changes) {
    if (!isAdmin) throw new Error("Керування користувачами доступне лише адміністратору.");
    if (mutationLock.current) return;
    mutationLock.current = true;
    setMutationPending(true);
    setMessage("");
    try {
      const saved = form.user
        ? await updateDocumentUser(form.user.username, changes)
        : await createDocumentUser(changes);
      if (!active.current) return;
      if (form.user?.username === currentUser.username) {
        await onCurrentUserUpdated?.({
          ...currentUser,
          full_name: saved?.full_name ?? changes.full_name,
          email: saved?.email ?? changes.email,
          role: saved?.role ?? changes.role,
          is_active: saved?.is_active ?? changes.is_active ?? currentUser.is_active,
        });
        if (!active.current) return;
      }
      setMessage(form.user ? "Зміни користувача збережено." : "Користувача створено.");
      setForm(null);
      setRevision((value) => value + 1);
    } finally {
      mutationLock.current = false;
      if (active.current) setMutationPending(false);
    }
  }

  if (!isAdmin) return null;

  const total = Number.isInteger(meta.total) && meta.total >= 0 ? meta.total : null;
  const pages = Number.isInteger(meta.pages) && meta.pages >= 0
    ? Math.max(1, meta.pages)
    : total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const hasNext = pages !== null ? page < pages : users.length === pageSize;

  return (
    <section
      aria-labelledby="document-users-title"
      className="mb-5 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 id="document-users-title" className="text-lg font-semibold text-slate-900">
          Керування користувачами
        </h3>
        <button type="button" onClick={onClose} disabled={mutationPending} className={secondaryButton}>
          Закрити користувачів
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor="document-users-role-filter" className="mb-1 block text-sm font-medium">Фільтр за роллю</label>
          <select
            id="document-users-role-filter"
            value={role}
            disabled={mutationPending}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Усі ролі</option>
            <option value="sensor">Сенсор (sensor)</option>
            <option value="researcher">Дослідник (researcher)</option>
            <option value="admin">Адміністратор (admin)</option>
          </select>
        </div>
        <button
          type="button"
          disabled={mutationPending}
          onClick={() => {
            setForm({ user: null });
            setMessage("");
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          + Створити користувача
        </button>
      </div>

      {form && (
        <DocumentUserForm
          key={form.user?.username ?? "create"}
          user={form.user}
          onSave={handleSave}
          onCancel={() => setForm(null)}
        />
      )}
      {message && <p role="status" className="mb-4 text-sm text-emerald-800">{message}</p>}
      {loading && <p role="status" className="mb-4 text-sm text-slate-500">Завантаження користувачів…</p>}
      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => setRevision((value) => value + 1)} className={secondaryButton}>
            Повторити завантаження користувачів
          </button>
        </div>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-3">Логін</th>
                <th scope="col" className="px-3 py-3">Ім’я та email</th>
                <th scope="col" className="px-3 py-3">Роль</th>
                <th scope="col" className="px-3 py-3">Стан</th>
                <th scope="col" className="px-3 py-3">Дії</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium">
                    {user.username}{user.username === currentUser.username ? " (ви)" : ""}
                  </td>
                  <td className="px-3 py-3">
                    <p>{user.full_name || "—"}</p>
                    <p className="text-slate-500">{user.email || "—"}</p>
                  </td>
                  <td className="px-3 py-3">{roleLabels[user.role] ?? user.role ?? "—"}</td>
                  <td className="px-3 py-3">
                    {typeof user.is_active === "boolean"
                      ? user.is_active ? "Активний" : "Неактивний"
                      : "Не визначено"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={mutationPending}
                      onClick={() => {
                        setForm({ user });
                        setMessage("");
                      }}
                      aria-label={`Редагувати користувача ${user.username}`}
                      className={secondaryButton}
                    >
                      Редагувати
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-slate-500">Користувачів не знайдено.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!error && (
        <nav aria-label="Сторінки користувачів" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={loading || mutationPending || page === 1} onClick={() => setPage((value) => value - 1)} className={secondaryButton}>
            Попередня сторінка користувачів
          </button>
          <p className="text-sm text-slate-600">
            Сторінка {page}{pages !== null ? ` із ${pages}` : ""}{total !== null ? ` · Усього: ${total}` : ""}
          </p>
          <button type="button" disabled={loading || mutationPending || !hasNext} onClick={() => setPage((value) => value + 1)} className={secondaryButton}>
            Наступна сторінка користувачів
          </button>
        </nav>
      )}
    </section>
  );
}
