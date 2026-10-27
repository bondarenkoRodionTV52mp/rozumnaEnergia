
import { useState } from "react";

export default function DocumentEditModal({
  row,
  onClose,
  onSave,
}) {
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(row.payload ?? {}, null, 2)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = JSON.parse(payloadText);

      if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload)
      ) {
        throw new Error("Payload повинен бути JSON-об'єктом");
      }

      setSaving(true);

      await onSave({
        payload,
      });
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Некоректний формат JSON"
          : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">
          Редагувати документ
        </h2>

        <p className="mb-2 text-sm text-slate-500">
          Тип: {row.type}
        </p>

        <p className="mb-4 break-all text-sm text-slate-500">
          ID: {row.id}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-sm font-medium">
            Payload (JSON)
          </label>

          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              Скасувати
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Збереження..." : "Зберегти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
