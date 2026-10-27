import { useEffect, useRef, useState } from "react";
import { DocumentSessionExpiredError } from "../api/documentAuth";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function DocumentUserForm({ user, onSave, onCancel }) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "researcher");
  const [isActive, setIsActive] = useState(user ? user.is_active === true : true);
  const [isActiveChanged, setIsActiveChanged] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");

    const trimmedUsername = username.trim();
    if (!user && (trimmedUsername.length < 2 || trimmedUsername.length > 128)) {
      setError("Логін має містити від 2 до 128 символів.");
      return;
    }
    if (!user || password) {
      if (password.length < 8 || password.length > 256) {
        setError("Пароль має містити від 8 до 256 символів.");
        return;
      }
    }
    if (!["sensor", "researcher", "admin"].includes(role)) {
      setError("Оберіть роль користувача.");
      return;
    }

    const changes = {
      full_name: fullName.trim() || null,
      email: email.trim() || null,
      role,
      ...(!user || typeof user.is_active === "boolean" || isActiveChanged
        ? { is_active: isActive }
        : {}),
      ...(!user ? { username: trimmedUsername } : {}),
      ...(!user || password ? { password } : {}),
    };

    submitting.current = true;
    setSaving(true);
    try {
      await onSave(changes);
      if (active.current) setPassword("");
    } catch (err) {
      if (!active.current || err instanceof DocumentSessionExpiredError) return;
      setError(err.status === 403
        ? "Немає дозволу на керування користувачами."
        : err.message || "Не вдалося зберегти користувача.");
    } finally {
      submitting.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="document-user-form-title"
      className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <h4 id="document-user-form-title" className="mb-4 font-semibold text-slate-900">
        {user ? `Редагування користувача ${user.username}` : "Створення користувача"}
      </h4>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="document-user-username" className="mb-1 block text-sm font-medium">Логін</label>
          <input
            id="document-user-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={2}
            maxLength={128}
            disabled={Boolean(user)}
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="document-user-full-name" className="mb-1 block text-sm font-medium">Повне ім’я</label>
          <input
            id="document-user-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={256}
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="document-user-email" className="mb-1 block text-sm font-medium">Email</label>
          <input
            id="document-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="document-user-role" className="mb-1 block text-sm font-medium">Роль</label>
          <select
            id="document-user-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
            className={inputClass}
          >
            <option value="sensor">Сенсор (sensor)</option>
            <option value="researcher">Дослідник (researcher)</option>
            <option value="admin">Адміністратор (admin)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="document-user-password" className="mb-1 block text-sm font-medium">
            {user ? "Новий пароль (залиште порожнім, щоб зберегти поточний)" : "Пароль"}
          </label>
          <input
            id="document-user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required={!user}
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setIsActive(event.target.checked);
              setIsActiveChanged(true);
            }}
          />
          Активний користувач
        </label>
        {user && typeof user.is_active !== "boolean" && (
          <p className="text-sm text-slate-500 sm:col-span-2">
            Поточний стан не надано API. Якщо прапорець не змінювати, стан залишиться без змін.
          </p>
        )}
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100 disabled:opacity-50"
        >
          Скасувати
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Збереження…" : user ? "Зберегти користувача" : "Створити користувача"}
        </button>
      </div>
    </form>
  );
}
