"""Simulated room B node. Publishes data and ACKs valid fan commands."""
import json
import os
import random
import threading
from datetime import datetime, timezone
from uuid import uuid4

import paho.mqtt.client as mqtt

DEVICE_ID = "sim-b-01"
BASE = f"home/room-b/{DEVICE_ID}"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=DEVICE_ID)
    client.username_pw_set(DEVICE_ID, os.environ["MQTT_SIM_PASSWORD"])
    offline = '{"state":"offline"}'
    client.will_set(f"{BASE}/status", offline, qos=1, retain=True)
    connected = threading.Event()

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            print(f"MQTT connection rejected: {reason_code}", flush=True)
            return
        client.subscribe(f"{BASE}/command", qos=1)
        connected.set()

    def on_disconnect(client, userdata, flags, reason_code, properties):
        connected.clear()

    def on_message(client, userdata, message):
        try:
            body = json.loads(message.payload)
            if not isinstance(body, dict) or body.get("action") != "FAN_SET":
                return
            command_id, value = body["command_id"], body["value"]
            if not isinstance(command_id, str) or not (1 <= len(command_id) <= 64):
                return
            if value not in ("ON", "OFF"):
                return
        except (ValueError, KeyError):
            return
        client.publish(f"{BASE}/ack", json.dumps({
            "command_id": command_id, "result": "OK",
            "fan_state": value, "ts": utc_now(),
        }), qos=1)
        print(f"Simulated fan: {value}", flush=True)

    client.on_connect, client.on_disconnect = on_connect, on_disconnect
    client.on_message = on_message
    client.connect_async(os.environ.get("MQTT_HOST", "mosquitto"),
                         int(os.environ.get("MQTT_PORT", "1883")), 30)
    client.loop_start()
    stop = threading.Event()
    boot_id, seq = uuid4().hex, 0
    try:
        while True:
            if not connected.wait(timeout=1):
                continue
            sample = {
                "schema_version": 1, "device_id": DEVICE_ID,
                "boot_id": boot_id, "seq": seq, "ts": utc_now(),
                "temperature_c": round(random.uniform(26, 30), 1),
                "humidity_pct": round(random.uniform(50, 68), 1),
                "mq135_adc_raw": random.randint(350, 800),
            }
            client.publish(f"{BASE}/telemetry", json.dumps(sample), qos=1)
            if seq % 3 == 0:
                client.publish(f"{BASE}/status", '{"state":"online"}', qos=1, retain=True)
            print(f"Queued simulated sample {seq}", flush=True)
            seq += 1
            stop.wait(10)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            if connected.is_set():
                client.publish(f"{BASE}/status", offline, qos=1, retain=True).wait_for_publish(timeout=2)
        finally:
            client.disconnect()
            client.loop_stop()


if __name__ == "__main__":
    main()

