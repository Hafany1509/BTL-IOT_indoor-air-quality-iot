"""Simulated room B node using the same MQTT message contract as the ESP32."""
import json
import os
import random
import signal
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from uuid import uuid4

import paho.mqtt.client as mqtt

DEVICE_ID = "sim-b-01"
ROOM_ID = "room-b"
BASE = f"home/{ROOM_ID}/{DEVICE_ID}"
SCENARIOS = {"normal", "hot", "high_gas", "alert"}
SCENARIO = os.environ.get("SIM_SCENARIO", "normal").strip().lower()
DEFAULT_SAMPLE_INTERVAL_SECONDS = max(
    2.0, min(300.0, float(os.environ.get("SIM_INTERVAL_SECONDS", "10")))
)
HEARTBEAT_INTERVAL_SECONDS = 30.0
FIRMWARE_VERSION = "sim-1.0.0"
RECENT_COMMAND_LIMIT = 128


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def make_sample(boot_id: str, seq: int, scenario: str) -> dict:
    """Create an in-contract sample; scenarios make demonstrations repeatable.

    MQ-135 levels follow the real room A node (20k/10k divider, 12-bit ADC):
    clean indoor air reads ~0, alcohol/perfume vapour peaks at ~235-393.
    Backend bands: GOOD < 50 <= MODERATE < 150 <= POOR < 300 <= UNHEALTHY,
    and the seeded gas alert fires above 150.
    """
    temperature_c = round(random.uniform(26.0, 30.0), 1)
    humidity_pct = round(random.uniform(50.0, 68.0), 1)
    mq135_adc_raw = random.choice((0, 0, 0, random.randint(1, 40)))

    if scenario in {"hot", "alert"}:
        temperature_c = 34.5
    if scenario in {"high_gas", "alert"}:
        mq135_adc_raw = random.randint(200, 280)

    return {
        "schema_version": 1,
        "device_id": DEVICE_ID,
        "boot_id": boot_id,
        "seq": seq,
        "ts": utc_now(),
        "temperature_c": temperature_c,
        "humidity_pct": humidity_pct,
        "mq135_adc_raw": mq135_adc_raw,
    }


def main() -> None:
    if SCENARIO not in SCENARIOS:
        raise SystemExit(
            f"SIM_SCENARIO must be one of {', '.join(sorted(SCENARIOS))}; got {SCENARIO!r}"
        )

    password = os.environ.get("MQTT_SIM_PASSWORD")
    if not password:
        raise SystemExit("MQTT_SIM_PASSWORD is required")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=DEVICE_ID)
    client.username_pw_set(DEVICE_ID, password)
    client.will_set(f"{BASE}/status", '{"state":"offline"}', qos=1, retain=True)

    connected = threading.Event()
    stop = threading.Event()
    started_at = time.monotonic()
    fan_state = "OFF"
    led_state = "OFF"
    sample_interval_seconds = DEFAULT_SAMPLE_INTERVAL_SECONDS
    recent_commands: OrderedDict[str, None] = OrderedDict()

    def publish_status(state: str) -> None:
        body = {
            "state": state,
            "firmware_version": FIRMWARE_VERSION,
            "uptime_seconds": int(time.monotonic() - started_at),
            "sampling_interval_seconds": int(sample_interval_seconds),
            "mq135_warming_up": False,  # simulated sensor has no heater
            "ts": utc_now(),
        }
        info = client.publish(
            f"{BASE}/status", json.dumps(body), qos=1, retain=True
        )
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            print(f"Could not queue {state} status: rc={info.rc}", flush=True)

    def publish_ack(
        command_id: str,
        result: str,
        reason: str | None = None,
        action: str | None = None,
    ) -> None:
        body = {
            "command_id": command_id,
            "result": result,
            "fan_state": fan_state,
            "led_state": led_state,
            "sampling_interval_seconds": int(sample_interval_seconds),
            "ts": utc_now(),
        }
        if action:
            body["action"] = action
        if reason:
            body["reason"] = reason
        info = client.publish(f"{BASE}/ack", json.dumps(body), qos=1)
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            print(f"Could not queue ACK {command_id}: rc={info.rc}", flush=True)

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            print(f"MQTT connection rejected: {reason_code}", flush=True)
            return
        client.subscribe([(f"{BASE}/command", 1), (f"{BASE}/config", 1)])
        connected.set()
        print(f"Connected as {DEVICE_ID}; scenario={SCENARIO}", flush=True)

    def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
        connected.clear()
        print(f"MQTT disconnected: {reason_code}", flush=True)

    def on_message(client, userdata, message):
        nonlocal fan_state, led_state, sample_interval_seconds
        if message.topic not in {f"{BASE}/command", f"{BASE}/config"}:
            return

        try:
            body = json.loads(message.payload)
        except (UnicodeDecodeError, json.JSONDecodeError):
            print("Rejected invalid command JSON", flush=True)
            return

        if not isinstance(body, dict):
            return
        command_id = body.get("command_id")
        action = body.get("action")
        value = body.get("value")
        if not isinstance(command_id, str) or not (1 <= len(command_id) <= 64):
            print("Rejected command without valid command_id", flush=True)
            return
        if action == "SAMPLING_INTERVAL_SET":
            if isinstance(value, bool) or not isinstance(value, int) or not 2 <= value <= 300:
                publish_ack(
                    command_id,
                    "REJECTED",
                    "sampling_interval_out_of_range",
                    action,
                )
                return
        elif isinstance(action, str) and action in {"FAN_SET", "LED_SET"}:
            if not isinstance(value, str) or value not in {"ON", "OFF"}:
                publish_ack(
                    command_id,
                    "REJECTED",
                    "unsupported_action_or_value",
                    action,
                )
                return
        else:
            publish_ack(
                command_id,
                "REJECTED",
                "unsupported_action_or_value",
                action if isinstance(action, str) else None,
            )
            return

        if command_id not in recent_commands:
            if action == "FAN_SET":
                fan_state = value
            elif action == "LED_SET":
                led_state = value
            else:
                sample_interval_seconds = float(value)
            recent_commands[command_id] = None
            if len(recent_commands) > RECENT_COMMAND_LIMIT:
                recent_commands.popitem(last=False)

        publish_ack(command_id, "OK", action=action)
        print(
            f"Simulated {action}: {value}; fan={fan_state}, led={led_state}, "
            f"sample_interval={sample_interval_seconds}s",
            flush=True,
        )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.connect_async(
        os.environ.get("MQTT_HOST", "mosquitto"),
        int(os.environ.get("MQTT_PORT", "1883")),
        keepalive=30,
    )
    client.loop_start()

    def request_stop(signum, frame):
        stop.set()

    signal.signal(signal.SIGTERM, request_stop)
    boot_id = uuid4().hex
    seq = 0
    last_sample_at = 0.0
    last_heartbeat_at = 0.0
    was_connected = False

    try:
        while not stop.is_set():
            if not connected.wait(timeout=0.5):
                was_connected = False
                continue

            now = time.monotonic()
            if not was_connected:
                last_heartbeat_at = 0.0
                was_connected = True

            if now - last_sample_at >= sample_interval_seconds:
                sample = make_sample(boot_id, seq, SCENARIO)
                info = client.publish(
                    f"{BASE}/telemetry", json.dumps(sample), qos=1
                )
                if info.rc == mqtt.MQTT_ERR_SUCCESS:
                    print(
                        f"Queued sample seq={seq}: "
                        f"{sample['temperature_c']} C, "
                        f"{sample['humidity_pct']}%, "
                        f"MQ135 ADC={sample['mq135_adc_raw']}",
                        flush=True,
                    )
                    seq += 1
                else:
                    print(f"Could not queue telemetry: rc={info.rc}", flush=True)
                last_sample_at = now

            if now - last_heartbeat_at >= HEARTBEAT_INTERVAL_SECONDS:
                publish_status("online")
                last_heartbeat_at = now

            stop.wait(0.2)
    except KeyboardInterrupt:
        stop.set()
    finally:
        try:
            if connected.is_set():
                status_info = client.publish(
                    f"{BASE}/status",
                    json.dumps({
                        "state": "offline",
                        "firmware_version": FIRMWARE_VERSION,
                        "uptime_seconds": int(time.monotonic() - started_at),
                        "sampling_interval_seconds": int(sample_interval_seconds),
                        "ts": utc_now(),
                    }),
                    qos=1,
                    retain=True,
                )
                status_info.wait_for_publish(timeout=2)
        finally:
            client.disconnect()
            client.loop_stop()


if __name__ == "__main__":
    main()
