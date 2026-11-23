# API CONTRACT – HỆ THỐNG IoT GIÁM SÁT KHÔNG KHÍ

> Nguồn: mã nguồn backend trong ZIP do người dùng cung cấp. Kiểm tra tĩnh, chưa chạy Swagger hoặc kiểm thử tích hợp.

**Tổng cộng: 29 endpoint / 7 router.** Base prefix `/api/v1`.

## Quy ước

- `datetime` trong JSON là chuỗi ngày giờ ISO 8601; `Optional[T]` cho phép `null`.
- Các field của schema response có thể trả `null` nếu khai báo Optional; bảng chỉ ra tính bắt buộc của request, không đồng nghĩa tất cả response luôn có giá trị khác null.
- Mã lỗi liệt kê gồm lỗi tường minh trong router, lỗi dependency và 422 do FastAPI; không khẳng định đây là danh sách lỗi runtime đầy đủ.
- Các response không khai báo `response_model` được mô tả theo lệnh `return` trong router.
- Phân quyền ở bảng phải đọc kèm `app/auth.py`; các API liệt kê danh sách có thể lọc theo assignment mà không gọi trực tiếp `check_device_scope`.

## A. Danh mục endpoint

| # | Method | URL | Request schema | Response schema | HTTP | Quyền | Trang |
|---:|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/v1/alert-rules` | `—` | `list[AlertRuleOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Alert Rules |
| 2 | `POST` | `/api/v1/alert-rules` | `AlertRuleCreate` | `AlertRuleOut` | 201 | ADMIN | Alert Rules |
| 3 | `PATCH` | `/api/v1/alert-rules/{rule_id}` | `AlertRuleUpdate` | `AlertRuleOut` | 200 | ADMIN | Alert Rules |
| 4 | `DELETE` | `/api/v1/alert-rules/{rule_id}` | `—` | `Không khai báo response_model` | 200 | ADMIN | Alert Rules |
| 5 | `GET` | `/api/v1/alerts` | `—` | `list[AlertOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Alerts |
| 6 | `PATCH` | `/api/v1/alerts/{alert_id}/acknowledge` | `—` | `AlertOut` | 200 | ADMIN hoặc OPERATOR; phạm vi CONTROL | Alerts |
| 7 | `PATCH` | `/api/v1/alerts/{alert_id}/resolve` | `AlertResolveRequest` | `AlertOut` | 200 | ADMIN hoặc OPERATOR; phạm vi CONTROL | Alerts |
| 8 | `GET` | `/api/v1/audit-logs` | `—` | `list[AuditLogOut]` | 200 | ADMIN | Audit Logs |
| 9 | `POST` | `/api/v1/auth/login` | `LoginRequest` | `TokenResponse` | 200 | Công khai | Login |
| 10 | `GET` | `/api/v1/auth/me` | `—` | `UserOut` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Profile |
| 11 | `PATCH` | `/api/v1/auth/password` | `PasswordChangeRequest` | `Không khai báo response_model` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Profile |
| 12 | `PATCH` | `/api/v1/auth/profile` | `ProfileUpdateRequest` | `UserOut` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Profile |
| 13 | `POST` | `/api/v1/auth/logout` | `—` | `Không khai báo response_model` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Profile |
| 14 | `POST` | `/api/v1/devices/{device_id}/commands` | `CommandCreate` | `CommandOut` | 201 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi CONTROL | Device Control |
| 15 | `GET` | `/api/v1/commands/{command_id}` | `—` | `CommandOut` | 200 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW | Device Control |
| 16 | `GET` | `/api/v1/devices/{device_id}/commands` | `—` | `list[CommandOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW | Device Control |
| 17 | `GET` | `/api/v1/rooms` | `—` | `list[RoomOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Rooms |
| 18 | `POST` | `/api/v1/rooms` | `RoomCreate` | `RoomOut` | 201 | ADMIN | Rooms |
| 19 | `GET` | `/api/v1/devices` | `—` | `list[DeviceOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER | Devices / Device Detail |
| 20 | `GET` | `/api/v1/devices/{device_id}` | `—` | `DeviceOut` | 200 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW | Devices / Device Detail |
| 21 | `POST` | `/api/v1/devices` | `DeviceRegisterRequest` | `DeviceOut` | 201 | ADMIN | Devices / Device Detail |
| 22 | `PATCH` | `/api/v1/devices/{device_id}/lifecycle` | `DeviceLifecycleUpdate` | `DeviceOut` | 200 | ADMIN hoặc OPERATOR; phạm vi MANAGE | Devices / Device Detail |
| 23 | `POST` | `/api/v1/devices/{device_id}/assignments` | `DeviceAssignmentCreate` | `DeviceAssignmentOut` | 200 | ADMIN | Devices / Device Detail |
| 24 | `GET` | `/api/v1/devices/{device_id}/telemetry` | `—` | `list[TelemetryOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW | Dashboard / History |
| 25 | `GET` | `/api/v1/devices/{device_id}/telemetry/latest` | `—` | `Optional[TelemetryOut]` | 200 | JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW | Dashboard / History |
| 26 | `GET` | `/api/v1/users` | `—` | `list[UserOut]` | 200 | ADMIN | Users |
| 27 | `POST` | `/api/v1/users` | `UserCreate` | `UserOut` | 201 | ADMIN | Users |
| 28 | `PATCH` | `/api/v1/users/{user_id}/status` | `UserStatusUpdate` | `UserOut` | 200 | ADMIN | Users |
| 29 | `PATCH` | `/api/v1/users/{user_id}/role` | `UserRoleUpdate` | `UserOut` | 200 | ADMIN | Users |

## B. Danh mục enum từ models.py

| Enum | Giá trị hợp lệ |
|---|---|
| `UserRole` | `ADMIN`, `OPERATOR`, `VIEWER` |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `LOCKED` |
| `DeviceLifecycle` | `REGISTERED`, `PROVISIONED`, `ACTIVE`, `OFFLINE`, `FAULT`, `MAINTENANCE`, `LOCKED`, `DECOMMISSIONED` |
| `AssignmentPermission` | `VIEW`, `CONTROL`, `MANAGE` |
| `QualityLevel` | `GOOD`, `MODERATE`, `POOR`, `UNHEALTHY` |
| `ValidationStatus` | `VALID`, `INVALID`, `ANOMALY` |
| `RuleMetric` | `TEMPERATURE`, `HUMIDITY`, `MQ135_RAW` |
| `RuleOperator` | `GT`, `GTE`, `LT`, `LTE`, `EQ` |
| `RuleSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `AlertStatus` | `OPEN`, `ACKNOWLEDGED`, `RESOLVED` |
| `CommandStatus` | `PENDING`, `SENT`, `ACKED`, `FAILED`, `TIMEOUT` |
| `ActorType` | `USER`, `DEVICE`, `SYSTEM` |
| `AuditResult` | `SUCCESS`, `FAILED` |

## C. Chi tiết từng schema và field

Bảng sau là hợp đồng field dùng chung cho các endpoint. Đối chiếu tên schema tại mục A và D.

### LoginRequest

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `username` | `str` | Có | min_length=1, max_length=50 |
| `password` | `str` | Có | min_length=1, max_length=100 |

### TokenResponse

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `access_token` | `str` | Có | — |
| `token_type` | `str` | Không | Mặc định: 'bearer' |
| `expires_in_seconds` | `int` | Có | — |
| `user_id` | `int` | Có | — |
| `username` | `str` | Có | — |
| `role` | `UserRole` | Có | —Enum: ADMIN, OPERATOR, VIEWER |

### PasswordChangeRequest

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `current_password` | `str` | Có | min_length=1 |
| `new_password` | `str` | Có | min_length=6, max_length=100 |

### ProfileUpdateRequest

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `full_name` | `Optional[str]` | Không | min_length=1, max_length=100 |
| `email` | `Optional[EmailStr]` | Không | Mặc định: None |

### UserOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `username` | `str` | Có | — |
| `email` | `str` | Có | — |
| `full_name` | `str` | Có | — |
| `role` | `UserRole` | Có | —Enum: ADMIN, OPERATOR, VIEWER |
| `status` | `UserStatus` | Có | —Enum: ACTIVE, INACTIVE, LOCKED |
| `created_at` | `datetime` | Có | — |
| `updated_at` | `datetime` | Có | — |

### UserCreate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `username` | `str` | Có | min_length=3, max_length=50 |
| `email` | `EmailStr` | Có | — |
| `password` | `str` | Có | min_length=6, max_length=100 |
| `full_name` | `str` | Có | min_length=1, max_length=100 |
| `role` | `UserRole` | Không | Mặc định: UserRole.VIEWER; Enum: ADMIN, OPERATOR, VIEWER |

### UserStatusUpdate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `status` | `UserStatus` | Có | —Enum: ACTIVE, INACTIVE, LOCKED |

### UserRoleUpdate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `role` | `UserRole` | Có | —Enum: ADMIN, OPERATOR, VIEWER |

### RoomOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `room_id` | `str` | Có | — |
| `name` | `str` | Có | — |
| `description` | `Optional[str]` | Không | Mặc định: None |
| `created_at` | `datetime` | Có | — |

### RoomCreate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `room_id` | `str` | Có | min_length=1, max_length=64, pattern='^[a-z0-9-]+$' |
| `name` | `str` | Có | min_length=1, max_length=100 |
| `description` | `Optional[str]` | Không | max_length=255 |

### DeviceOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `device_id` | `str` | Có | — |
| `room_id` | `str` | Có | — |
| `display_name` | `str` | Có | — |
| `lifecycle` | `DeviceLifecycle` | Có | —Enum: REGISTERED, PROVISIONED, ACTIVE, OFFLINE, FAULT, MAINTENANCE, LOCKED, DECOMMISSIONED |
| `firmware_version` | `str` | Có | — |
| `mqtt_client_id` | `Optional[str]` | Không | Mặc định: None |
| `last_seen_at` | `Optional[datetime]` | Không | Mặc định: None |
| `created_at` | `datetime` | Có | — |
| `updated_at` | `datetime` | Có | — |

### DeviceRegisterRequest

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `device_id` | `str` | Có | min_length=1, max_length=64, pattern='^[a-z0-9-]+$' |
| `room_id` | `str` | Có | min_length=1, max_length=64 |
| `display_name` | `str` | Có | min_length=1, max_length=100 |
| `firmware_version` | `str` | Không | max_length=32 |
| `mqtt_client_id` | `Optional[str]` | Không | max_length=64 |

### DeviceLifecycleUpdate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `lifecycle` | `DeviceLifecycle` | Có | —Enum: REGISTERED, PROVISIONED, ACTIVE, OFFLINE, FAULT, MAINTENANCE, LOCKED, DECOMMISSIONED |
| `reason` | `Optional[str]` | Không | max_length=255 |

### DeviceAssignmentOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `user_id` | `int` | Có | — |
| `device_id` | `Optional[str]` | Không | Mặc định: None |
| `room_id` | `Optional[str]` | Không | Mặc định: None |
| `permission` | `AssignmentPermission` | Có | —Enum: VIEW, CONTROL, MANAGE |
| `assigned_by` | `int` | Có | — |
| `assigned_at` | `datetime` | Có | — |
| `expires_at` | `Optional[datetime]` | Không | Mặc định: None |

### DeviceAssignmentCreate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `user_id` | `int` | Có | — |
| `device_id` | `Optional[str]` | Không | Mặc định: None |
| `room_id` | `Optional[str]` | Không | Mặc định: None |
| `permission` | `AssignmentPermission` | Không | Mặc định: AssignmentPermission.VIEW; Enum: VIEW, CONTROL, MANAGE |
| `expires_at` | `Optional[datetime]` | Không | Mặc định: None |

### TelemetryOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `device_id` | `str` | Có | — |
| `boot_id` | `str` | Có | — |
| `seq` | `int` | Có | — |
| `measured_at` | `datetime` | Có | — |
| `received_at` | `datetime` | Có | — |
| `temperature_c` | `float` | Có | — |
| `humidity_pct` | `float` | Có | — |
| `mq135_adc_raw` | `int` | Có | — |
| `quality_level` | `QualityLevel` | Có | —Enum: GOOD, MODERATE, POOR, UNHEALTHY |
| `validation_status` | `ValidationStatus` | Có | —Enum: VALID, INVALID, ANOMALY |

### CommandCreate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `command_type` | `str` | Có | min_length=1, max_length=50 |
| `payload` | `dict[str, Any]` | Có | Mặc định: Field(..., description="Action parameters, e.g. {'action': 'FAN_SET', 'value': 'ON'}") |
| `timeout_seconds` | `int` | Không | ge=2, le=120 |

### CommandOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `command_id` | `str` | Có | — |
| `device_id` | `str` | Có | — |
| `requested_by` | `int` | Có | — |
| `command_type` | `str` | Có | — |
| `payload` | `dict[str, Any]` | Có | — |
| `status` | `CommandStatus` | Có | —Enum: PENDING, SENT, ACKED, FAILED, TIMEOUT |
| `created_at` | `datetime` | Có | — |
| `sent_at` | `Optional[datetime]` | Không | Mặc định: None |
| `ack_at` | `Optional[datetime]` | Không | Mặc định: None |
| `timeout_at` | `datetime` | Có | — |
| `result_payload` | `Optional[dict[str, Any]]` | Không | Mặc định: None |
| `error_message` | `Optional[str]` | Không | Mặc định: None |

### AlertRuleOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `name` | `str` | Có | — |
| `room_id` | `Optional[str]` | Không | Mặc định: None |
| `device_id` | `Optional[str]` | Không | Mặc định: None |
| `metric` | `RuleMetric` | Có | —Enum: TEMPERATURE, HUMIDITY, MQ135_RAW |
| `operator` | `RuleOperator` | Có | —Enum: GT, GTE, LT, LTE, EQ |
| `threshold` | `float` | Có | — |
| `severity` | `RuleSeverity` | Có | —Enum: LOW, MEDIUM, HIGH, CRITICAL |
| `is_enabled` | `bool` | Có | — |
| `cooldown_seconds` | `int` | Có | — |
| `created_by` | `int` | Có | — |
| `created_at` | `datetime` | Có | — |
| `updated_at` | `datetime` | Có | — |

### AlertRuleCreate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `name` | `str` | Có | min_length=1, max_length=100 |
| `room_id` | `Optional[str]` | Không | Mặc định: None |
| `device_id` | `Optional[str]` | Không | Mặc định: None |
| `metric` | `RuleMetric` | Có | —Enum: TEMPERATURE, HUMIDITY, MQ135_RAW |
| `operator` | `RuleOperator` | Không | Mặc định: RuleOperator.GT; Enum: GT, GTE, LT, LTE, EQ |
| `threshold` | `float` | Có | — |
| `severity` | `RuleSeverity` | Không | Mặc định: RuleSeverity.MEDIUM; Enum: LOW, MEDIUM, HIGH, CRITICAL |
| `is_enabled` | `bool` | Không | Mặc định: True |
| `cooldown_seconds` | `int` | Không | ge=10, le=86400 |

### AlertRuleUpdate

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `name` | `Optional[str]` | Không | min_length=1, max_length=100 |
| `threshold` | `Optional[float]` | Không | Mặc định: None |
| `severity` | `Optional[RuleSeverity]` | Không | Mặc định: None; Enum: LOW, MEDIUM, HIGH, CRITICAL |
| `is_enabled` | `Optional[bool]` | Không | Mặc định: None |
| `cooldown_seconds` | `Optional[int]` | Không | ge=10, le=86400 |

### AlertOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `device_id` | `str` | Có | — |
| `rule_id` | `int` | Có | — |
| `metric_value` | `float` | Có | — |
| `status` | `AlertStatus` | Có | —Enum: OPEN, ACKNOWLEDGED, RESOLVED |
| `triggered_at` | `datetime` | Có | — |
| `acknowledged_by` | `Optional[int]` | Không | Mặc định: None |
| `acknowledged_at` | `Optional[datetime]` | Không | Mặc định: None |
| `resolved_by` | `Optional[int]` | Không | Mặc định: None |
| `resolved_at` | `Optional[datetime]` | Không | Mặc định: None |
| `resolution_notes` | `Optional[str]` | Không | Mặc định: None |

### AlertResolveRequest

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `resolution_notes` | `Optional[str]` | Không | max_length=500 |

### AuditLogOut

| Field JSON | Kiểu Python / JSON tương ứng | Bắt buộc khi gửi request | Ràng buộc / mặc định |
|---|---|---|---|
| `id` | `int` | Có | — |
| `actor_type` | `ActorType` | Có | —Enum: USER, DEVICE, SYSTEM |
| `actor_user_id` | `Optional[int]` | Không | Mặc định: None |
| `actor_device_id` | `Optional[str]` | Không | Mặc định: None |
| `action` | `str` | Có | — |
| `target_type` | `str` | Có | — |
| `target_id` | `str` | Có | — |
| `result` | `AuditResult` | Có | —Enum: SUCCESS, FAILED |
| `ip_address` | `Optional[str]` | Không | Mặc định: None |
| `request_id` | `Optional[str]` | Không | Mặc định: None |
| `metadata (alias của metadata_)` | `Optional[dict[str, Any]]` | Không | serialization_alias='metadata' |
| `created_at` | `datetime` | Có | — |

## D. Phân tích từng endpoint: tham số, quyền, lỗi, mapping trang

### API-001 · GET /api/v1/alert-rules

- **Router / hàm:** `routers/alerts.py:36` → `list_alert_rules()`
- **Frontend:** `Alert Rules`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `list[AlertRuleOut]`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-002 · POST /api/v1/alert-rules

- **Router / hàm:** `routers/alerts.py:45` → `create_alert_rule()`
- **Frontend:** `Alert Rules`
- **Quyền:** ADMIN
- **Request body:** `AlertRuleCreate` (xem đầy đủ từng field ở mục C)
- **Response:** `AlertRuleOut`; HTTP 201 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-003 · PATCH /api/v1/alert-rules/{rule_id}

- **Router / hàm:** `routers/alerts.py:76` → `update_alert_rule()`
- **Frontend:** `Alert Rules`
- **Quyền:** ADMIN
- **Request body:** `AlertRuleUpdate` (xem đầy đủ từng field ở mục C)
- **Response:** `AlertRuleOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `rule_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Quy tắc cảnh báo không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-004 · DELETE /api/v1/alert-rules/{rule_id}

- **Router / hàm:** `routers/alerts.py:110` → `delete_alert_rule()`
- **Frontend:** `Alert Rules`
- **Quyền:** ADMIN
- **Request body:** `—`
- **Response:** `Không khai báo response_model`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `rule_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Quy tắc cảnh báo không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-005 · GET /api/v1/alerts

- **Router / hàm:** `routers/alerts.py:132` → `list_alerts()`
- **Frontend:** `Alerts`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `list[AlertOut]`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `status_filter` | `Optional[AlertStatus]` | `Query(None, alias='status')` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-006 · PATCH /api/v1/alerts/{alert_id}/acknowledge

- **Router / hàm:** `routers/alerts.py:168` → `acknowledge_alert()`
- **Frontend:** `Alerts`
- **Quyền:** ADMIN hoặc OPERATOR; phạm vi CONTROL
- **Request body:** `—`
- **Response:** `AlertOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `alert_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Cảnh báo không tồn tại'
- 400: f'Cảnh báo đang ở trạng thái {alert.status.value}'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-007 · PATCH /api/v1/alerts/{alert_id}/resolve

- **Router / hàm:** `routers/alerts.py:199` → `resolve_alert()`
- **Frontend:** `Alerts`
- **Quyền:** ADMIN hoặc OPERATOR; phạm vi CONTROL
- **Request body:** `AlertResolveRequest` (xem đầy đủ từng field ở mục C)
- **Response:** `AlertOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `alert_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Cảnh báo không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-008 · GET /api/v1/audit-logs

- **Router / hàm:** `routers/audit.py:17` → `get_audit_logs()`
- **Frontend:** `Audit Logs`
- **Quyền:** ADMIN
- **Request body:** `—`
- **Response:** `list[AuditLogOut]`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `action` | `Optional[str]` | `Query(None)` |
| `target_type` | `Optional[str]` | `Query(None)` |
| `limit` | `int` | `Query(50, ge=1, le=200)` |
| `offset` | `int` | `Query(0, ge=0)` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-009 · POST /api/v1/auth/login

- **Router / hàm:** `routers/auth.py:22` → `login()`
- **Frontend:** `Login`
- **Quyền:** Công khai
- **Request body:** `LoginRequest` (xem đầy đủ từng field ở mục C)
- **Response:** `TokenResponse`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 401: 'Incorrect username or password'
- 403: 'Tài khoản đã bị khóa'
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-010 · GET /api/v1/auth/me

- **Router / hàm:** `routers/auth.py:74` → `get_me()`
- **Frontend:** `Profile`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `UserOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-011 · PATCH /api/v1/auth/password

- **Router / hàm:** `routers/auth.py:80` → `change_password()`
- **Frontend:** `Profile`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `PasswordChangeRequest` (xem đầy đủ từng field ở mục C)
- **Response:** `Không khai báo response_model`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 400: 'Mật khẩu hiện tại không chính xác'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-012 · PATCH /api/v1/auth/profile

- **Router / hàm:** `routers/auth.py:100` → `update_profile()`
- **Frontend:** `Profile`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `ProfileUpdateRequest` (xem đầy đủ từng field ở mục C)
- **Response:** `UserOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 400: 'Email này đã được sử dụng'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-013 · POST /api/v1/auth/logout

- **Router / hàm:** `routers/auth.py:121` → `logout()`
- **Frontend:** `Profile`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `Không khai báo response_model`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-014 · POST /api/v1/devices/{device_id}/commands

- **Router / hàm:** `routers/commands.py:27` → `send_command()`
- **Frontend:** `Device Control`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi CONTROL
- **Request body:** `CommandCreate` (xem đầy đủ từng field ở mục C)
- **Response:** `CommandOut`; HTTP 201 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 400: f"Cannot dispatch command: Device '{device_id}' is currently {device.lifecycle.value}"
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-015 · GET /api/v1/commands/{command_id}

- **Router / hàm:** `routers/commands.py:89` → `get_command_status()`
- **Frontend:** `Device Control`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW
- **Request body:** `—`
- **Response:** `CommandOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `command_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Lệnh không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-016 · GET /api/v1/devices/{device_id}/commands

- **Router / hàm:** `routers/commands.py:115` → `list_device_commands()`
- **Frontend:** `Device Control`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW
- **Request body:** `—`
- **Response:** `list[CommandOut]`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |
| `limit` | `int` | `Query(20, ge=1, le=100)` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-017 · GET /api/v1/rooms

- **Router / hàm:** `routers/devices.py:39` → `list_rooms()`
- **Frontend:** `Rooms`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `list[RoomOut]`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-018 · POST /api/v1/rooms

- **Router / hàm:** `routers/devices.py:45` → `create_room()`
- **Frontend:** `Rooms`
- **Quyền:** ADMIN
- **Request body:** `RoomCreate` (xem đầy đủ từng field ở mục C)
- **Response:** `RoomOut`; HTTP 201 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 400: 'Mã phòng đã tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-019 · GET /api/v1/devices

- **Router / hàm:** `routers/devices.py:62` → `list_devices()`
- **Frontend:** `Devices / Device Detail`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER
- **Request body:** `—`
- **Response:** `list[DeviceOut]`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-020 · GET /api/v1/devices/{device_id}

- **Router / hàm:** `routers/devices.py:96` → `get_device()`
- **Frontend:** `Devices / Device Detail`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW
- **Request body:** `—`
- **Response:** `DeviceOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-021 · POST /api/v1/devices

- **Router / hàm:** `routers/devices.py:107` → `register_device()`
- **Frontend:** `Devices / Device Detail`
- **Quyền:** ADMIN
- **Request body:** `DeviceRegisterRequest` (xem đầy đủ từng field ở mục C)
- **Response:** `DeviceOut`; HTTP 201 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 400: 'Mã thiết bị đã tồn tại'
- 400: f'Phòng {payload.room_id} không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-022 · PATCH /api/v1/devices/{device_id}/lifecycle

- **Router / hàm:** `routers/devices.py:140` → `update_device_lifecycle()`
- **Frontend:** `Devices / Device Detail`
- **Quyền:** ADMIN hoặc OPERATOR; phạm vi MANAGE
- **Request body:** `DeviceLifecycleUpdate` (xem đầy đủ từng field ở mục C)
- **Response:** `DeviceOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 403: 'Chỉ Admin mới có quyền Khóa hoặc Ngừng sử dụng thiết bị'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-023 · POST /api/v1/devices/{device_id}/assignments

- **Router / hàm:** `routers/devices.py:173` → `assign_device()`
- **Frontend:** `Devices / Device Detail`
- **Quyền:** ADMIN
- **Request body:** `DeviceAssignmentCreate` (xem đầy đủ từng field ở mục C)
- **Response:** `DeviceAssignmentOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Thiết bị không tồn tại'
- 404: 'Người dùng không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-024 · GET /api/v1/devices/{device_id}/telemetry

- **Router / hàm:** `routers/devices.py:222` → `get_device_telemetry_history()`
- **Frontend:** `Dashboard / History`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW
- **Request body:** `—`
- **Response:** `list[TelemetryOut]`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |
| `from_time` | `Optional[datetime]` | `Query(None, alias='from')` |
| `to_time` | `Optional[datetime]` | `Query(None, alias='to')` |
| `limit` | `int` | `Query(100, ge=1, le=1000)` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-025 · GET /api/v1/devices/{device_id}/telemetry/latest

- **Router / hàm:** `routers/devices.py:247` → `get_latest_telemetry()`
- **Frontend:** `Dashboard / History`
- **Quyền:** JWT: ADMIN/OPERATOR/VIEWER; phạm vi VIEW
- **Request body:** `—`
- **Response:** `Optional[TelemetryOut]`; HTTP 200

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `device_id` | `str` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 404: thiết bị không tồn tại
- 403: ngoài phạm vi hoặc thiếu quyền thiết bị
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-026 · GET /api/v1/users

- **Router / hàm:** `routers/users.py:16` → `list_users()`
- **Frontend:** `Users`
- **Quyền:** ADMIN
- **Request body:** `—`
- **Response:** `list[UserOut]`; HTTP 200

**Lỗi xác định từ code / dependencies:**
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền

### API-027 · POST /api/v1/users

- **Router / hàm:** `routers/users.py:26` → `create_user()`
- **Frontend:** `Users`
- **Quyền:** ADMIN
- **Request body:** `UserCreate` (xem đầy đủ từng field ở mục C)
- **Response:** `UserOut`; HTTP 201 (xem đầy đủ từng field ở mục C)

**Lỗi xác định từ code / dependencies:**
- 400: 'Tên người dùng đã tồn tại'
- 400: 'Email đã tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-028 · PATCH /api/v1/users/{user_id}/status

- **Router / hàm:** `routers/users.py:61` → `update_user_status()`
- **Frontend:** `Users`
- **Quyền:** ADMIN
- **Request body:** `UserStatusUpdate` (xem đầy đủ từng field ở mục C)
- **Response:** `UserOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `user_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 400: 'Không thể tự khóa tài khoản Admin của chính mình'
- 404: 'Người dùng không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

### API-029 · PATCH /api/v1/users/{user_id}/role

- **Router / hàm:** `routers/users.py:88` → `update_user_role()`
- **Frontend:** `Users`
- **Quyền:** ADMIN
- **Request body:** `UserRoleUpdate` (xem đầy đủ từng field ở mục C)
- **Response:** `UserOut`; HTTP 200 (xem đầy đủ từng field ở mục C)

**Path/query parameters**

| Tên tham số Python | Kiểu | Khai báo mặc định / alias / giới hạn |
|---|---|---|
| `user_id` | `int` | `Bắt buộc` |

**Lỗi xác định từ code / dependencies:**
- 404: 'Người dùng không tồn tại'
- 401: JWT thiếu/không hợp lệ
- 403: tài khoản khóa/không hoạt động hoặc không đủ quyền
- 422: dữ liệu đầu vào không hợp lệ (FastAPI)

## E. Response không có response_model và lưu ý triển khai

- `PATCH /auth/password`: `{ "status": "ok", "message": "Đổi mật khẩu thành công" }`.
- `POST /auth/logout`: `{ "status": "ok", "message": "Đăng xuất thành công" }`; không revoke JWT trên server.
- `DELETE /alert-rules/{rule_id}`: `{ "status": "ok", "message": "Đã xóa quy tắc cảnh báo" }`.
- `GET /devices/{device_id}/telemetry/latest`: response có thể là `null` nếu chưa có bản ghi.
- `GET /devices/{device_id}/telemetry`: sắp xếp theo `measured_at DESC`, `limit` 1–1000, mặc định 100.
- `GET /alerts`: giới hạn 100 bản ghi, sắp xếp mới nhất trước; lọc theo phạm vi thiết bị đối với non-admin.
- `POST /devices/{device_id}/assignments`: có thể cập nhật assignment hiện có thay vì tạo mới, nhưng decorator không khai báo HTTP 201.
- `AuditLogOut.metadata_` được serialize thành JSON field `metadata`.
- `DeviceAssignmentCreate.room_id` tồn tại trong schema, nhưng hàm gán thiết bị lưu `device_id` từ URL; cần kiểm tra yêu cầu phân quyền theo phòng trước khi xây UI.
- `POST /auth/login` có kiểm tra LOCKED; cần kiểm tra thêm xử lý INACTIVE theo yêu cầu nghiệp vụ.
- `PATCH /devices/{device_id}/lifecycle` gán trực tiếp lifecycle; không thấy bảng chuyển trạng thái hợp lệ được kiểm tra trong router.
- Các API cần kiểm tra Swagger/OpenAPI và test với MySQL/MQTT trước khi đánh dấu đã nghiệm thu.
