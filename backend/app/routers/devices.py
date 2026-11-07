"""Device management, lifecycle transitions, assignment, and telemetry history."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.auth import check_device_scope, get_current_user, require_role
from app.database import get_db
from app.models import (
    AssignmentPermission,
    AuditResult,
    Device,
    DeviceAssignment,
    DeviceLifecycle,
    Room,
    Telemetry,
    User,
    UserRole,
)
from app.schemas import (
    DeviceAssignmentCreate,
    DeviceAssignmentOut,
    DeviceLifecycleUpdate,
    DeviceOut,
    DeviceRegisterRequest,
    RoomCreate,
    RoomOut,
    TelemetryOut,
)

router = APIRouter(tags=["devices"])


# --- Rooms ---
@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all available rooms."""
    return db.execute(select(Room).order_by(Room.name.asc())).scalars().all()


@router.post("/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin creates a new room location."""
    if db.get(Room, payload.room_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã phòng đã tồn tại")
    room = Room(room_id=payload.room_id, name=payload.name, description=payload.description)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


# --- Devices ---
@router.get("/devices", response_model=list[DeviceOut])
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List devices accessible to the current user.
    - ADMIN sees all devices.
    - OPERATOR / VIEWER sees only devices explicitly assigned directly or via room.
    """
    if current_user.role == UserRole.ADMIN:
        return db.execute(select(Device).order_by(Device.device_id.asc())).scalars().all()

    # Find assigned device IDs and room IDs
    assignments = db.execute(
        select(DeviceAssignment).where(DeviceAssignment.user_id == current_user.id)
    ).scalars().all()

    assigned_device_ids = {a.device_id for a in assignments if a.device_id}
    assigned_room_ids = {a.room_id for a in assignments if a.room_id}

    if not assigned_device_ids and not assigned_room_ids:
        return []

    stmt = select(Device).where(
        or_(
            Device.device_id.in_(assigned_device_ids),
            Device.room_id.in_(assigned_room_ids),
        )
    ).order_by(Device.device_id.asc())

    return db.execute(stmt).scalars().all()


@router.get("/devices/{device_id}", response_model=DeviceOut)
def get_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single device details after verifying user's scope."""
    device = check_device_scope(db, current_user, device_id, AssignmentPermission.VIEW)
    return device


@router.post("/devices", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def register_device(
    payload: DeviceRegisterRequest,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Register a new device into the system (status starts as REGISTERED)."""
    if db.get(Device, payload.device_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã thiết bị đã tồn tại")

    if not db.get(Room, payload.room_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Phòng {payload.room_id} không tồn tại")

    device = Device(
        device_id=payload.device_id,
        room_id=payload.room_id,
        display_name=payload.display_name,
        lifecycle=DeviceLifecycle.REGISTERED,
        firmware_version=payload.firmware_version,
        mqtt_client_id=payload.mqtt_client_id or payload.device_id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    record_audit(
        db, action="REGISTER_DEVICE", target_type="DEVICE", target_id=device.device_id,
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"room_id": device.room_id, "display_name": device.display_name}
    )
    return device


@router.patch("/devices/{device_id}/lifecycle", response_model=DeviceOut)
def update_device_lifecycle(
    device_id: str,
    payload: DeviceLifecycleUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
    db: Session = Depends(get_db),
):
    """
    Transition device lifecycle state (REGISTERED, PROVISIONED, ACTIVE,
    OFFLINE, FAULT, MAINTENANCE, LOCKED, DECOMMISSIONED).
    """
    device = check_device_scope(db, admin, device_id, AssignmentPermission.MANAGE)

    old_state = device.lifecycle
    new_state = payload.lifecycle

    # Operator cannot decommission or lock device (Admin only)
    if admin.role != UserRole.ADMIN and new_state in (DeviceLifecycle.LOCKED, DeviceLifecycle.DECOMMISSIONED):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Admin mới có quyền Khóa hoặc Ngừng sử dụng thiết bị")

    device.lifecycle = new_state
    db.commit()
    db.refresh(device)

    record_audit(
        db, action="DEVICE_LIFECYCLE_CHANGE", target_type="DEVICE", target_id=device.device_id,
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"old_state": old_state.value, "new_state": new_state.value, "reason": payload.reason}
    )
    return device


# --- Device Assignments ---
@router.post("/devices/{device_id}/assignments", response_model=DeviceAssignmentOut)
def assign_device(
    device_id: str,
    payload: DeviceAssignmentCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Assign an Operator or Viewer to a specific device or room."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thiết bị không tồn tại")

    target_user = db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")

    # Check existing assignment
    stmt = select(DeviceAssignment).where(
        DeviceAssignment.user_id == payload.user_id,
        DeviceAssignment.device_id == device_id,
    )
    existing = db.execute(stmt).scalars().first()
    if existing:
        existing.permission = payload.permission
        existing.expires_at = payload.expires_at
        db.commit()
        db.refresh(existing)
        return existing

    assignment = DeviceAssignment(
        user_id=payload.user_id,
        device_id=device_id,
        permission=payload.permission,
        assigned_by=admin.id,
        expires_at=payload.expires_at,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    record_audit(
        db, action="ASSIGN_DEVICE", target_type="DEVICE_ASSIGNMENT", target_id=str(assignment.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"user_id": payload.user_id, "device_id": device_id, "permission": payload.permission.value}
    )
    return assignment


# --- Telemetry Queries ---
@router.get("/devices/{device_id}/telemetry", response_model=list[TelemetryOut])
def get_device_telemetry_history(
    device_id: str,
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Query telemetry time-series history for a device.
    Supports filtering by from_time and to_time (UTC).
    """
    check_device_scope(db, current_user, device_id, AssignmentPermission.VIEW)

    stmt = select(Telemetry).where(Telemetry.device_id == device_id)
    if from_time:
        stmt = stmt.where(Telemetry.measured_at >= from_time)
    if to_time:
        stmt = stmt.where(Telemetry.measured_at <= to_time)

    stmt = stmt.order_by(Telemetry.measured_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/devices/{device_id}/telemetry/latest", response_model=Optional[TelemetryOut])
def get_latest_telemetry(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the single most recent telemetry sample."""
    check_device_scope(db, current_user, device_id, AssignmentPermission.VIEW)

    stmt = select(Telemetry).where(Telemetry.device_id == device_id).order_by(Telemetry.measured_at.desc()).limit(1)
    return db.execute(stmt).scalars().first()

