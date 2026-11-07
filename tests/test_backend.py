"""Comprehensive backend tests covering Auth, RBAC, Device Scope, Telemetry, and Commands."""
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import create_access_token, hash_password, verify_password
from app.database import Base, get_db
from app.main import app
from app.models import (
    AssignmentPermission,
    Device,
    DeviceAssignment,
    DeviceLifecycle,
    Room,
    Telemetry,
    User,
    UserRole,
    UserStatus,
)

# Use in-memory SQLite for high-speed automated unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as db:
        # Seed test rooms
        room_a = Room(room_id="room-a", name="Phòng Test A")
        db.add(room_a)

        # Seed test users
        pw_hash = hash_password("Demo@2026!")
        admin = User(id=1, username="admin", email="admin@test.local", password_hash=pw_hash, full_name="Admin", role=UserRole.ADMIN, status=UserStatus.ACTIVE)
        operator = User(id=2, username="operator", email="operator@test.local", password_hash=pw_hash, full_name="Operator", role=UserRole.OPERATOR, status=UserStatus.ACTIVE)
        viewer = User(id=3, username="viewer", email="viewer@test.local", password_hash=pw_hash, full_name="Viewer", role=UserRole.VIEWER, status=UserStatus.ACTIVE)
        locked = User(id=4, username="locked", email="locked@test.local", password_hash=pw_hash, full_name="Locked", role=UserRole.OPERATOR, status=UserStatus.LOCKED)
        db.add_all([admin, operator, viewer, locked])

        # Seed test device
        dev1 = Device(device_id="esp32-a-01", room_id="room-a", display_name="ESP32 A", lifecycle=DeviceLifecycle.ACTIVE)
        dev2 = Device(device_id="esp32-b-02", room_id="room-a", display_name="ESP32 B", lifecycle=DeviceLifecycle.ACTIVE)
        db.add_all([dev1, dev2])

        # Seed assignment: operator has CONTROL on esp32-a-01; viewer has VIEW on esp32-a-01
        # Neither has access to esp32-b-02 (to test IDOR T10)
        assign_op = DeviceAssignment(user_id=2, device_id="esp32-a-01", permission=AssignmentPermission.CONTROL, assigned_by=1)
        assign_vi = DeviceAssignment(user_id=3, device_id="esp32-a-01", permission=AssignmentPermission.VIEW, assigned_by=1)
        db.add_all([assign_op, assign_vi])

        db.commit()
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def get_token_for(username: str, user_id: int, role: UserRole) -> str:
    token, _ = create_access_token(user_id=user_id, username=username, role=role)
    return token


# --- 1. Password & Hash Tests (T02) ---
def test_password_hash_and_verify():
    raw = "MySuperSecret123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


# --- 2. Auth Login Tests (T01) ---
def test_login_success():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "Demo@2026!"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"


def test_login_wrong_password():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert res.status_code == 401


def test_login_locked_account():
    res = client.post("/api/v1/auth/login", json={"username": "locked", "password": "Demo@2026!"})
    assert res.status_code == 403


# --- 3. RBAC & Device Scope Tests (T09, T10, SC-05) ---
def test_admin_can_access_all_devices():
    token = get_token_for("admin", 1, UserRole.ADMIN)
    res = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    device_ids = [d["device_id"] for d in res.json()]
    assert "esp32-a-01" in device_ids
    assert "esp32-b-02" in device_ids


def test_operator_only_sees_assigned_devices():
    token = get_token_for("operator", 2, UserRole.OPERATOR)
    res = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    device_ids = [d["device_id"] for d in res.json()]
    assert "esp32-a-01" in device_ids
    assert "esp32-b-02" not in device_ids  # IDOR protection


def test_user_cannot_access_unassigned_device_idor():
    token = get_token_for("operator", 2, UserRole.OPERATOR)
    res = client.get("/api/v1/devices/esp32-b-02", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403  # Blocked outside scope


def test_viewer_cannot_send_commands_t09():
    token = get_token_for("viewer", 3, UserRole.VIEWER)
    res = client.post(
        "/api/v1/devices/esp32-a-01/commands",
        json={"command_type": "FAN_SET", "payload": {"action": "FAN_SET", "value": "ON"}, "timeout_seconds": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403  # Viewer is forbidden from controlling devices


@patch("app.routers.commands.dispatch_device_command", return_value=True)
def test_operator_can_send_command_to_assigned_device(mock_dispatch):
    token = get_token_for("operator", 2, UserRole.OPERATOR)
    res = client.post(
        "/api/v1/devices/esp32-a-01/commands",
        json={"command_type": "FAN_SET", "payload": {"action": "FAN_SET", "value": "ON"}, "timeout_seconds": 15},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SENT"
    assert data["command_id"].startswith("cmd-")

