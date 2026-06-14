import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from mqtt_client import start_mqtt_subscriber
from simulator import start_simulation
from routers import telemetry, nodes, stats, alerts, config

app = FastAPI(
    title="SmartEnergy Lab API",
    version="2.0.0",
    description="API для IoT-системи моніторингу енергоспоживання SmartEnergy Lab",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Телеметрія"])
app.include_router(nodes.router,     prefix="/api/nodes",     tags=["Вузли"])
app.include_router(stats.router,     prefix="/api/stats",     tags=["Статистика"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["Сповіщення"])
app.include_router(config.router,    prefix="/api/config",    tags=["Конфігурація"])


@app.on_event("startup")
def startup() -> None:
    init_db()
    threading.Thread(target=start_mqtt_subscriber, daemon=True, name="mqtt-subscriber").start()
    threading.Thread(target=start_simulation,      daemon=True, name="iot-simulator").start()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SmartEnergy Lab", "version": "2.0.0"}
