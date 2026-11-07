"""SQLAlchemy 2.0 ORM models corresponding to database/init/001_full_schema.sql."""
import enum
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Double,
    Enum,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Enums matching database DDL
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LOCKED = "LOCKED"


class DeviceLifecycle(str, enum.Enum):
    REGISTERED = "REGISTERED"
    PROVISIONED = "PROVISIONED"
    ACTIVE = "ACTIVE"
    OFFLINE = "OFFLINE"
    FAULT = "FAULT"
    MAINTENANCE = "MAINTENANCE"
    LOCKED = "LOCKED"
    DECOMMISSIONED = "DECOMMISSIONED"


class AssignmentPermission(str, enum.Enum):
    VIEW = "VIEW"
    CONTROL = "CONTROL"
    MANAGE = "MANAGE"


class QualityLevel(str, enum.Enum):
    GOOD = "GOOD"
    MODERATE = "MODERATE"
    POOR = "POOR"
    UNHEALTHY = "UNHEALTHY"


class ValidationStatus(str, enum.Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    ANOMALY = "ANOMALY"


class RuleMetric(str, enum.Enum):
    TEMPERATURE = "TEMPERATURE"
    HUMIDITY = "HUMIDITY"
    MQ135_RAW = "MQ135_RAW"


class RuleOperator(str, enum.Enum):
    GT = "GT"
    GTE = "GTE"
    LT = "LT"
    LTE = "LTE"
    EQ = "EQ"


class RuleSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class CommandStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    ACKED = "ACKED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"


class ActorType(str, enum.Enum):
    USER = "USER"
    DEVICE = "DEVICE"
    SYSTEM = "SYSTEM"


class AuditResult(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


# 1. Rooms
class Room(Base):
    __tablename__ = "rooms"

    room_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="room")


# 2. Users
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.VIEWER)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    assignments: Mapped[list["DeviceAssignment"]] = relationship("DeviceAssignment", foreign_keys="DeviceAssignment.user_id", back_populates="user")
    commands: Mapped[list["Command"]] = relationship("Command", back_populates="requester")


# 3. Devices
class Device(Base):
    __tablename__ = "devices"

    device_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_id: Mapped[str] = mapped_column(String(64), ForeignKey("rooms.room_id"), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    lifecycle: Mapped[DeviceLifecycle] = mapped_column(Enum(DeviceLifecycle), nullable=False, default=DeviceLifecycle.REGISTERED)
    firmware_version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    credential_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mqtt_client_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    room: Mapped["Room"] = relationship("Room", back_populates="devices")
    telemetry_samples: Mapped[list["Telemetry"]] = relationship("Telemetry", back_populates="device")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="device")
    commands: Mapped[list["Command"]] = relationship("Command", back_populates="device")


# 4. Device Assignments
class DeviceAssignment(Base):
    __tablename__ = "device_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("devices.device_id", ondelete="CASCADE"), nullable=True)
    room_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("rooms.room_id", ondelete="CASCADE"), nullable=True)
    permission: Mapped[AssignmentPermission] = mapped_column(Enum(AssignmentPermission), nullable=False, default=AssignmentPermission.VIEW)
    assigned_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="assignments")


# 5. Telemetry
class Telemetry(Base):
    __tablename__ = "telemetry"

    device_id: Mapped[str] = mapped_column(String(64), ForeignKey("devices.device_id"), primary_key=True)
    boot_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    seq: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    measured_at: Mapped[datetime] = mapped_column(DateTime(6), nullable=False, index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(6), server_default=func.now(), nullable=False)
    temperature_c: Mapped[float] = mapped_column(Double, nullable=False)
    humidity_pct: Mapped[float] = mapped_column(Double, nullable=False)
    mq135_adc_raw: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    quality_level: Mapped[QualityLevel] = mapped_column(Enum(QualityLevel), nullable=False, default=QualityLevel.GOOD)
    validation_status: Mapped[ValidationStatus] = mapped_column(Enum(ValidationStatus), nullable=False, default=ValidationStatus.VALID)

    device: Mapped["Device"] = relationship("Device", back_populates="telemetry_samples")

    __table_args__ = (
        Index("ix_telemetry_device_measured", "device_id", "measured_at"),
    )


# 6. Alert Rules
class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    room_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("rooms.room_id", ondelete="CASCADE"), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("devices.device_id", ondelete="CASCADE"), nullable=True)
    metric: Mapped[RuleMetric] = mapped_column(Enum(RuleMetric), nullable=False)
    operator: Mapped[RuleOperator] = mapped_column(Enum(RuleOperator), nullable=False, default=RuleOperator.GT)
    threshold: Mapped[float] = mapped_column(Double, nullable=False)
    severity: Mapped[RuleSeverity] = mapped_column(Enum(RuleSeverity), nullable=False, default=RuleSeverity.MEDIUM)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    cooldown_seconds: Mapped[int] = mapped_column(BigInteger, nullable=False, default=300)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="rule")


# 7. Alerts
class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(64), ForeignKey("devices.device_id"), nullable=False)
    rule_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("alert_rules.id"), nullable=False)
    metric_value: Mapped[float] = mapped_column(Double, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), nullable=False, default=AlertStatus.OPEN)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    acknowledged_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    resolved_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    device: Mapped["Device"] = relationship("Device", back_populates="alerts")
    rule: Mapped["AlertRule"] = relationship("AlertRule", back_populates="alerts")


# 8. Commands
class Command(Base):
    __tablename__ = "commands"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    command_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(64), ForeignKey("devices.device_id"), nullable=False)
    requested_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    command_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[CommandStatus] = mapped_column(Enum(CommandStatus), nullable=False, default=CommandStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    ack_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    timeout_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    result_payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    device: Mapped["Device"] = relationship("Device", back_populates="commands")
    requester: Mapped["User"] = relationship("User", back_populates="commands")


# 9. Audit Logs
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_type: Mapped[ActorType] = mapped_column(Enum(ActorType), nullable=False, default=ActorType.USER)
    actor_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_device_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[AuditResult] = mapped_column(Enum(AuditResult), nullable=False, default=AuditResult.SUCCESS)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

