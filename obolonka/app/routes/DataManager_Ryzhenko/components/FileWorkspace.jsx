import { useEffect, useRef, useState } from "react";
import { deleteFileData, getFileData, updateFileData } from "../api/fileApi";
import { ui } from "../styles/ui";
import DataTable from "./DataTable";
import DeleteModal from "./DeleteModal";
import EditModal from "./EditModal";
import SearchBar from "./SearchBar";
import StatsCards from "./StatsCards";
import ViewModal from "./ViewModal";

export default function FileWorkspace() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const mounted = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    async function loadFiles() {
      try {
        const result = await getFileData();
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFiles();
    return () => { active = false; mounted.current = false; };
  }, []);

  async function handleSave(row) {
    setError("");
    try {
      const saved = await updateFileData(row.id, row);
      if (!mounted.current) return;
      setData((current) => current.map((item) => item.id === saved.id ? saved : item));
      setEditingRow(null);
    } catch (err) {
      if (mounted.current) setError(err.message);
    }
  }

  async function handleDelete(row) {
    setError("");
    try {
      await deleteFileData(row.id);
      if (!mounted.current) return;
      setData((current) => current.filter((item) => item.id !== row.id));
      setDeletingRow(null);
    } catch (err) {
      if (mounted.current) setError(err.message);
    }
  }

  const filtered = data.filter((row) => Object.values(row).some((value) =>
    String(value).toLowerCase().includes(searchQuery.toLowerCase())
  ));

  return (
    <>
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <main className={ui.layout.section}>
        <div className={ui.layout.contentPanel}>
          <div className={ui.misc.topRow}>
            <div>
              <h2 className={ui.text.sectionTitle}>Область відображення даних</h2>
              <p className={ui.text.muted}>Файлові об’єкти та їхні метадані.</p>
            </div>
          </div>
          <p className={`${ui.text.infoText} mb-4`}>Поточний режим: <span className={ui.text.infoStrong}>Файли</span></p>
          {loading && <p className={ui.text.muted}>Завантаження даних...</p>}
          {error && <p role="alert" className={ui.text.muted}>{error}</p>}
          {!loading && !error && <DataTable key={searchQuery} rows={filtered} onView={setSelectedRow} onEdit={setEditingRow} onDelete={setDeletingRow} />}
          <StatsCards dataType="Файли" recordsCount={filtered.length} />
          <ViewModal row={selectedRow} onClose={() => setSelectedRow(null)} />
          {editingRow && <EditModal row={editingRow} onClose={() => setEditingRow(null)} onSave={handleSave} />}
          {deletingRow && <DeleteModal row={deletingRow} onClose={() => setDeletingRow(null)} onConfirm={handleDelete} />}
        </div>
      </main>
    </>
  );
}
