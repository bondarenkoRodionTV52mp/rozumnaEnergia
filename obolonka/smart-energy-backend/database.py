import os
import time
import psycopg2
import psycopg2.extras
import psycopg2.pool
from contextlib import contextmanager

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _create_pool() -> None:
    global _pool
    for attempt in range(15):
        try:
            _pool = psycopg2.pool.ThreadedConnectionPool(
                1, 10,
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                dbname=os.getenv("DB_NAME", "smartenergy"),
                user=os.getenv("DB_USER", "smartenergy"),
                password=os.getenv("DB_PASSWORD", "smartenergy123"),
            )
            print("[DB] PostgreSQL з'єднання встановлено")
            return
        except psycopg2.OperationalError as e:
            print(f"[DB] Очікування PostgreSQL... ({attempt + 1}/15): {e}")
            time.sleep(3)
    raise RuntimeError("Не вдалося підключитися до PostgreSQL")


def init_db() -> None:
    _create_pool()
    with get_db() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                id        VARCHAR(50) PRIMARY KEY,
                name      VARCHAR(100) NOT NULL,
                location  VARCHAR(100) NOT NULL,
                status    VARCHAR(20) DEFAULT 'offline',
                last_seen TIMESTAMPTZ
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id          SERIAL PRIMARY KEY,
                node_id     VARCHAR(50) NOT NULL REFERENCES nodes(id),
                timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                temperature REAL,
                voltage     REAL,
                current_a   REAL,
                power       REAL,
                energy      REAL,
                frequency   REAL
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS thresholds (
                id        SERIAL PRIMARY KEY,
                node_id   VARCHAR(50),
                metric    VARCHAR(50) NOT NULL,
                min_value REAL,
                max_value REAL,
                UNIQUE (node_id, metric)
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id            SERIAL PRIMARY KEY,
                node_id       VARCHAR(50) NOT NULL REFERENCES nodes(id),
                metric        VARCHAR(50) NOT NULL,
                value         REAL NOT NULL,
                threshold_min REAL,
                threshold_max REAL,
                severity      VARCHAR(20) DEFAULT 'warning',
                timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                acknowledged  BOOLEAN DEFAULT FALSE
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tel_node ON telemetry(node_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tel_ts   ON telemetry(timestamp);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_alerts_node ON alerts(node_id, acknowledged);")

        cur.execute("""
            INSERT INTO nodes (id, name, location) VALUES
                ('node-001', 'Офіс',            'Кімната 101'),
                ('node-002', 'Серверна',         'Підвал'),
                ('node-003', 'Виробничий цех',   'Корпус А'),
                ('node-004', 'Склад',            'Корпус Б')
            ON CONFLICT (id) DO NOTHING;
        """)

    # Заповнення порогів після ініціалізації таблиць
    from alert_checker import seed_default_thresholds
    seed_default_thresholds()


@contextmanager
def get_db():
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def cleanup_old_telemetry(keep: int = 2000) -> None:
    with get_db() as cur:
        cur.execute("""
            DELETE FROM telemetry
            WHERE id NOT IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (PARTITION BY node_id ORDER BY id DESC) AS rn
                    FROM telemetry
                ) ranked WHERE rn <= %s
            )
        """, (keep,))
