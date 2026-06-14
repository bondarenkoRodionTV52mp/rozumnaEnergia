from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Query

from database import get_db

router = APIRouter()

ALLOWED_METRICS = {"temperature", "voltage", "current_a", "power", "energy", "frequency"}


def _ts(value) -> str:
    """Перетворює datetime або рядок на ISO-рядок без мікросекунд."""
    if hasattr(value, "isoformat"):
        return value.isoformat()[:19]
    return str(value)[:19]


@router.get("/latest")
def latest(node_id: Optional[str] = None):
    """Останній вимір кожного вузла (або конкретного)."""
    with get_db() as cur:
        if node_id:
            cur.execute("""
                SELECT t.*, n.name AS node_name
                FROM telemetry t JOIN nodes n ON t.node_id = n.id
                WHERE t.node_id = %s
                ORDER BY t.id DESC LIMIT 1
            """, (node_id,))
            row = cur.fetchone()
            return dict(row) if row else {}
        cur.execute("""
            SELECT t.*, n.name AS node_name
            FROM telemetry t JOIN nodes n ON t.node_id = n.id
            WHERE t.id IN (SELECT MAX(id) FROM telemetry GROUP BY node_id)
            ORDER BY t.node_id
        """)
        return [dict(r) for r in cur.fetchall()]


@router.get("/history")
def history(
    node_id: Optional[str] = None,
    limit: int = Query(100, le=500),
):
    with get_db() as cur:
        if node_id:
            cur.execute("""
                SELECT * FROM telemetry WHERE node_id=%s
                ORDER BY id DESC LIMIT %s
            """, (node_id, limit))
        else:
            cur.execute("SELECT * FROM telemetry ORDER BY id DESC LIMIT %s", (limit,))
        rows = cur.fetchall()
        return list(reversed([dict(r) for r in rows]))


@router.get("/chart")
def chart(
    node_id: str,
    metric: str = Query("temperature"),
    limit: int = Query(60, le=300),
):
    if metric not in ALLOWED_METRICS:
        metric = "temperature"
    with get_db() as cur:
        cur.execute(f"""
            SELECT timestamp, {metric} AS value
            FROM telemetry WHERE node_id=%s
            ORDER BY id DESC LIMIT %s
        """, (node_id, limit))
        rows = cur.fetchall()
        return list(reversed([dict(r) for r in rows]))


@router.get("/multi-chart")
def multi_chart(
    metric: str = Query("temperature"),
    limit: int = Query(60, le=300),
):
    """Дані для графіка з усіма вузлами одночасно."""
    if metric not in ALLOWED_METRICS:
        metric = "temperature"
    with get_db() as cur:
        cur.execute(f"""
            SELECT node_id, timestamp, {metric} AS value
            FROM telemetry
            WHERE id IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (PARTITION BY node_id ORDER BY id DESC) AS rn
                    FROM telemetry
                ) ranked
                WHERE rn <= %s
            )
            ORDER BY node_id, timestamp
        """, (limit,))
        rows = cur.fetchall()

    buckets: dict[str, dict] = defaultdict(dict)
    for r in rows:
        ts = _ts(r["timestamp"])
        buckets[ts][r["node_id"]] = r["value"]
    return [{"timestamp": ts, **vals} for ts, vals in sorted(buckets.items())]
