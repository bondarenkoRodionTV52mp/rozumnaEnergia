"""Симулятор IoT-вузлів — генерує телеметрію і публікує через MQTT з авторизацією."""
import json
import math
import os
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST     = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "smartenergy")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "SmartEnergy2024")

NODES    = ["node-001", "node-002", "node-003", "node-004"]
INTERVAL = 5  # секунд між вимірами

# Накопичена енергія (кВт·год) per вузол
_energy: dict[str, float] = {nid: random.uniform(10, 200) for nid in NODES}

NODE_PARAMS = {
    "node-001": {"temp_base": 22, "temp_amp": 4,  "cur_base": 3.0,  "cur_amp": 1.5},
    "node-002": {"temp_base": 36, "temp_amp": 8,  "cur_base": 8.5,  "cur_amp": 3.0},
    "node-003": {"temp_base": 28, "temp_amp": 10, "cur_base": 12.0, "cur_amp": 5.0},
    "node-004": {"temp_base": 18, "temp_amp": 5,  "cur_base": 2.0,  "cur_amp": 1.0},
}


def _generate(node_id: str, t: float) -> dict:
    p = NODE_PARAMS[node_id]
    temperature = p["temp_base"] + p["temp_amp"] * math.sin(t / 600) + random.gauss(0, 0.4)
    voltage     = 230.0 + 5 * math.sin(t / 900 + 0.5) + random.gauss(0, 1.5)
    current     = max(0.1, p["cur_base"] + p["cur_amp"] * math.sin(t / 300 + 1) + random.gauss(0, 0.2))
    power       = voltage * current
    _energy[node_id] += power * (INTERVAL / 3_600_000)  # Вт·с → кВт·год
    frequency   = 50.0 + 0.2 * math.sin(t / 120) + random.gauss(0, 0.05)
    return {
        "temperature": round(temperature, 2),
        "voltage":     round(voltage, 2),
        "current_a":   round(current, 3),
        "power":       round(power, 2),
        "energy":      round(_energy[node_id], 4),
        "frequency":   round(frequency, 3),
    }


def start_simulation() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            print(f"[SIM] Підключено до MQTT {MQTT_HOST}:{MQTT_PORT} як '{MQTT_USERNAME}'")
            break
        except Exception as e:
            print(f"[SIM] MQTT недоступний: {e}. Повторна спроба через 5 с...")
            time.sleep(5)

    client.loop_start()
    t0 = time.time()

    while True:
        t = time.time() - t0
        for nid in NODES:
            payload = json.dumps(_generate(nid, t))
            client.publish(f"smartenergy/{nid}/telemetry", payload, qos=1)
        time.sleep(INTERVAL)
