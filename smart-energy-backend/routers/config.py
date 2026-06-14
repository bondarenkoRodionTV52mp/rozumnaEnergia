"""Модуль конфігурації мережевого з'єднання — відображає та дозволяє змінювати
параметри підключення до MQTT-брокера, бази даних та порогові значення."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter()


@router.get("/network")
def get_network_config():
    """Поточна конфігурація мережевих з'єднань системи."""
    return {
        "mqtt": {
            "host":          os.getenv("MQTT_HOST", "localhost"),
            "port":          int(os.getenv("MQTT_PORT", "1883")),
            "username":      os.getenv("MQTT_USERNAME", "smartenergy"),
            "topic_pattern": "smartenergy/+/telemetry",
            "qos":           1,
            "auth_enabled":  True,
            "protocol":      "MQTT v5",
        },
        "database": {
            "host":   os.getenv("DB_HOST", "localhost"),
            "port":   int(os.getenv("DB_PORT", "5432")),
            "name":   os.getenv("DB_NAME", "smartenergy"),
            "user":   os.getenv("DB_USER", "smartenergy"),
            "engine": "PostgreSQL 16",
        },
        "simulation": {
            "nodes":             4,
            "interval_seconds":  5,
            "protocol":          "MQTT",
            "metrics":           ["temperature", "voltage", "current_a", "power", "energy", "frequency"],
        },
    }


@router.get("/thresholds")
def get_thresholds():
    """Список усіх порогових значень."""
    with get_db() as cur:
        cur.execute("SELECT * FROM thresholds ORDER BY node_id NULLS FIRST, metric")
        return [dict(r) for r in cur.fetchall()]


class ThresholdUpdate(BaseModel):
    min_value: Optional[float] = None
    max_value: Optional[float] = None


@router.put("/thresholds/{threshold_id}")
def update_threshold(threshold_id: int, body: ThresholdUpdate):
    """Оновити порогові значення для метрики."""
    with get_db() as cur:
        cur.execute("SELECT id FROM thresholds WHERE id=%s", (threshold_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Поріг не знайдено")
        cur.execute(
            "UPDATE thresholds SET min_value=%s, max_value=%s WHERE id=%s",
            (body.min_value, body.max_value, threshold_id),
        )
    return {"status": "ok", "id": threshold_id}
