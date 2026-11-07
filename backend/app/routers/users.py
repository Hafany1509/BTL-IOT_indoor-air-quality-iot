"""User administration endpoints (Admin only)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.auth import hash_password, require_role
from app.database import get_db
from app.models import AuditResult, User, UserRole, UserStatus
from app.schemas import UserCreate, UserOut, UserRoleUpdate, UserStatusUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """List all user accounts in the system."""
    stmt = select(User).order_by(User.id.asc())
    return db.execute(stmt).scalars().all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new user account with a specified role."""
    # Check duplicate username
    if db.execute(select(User).where(User.username == payload.username)).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên người dùng đã tồn tại")

    # Check duplicate email
    if db.execute(select(User).where(User.email == payload.email)).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã tồn tại")

    new_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        status=UserStatus.ACTIVE,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit(
        db, action="CREATE_USER", target_type="USER", target_id=str(new_user.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"username": new_user.username, "role": new_user.role.value}
    )
    return new_user


@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Lock, unlock, or deactivate a user account."""
    if user_id == admin.id and payload.status == UserStatus.LOCKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự khóa tài khoản Admin của chính mình")

    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")

    target.status = payload.status
    db.commit()
    db.refresh(target)

    record_audit(
        db, action="UPDATE_USER_STATUS", target_type="USER", target_id=str(target.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"new_status": payload.status.value}
    )
    return target


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    admin: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Change a user's role (ADMIN, OPERATOR, VIEWER)."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")

    target.role = payload.role
    db.commit()
    db.refresh(target)

    record_audit(
        db, action="CHANGE_USER_ROLE", target_type="USER", target_id=str(target.id),
        actor_user_id=admin.id, result=AuditResult.SUCCESS,
        metadata={"new_role": payload.role.value}
    )
    return target

