"""MQTT publisher helper for dispatching commands from FastAPI to the broker."""
import json
import logging
import os
from typing import Any

import paho.mqtt.client as mqtt

log = logging.getLogger("api.mqtt")


def get_mqtt_publisher() -> mqtt.Client:
    """Creates an authenticated MQTT client for publishing messages."""
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="iot-backend-api")
    password = os.environ.get("MQTT_BACKEND_PASSWORD", "")
    if password:
        client.username_pw_set("iot-backend", password)
    host = os.environ.get("MQTT_HOST", "mosquitto")
    port = int(os.environ.get("MQTT_PORT", "1883"))
    client.connect(host, port, keepalive=30)
    return client


def dispatch_device_command(room_id: str, device_id: str, command_payload: dict[str, Any]) -> bool:
    """Publishes a command message to the device topic: home/{room_id}/{device_id}/command with QoS 1."""
    topic = f"home/{room_id}/{device_id}/command"
    client = None
    try:
        client = get_mqtt_publisher()
        client.loop_start()                          # Chạy network loop để PUBACK được xử lý đúng
        info = client.publish(topic, json.dumps(command_payload), qos=1)
        info.wait_for_publish(timeout=3)
        if not info.is_published():                  # Không báo thành công giả khi broker chưa xác nhận
            raise TimeoutError("Broker did not confirm PUBLISH within timeout")
        log.info("Published command to %s: %s", topic, command_payload.get("command_id"))
        return True
    except Exception as exc:
        log.error("Failed to publish command to MQTT topic %s: %s", topic, exc)
        return False
    finally:
        if client is not None:
            client.loop_stop()
            client.disconnect()

