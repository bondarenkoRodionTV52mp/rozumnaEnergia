import { useState } from "react";
import { ui } from "../styles/ui";

export default function EditModal({ row, onClose, onSave }) {
  const [formData, setFormData] = useState(() => ({ ...row }));

  if (!row) {
    return null;
  }

  function handleChange(key, value) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(formData);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
        <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
        >
        <div className="mb-4 flex items-center justify-between">
          <h3 className={ui.text.sectionTitle}>Редагування запису</h3>

          <button
            className={ui.button.subtle}
            onClick={onClose}
          >
            Закрити
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                {Object.entries(formData).map(([key, value]) => (
                    <div key={key}>
                    <label className={ui.text.label}>
                        {key}
                    </label>

                    <input
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                        value={
                        value !== null && typeof value === "object"
                            ? JSON.stringify(value)
                            : value ?? ""
                        }
                        disabled={key === "id"}
                        onChange={(event) =>
                        handleChange(key, event.target.value)
                        }
                    />
                    </div>
                ))}
            </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={ui.button.secondary}
              onClick={onClose}
            >
              Скасувати
            </button>

            <button
              type="submit"
              className={ui.button.primary}
            >
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}