import { ui } from "../styles/ui";

export default function DeleteModal({ row, onClose, onConfirm }) {
  if (!row) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className={ui.text.sectionTitle}>Підтвердження видалення</h3>

        <p className="mt-3">
          Ви впевнені, що хочете видалити цей запис?
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={ui.button.secondary}
            onClick={onClose}
          >
            Скасувати
          </button>

          <button
            type="button"
            className={ui.button.primary}
            onClick={() => onConfirm(row)}
          >
            Видалити
          </button>
        </div>
      </div>
    </div>
  );
}