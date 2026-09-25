import { ui } from "../styles/ui";

export default function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <div className={ui.search.outer}>
      <div className={ui.search.panel}>
        <div className={ui.search.row}>
          <div className="flex-1">
            <div className={ui.search.inputWrap}>
              <span className={ui.search.icon}>🔍</span>

              <input
                className={ui.search.input}
                placeholder="Пошук по даних..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />

              <button
                className={ui.button.subtle}
                onClick={() => setSearchQuery("")}
              >
                Очистити
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}