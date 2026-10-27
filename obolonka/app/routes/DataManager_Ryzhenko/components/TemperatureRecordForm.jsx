import { useEffect, useId, useRef, useState } from "react";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function TemperatureRecordForm({ onSave, onClose }) {
  const id = useId();
  const [sensorId, setSensorId] = useState("");
  const [value, setValue] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const submitting = useRef(false);
  const dialog = useRef(null);
  const sensorInput = useRef(null);

  useEffect(() => {
    active.current = true;
    const previousFocus = document.activeElement;
    sensorInput.current?.focus();
    return () => {
      active.current = false;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  function handleClose() {
    if (!submitting.current) onClose();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
      return;
    }
    if (event.key !== "Tab") return;

    const controls = dialog.current?.querySelectorAll("input:not(:disabled), button:not(:disabled)");
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");

    const sensorNumber = Number(sensorId);
    if (!sensorId.trim() || !Number.isInteger(sensorNumber) ||
      sensorNumber < -2147483648 || sensorNumber > 2147483647) {
      setError("ID датчика має бути цілим числом від −2147483648 до 2147483647.");
      return;
    }

    const measuredValue = Number(value);
    if (!value.trim() || !Number.isFinite(measuredValue)) {
      setError("Укажіть числове значення вимірювання.");
      return;
    }

    const measuredAt = new Date(timestamp);
    if (!timestamp || Number.isNaN(measuredAt.getTime())) {
      setError("Укажіть коректні дату й час вимірювання.");
      return;
    }

    submitting.current = true;
    setSaving(true);
    try {
      await onSave({
        sensorId: sensorNumber,
        parameter: "TEMPERATURE",
        value: measuredValue,
        timestamp: measuredAt.toISOString(),
      });
    } catch (err) {
      if (active.current) {
        setError(err.message || "Не вдалося зберегти вимірювання. Спробуйте ще раз.");
      }
    } finally {
      submitting.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={handleKeyDown}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={`${id}-title`} className="mb-5 text-xl font-semibold text-slate-900">
          Додати вимірювання
        </h2>
        <form onSubmit={handleSubmit} aria-label="Створення вимірювання" className="space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <div>
              <label htmlFor={`${id}-sensor`} className={labelClass}>ID датчика</label>
              <input
                ref={sensorInput}
                id={`${id}-sensor`}
                type="number"
                step="1"
                min={-2147483648}
                max={2147483647}
                value={sensorId}
                onChange={(event) => setSensorId(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-parameter`} className={labelClass}>Параметр</label>
              <input id={`${id}-parameter`} value="TEMPERATURE" readOnly className={inputClass} />
            </div>
            <div>
              <label htmlFor={`${id}-value`} className={labelClass}>Значення</label>
              <input
                id={`${id}-value`}
                type="number"
                step="any"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-timestamp`} className={labelClass}>Час вимірювання</label>
              <input
                id={`${id}-timestamp`}
                type="datetime-local"
                step="1"
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
                required
                aria-describedby={`${id}-time-note`}
                className={inputClass}
              />
              <p id={`${id}-time-note`} className="mt-2 text-xs text-slate-500">
                Дата й час указані у часовому поясі вашого пристрою.
              </p>
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Збереження..." : "Зберегти вимірювання"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
