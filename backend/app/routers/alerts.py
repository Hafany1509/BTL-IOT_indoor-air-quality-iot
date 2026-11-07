"""Alert rules and alert events management endpoints."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.auth import check_device_scope, get_current_user, require_role
from app.database import get_db
from app.models import (
    Alert,
    AlertRule,
    AlertStatus,
    AssignmentPermission,
    AuditResult,
    Device,
    DeviceAssignment,
    User,
    UserRole,
)
from app.schemas import (
    AlertOut,
    AlertResolveRequest,
    AlertRuleCreate,
    AlertRuleOut,
    AlertRuleUpdate,
)

router = APIRouter(tags=["alerts"])


# --- Alert Rules ---
@router.get("/alert-rules", response_model=list[AlertRuleOut])
def list_alert_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all configured alert rules."""
    return db.execute(select(AlertRule).order_by(AlertRule.id.asc())).scalars().all()


@router.post("/alert-rules", response_model=AlertRuleOut, status_code=status.HTTP_201_CREATED)
def create_alert_rule(
    payload: AlertRuleCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin creates a new threshold alert rule."""
    rule = AlertRule(
        name=payload.name,
        room_id=payload.room_id,
        device_id=payload.device_id,
        metric=payload.metric,
        operator=payload.operator,
        threshold=payload.threshold,
        severity=payload.severity,
        is_enabled=payload.is_enabled,
        cooldown_seconds=payload.cooldown_seconds,
        created_by=admin.id,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    record_audit(
        db, action="CREATE_ALERT_RULE", target_type="ALERT_RULE", target_id=str(rule.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"name": rule.name, "metric": rule.metric.value, "threshold": rule.threshold}
    )
    return rule


@router.patch("/alert-rules/{rule_id}", response_model=AlertRuleOut)
def update_alert_rule(
    rule_id: int,
    payload: AlertRuleUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin updates an alert rule configuration."""
    rule = db.get(AlertRule, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quy tắc cảnh báo không tồn tại")

    if payload.name is not None:
        rule.name = payload.name
    if payload.threshold is not None:
        rule.threshold = payload.threshold
    if payload.severity is not None:
        rule.severity = payload.severity
    if payload.is_enabled is not None:
        rule.is_enabled = payload.is_enabled
    if payload.cooldown_seconds is not None:
        rule.cooldown_seconds = payload.cooldown_seconds

    db.commit()
    db.refresh(rule)

    record_audit(
        db, action="UPDATE_ALERT_RULE", target_type="ALERT_RULE", target_id=str(rule.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"threshold": rule.threshold, "is_enabled": rule.is_enabled}
    )
    return rule


@router.delete("/alert-rules/{rule_id}")
def delete_alert_rule(
    rule_id: int,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin deletes an alert rule."""
    rule = db.get(AlertRule, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quy tắc cảnh báo không tồn tại")

    db.delete(rule)
    db.commit()

    record_audit(
        db, action="DELETE_ALERT_RULE", target_type="ALERT_RULE", target_id=str(rule_id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS
    )
    return {"status": "ok", "message": "Đã xóa quy tắc cảnh báo"}


# --- Alerts ---
@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List triggered alert events.
    Scoped: Users only see alerts for devices they have access to.
    """
    stmt = select(Alert)
    if status_filter:
        stmt = stmt.where(Alert.status == status_filter)

    if current_user.role != UserRole.ADMIN:
        assignments = db.execute(
            select(DeviceAssignment).where(DeviceAssignment.user_id == current_user.id)
        ).scalars().all()
        dev_ids = {a.device_id for a in assignments if a.device_id}
        room_ids = {a.room_id for a in assignments if a.room_id}

        if not dev_ids and not room_ids:
            return []

        # Subquery or join devices
        stmt = stmt.join(Device, Alert.device_id == Device.device_id).where(
            or_(
                Alert.device_id.in_(dev_ids),
                Device.room_id.in_(room_ids),
            )
        )

    stmt = stmt.order_by(Alert.triggered_at.desc()).limit(100)
    return db.execute(stmt).scalars().all()


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
    db: Session = Depends(get_db),
):
    """Operator or Admin acknowledges receipt of an alert."""
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cảnh báo không tồn tại")

    # Scope check
    check_device_scope(db, current_user, alert.device_id, AssignmentPermission.CONTROL)

    if alert.status != AlertStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cảnh báo đang ở trạng thái {alert.status.value}")

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(alert)

    record_audit(
        db, action="ACKNOWLEDGE_ALERT", target_type="ALERT", target_id=str(alert.id),
        actor_user_id=current_user.id, result=AuditResult.SUCCESS,
        metadata={"device_id": alert.device_id, "rule_id": alert.rule_id}
    )
    return alert


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: int,
    payload: AlertResolveRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
    db: Session = Depends(get_db),
):
    """Operator or Admin marks an alert resolved with notes."""
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cảnh báo không tồn tại")

    # Scope check
    check_device_scope(db, current_user, alert.device_id, AssignmentPermission.CONTROL)

    alert.status = AlertStatus.RESOLVED
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if payload.resolution_notes:
        alert.resolution_notes = payload.resolution_notes

    db.commit()
    db.refresh(alert)

    record_audit(
        db, action="RESOLVE_ALERT", target_type="ALERT", target_id=str(alert.id),
        actor_user_id=current_user.id, result=AuditResult.SUCCESS,
        metadata={"device_id": alert.device_id, "notes": payload.resolution_notes}
    )
    return alert

