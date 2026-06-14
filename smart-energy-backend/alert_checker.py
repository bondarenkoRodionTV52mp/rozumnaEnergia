"""Модуль перевірки порогових значень телеметрії та генерації сповіщень."""
from database import get_db

# Порогові значення за замовчуванням (застосовуються до всіх вузлів)
DEFAULT_THRESHOLDS: dict[str, dict] = {
    "temperature": {"min": 10.0, "max": 40.0},
    "voltage":     {"min": 210.0, "max": 250.0},
    "current_a":   {"min": 0.0,  "max": 18.0},
    "power":       {"min": 0.0,  "max": 5000.0},
    "frequency":   {"min": 49.0, "max": 51.0},
}


def seed_default_thresholds() -> None:
    """Ініціалізація порогів за замовчуванням (виконується при запуску).
    Спочатку видаляє дублікати, потім вставляє якщо порогів ще немає."""
    with get_db() as cur:
        # Видалити дублікати (залишити тільки перший запис кожної метрики)
        cur.execute("""
            DELETE FROM thresholds WHERE id NOT IN (
                SELECT MIN(id) FROM thresholds GROUP BY COALESCE(node_id, ''), metric
            )
        """)
        # Вставити тільки якщо глобальних порогів ще немає
        cur.execute("SELECT COUNT(*) AS c FROM thresholds WHERE node_id IS NULL")
        if cur.fetchone()["c"] > 0:
            return
        for metric, bounds in DEFAULT_THRESHOLDS.items():
            cur.execute("""
                INSERT INTO thresholds (node_id, metric, min_value, max_value)
                VALUES (NULL, %s, %s, %s)
            """, (metric, bounds["min"], bounds["max"]))


def check_and_save_alerts(node_id: str, reading: dict) -> None:
    """Порівнює поточні показники з порогами. Якщо перевищено — зберігає alert."""
    with get_db() as cur:
        # Отримуємо пороги: спочатку специфічні для вузла, потім глобальні
        cur.execute("""
            SELECT DISTINCT ON (metric)
                metric, min_value, max_value
            FROM thresholds
            WHERE node_id = %s OR node_id IS NULL
            ORDER BY metric, node_id NULLS LAST
        """, (node_id,))
        thresholds = {r["metric"]: r for r in cur.fetchall()}

    for metric, threshold in thresholds.items():
        value = reading.get(metric)
        if value is None:
            continue

        min_v = threshold["min_value"]
        max_v = threshold["max_value"]
        violated = (min_v is not None and value < min_v) or \
                   (max_v is not None and value > max_v)

        if not violated:
            continue

        # Визначаємо серйозність: critical якщо відхилення > 10%
        if max_v is not None and value > max_v:
            deviation = (value - max_v) / max_v
        else:
            deviation = (min_v - value) / min_v if min_v else 0
        severity = "critical" if deviation > 0.10 else "warning"

        # Уникаємо дублювання: не створюємо новий alert якщо вже є активний за останні 5 хв
        with get_db() as cur:
            cur.execute("""
                SELECT id FROM alerts
                WHERE node_id = %s AND metric = %s AND acknowledged = FALSE
                  AND timestamp > NOW() - INTERVAL '5 minutes'
                LIMIT 1
            """, (node_id, metric))
            if cur.fetchone():
                continue

            cur.execute("""
                INSERT INTO alerts (node_id, metric, value, threshold_min, threshold_max, severity)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (node_id, metric, value, min_v, max_v, severity))
