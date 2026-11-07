"""Authentication endpoints: login, profile, password change."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import AuditResult, User, UserStatus
from app.schemas import (
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with username and password, return signed JWT."""
    stmt = select(User).where(User.username == payload.username)
    user = db.execute(stmt).scalars().first()

    ip = request.client.host if request.client else None

    # Generic error message to prevent user enumeration
    invalid_creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        record_audit(
            db, action="LOGIN_FAILED", target_type="USER", target_id=payload.username,
            result=AuditResult.FAILED, ip_address=ip, metadata={"reason": "User not found"}
        )
        raise invalid_creds_exc

    if user.status == UserStatus.LOCKED:
        record_audit(
            db, action="LOGIN_LOCKED", target_type="USER", target_id=str(user.id),
            actor_user_id=user.id, result=AuditResult.FAILED, ip_address=ip,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")

    if not verify_password(payload.password, user.password_hash):
        record_audit(
            db, action="LOGIN_FAILED", target_type="USER", target_id=str(user.id),
            actor_user_id=user.id, result=AuditResult.FAILED, ip_address=ip, metadata={"reason": "Bad password"}
        )
        raise invalid_creds_exc

    token, expires_in = create_access_token(user.id, user.username, user.role)
    record_audit(
        db, action="LOGIN_SUCCESS", target_type="USER", target_id=str(user.id),
        actor_user_id=user.id, result=AuditResult.SUCCESS, ip_address=ip
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=expires_in,
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently logged-in user."""
    return current_user


@router.patch("/password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password after verifying existing password."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu hiện tại không chính xác")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    record_audit(
        db, action="CHANGE_PASSWORD", target_type="USER", target_id=str(current_user.id),
        actor_user_id=current_user.id, result=AuditResult.SUCCESS
    )
    return {"status": "ok", "message": "Đổi mật khẩu thành công"}


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's own profile info."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.email is not None:
        # Check if email is already taken by another user
        stmt = select(User).where(User.email == payload.email, User.id != current_user.id)
        if db.execute(stmt).scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email này đã được sử dụng")
        current_user.email = payload.email

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Acknowledge user logout (token expiration handled client-side)."""
    record_audit(
        db, action="LOGOUT", target_type="USER", target_id=str(current_user.id),
        actor_user_id=current_user.id, result=AuditResult.SUCCESS
    )
    return {"status": "ok", "message": "Đăng xuất thành công"}

