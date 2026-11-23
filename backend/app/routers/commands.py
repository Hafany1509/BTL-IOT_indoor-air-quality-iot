"""Command dispatching and ACK / Timeout tracking endpoints."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.auth import check_device_scope, get_current_user
from app.database import get_db
from app.models import (
    AssignmentPermission,
    AuditResult,
    Command,
    CommandStatus,
    DeviceLifecycle,
    User,
)
from app.mqtt_client import dispatch_device_command
from app.schemas import CommandCreate, CommandOut

router = APIRouter(tags=["commands"])


@router.post("/devices/{device_id}/commands", response_model=CommandOut, status_code=status.HTTP_201_CREATED)
def send_command(
    device_id: str,
    payload: CommandCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dispatch a command to an actuator (e.g. FAN_SET, LED_SET).
    - Checks user has CONTROL or MANAGE permission on this device (Viewer is blocked).
    - Checks device lifecycle is ACTIVE.
    - Publishes to MQTT and tracks PENDING -> SENT -> ACKED/TIMEOUT.
    """
    device = check_device_scope(db, current_user, device_id, AssignmentPermission.CONTROL)

    if device.lifecycle != DeviceLifecycle.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot dispatch command: Device '{device_id}' is currently {device.lifecycle.value}",
        )

    cmd_id = f"cmd-{uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    timeout_at = now + timedelta(seconds=payload.timeout_seconds)

    # Wrap action and payload for MQTT device compatibility
    full_payload = {**payload.payload, "command_id": cmd_id}

    command_record = Command(
        command_id=cmd_id,
        device_id=device_id,
        requested_by=current_user.id,
        command_type=payload.command_type,
        payload=full_payload,
        status=CommandStatus.PENDING,
        created_at=now,
        timeout_at=timeout_at,
    )
    db.add(command_record)
    db.commit()
    db.refresh(command_record)

    # Publish to MQTT topic home/{room_id}/{device_id}/command
    sent = dispatch_device_command(device.room_id, device_id, full_payload)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if sent:
        # Chỉ chuyển sang SENT nếu lệnh vẫn còn PENDING, tránh ghi đè ACKED mà worker đã lưu
        db.execute(
            update(Command)
            .where(Command.id == command_record.id, Command.status == CommandStatus.PENDING)
            .values(status=CommandStatus.SENT, sent_at=now)
        )
    else:
        db.execute(
            update(Command)
            .where(Command.id == command_record.id, Command.status == CommandStatus.PENDING)
            .values(
                status=CommandStatus.FAILED,
                error_message="Failed to publish message to MQTT broker",
            )
        )

    db.commit()
    db.refresh(command_record)

    record_audit(
        db, action="SEND_COMMAND", target_type="COMMAND", target_id=cmd_id,
        actor_user_id=current_user.id, result=AuditResult.SUCCESS if sent else AuditResult.FAILED,
        metadata={"device_id": device_id, "command_type": payload.command_type, "payload": full_payload}
    )
    return command_record


@router.get("/commands/{command_id}", response_model=CommandOut)
def get_command_status(
    command_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve command details, ACK status, or timeout state."""
    stmt = select(Command).where(Command.command_id == command_id)
    cmd = db.execute(stmt).scalars().first()
    if not cmd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lệnh không tồn tại")

    # Scope check
    check_device_scope(db, current_user, cmd.device_id, AssignmentPermission.VIEW)

    # Check if timeout has expired while still in SENT status
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if cmd.status == CommandStatus.SENT and cmd.timeout_at < now:
        cmd.status = CommandStatus.TIMEOUT
        cmd.error_message = "Device did not ACK within timeout threshold"
        db.commit()
        db.refresh(cmd)

    return cmd


@router.get("/devices/{device_id}/commands", response_model=list[CommandOut])
def list_device_commands(
    device_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List historical command records for a device."""
    check_device_scope(db, current_user, device_id, AssignmentPermission.VIEW)

    stmt = select(Command).where(Command.device_id == device_id).order_by(Command.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()

