import { useEffect, useRef, useState } from "react";
import DataTypeDropdown from "./components/DataTypeDropdown";
import SearchBar from "./components/SearchBar";
import DataTable from "./components/DataTable";
import StatsCards from "./components/StatsCards";
import ViewModal from "./components/ViewModal";
import EditModal from "./components/EditModal";
import { dataTypeOptions } from "./data/mockData";
import { ui } from "./styles/ui";
import { getDataByType, updateDataByType, deleteDataByType, } from "./api/dataApi";
import DeleteModal from "./components/DeleteModal";

export default function App() {
  const [dataType, setDataType] = useState("relational");
  const currentDataTypeLabel =
  dataTypeOptions.find((item) => item.value === dataType)?.label ?? dataType;
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);

  const dataMenuRef = useRef(null);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredData = data.filter((row) =>
    Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  useEffect(() => {
    async function loadData() {
      const apiType = dataType;

      try {
        setIsLoading(true);
        setError(null);

        const result = await getDataByType(apiType);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setIsDataMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
                  Область відображення даних
                </h2>
                <p className={ui.text.muted}>
                  Тут будуть показуватися таблиці, JSON-структури або файлові
                  об’єкти залежно від обраного режиму
                </p>
              </div>
            </div>

            <div className={ui.misc.currentModeRow}>
              <div className={ui.text.infoText}>
                Поточний режим:{" "}
                <span className={ui.text.infoStrong}>{currentDataTypeLabel}</span>
              </div>
            </div>

            <ViewModal
              row={selectedRow}
              onClose={() => setSelectedRow(null)}
            />

            {editingRow && (
              <EditModal
                row={editingRow}
                onClose={() => setEditingRow(null)}
                onSave={async (updatedRow) => {
                  try {
                    const savedRow = await updateDataByType(
                      dataType,
                      updatedRow.id,
                      updatedRow
                    );

                    setData((currentData) =>
                      currentData.map((row) =>
                        row.id === savedRow.id ? savedRow : row
                      )
                    );

                    setEditingRow(null);
                  } catch (error) {
                    console.error(error);
                  }
                }}
              />
            )}

            {deletingRow && (
              <DeleteModal
                row={deletingRow}
                onClose={() => setDeletingRow(null)}
                onConfirm={async (row) => {
                  try {
                    await deleteDataByType(dataType, row.id);

                    setData((currentData) =>
                      currentData.filter((item) => item.id !== row.id)
                    );

                    setDeletingRow(null);
                  } catch (error) {
                    console.error(error);
                  }
                }}
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

            {!isLoading && !error && (
              <DataTable
                key={`${dataType}-${searchQuery}`}
                rows={filteredData}
                onView={setSelectedRow}
                onEdit={setEditingRow}
                onDelete={setDeletingRow}
              />
            )}
            <StatsCards dataType={currentDataTypeLabel}
              recordsCount={filteredData.length} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}