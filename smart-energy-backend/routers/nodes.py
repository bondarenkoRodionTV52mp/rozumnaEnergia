from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter()


@router.get("/")
def list_nodes():
    with get_db() as cur:
        cur.execute("SELECT * FROM nodes ORDER BY id")
        return [dict(r) for r in cur.fetchall()]


@router.get("/{node_id}")
def get_node(node_id: str):
    with get_db() as cur:
        cur.execute("SELECT * FROM nodes WHERE id=%s", (node_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Вузол не знайдено")
        return dict(row)
