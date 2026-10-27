const roleLabels = {
  sensor: "Сенсор",
  researcher: "Дослідник",
  admin: "Адміністратор",
};

export default function DocumentProfile({
  profile,
  onManageUsers,
  isAdmin,
  loading,
  error,
  onRetry,
}) {
  return (
    <section
      aria-label="Поточний користувач"
      className="mb-5 rounded-xl border border-slate-200 bg-white p-4"
    >
      {loading ? (
        <p className="text-sm text-slate-500" role="status">
          Завантаження профілю…
        </p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-red-700" role="alert">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition hover:bg-slate-100"
          >
            Повторити завантаження профілю
          </button>
        </div>
      ) : profile ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Ви увійшли як <strong className="text-slate-900">{profile.username}</strong>
            </p>
            {profile.full_name && (
              <p className="mt-1 font-medium text-slate-900">{profile.full_name}</p>
            )}
            <p className="mt-1 text-sm text-slate-600">
              Роль: {roleLabels[profile.role] ?? "Не визначено"} ({profile.role})
            </p>
            {profile.email && (
              <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
            )}
          </div>
          {isAdmin && profile.role === "admin" && (
            <button
              type="button"
              onClick={onManageUsers}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Користувачі
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Профіль користувача недоступний.</p>
      )}
    </section>
  );
}
