import { useEffect, useId, useRef, useState } from "react";
import {
  createTemperatureRecord,
  getLatestTemperatureRecord,
  getTemperatureRecords,
} from "../api/relationalApi";
import { ui } from "../styles/ui";
import DataTable from "./DataTable";
import StatsCards from "./StatsCards";
import TemperatureRecordForm from "./TemperatureRecordForm";
import ViewModal from "./ViewModal";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500";
const actionClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50";
const secondaryClass = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100";

export default function RelationalWorkspace() {
  const id = useId();
  const [mode, setMode] = useState("range");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [sensorId, setSensorId] = useState("");
  const [formError, setFormError] = useState("");
  const [query, setQuery] = useState(null);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState([]);
  const [savedRecord, setSavedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const mounted = useRef(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    async function loadRecords() {
      setLoading(true);
      setError("");
      setRows([]);
      try {
        const result = query.mode === "range"
          ? await getTemperatureRecords({ after: query.after, before: query.before, signal: controller.signal })
          : [await getLatestTemperatureRecord(query.sensorId, { signal: controller.signal })];
        if (controller.signal.aborted || version !== requestVersion.current) return;
        setRows(result);
      } catch (err) {
        if (controller.signal.aborted || version !== requestVersion.current) return;
        setRows([]);
        if (!(query.mode === "latest" && err.status === 404)) setError(err.message);
      } finally {
        if (!controller.signal.aborted && version === requestVersion.current) setLoading(false);
      }
    }
    loadRecords();
    return () => controller.abort();
  }, [query, revision]);

  function selectMode(nextMode) {
    if (nextMode === mode) return;
    requestVersion.current += 1;
    setMode(nextMode);
    setQuery(null);
    setRows([]);
    setSavedRecord(null);
    setLoading(false);
    setError("");
    setFormError("");
    setMessage("");
    setSelectedRow(null);
  }

  function submitQuery(event) {
    event.preventDefault();
    setFormError("");
    let nextQuery;
    if (mode === "range") {
      const start = new Date(after);
      const end = new Date(before);
      if (!after || !before || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setFormError("Укажіть обидві дати й час для пошуку вимірювань.");
        return;
      }
      if (start >= end) {
        setFormError("Дата «Від» має бути ранішою за дату «До».");
        return;
      }
      nextQuery = { mode, after: start.toISOString(), before: end.toISOString() };
    } else {
      const number = Number(sensorId);
      if (!sensorId.trim() || !Number.isInteger(number) || number < -2147483648 || number > 2147483647) {
        setFormError("ID датчика має бути цілим числом від −2147483648 до 2147483647.");
        return;
      }
      nextQuery = { mode, sensorId: number };
    }
    requestVersion.current += 1;
    setSelectedRow(null);
    setMessage("");
    setSavedRecord(null);
    setQuery(nextQuery);
  }

  async function handleCreate(record) {
    const created = await createTemperatureRecord(record);
    if (!mounted.current) return;
    setAdding(false);
    setSavedRecord(created);
    setMessage(`Вимірювання №${created.id} для датчика ${created.sensorId} збережено. Якщо виконано запит, показано його актуальний результат.`);
    setRevision((value) => value + 1);
  }

  const displayedRows = query ? rows : savedRecord ? [savedRecord] : [];
  const hasResult = Boolean(query || savedRecord);

  return (
    <main className={ui.layout.section}>
      <div className={ui.layout.contentPanel}>
        <div className={ui.misc.topRow}>
          <div>
            <h2 className={ui.text.sectionTitle}>Температурні вимірювання</h2>
            <p className={ui.text.muted}>Дані температурних датчиків із реляційного сховища SmartEnergy.</p>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setAdding(true)} className={actionClass}>+ Додати вимірювання</button>
          <p className={ui.text.infoText}>Поточний режим: <span className={ui.text.infoStrong}>Реляційні дані</span></p>
        </div>

        <section aria-label="Пошук вимірювань" className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Спосіб пошуку вимірювань">
            <button type="button" aria-pressed={mode === "range"} onClick={() => selectMode("range")} className={mode === "range" ? actionClass : secondaryClass}>За діапазоном дат</button>
            <button type="button" aria-pressed={mode === "latest"} onClick={() => selectMode("latest")} className={mode === "latest" ? actionClass : secondaryClass}>Останнє вимірювання датчика</button>
          </div>
          <form onSubmit={submitQuery} aria-label={mode === "range" ? "Діапазон вимірювань" : "Останнє вимірювання"}>
            {mode === "range" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-after`} className="mb-1 block text-sm font-medium">Від</label>
                  <input id={`${id}-after`} type="datetime-local" step="1" required value={after} onChange={(event) => setAfter(event.target.value)} className={inputClass} aria-describedby={`${id}-range-note`} />
                </div>
                <div>
                  <label htmlFor={`${id}-before`} className="mb-1 block text-sm font-medium">До</label>
                  <input id={`${id}-before`} type="datetime-local" step="1" required value={before} onChange={(event) => setBefore(event.target.value)} className={inputClass} aria-describedby={`${id}-range-note`} />
                </div>
                <p id={`${id}-range-note`} className="text-xs text-slate-500 sm:col-span-2">Буде отримано записи всіх датчиків строго між указаними моментами: самі межі не включаються. Час — у часовому поясі вашого пристрою.</p>
              </div>
            ) : (
              <div className="max-w-sm">
                <label htmlFor={`${id}-sensor`} className="mb-1 block text-sm font-medium">ID датчика для пошуку</label>
                <input id={`${id}-sensor`} type="number" step="1" min={-2147483648} max={2147483647} required value={sensorId} onChange={(event) => setSensorId(event.target.value)} className={inputClass} />
              </div>
            )}
            {formError && <p role="alert" className="mt-3 text-sm text-red-600">{formError}</p>}
            <button type="submit" className={`${actionClass} mt-4`}>{mode === "range" ? "Завантажити вимірювання" : "Знайти останнє вимірювання"}</button>
          </form>
        </section>

        {message && <p role="status" className="mb-4 text-sm text-emerald-800">{message}</p>}
        {error && <div role="alert" className="mb-4 text-sm text-red-600">{error} <button type="button" onClick={() => setRevision((value) => value + 1)} className="underline">Повторити завантаження</button></div>}
        {loading && <p role="status" className="mb-4 text-sm text-slate-500">Завантаження вимірювань...</p>}
        {!hasResult && !loading && <p className={ui.text.muted}>Оберіть часовий діапазон або знайдіть останній запис за ID датчика.</p>}
        {hasResult && !loading && !error && (displayedRows.length > 0
          ? <DataTable key={JSON.stringify(query) + revision} rows={displayedRows} onView={setSelectedRow} />
          : <p role="status" className="py-4 text-sm text-slate-500">{query?.mode === "latest" ? `Для датчика ${query.sensorId} вимірювань не знайдено.` : "За вказаний часовий діапазон вимірювань не знайдено."}</p>)}
        <StatsCards dataType="Реляційні дані — температурні вимірювання" recordsCount={displayedRows.length} />
        <ViewModal row={selectedRow} onClose={() => setSelectedRow(null)} />
        {adding && <TemperatureRecordForm onClose={() => setAdding(false)} onSave={handleCreate} />}
      </div>
    </main>
  );
}
