"""One MQTT worker per deployment. The API does not start another consumer."""
import logging
import os

import paho.mqtt.client as mqtt
from sqlalchemy import URL, create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.contracts import decode_telemetry

log = logging.getLogger("telemetry")
INSERT = text("""
    INSERT INTO telemetry
        (device_id, boot_id, seq, measured_at, temperature_c, humidity_pct, mq135_adc_raw)
    SELECT device_id, :boot_id, :seq, :measured_at, :temperature_c, :humidity_pct, :mq135_adc_raw
    FROM devices
    WHERE device_id = :device_id AND room_id = :room_id AND lifecycle = 'ACTIVE'
    ON DUPLICATE KEY UPDATE received_at = telemetry.received_at
""")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    db = create_engine(
        URL.create("mysql+pymysql", username=os.environ["MYSQL_USER"],
                   password=os.environ["MYSQL_PASSWORD"],
                   host=os.environ.get("MYSQL_HOST", "mysql"),
                   database=os.environ["MYSQL_DATABASE"]),
        pool_pre_ping=True,
    )
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="iot-backend")
    client.username_pw_set("iot-backend", os.environ["MQTT_BACKEND_PASSWORD"])

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            log.error("Broker rejected connection: %s", reason_code)
            return
        client.subscribe("home/+/+/telemetry", qos=1)

    def on_message(client, userdata, message):
        try:
            room_id, sample = decode_telemetry(message.topic, message.payload)
        except ValueError:
            log.warning("Rejected invalid telemetry on %s", message.topic)
            return
        values = sample.model_dump(exclude={"schema_version", "ts"})
        values.update(room_id=room_id, measured_at=sample.ts.replace(tzinfo=None))
        try:
            with db.begin() as conn:
                conn.execute(INSERT, values)
        except SQLAlchemyError as exc:
            # Starter: log the failure. A durable retry queue is a follow-up.
            log.error("Database write failed (%s)", type(exc).__name__)

    client.on_connect = on_connect
    client.on_message = on_message
    client.connect_async(os.environ.get("MQTT_HOST", "mosquitto"),
                         int(os.environ.get("MQTT_PORT", "1883")), 30)
    try:
        client.loop_forever(retry_first_connection=True)
    finally:
        client.disconnect()
        db.dispose()


if __name__ == "__main__":
    main()

