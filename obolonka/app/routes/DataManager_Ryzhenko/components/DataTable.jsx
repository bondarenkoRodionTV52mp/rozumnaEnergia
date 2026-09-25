import { ui } from "../styles/ui";
import { useState } from "react";

export default function DataTable({ rows, onView, onEdit, onDelete }) {

  const [currentPage, setCurrentPage] = useState(1);
  
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  
  if (!rows || rows.length === 0) {
    return (
      <div className={ui.table.wrapper}>
        <div className={ui.table.scroll}>
          <div className={ui.table.tdMuted}>Немає даних для відображення</div>
        </div>
      </div>
    );
  }

  const rowsPerPage = 10;

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  function handleSort(column) {
    setSortConfig((current) => {
      if (current.key === column) {
        return {
          key: column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key: column,
        direction: "asc",
      };
    });
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key) {
      return 0;
    }

    const valueA = a[sortConfig.key];
    const valueB = b[sortConfig.key];

    // Порожні значення відправляємо вниз
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    let comparison = 0;

    // Числа
    if (typeof valueA === "number" && typeof valueB === "number") {
      comparison = valueA - valueB;
    }

    // Дати
    else if (
      !Number.isNaN(Date.parse(valueA)) &&
      !Number.isNaN(Date.parse(valueB))
    ) {
      comparison = new Date(valueA) - new Date(valueB);
    }

    // Текст
    else {
      comparison = String(valueA).localeCompare(String(valueB), "uk", {
        numeric: true,
        sensitivity: "base",
      });
    }

    return sortConfig.direction === "asc"
      ? comparison
      : -comparison;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;

  const currentRows = sortedRows.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const columns = [
    ...new Set(
      rows.flatMap((row) => Object.keys(row))
    ),
  ];

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  return (
    <div className={ui.table.wrapper}>
      <div className={ui.table.scroll}>
        <table className={ui.table.table}>
          <thead className={ui.table.thead}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className={`${ui.table.th} cursor-pointer select-none`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column}</span>

                    {sortConfig.key === column && (
                      <span>
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              <th className={ui.table.th}>Дії</th>
            </tr>
          </thead>

          <tbody>
            {currentRows.map((row, index) => (
              <tr key={row.id ?? index} className={ui.table.tr}>
                {columns.map((column) => (
                  <td
                    key={column}
                    className={
                      column === "id" ? ui.table.tdStrong : ui.table.td
                    }
                  >
                    {renderValue(row[column])}
                  </td>
                ))}

                <td className={ui.table.tdActions}>
                  <div className={ui.table.actions}>
                    <button
                      className={ui.button.tiny}
                      onClick={() => onView(row)}
                    >
                      Переглянути
                    </button>
                    <button
                      className={ui.button.tiny}
                      onClick={() => onEdit(row)}
                    >
                      Редагувати
                    </button>
                    <button
                      className={ui.button.tiny}
                      onClick={() => onDelete(row)}
                    >
                      Видалити
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4">
        <button
          className={ui.button.small}
          onClick={() => setCurrentPage((page) => page - 1)}
          disabled={currentPage === 1}
        >
          Назад
        </button>

        <div className="text-sm text-neutral-600">
          Сторінка {currentPage} з {totalPages}
        </div>

        <button
          className={ui.button.small}
          onClick={() => setCurrentPage((page) => page + 1)}
          disabled={currentPage === totalPages}
        >
          Далі
        </button>
      </div>
    </div>
  );
}