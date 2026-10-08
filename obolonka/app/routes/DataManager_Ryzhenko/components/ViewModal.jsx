import { ui } from "../styles/ui";

export default function ViewModal({ row, onClose }) {
  if (!row) {
    return null;
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
          <h3 className={ui.text.sectionTitle}>Перегляд запису</h3>

          <button
            className={ui.button.subtle}
            onClick={onClose}
          >
            Закрити
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          {Object.entries(row).map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[180px_1fr] gap-4 border-b pb-2"
            >
              <div className="font-medium">
                {key}
              </div>

              <div className="break-words">
                {value !== null && typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value ?? "—")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}