import { useState } from "react";

function createInitialFormData(rows) {
  const fields = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "id") {
        fields.add(key);
      }
    });
  });

  const initialData = {};

  fields.forEach((field) => {
    initialData[field] = "";
  });

  return initialData;
}

export default function AddModal({
  rows = [],
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(() =>
    createInitialFormData(rows)
  );

  const [newFieldName, setNewFieldName] = useState("");

  function handleChange(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAddField() {
    const fieldName = newFieldName.trim();

    if (!fieldName) {
      return;
    }

    if (fieldName === "id") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(formData, fieldName)) {
      return;
    }

    setFormData((current) => ({
      ...current,
      [fieldName]: "",
    }));

    setNewFieldName("");
  }

  function handleRemoveField(field) {
    setFormData((current) => {
      const updated = { ...current };

      delete updated[field];

      return updated;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSave(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Додати запис
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Заповніть поля нового запису
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {Object.entries(formData).map(([field, value]) => (
              <div key={field}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    {field}
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveField(field)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Видалити поле
                  </button>
                </div>

                <input
                  type="text"
                  value={value}
                  onChange={(event) =>
                    handleChange(field, event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </div>
            ))}

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Нове поле
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(event) =>
                    setNewFieldName(event.target.value)
                  }
                  placeholder="Назва поля"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />

                <button
                  type="button"
                  onClick={handleAddField}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  + Додати поле
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Скасувати
            </button>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Додати
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}