"""Authentication, JWT token management, and RBAC / Device Scope verification."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AssignmentPermission, Device, DeviceAssignment, User, UserRole, UserStatus

JWT_SECRET = os.environ.get("JWT_SECRET", "iot_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 hours

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with random salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: int, username: str, role: UserRole) -> tuple[str, int]:
    """Generates a signed JWT access token."""
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role.value,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return token, int(expires_delta.total_seconds())


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Extracts and verifies JWT Bearer token, returns the authenticated User."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    if user.status == UserStatus.LOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is locked")
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    return user


def require_role(*allowed_roles: UserRole):
    """Enforces role-based access control (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role {current_user.role.value}",
            )
        return current_user
    return role_checker


def check_device_scope(
    db: Session,
    user: User,
    device_id: str,
    required_permission: AssignmentPermission = AssignmentPermission.VIEW,
) -> Device:
    """
    Enforces scope-based authorization (ABAC / Device Scope):
    - ADMIN has full access to all devices.
    - OPERATOR / VIEWER must be explicitly assigned to the device or the room.
    - Prevents IDOR vulnerabilities.
    """
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Device {device_id} not found")

    # Admins bypass device scope
    if user.role == UserRole.ADMIN:
        return device

    # Viewers cannot request CONTROL or MANAGE permissions
    if user.role == UserRole.VIEWER and required_permission in (AssignmentPermission.CONTROL, AssignmentPermission.MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role cannot execute control or management operations",
        )

    # Check assignment via device_id OR room_id
    stmt = select(DeviceAssignment).where(
        DeviceAssignment.user_id == user.id,
        or_(
            DeviceAssignment.device_id == device_id,
            DeviceAssignment.room_id == device.room_id,
        ),
    )
    assignment = db.execute(stmt).scalars().first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Device '{device_id}' is outside your assigned scope",
        )

    # Check expiration if set
    if assignment.expires_at and assignment.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your assignment for this device has expired",
        )

    # Permission level check
    levels = {AssignmentPermission.VIEW: 1, AssignmentPermission.CONTROL: 2, AssignmentPermission.MANAGE: 3}
    if levels.get(assignment.permission, 0) < levels.get(required_permission, 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {required_permission.value} permission on device '{device_id}'",
        )

    return device

