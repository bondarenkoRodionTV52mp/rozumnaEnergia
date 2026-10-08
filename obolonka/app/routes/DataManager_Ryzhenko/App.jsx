import { useEffect, useRef, useState } from "react";

import DataTypeDropdown from "./components/DataTypeDropdown";
import SearchBar from "./components/SearchBar";
import DataTable from "./components/DataTable";
import StatsCards from "./components/StatsCards";
import ViewModal from "./components/ViewModal";
import EditModal from "./components/EditModal";
import DeleteModal from "./components/DeleteModal";
import AddModal from "./components/AddModal";

import { dataTypeOptions } from "./data/mockData";
import { ui } from "./styles/ui";

import {
  getDataByType,
  updateDataByType,
  deleteDataByType,
} from "./api/dataApi";

import {
  getRelationalTables,
  getRelationalTableData,
  createRelationalRecord,
  updateRelationalRecord,
  deleteRelationalRecord,
} from "./api/relationalApi";

export default function App() {
  // =========================
  // Основний режим даних
  // =========================

  const [dataType, setDataType] = useState("relational");

  const currentDataTypeLabel =
    dataTypeOptions.find((item) => item.value === dataType)?.label ?? dataType;

  // =========================
  // Dropdown типу даних
  // =========================

  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dataMenuRef = useRef(null);

  // =========================
  // Дані
  // =========================

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================
  // Реляційні таблиці
  // =========================

  const [relationalTables, setRelationalTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  // =========================
  // Пошук
  // =========================

  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredTables = relationalTables.filter((table) =>
    Object.values(table).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // =========================
  // Модальні вікна
  // =========================

  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // =========================
  // Завантаження режиму
  // =========================

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        setSearchQuery("");
        setSelectedTable(null);

        if (dataType === "relational") {
          const tables = await getRelationalTables();

          setRelationalTables(tables);
          setData([]);

          return;
        }

        const result = await getDataByType(dataType);

        setData(result);
      } catch (error) {
        console.error(error);
        setError("Не вдалося завантажити дані");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [dataType]);

  // =========================
  // Закриття dropdown
  // =========================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dataMenuRef.current &&
        !dataMenuRef.current.contains(event.target)
      ) {
        setIsDataMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================
  // Відкрити relational table
  // =========================

  async function handleSelectTable(table) {
    try {
      setIsLoading(true);
      setError(null);
      setSearchQuery("");

      const result = await getRelationalTableData(table.name);

      setSelectedTable(table);
      setData(result);
    } catch (error) {
      console.error(error);
      setError(`Не вдалося завантажити таблицю "${table.label}"`);
    } finally {
      setIsLoading(false);
    }
  }

  // =========================
  // Назад до списку таблиць
  // =========================

  function handleBackToTables() {
    setSelectedTable(null);
    setData([]);
    setSearchQuery("");

    setSelectedRow(null);
    setEditingRow(null);
    setDeletingRow(null);
    setIsAddModalOpen(false);
  }

  // =========================
  // Додавання
  // =========================

  async function handleCreate(newRecord) {
    if (!selectedTable) {
      return;
    }

    try {
      setError(null);

      const createdRecord = await createRelationalRecord(
        selectedTable.name,
        newRecord
      );

      setData((currentData) => [
        ...currentData,
        createdRecord,
      ]);

      setIsAddModalOpen(false);
    } catch (error) {
      console.error(error);
      setError("Не вдалося створити запис");
    }
  }

  // =========================
  // Редагування
  // =========================

  async function handleSave(updatedRow) {
    try {
      setError(null);

      let savedRow;

      if (dataType === "relational") {
        if (!selectedTable) {
          return;
        }

        savedRow = await updateRelationalRecord(
          selectedTable.name,
          updatedRow.id,
          updatedRow
        );
      } else {
        savedRow = await updateDataByType(
          dataType,
          updatedRow.id,
          updatedRow
        );
      }

      setData((currentData) =>
        currentData.map((row) =>
          row.id === savedRow.id ? savedRow : row
        )
      );

      setEditingRow(null);
    } catch (error) {
      console.error(error);
      setError("Не вдалося зберегти зміни");
    }
  }

  // =========================
  // Видалення
  // =========================

  async function handleDelete(row) {
    try {
      setError(null);

      if (dataType === "relational") {
        if (!selectedTable) {
          return;
        }

        await deleteRelationalRecord(
          selectedTable.name,
          row.id
        );
      } else {
        await deleteDataByType(dataType, row.id);
      }

      setData((currentData) =>
        currentData.filter((item) => item.id !== row.id)
      );

      setDeletingRow(null);
    } catch (error) {
      console.error(error);
      setError("Не вдалося видалити запис");
    }
  }

  // =========================
  // Що зараз показуємо
  // =========================

  const isRelationalTableList =
    dataType === "relational" && !selectedTable;

  const recordsCount = isRelationalTableList
    ? filteredTables.length
    : filteredData.length;

  // =========================
  // Render
  // =========================

  return (
    <div className={ui.layout.page}>
      <div className={ui.layout.appShell}>
        <header className={ui.layout.header}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className={ui.text.pageTitle}>
                Графічний інтерфейс користувача керування даними
              </h1>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <DataTypeDropdown
                dataType={dataType}
                isOpen={isDataMenuOpen}
                setIsOpen={setIsDataMenuOpen}
                setDataType={setDataType}
                options={dataTypeOptions}
                dropdownRef={dataMenuRef}
              />
            </div>
          </div>
        </header>

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className={ui.layout.section}>
          <div className={ui.layout.contentPanel}>
            <div className={ui.misc.topRow}>
              <div>
                <h2 className={ui.text.sectionTitle}>
                  {selectedTable
                    ? selectedTable.label
                    : "Область відображення даних"}
                </h2>

                <p className={ui.text.muted}>
                  {isRelationalTableList
                    ? "Оберіть таблицю для перегляду та керування її даними"
                    : selectedTable
                      ? `Перегляд даних таблиці "${selectedTable.label}"`
                      : "Тут будуть показуватися JSON-структури або файлові об’єкти залежно від обраного режиму"}
                </p>
              </div>
            </div>

            <div className={ui.misc.currentModeRow}>
              <div className={ui.text.infoText}>
                Поточний режим:{" "}
                <span className={ui.text.infoStrong}>
                  {currentDataTypeLabel}
                </span>

                {selectedTable && (
                  <>
                    {" / "}
                    <span className={ui.text.infoStrong}>
                      {selectedTable.label}
                    </span>
                  </>
                )}
              </div>

              {selectedTable && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBackToTables}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    ← Назад до таблиць
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    + Додати запис
                  </button>
                </div>
              )}
            </div>

            <ViewModal
              row={selectedRow}
              onClose={() => setSelectedRow(null)}
            />
            
            {isAddModalOpen && (
              <AddModal
                rows={data}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleCreate}
              />
            )}

            {editingRow && (
              <EditModal
                row={editingRow}
                onClose={() => setEditingRow(null)}
                onSave={handleSave}
              />
            )}

            {deletingRow && (
              <DeleteModal
                row={deletingRow}
                onClose={() => setDeletingRow(null)}
                onConfirm={handleDelete}
              />
            )}

            {isLoading && (
              <div className={ui.text.muted}>
                Завантаження даних...
              </div>
            )}

            {error && (
              <div className={ui.text.muted}>
                {error}
              </div>
            )}

            {!isLoading && !error && isRelationalTableList && (
              <DataTable
                key={`relational-tables-${searchQuery}`}
                rows={filteredTables}
                onView={handleSelectTable}
                viewLabel="Відкрити"
              />
            )}

            {!isLoading &&
              !error &&
              !isRelationalTableList && (
                <DataTable
                  key={`${dataType}-${selectedTable?.name ?? "data"}-${searchQuery}`}
                  rows={filteredData}
                  onView={setSelectedRow}
                  onEdit={setEditingRow}
                  onDelete={setDeletingRow}
                />
              )}

            <StatsCards
              dataType={
                selectedTable
                  ? `${currentDataTypeLabel} / ${selectedTable.label}`
                  : currentDataTypeLabel
              }
              recordsCount={recordsCount}
            />
          </div>
        </main>
      </div>
    </div>
  );
}