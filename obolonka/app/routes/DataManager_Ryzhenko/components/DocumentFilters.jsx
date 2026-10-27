import { useId, useState } from "react";

const textFields = [
  ["type", "Тип документа"],
  ["category", "Категорія"],
  ["source_system", "Джерело даних"],
  ["entity_id", "Ідентифікатор сутності"],
  ["owner_id", "Власник"],
];

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const buttonClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function createDraft(filters) {
  return {
    type: filters.type ?? "",
    category: filters.category ?? "",
    source_system: filters.source_system ?? "",
    entity_id: filters.entity_id ?? "",
    owner_id: filters.owner_id ?? "",
    tags: Array.isArray(filters.tags) ? filters.tags.join(", ") : filters.tags ?? "",
    visibility: filters.visibility ?? "",
    created_after: toLocalDateTime(filters.created_after),
    created_before: toLocalDateTime(filters.created_before),
    sort: filters.sort ?? "",
  };
}

function DocumentFiltersForm({ filters, onApply, onReset, disabled }) {
  const id = useId();
  const [draft, setDraft] = useState(() => createDraft(filters));
  const [error, setError] = useState("");

  function changeField(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (disabled) return;

    const dates = {};
    for (const name of ["created_after", "created_before"]) {
      if (!draft[name]) continue;
      const date = new Date(draft[name]);
      if (Number.isNaN(date.getTime())) {
        setError("Укажіть коректні дату й час.");
        return;
      }
      dates[name] = date.toISOString();
    }
    if (dates.created_after && dates.created_before &&
      new Date(dates.created_after) > new Date(dates.created_before)) {
      setError("Дата «Від» не може бути пізнішою за дату «До».");
      return;
    }

    const nextFilters = { ...dates };
    for (const name of [...textFields.map(([name]) => name), "visibility", "sort"]) {
      const value = draft[name].trim();
      if (value) nextFilters[name] = value;
    }
    const tags = [...new Set(draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean))];
    if (tags.length) nextFilters.tags = tags;

    setError("");
    onApply(nextFilters);
  }

  function handleReset() {
    if (disabled) return;
    setDraft(createDraft({}));
    setError("");
    onReset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Фільтри документів"
    >
      <fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {textFields.map(([name, label]) => (
          <div key={name}>
            <label htmlFor={`${id}-${name}`} className={labelClass}>{label}</label>
            <input
              id={`${id}-${name}`}
              name={name}
              type="text"
              value={draft[name]}
              onChange={(event) => changeField(name, event.target.value)}
              className={inputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor={`${id}-tags`} className={labelClass}>Теги (через кому)</label>
          <input
            id={`${id}-tags`}
            name="tags"
            type="text"
            value={draft.tags}
            onChange={(event) => changeField("tags", event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${id}-visibility`} className={labelClass}>Видимість</label>
          <select
            id={`${id}-visibility`}
            name="visibility"
            value={draft.visibility}
            onChange={(event) => changeField("visibility", event.target.value)}
            className={inputClass}
          >
            <option value="">Усі</option>
            <option value="private">Приватні</option>
            <option value="project">Проєктні</option>
            <option value="public">Публічні</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-created-after`} className={labelClass}>Створено: від</label>
          <input
            id={`${id}-created-after`}
            name="created_after"
            type="datetime-local"
            step="1"
            value={draft.created_after}
            onChange={(event) => changeField("created_after", event.target.value)}
            className={inputClass}
            aria-describedby={`${id}-date-note`}
          />
        </div>

        <div>
          <label htmlFor={`${id}-created-before`} className={labelClass}>Створено: до</label>
          <input
            id={`${id}-created-before`}
            name="created_before"
            type="datetime-local"
            step="1"
            value={draft.created_before}
            onChange={(event) => changeField("created_before", event.target.value)}
            className={inputClass}
            aria-describedby={`${id}-date-note`}
          />
        </div>

        <div>
          <label htmlFor={`${id}-sort`} className={labelClass}>Сортування</label>
          <select
            id={`${id}-sort`}
            name="sort"
            value={draft.sort}
            onChange={(event) => changeField("sort", event.target.value)}
            className={inputClass}
          >
            <option value="">За замовчуванням</option>
            <option value="created_at:desc">Спочатку новіші</option>
            <option value="created_at:asc">Спочатку старіші</option>
            <option value="updated_at:desc">Оновлені нещодавно</option>
            <option value="updated_at:asc">Оновлені давно</option>
            <option value="type:asc">За типом: А–Я</option>
            <option value="category:asc">За категорією: А–Я</option>
          </select>
        </div>
      </fieldset>

      <p id={`${id}-date-note`} className="mt-3 text-xs text-slate-500">
        Дата й час указані у часовому поясі вашого пристрою. Документ має містити всі зазначені теги.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={disabled} className={buttonClass}>Застосувати фільтри</button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleReset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Скинути фільтри
        </button>
      </div>
    </form>
  );
}

export default function DocumentFilters({ filters = {}, onApply, onReset, disabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const activeCount = Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== ""
  ).length;

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg text-left font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-600"
        >
          <span>Фільтри документів</span>
          <span className="flex items-center gap-3 text-sm font-medium">
            {activeCount > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">Активних параметрів: {activeCount}</span>
            )}
            <span>{expanded ? "Згорнути" : "Розгорнути"} <span aria-hidden="true">{expanded ? "▴" : "▾"}</span></span>
          </span>
        </button>
      </h3>
      <div id={contentId} hidden={!expanded} className="pt-4">
        <DocumentFiltersForm
          key={JSON.stringify(filters)}
          filters={filters}
          onApply={onApply}
          onReset={onReset}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
