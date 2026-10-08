import { ui } from "../styles/ui";

export default function StatsCards({ dataType, recordsCount }) {
  return (
    <div className={ui.cards.grid}>
      <div className={ui.cards.card}>
        <div className={ui.cards.label}>Активний режим</div>
        <div className={ui.cards.value}>{dataType}</div>
      </div>

      <div className={ui.cards.card}>
        <div className={ui.cards.label}>Знайдено записів</div>
        <div className={ui.cards.value}>{recordsCount}</div>
      </div>
    </div>
  );
}