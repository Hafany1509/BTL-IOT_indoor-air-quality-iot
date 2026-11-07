"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    ActorType,
    AlertStatus,
    AssignmentPermission,
    AuditResult,
    CommandStatus,
    DeviceLifecycle,
    QualityLevel,
    RuleMetric,
    RuleOperator,
    RuleSeverity,
    UserRole,
    UserStatus,
    ValidationStatus,
)


# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: int
    username: str
    role: UserRole


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


# --- User Schemas ---
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.VIEWER


class UserStatusUpdate(BaseModel):
    status: UserStatus


class UserRoleUpdate(BaseModel):
    role: UserRole


# --- Room Schemas ---
class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    room_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime


class RoomCreate(BaseModel):
    room_id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


# --- Device Schemas ---
class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    room_id: str
    display_name: str
    lifecycle: DeviceLifecycle
    firmware_version: str
    mqtt_client_id: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DeviceRegisterRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    room_id: str = Field(..., min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=100)
    firmware_version: str = Field("1.0.0", max_length=32)
    mqtt_client_id: Optional[str] = Field(None, max_length=64)


class DeviceLifecycleUpdate(BaseModel):
    lifecycle: DeviceLifecycle
    reason: Optional[str] = Field(None, max_length=255)


# --- Device Assignment Schemas ---
class DeviceAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    device_id: Optional[str] = None
    room_id: Optional[str] = None
    permission: AssignmentPermission
    assigned_by: int
    assigned_at: datetime
    expires_at: Optional[datetime] = None


class DeviceAssignmentCreate(BaseModel):
    user_id: int
    device_id: Optional[str] = None
    room_id: Optional[str] = None
    permission: AssignmentPermission = AssignmentPermission.VIEW
    expires_at: Optional[datetime] = None


# --- Telemetry Schemas ---
class TelemetryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    boot_id: str
    seq: int
    measured_at: datetime
    received_at: datetime
    temperature_c: float
    humidity_pct: float
    mq135_adc_raw: int
    quality_level: QualityLevel
    validation_status: ValidationStatus


# --- Command Schemas ---
class CommandCreate(BaseModel):
    command_type: str = Field(..., min_length=1, max_length=50)
    payload: dict[str, Any] = Field(..., description="Action parameters, e.g. {'action': 'FAN_SET', 'value': 'ON'}")
    timeout_seconds: int = Field(15, ge=2, le=120)


class CommandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    command_id: str
    device_id: str
    requested_by: int
    command_type: str
    payload: dict[str, Any]
    status: CommandStatus
    created_at: datetime
    sent_at: Optional[datetime] = None
    ack_at: Optional[datetime] = None
    timeout_at: datetime
    result_payload: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None


# --- Alert Rule Schemas ---
class AlertRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    room_id: Optional[str] = None
    device_id: Optional[str] = None
    metric: RuleMetric
    operator: RuleOperator
    threshold: float
    severity: RuleSeverity
    is_enabled: bool
    cooldown_seconds: int
    created_by: int
    created_at: datetime
    updated_at: datetime


class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    room_id: Optional[str] = None
    device_id: Optional[str] = None
    metric: RuleMetric
    operator: RuleOperator = RuleOperator.GT
    threshold: float
    severity: RuleSeverity = RuleSeverity.MEDIUM
    is_enabled: bool = True
    cooldown_seconds: int = Field(300, ge=10, le=86400)


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    threshold: Optional[float] = None
    severity: Optional[RuleSeverity] = None
    is_enabled: Optional[bool] = None
    cooldown_seconds: Optional[int] = Field(None, ge=10, le=86400)


# --- Alert Schemas ---
class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    rule_id: int
    metric_value: float
    status: AlertStatus
    triggered_at: datetime
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None


class AlertResolveRequest(BaseModel):
    resolution_notes: Optional[str] = Field(None, max_length=500)


# --- Audit Log Schemas ---
class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_type: ActorType
    actor_user_id: Optional[int] = None
    actor_device_id: Optional[str] = None
    action: str
    target_type: str
    target_id: str
    result: AuditResult
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    metadata_: Optional[dict[str, Any]] = Field(None, serialization_alias="metadata")
    created_at: datetime

