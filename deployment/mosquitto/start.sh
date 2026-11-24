#!/bin/sh
set -eu
umask 077
# The file survives a container stop/start; mosquitto_passwd -c refuses to overwrite it.
rm -f /tmp/iot-passwords
mosquitto_passwd -b -c /tmp/iot-passwords iot-backend "$MQTT_BACKEND_PASSWORD"
mosquitto_passwd -b /tmp/iot-passwords esp32-a-01 "$MQTT_ESP32_PASSWORD"
mosquitto_passwd -b /tmp/iot-passwords sim-b-01 "$MQTT_SIM_PASSWORD"
chown mosquitto:mosquitto /tmp/iot-passwords
exec mosquitto -c /iot/mosquitto.conf

