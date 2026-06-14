from fastapi import APIRouter, Query
from database import get_db

router = APIRouter()


@router.get("/")
def list_alerts(
    acknowledged: bool = Query(False),
    limit: int = Query(50, le=200),
):
    with get_db() as cur:
        cur.execute("""
            SELECT a.*, n.name AS node_name
            FROM alerts a JOIN nodes n ON a.node_id = n.id
            WHERE a.acknowledged = %s
            ORDER BY a.timestamp DESC
            LIMIT %s
        """, (acknowledged, limit))
        return [dict(r) for r in cur.fetchall()]


@router.get("/count")
def alert_count():
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM alerts WHERE acknowledged = FALSE")
        return {"count": cur.fetchone()["c"]}


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int):
    with get_db() as cur:
        cur.execute("UPDATE alerts SET acknowledged = TRUE WHERE id = %s", (alert_id,))
    return {"status": "ok"}


@router.post("/acknowledge-all")
def acknowledge_all():
    with get_db() as cur:
        cur.execute("UPDATE alerts SET acknowledged = TRUE WHERE acknowledged = FALSE")
    return {"status": "ok"}
