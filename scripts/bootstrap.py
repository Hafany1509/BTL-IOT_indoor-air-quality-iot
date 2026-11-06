"""Create a local .env without overwriting an existing file."""
from pathlib import Path
from secrets import token_hex

root = Path(__file__).resolve().parents[1]
values = {
    "MYSQL_DATABASE": "air_quality",
    "MYSQL_USER": "iot_app",
    **{name: token_hex(24) for name in (
        "MYSQL_PASSWORD", "MYSQL_ROOT_PASSWORD",
        "MQTT_BACKEND_PASSWORD", "MQTT_ESP32_PASSWORD", "MQTT_SIM_PASSWORD",
    )},
    "MQTT_BIND_ADDRESS": "127.0.0.1",
}
try:
    with (root / ".env").open("x", encoding="utf-8", newline="\n") as f:
        f.writelines(f"{key}={value}\n" for key, value in values.items())
except FileExistsError:
    print(".env already exists; kept unchanged.")
else:
    print("Created .env with local credentials.")

