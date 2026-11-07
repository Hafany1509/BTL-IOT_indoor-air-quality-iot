"""Audit logging helper that ensures security actions are immutably recorded."""
import copy
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import ActorType, AuditLog, AuditResult


SENSITIVE_KEYS = {"password", "token", "password_hash", "access_token", "credential_hash", "secret"}


def sanitize_metadata(data: Any) -> Any:
    """Removes sensitive keys from dictionary structures before logging."""
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                clean[k] = "[REDACTED]"
            else:
                clean[k] = sanitize_metadata(v)
        return clean
    elif isinstance(data, list):
        return [sanitize_metadata(item) for item in data]
    return data


def record_audit(
    db: Session,
    action: str,
    target_type: str,
    target_id: str,
    actor_type: ActorType = ActorType.USER,
    actor_user_id: Optional[int] = None,
    actor_device_id: Optional[str] = None,
    result: AuditResult = AuditResult.SUCCESS,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """Creates and commits an immutable audit log record."""
    clean_metadata = sanitize_metadata(copy.deepcopy(metadata)) if metadata else None
    log_entry = AuditLog(
        actor_type=actor_type,
        actor_user_id=actor_user_id,
        actor_device_id=actor_device_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        result=result,
        ip_address=ip_address,
        request_id=request_id,
        metadata_=clean_metadata,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

