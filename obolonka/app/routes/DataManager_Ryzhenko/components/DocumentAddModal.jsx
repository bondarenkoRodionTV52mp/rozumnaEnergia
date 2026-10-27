
import { useEffect, useState } from "react";
import { getDocumentTypes } from "../api/documentApi";

export default function DocumentAddModal({ onClose, onSave }) {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [sourceSystem, setSourceSystem] = useState("web_dashboard");
  const [entityId, setEntityId] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [tagsText, setTagsText] = useState("");
  const [visibility, setVisibility] = useState("private");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTypes() {
      try {
        const result = await getDocumentTypes();

        if (!active) return;

        const available = result.filter((item) => item.is_active);

        setTypes(available);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTypes();

    return () => {
      active = false;
    };
  }, []);

  const currentType = types.find(
    (item) => item.name === selectedType
  );

  function handleTypeChange(value) {
    setSelectedType(value);

    if (value === "practice26_type_panel_config") {
      setPayloadText(JSON.stringify({
        max_power_w: 450,
        orientation: "south"
      }, null, 2));
    } else {
      setPayloadText("{}");
    }
  }

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

      const newDocument = {
        type: selectedType,
        category: currentType?.category ?? "general",
        schema_version: 1,
        source_system: sourceSystem.trim(),
        entity_id: entityId.trim() || null,
        tags: tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        payload,
        metadata: {},
        visibility
      };

      setSaving(true);
      await onSave(newDocument);
    } catch (err) {
      setError(err instanceof SyntaxError
        ? "Некоректний формат JSON у полі Payload"
        : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-add-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="document-add-title"
          className="mb-5 text-xl font-semibold text-slate-900"
        >
          Додати документ
        </h2>

        {loading ? (
          <p>Завантаження типів документів...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Тип документа *
              </label>

              <select
                required
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="">Оберіть тип документа</option>

                {types.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {currentType && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <p>{currentType.description}</p>
                <p className="mt-2">
                  Обов'язкові поля Payload:{" "}
                  {currentType.payload_schema?.required?.join(", ") ||
                    "не визначені"}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                Джерело даних *
              </label>

              <input
                required
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Ідентифікатор об'єкта
              </label>

              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Наприклад, new-panel-001"
                className="w-full rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Payload (JSON) *
              </label>

              <textarea
                required
                rows={7}
                spellCheck={false}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Теги (через кому)
              </label>

              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="test, test1"
                className="w-full rounded-lg border border-slate-300 p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Видимість
              </label>

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2"
              >
                <option value="private">Private</option>
                <option value="project">Project</option>
                <option value="public">Public</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-3">
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
                disabled={saving || !selectedType}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? "Збереження..." : "Створити"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
