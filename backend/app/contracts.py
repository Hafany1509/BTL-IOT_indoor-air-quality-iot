from datetime import datetime, timezone
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class Telemetry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    device_id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    boot_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    seq: int = Field(strict=True, ge=0, le=2**32 - 1)
    ts: AwareDatetime
    temperature_c: float = Field(strict=True, ge=-40, le=80)
    humidity_pct: float = Field(strict=True, ge=0, le=100)
    mq135_adc_raw: int = Field(strict=True, ge=0, le=4095)

    @field_validator("ts", mode="before")
    @classmethod
    def require_timestamp_string(cls, value: object) -> object:
        if not isinstance(value, str) or "T" not in value:
            raise ValueError("ts must be an ISO 8601 timestamp with timezone")
        return value


def decode_telemetry(topic: str, payload: bytes) -> tuple[str, Telemetry]:
    prefix, room_id, device_id, kind = topic.split("/")
    if prefix != "home" or kind != "telemetry" or not room_id:
        raise ValueError("unexpected telemetry topic")
    sample = Telemetry.model_validate_json(payload)
    if sample.device_id != device_id:
        raise ValueError("device_id does not match topic")
    sample.ts = sample.ts.astimezone(timezone.utc)
    return room_id, sample

