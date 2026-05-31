from fastapi import APIRouter
from database import get_db

router = APIRouter()


@router.get("/summary")
def summary():
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM nodes WHERE status='online'")
        online = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) AS c FROM nodes")
        total_nodes = cur.fetchone()["c"]

        cur.execute("""
            SELECT
                AVG(temperature)    AS avg_temp,
                AVG(voltage)        AS avg_voltage,
                AVG(current_a)      AS avg_current,
                SUM(power)/1000.0   AS total_kw
            FROM telemetry
            WHERE id IN (SELECT MAX(id) FROM telemetry GROUP BY node_id)
        """)
        agg = cur.fetchone()

        cur.execute("""
            SELECT SUM(energy) AS total
            FROM (SELECT MAX(energy) AS energy FROM telemetry GROUP BY node_id) sub
        """)
        total_energy = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS c FROM telemetry")
        total_readings = cur.fetchone()["c"]

        return {
            "online_nodes":     online,
            "total_nodes":      total_nodes,
            "avg_temperature":  round(float(agg["avg_temp"]  or 0), 2),
            "avg_voltage":      round(float(agg["avg_voltage"] or 0), 2),
            "avg_current":      round(float(agg["avg_current"] or 0), 3),
            "total_power_kw":   round(float(agg["total_kw"]  or 0), 3),
            "total_energy_kwh": round(float(total_energy     or 0), 4),
            "total_readings":   total_readings,
        }
