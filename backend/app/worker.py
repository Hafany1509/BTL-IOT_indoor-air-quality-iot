"""MQTT background worker that handles Telemetry, Status/Heartbeat, Command ACKs, and Alert Rules."""
import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import paho.mqtt.client as mqtt
from sqlalchemy import URL, create_engine, select, text, update
from sqlalchemy.orm import sessionmaker

from app.contracts import decode_telemetry
from app.models import (
    Alert,
    AlertRule,
    AlertStatus,
    Command,
    CommandStatus,
    Device,
    DeviceLifecycle,
    RuleMetric,
    RuleOperator,
)

log = logging.getLogger("worker")

# Idempotent insert for telemetry matching QoS 1 retries
INSERT_TELEMETRY = text("""
    INSERT INTO telemetry
        (device_id, boot_id, seq, measured_at, temperature_c, humidity_pct, mq135_adc_raw, quality_level, validation_status)
    SELECT device_id, :boot_id, :seq, :measured_at, :temperature_c, :humidity_pct, :mq135_adc_raw, :quality_level, 'VALID'
    FROM devices
    WHERE device_id = :device_id AND room_id = :room_id AND lifecycle = 'ACTIVE'
    ON DUPLICATE KEY UPDATE received_at = CURRENT_TIMESTAMP(6)
""")


def evaluate_air_quality(mq135_adc_raw: int) -> str:
    """Classifies relative air quality level based on MQ-135 raw ADC count.

    Ngưỡng được hiệu chỉnh theo đo thực tế với ESP32 (ADC 12-bit, mạch chia áp 20k/10k):
      - Không khí trong phòng thường: 0–6
      - Hơi cồn sát cảm biến: tối đa ~235
    Các mức dưới đây phản ánh baseline thực tế; cần tinh chỉnh sau khi cảm biến burn-in.
    """
    if mq135_adc_raw < 50:
        return "GOOD"
    elif mq135_adc_raw < 150:
        return "MODERATE"
    elif mq135_adc_raw < 300:
        return "POOR"
    return "UNHEALTHY"


def check_operator(val: float, threshold: float, op: RuleOperator) -> bool:
    """Evaluates numeric threshold comparison operator."""
    if op == RuleOperator.GT:
        return val > threshold
    elif op == RuleOperator.GTE:
        return val >= threshold
    elif op == RuleOperator.LT:
        return val < threshold
    elif op == RuleOperator.LTE:
        return val <= threshold
    elif op == RuleOperator.EQ:
        return abs(val - threshold) < 1e-4
    return False


def evaluate_alert_rules(session, device_id: str, room_id: str, sample_dict: dict[str, Any]):
    """Evaluates incoming telemetry values against enabled rules with cooldown enforcement."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Fetch applicable enabled rules
    rules = session.execute(
        select(AlertRule).where(
            AlertRule.is_enabled == True,
            (AlertRule.device_id == device_id) | (AlertRule.room_id == room_id) | (
                (AlertRule.device_id.is_(None)) & (AlertRule.room_id.is_(None))
            ),
        )
    ).scalars().all()

    for rule in rules:
        val = None
        if rule.metric == RuleMetric.TEMPERATURE:
            val = float(sample_dict.get("temperature_c", 0))
        elif rule.metric == RuleMetric.HUMIDITY:
            val = float(sample_dict.get("humidity_pct", 0))
        elif rule.metric == RuleMetric.MQ135_RAW:
            val = float(sample_dict.get("mq135_adc_raw", 0))

        if val is None or not check_operator(val, rule.threshold, rule.operator):
            continue

        # Check if an OPEN or ACKNOWLEDGED alert already exists for this rule and device
        existing_alert = session.execute(
            select(Alert).where(
                Alert.device_id == device_id,
                Alert.rule_id == rule.id,
                Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]),
            )
        ).scalars().first()

        if existing_alert:
            continue  # Don't create duplicate open alerts

        # Check cooldown since last triggered alert for this rule and device
        last_alert = session.execute(
            select(Alert)
            .where(Alert.device_id == device_id, Alert.rule_id == rule.id)
            .order_by(Alert.triggered_at.desc())
            .limit(1)
        ).scalars().first()

        if last_alert and (now - last_alert.triggered_at).total_seconds() < rule.cooldown_seconds:
            continue  # Still in cooldown period

        # Trigger new alert
        new_alert = Alert(
            device_id=device_id,
            rule_id=rule.id,
            metric_value=val,
            status=AlertStatus.OPEN,
            triggered_at=now,
        )
        session.add(new_alert)
        log.warning("ALERT TRIGGERED: Device %s exceeded rule '%s' (Value: %.1f, Threshold: %.1f)",
                    device_id, rule.name, val, rule.threshold)

    session.commit()


def watchdog_thread(session_factory, stop_event: threading.Event):
    """
    Periodic background supervisor:
    1. Marks timed-out commands as TIMEOUT.
    2. Detects offline devices (last_seen_at > 60 seconds ago).
    """
    log.info("Watchdog supervisor thread started.")
    while not stop_event.is_set():
        try:
            with session_factory() as session:
                now = datetime.now(timezone.utc).replace(tzinfo=None)

                # 1. Check command timeouts – chỉ áp dụng cho SENT, bỏ qua ACKED/FAILED
                timed_out_cmds = session.execute(
                    select(Command).where(
                        Command.status == CommandStatus.SENT,
                        Command.timeout_at < now,
                    )
                ).scalars().all()

                for cmd in timed_out_cmds:
                    # Kiểm tra lại trạng thái trong vòng lặp để tránh race với worker ACK handler
                    if cmd.status != CommandStatus.SENT:
                        continue
                    cmd.status = CommandStatus.TIMEOUT
                    cmd.error_message = "Timeout: thiết bị không phản hồi ACK kịp thời"
                    log.info("Command %s timed out waiting for ACK", cmd.command_id)

                # 2. Check offline devices (timeout: 60s)
                offline_threshold = now - timedelta(seconds=60)
                offline_devices = session.execute(
                    select(Device).where(
                        Device.lifecycle == DeviceLifecycle.ACTIVE,
                        Device.last_seen_at < offline_threshold,
                    )
                ).scalars().all()

                for dev in offline_devices:
                    dev.lifecycle = DeviceLifecycle.OFFLINE
                    log.warning("Device %s marked OFFLINE (heartbeat missed for >60s)", dev.device_id)

                session.commit()
        except Exception as exc:
            log.error("Watchdog cycle error: %s", exc)

        stop_event.wait(5)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    db_url = URL.create(
        "mysql+pymysql",
        username=os.environ["MYSQL_USER"],
        password=os.environ["MYSQL_PASSWORD"],
        host=os.environ.get("MYSQL_HOST", "mysql"),
        port=int(os.environ.get("MYSQL_PORT", "3306")),
        database=os.environ["MYSQL_DATABASE"],
    )
    engine = create_engine(db_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="iot-backend-worker")
    backend_password = os.environ.get("MQTT_BACKEND_PASSWORD", "")
    if backend_password:
        client.username_pw_set("iot-backend", backend_password)

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            log.error("Broker connection rejected: %s", reason_code)
            return
        log.info("Connected to Mosquitto MQTT Broker. Subscribing to topics...")
        client.subscribe("home/+/+/telemetry", qos=1)
        client.subscribe("home/+/+/status", qos=1)
        client.subscribe("home/+/+/ack", qos=1)

    def on_message(client, userdata, message):
        topic = message.topic
        parts = topic.split("/")
        if len(parts) != 4 or parts[0] != "home":
            return
        _, room_id, device_id, kind = parts

        try:
            with session_factory() as session:
                # 1. Telemetry Handling
                if kind == "telemetry":
                    try:
                        _, sample = decode_telemetry(topic, message.payload)
                    except ValueError as err:
                        log.warning("Rejected invalid telemetry from %s: %s", topic, err)
                        return

                    quality = evaluate_air_quality(sample.mq135_adc_raw)
                    values = sample.model_dump(exclude={"schema_version", "ts"})
                    values.update(
                        room_id=room_id,
                        measured_at=sample.ts.replace(tzinfo=None),
                        quality_level=quality,
                    )
                    session.execute(INSERT_TELEMETRY, values)

                    # Update last_seen_at
                    session.execute(
                        update(Device)
                        .where(Device.device_id == device_id)
                        .values(last_seen_at=datetime.now(timezone.utc).replace(tzinfo=None))
                    )
                    session.commit()

                    # Run alert rules
                    evaluate_alert_rules(session, device_id, room_id, values)

                # 2. Status / Heartbeat / LWT Handling
                elif kind == "status":
                    try:
                        body = json.loads(message.payload)
                        state = body.get("state")
                    except Exception:
                        return

                    now = datetime.now(timezone.utc).replace(tzinfo=None)
                    dev = session.get(Device, device_id)
                    if not dev:
                        return

                    if state == "online":
                        dev.last_seen_at = now
                        if dev.lifecycle in (DeviceLifecycle.REGISTERED, DeviceLifecycle.PROVISIONED, DeviceLifecycle.OFFLINE):
                            dev.lifecycle = DeviceLifecycle.ACTIVE
                            log.info("Device %s is ONLINE and ACTIVE", device_id)
                    elif state == "offline":
                        if dev.lifecycle not in (DeviceLifecycle.LOCKED, DeviceLifecycle.DECOMMISSIONED):
                            dev.lifecycle = DeviceLifecycle.OFFLINE
                            log.warning("Device %s status received: OFFLINE", device_id)

                    session.commit()

                # 3. Command ACK Handling
                elif kind == "ack":
                    try:
                        body = json.loads(message.payload)
                        cmd_id = body.get("command_id")
                        result = body.get("result", "OK")
                    except Exception:
                        return

                    if not cmd_id:
                        return

                    cmd = session.execute(
                        select(Command).where(Command.command_id == cmd_id)
                    ).scalars().first()

                    if cmd:
                        cmd.status = CommandStatus.ACKED if result == "OK" else CommandStatus.FAILED
                        cmd.ack_at = datetime.now(timezone.utc).replace(tzinfo=None)
                        cmd.result_payload = body
                        session.commit()
                        log.info("Command %s updated to %s", cmd_id, cmd.status.value)

        except Exception as exc:
            log.error("Error processing message on %s: %s", topic, exc)

    client.on_connect = on_connect
    client.on_message = on_message

    stop_event = threading.Event()
    watchdog = threading.Thread(target=watchdog_thread, args=(session_factory, stop_event), daemon=True)
    watchdog.start()

    mqtt_host = os.environ.get("MQTT_HOST", "mosquitto")
    mqtt_port = int(os.environ.get("MQTT_PORT", "1883"))
    log.info("Connecting to MQTT broker at %s:%d", mqtt_host, mqtt_port)
    client.connect_async(mqtt_host, mqtt_port, 30)

    try:
        client.loop_forever(retry_first_connection=True)
    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()
        client.disconnect()
        engine.dispose()
        log.info("Worker gracefully stopped.")


if __name__ == "__main__":
    main()
