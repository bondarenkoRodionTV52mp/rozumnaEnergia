import { useId } from "react";
import { ui } from "../styles/ui";

function renderValue(value) {
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

const disabledClass = " disabled:cursor-not-allowed disabled:opacity-50";

export default function DocumentTable({
  rows = [],
  meta = {},
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  loading = false,
}) {
  const pageSizeId = useId();
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const hasActions = onView || onEdit || onDelete;
  const total = Number.isInteger(meta?.total) && meta.total >= 0 ? meta.total : null;
  const totalPages = Number.isInteger(meta?.pages) && meta.pages >= 0
    ? meta.pages
    : total !== null ? Math.ceil(total / pageSize) : null;
  const hasNextPage = totalPages !== null
    ? page < totalPages
    : rows.length === pageSize;

  return (
    <div className={ui.table.wrapper} aria-busy={loading}>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-neutral-500" role="status">
          {loading ? "Завантаження документів..." : "За вибраними фільтрами документів немає"}
        </p>
      ) : (
        <div className={ui.table.scroll}>
          <table className={ui.table.table} aria-label="Документи">
            <thead className={ui.table.thead}>
              <tr>
                {columns.map((column) => <th key={column} scope="col" className={ui.table.th}>{column}</th>)}
                {hasActions && <th scope="col" className={ui.table.th}>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? row._id ?? `${page}-${index}`} className={ui.table.tr}>
                  {columns.map((column) => (
                    <td
                      key={column}
                      className={column === "id" || column === "_id" ? ui.table.tdStrong : ui.table.td}
                      title={renderValue(row[column])}
                    >
                      {renderValue(row[column])}
                    </td>
                  ))}
                  {hasActions && (
                    <td className={ui.table.tdActions}>
                      <div className={ui.table.actions}>
                        {onView && (
                          <button type="button" disabled={loading} onClick={() => onView(row)} className={ui.button.tiny + disabledClass}>
                            Переглянути
                          </button>
                        )}
                        {onEdit && (
                          <button type="button" disabled={loading} onClick={() => onEdit(row)} className={ui.button.tiny + disabledClass}>
                            Редагувати
                          </button>
                        )}
                        {onDelete && (
                          <button type="button" disabled={loading} onClick={() => onDelete(row)} className={ui.button.tiny + disabledClass}>
                            Видалити
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
          <label htmlFor={pageSizeId}>Документів на сторінці</label>
          <select
            id={pageSizeId}
            value={pageSize}
            disabled={loading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 disabled:opacity-50"
          >
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>Показано: {rows.length}{total !== null ? ` · Усього: ${total}` : ""}</span>
        </div>

        <nav aria-label="Сторінки документів" className="flex items-center gap-3">
          <button
            type="button"
            className={ui.button.small + disabledClass}
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </button>
          <span className="text-sm text-neutral-600" aria-live="polite">
            Сторінка {page}{totalPages !== null && totalPages > 0 ? ` з ${totalPages}` : ""}
          </span>
          <button
            type="button"
            className={ui.button.small + disabledClass}
            disabled={loading || !hasNextPage}
            onClick={() => onPageChange(page + 1)}
          >
            Далі
          </button>
        </nav>
      </div>
    </div>
  );
}
