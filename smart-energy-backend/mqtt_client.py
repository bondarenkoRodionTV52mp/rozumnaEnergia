"""MQTT subscriber — отримує телеметрію від IoT-вузлів, зберігає в PostgreSQL,
перевіряє порогові значення і генерує сповіщення."""
import json
import os
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from database import get_db, cleanup_old_telemetry
from alert_checker import check_and_save_alerts

MQTT_HOST     = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "subscriber")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "SmartEnergy2024")
TOPIC         = "smartenergy/+/telemetry"

_msg_counter = 0


def _on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        client.subscribe(TOPIC, qos=1)
        print(f"[MQTT] Авторизовано як '{MQTT_USERNAME}'. Підписка: {TOPIC}")
    elif rc == 4:
        print("[MQTT] Помилка авторизації: невірний логін або пароль")
    else:
        print(f"[MQTT] Помилка підключення: rc={rc}")


def _on_message(client, userdata, msg):
    global _msg_counter
    try:
        data    = json.loads(msg.payload.decode())
        node_id = msg.topic.split("/")[1]
        now     = datetime.now(timezone.utc)

        with get_db() as cur:
            cur.execute("""
                INSERT INTO telemetry
                    (node_id, timestamp, temperature, voltage, current_a, power, energy, frequency)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                node_id, now,
                data["temperature"], data["voltage"], data["current_a"],
                data["power"], data["energy"], data["frequency"],
            ))
            cur.execute(
                "UPDATE nodes SET status='online', last_seen=%s WHERE id=%s",
                (now, node_id),
            )

        # Перевірка порогових значень і генерація сповіщень
        check_and_save_alerts(node_id, data)

        _msg_counter += 1
        if _msg_counter % 500 == 0:
            cleanup_old_telemetry(keep=2000)

    except Exception as e:
        print(f"[MQTT] Помилка обробки повідомлення: {e}")


def start_mqtt_subscriber() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = _on_connect
    client.on_message = _on_message

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as e:
            print(f"[MQTT] З'єднання перервано: {e}. Повторна спроба через 5 с...")
            time.sleep(5)
