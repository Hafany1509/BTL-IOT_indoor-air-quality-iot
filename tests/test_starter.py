import json

import pytest
from fastapi.testclient import TestClient

from app.contracts import decode_telemetry
from app.main import app


def sample(**changes):
    return json.dumps({
        "schema_version": 1, "device_id": "sim-b-01", "boot_id": "a" * 32,
        "seq": 1, "ts": "2026-11-06T14:00:00+07:00",
        "temperature_c": 27.1, "humidity_pct": 55.0, "mq135_adc_raw": 512,
    } | changes).encode()


def test_health():
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_valid_message_is_normalized_to_utc():
    room, telemetry = decode_telemetry("home/room-b/sim-b-01/telemetry", sample())
    assert room == "room-b"
    assert telemetry.ts.isoformat() == "2026-11-06T07:00:00+00:00"


@pytest.mark.parametrize("changes", [
    {"device_id": "esp32-a-01"}, {"mq135_adc_raw": 4096},
    {"humidity_pct": -1}, {"ts": "2026-11-06T14:00:00"},
])
def test_rejects_invalid_or_mismatched_payload(changes):
    with pytest.raises(ValueError):
        decode_telemetry("home/room-b/sim-b-01/telemetry", sample(**changes))

