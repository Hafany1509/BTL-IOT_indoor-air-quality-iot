# ĐẶC TẢ HỆ THỐNG & YÊU CẦU TRIỂN KHAI FRONTEND CHO CODEX

> **Mục đích:** Đặt file này tại `docs/CODEX_FRONTEND_SYSTEM_SPEC_IOT.md` trong repository và yêu cầu Codex đọc toàn bộ trước khi tạo/chỉnh sửa giao diện. Đây là đặc tả frontend, không phải yêu cầu thay đổi backend.  
> **Ưu tiên:** Triển khai đầy đủ ADMIN trước, sau đó dùng chung trang/component và bổ sung phân quyền OPERATOR, VIEWER.  
> **Nguồn kiểm chứng:** ZIP mã nguồn dự án đã cung cấp (`backend/app/routers/*.py`, `backend/app/schemas.py`, `backend/app/models.py`, `database/seed_demo.sql`, `frontend/`) và quy tắc thiết kế đã thống nhất. Nếu repository làm việc có thay đổi mới hơn, **mã nguồn hiện tại và OpenAPI `/openapi.json` là nguồn sự thật**; cập nhật cách tích hợp theo đó.

## 1. Bối cảnh và mục tiêu

Tên ứng dụng: **Air Quality IoT – Hệ thống giám sát và cảnh báo chất lượng không khí trong nhà**. Đồ án gồm một **node ESP32 vật lý** dùng DHT22 (nhiệt độ, độ ẩm), MQ-135 (giá trị ADC thô), cơ cấu chấp hành quạt và đèn LED; luồng chính: ESP32 → MQTT/Mosquitto → FastAPI worker → MySQL → FastAPI REST → React/Vite. Lệnh điều khiển từ frontend → FastAPI → MQTT → ESP32 → phản hồi ACK → backend.

**Giới hạn triển khai thực tế:** Người dùng chỉ có **01 node vật lý**, ưu tiên giám sát `esp32-a-01`. Repository seed còn chứa `sim-b-01` (node mô phỏng) và `room-b`; đây là dữ liệu mẫu trong mã nguồn, không đồng nghĩa người dùng có node vật lý thứ hai. Thiết kế mặc định tập trung vào một node; nếu API trả về nhiều thiết bị, chọn node đang được cấp quyền hoặc hiển thị bộ chọn nhỏ, không dựng hệ thống quản lý đa cơ sở phức tạp. **Không hardcode** rằng luôn tồn tại `esp32-a-01` hoặc thiết bị luôn online.

**Mục tiêu frontend:** trực quan, dễ demo; hiển thị telemetry thực tế, lịch sử biểu đồ, cảnh báo, điều khiển quạt/LED có trạng thái ACK, quy tắc cảnh báo, người dùng, node, audit log và hồ sơ. UI bằng **tiếng Việt**, thuật ngữ kỹ thuật rõ ràng.

## 2. Stack và nguyên tắc kỹ thuật

- React + Vite (JavaScript JSX); React Router; Axios; Lucide React; Recharts; CSS thường với biến thiết kế (không tự ý thêm framework UI nặng).
- Frontend ở `frontend/` của repository hiện tại, **không tạo repository mới**, không thay đổi backend, schema SQL, firmware hoặc Docker khi chưa được yêu cầu.
- Giữ và tái sử dụng mã frontend hiện hữu nếu có; trước khi tạo file, kiểm tra `frontend/package.json`, `frontend/src/`, `vite.config.js`, `.gitignore`.
- Có thể dùng mock data khi thiết kế nhưng phải tách riêng trong `src/mocks/`, có nhãn “Dữ liệu minh họa”; khi kết nối API thật, không âm thầm fallback sang mock nếu request lỗi.
- Không giả lập WebSocket/MQTT trực tiếp trên trình duyệt khi backend chỉ có REST. Có thể polling (ví dụ 5–10 giây cho latest, 10–30 giây cho alerts, theo cấu hình), dừng polling khi tab không hiển thị hoặc component unmount; không gọi API dồn dập.
- Ưu tiên xây dựng frontend chạy được và kiểm tra `npm run build`; không tạo hàng chục file rỗng.

## 3. Vai trò và phân quyền

| Tính năng                              | ADMIN          | OPERATOR                                               | VIEWER                 |
| -------------------------------------- | -------------- | ------------------------------------------------------ | ---------------------- |
| Đăng nhập, hồ sơ                       | Có             | Có                                                     | Có                     |
| Xem node, telemetry, lịch sử, cảnh báo | Toàn bộ        | Trong phạm vi được cấp                                 | Trong phạm vi được cấp |
| Gửi lệnh quạt/LED                      | Có             | Nếu có quyền CONTROL/MANAGE trên node                  | Không                  |
| Xác nhận/giải quyết cảnh báo           | Có             | Nếu có quyền CONTROL/MANAGE trên node                  | Không                  |
| Quản lý quy tắc cảnh báo               | Có             | Không                                                  | Không                  |
| Quản lý người dùng                     | Có             | Không                                                  | Không                  |
| Quản lý vòng đời node                  | Có             | Chỉ khi có quyền MANAGE, hạn chế LOCKED/DECOMMISSIONED | Không                  |
| Gán quyền thiết bị                     | Theo API ADMIN | Không                                                  | Không                  |
| Xem audit logs                         | Có             | Không                                                  | Không                  |

**Quan trọng:** Backend kiểm tra cả `role` và `device_assignments` (`VIEW < CONTROL < MANAGE`), không chỉ role. Frontend ẩn/vô hiệu hóa thao tác để cải thiện UX nhưng **không được coi đó là bảo mật**. Không giả định mọi OPERATOR đều có CONTROL. Backend hiện không cung cấp API riêng để liệt kê assignment của người đang đăng nhập; với OPERATOR, chỉ hiện nút điều khiển khi đã có căn cứ quyền phù hợp từ luồng ứng dụng, nếu không có thì để backend quyết định và xử lý 403 rõ ràng. ADMIN mặc định toàn quyền thiết bị theo backend.

## 4. Bố cục, Design System

**Phong cách:** Modern IoT Dashboard, chuyên nghiệp, sạch, sáng, ưu tiên quan sát số liệu.

- Sidebar nền navy `#0F172A`, rộng khoảng 248px, có logo, menu, trạng thái điều hướng; thu gọn trên tablet/mobile.
- Header nền sáng, cao ~68px: tên trang, trạng thái cập nhật, chuông cảnh báo, avatar/tài khoản và đăng xuất.
- Nền `#F8FAFC`; Card `#FFFFFF`, border nhạt, bo góc 12–16px, shadow nhẹ.
- Primary `#2563EB`; Success `#16A34A`; Warning `#F59E0B`; Danger `#DC2626`; Muted `#64748B`.
- Font Inter hoặc Be Vietnam Pro, fallback system sans-serif; body 14–16px; tiêu đề trang 24–28px; số đo 28–36px.
- Khoảng cách theo bội số 8px; trạng thái không chỉ dựa trên màu, luôn kèm chữ/icon.
- Desktop >=1200px: 3 sensor cards một hàng, chart + panel hai cột; tablet 768–1199px: 2 cột; mobile <768px: 1 cột, Sidebar dạng drawer, bảng có cuộn ngang.
- Sử dụng chung Button, Input, Select, Card, StatusBadge, Modal, ConfirmDialog, EmptyState, LoadingSkeleton, PageHeader, Toast.
- Trạng thái bắt buộc: loading, empty, error, 401, 403, offline, stale-data, pending-command, success, timeout; các nút hành động nguy hiểm cần xác nhận.
- Các biểu đồ hiển thị đơn vị chính xác, tooltip có thời gian; hỗ trợ định dạng ngày giờ `vi-VN`, phân biệt timestamp API với thời gian địa phương.

## 5. Sơ đồ điều hướng

**Public:** `/login`.

**Sau đăng nhập (MainLayout):**

1. `/dashboard` – Tổng quan (ADMIN, OPERATOR, VIEWER)
2. `/telemetry` – Lịch sử dữ liệu (người có quyền VIEW)
3. `/alerts` – Cảnh báo (người có quyền VIEW)
4. `/control` – Điều khiển quạt/LED (ADMIN, OPERATOR có quyền)
5. `/alert-rules` – Quy tắc cảnh báo (ADMIN)
6. `/users` – Quản lý người dùng (ADMIN)
7. `/device` – Node ESP32 và quyền truy cập (ADMIN; OPERATOR chỉ các phần API cho phép)
8. `/audit-logs` – Nhật ký hệ thống (ADMIN)
9. `/profile` – Hồ sơ cá nhân (mọi role)
10. `*` – NotFound; có trang 403 và lỗi tải dữ liệu.

**Không tạo ba bộ trang cho ba role**; sử dụng `ProtectedRoute`, `RoleGuard` và permission checks. Login có AuthLayout riêng.

## 6. Đặc tả chi tiết từng màn hình ADMIN

### 6.1. Login – `/login`

- Layout hai phần: bên trái branding/illustration về không khí sạch, bên phải form; trên mobile chỉ còn form.
- Logo/tên hệ thống, tiêu đề “Đăng nhập”, input `username`, `password`, nút hiện/ẩn mật khẩu, nút Đăng nhập, thông báo lỗi dưới form.
- Validate không bỏ trống; disable nút khi đang submit; Enter để gửi; 401 hiển thị “Tên đăng nhập hoặc mật khẩu không đúng”; không tiết lộ tài khoản tồn tại hay không.
- Thành công: lưu phiên đăng nhập theo phương án demo, lấy `/auth/me`, chuyển `/dashboard`; đăng xuất xóa phiên frontend. Không nhúng mật khẩu demo vào source hoặc UI.

### 6.2. Dashboard – `/dashboard`

- PageHeader “Tổng quan chất lượng không khí”, thời điểm cập nhật cuối, trạng thái kết nối node.
- **Node summary:** tên node, ID, phòng, firmware, lifecycle, last_seen_at; phân biệt `lifecycle=ACTIVE` với **online thực tế**: trạng thái online phải xét `last_seen_at`/telemetry mới nhất theo ngưỡng cấu hình, không chỉ lifecycle.
- **3 SensorCards:** Nhiệt độ (`temperature_c`, °C), độ ẩm (`humidity_pct`, %), MQ-135 (`mq135_adc_raw`, ADC raw). Có icon, thời gian đo, trạng thái chất lượng và chỉ báo lỗi dữ liệu.
- **AirQualityStatus:** hiển thị `quality_level` GOOD/MODERATE/POOR/UNHEALTHY từ backend, dịch nhãn tiếng Việt; không tự gọi đó là AQI.
- **Biểu đồ nhỏ:** xu hướng 1–24 giờ gần nhất; có lựa chọn metric; tooltip; không tự tạo dữ liệu nếu rỗng.
- **RecentAlerts:** tối đa 5 cảnh báo gần đây, trạng thái và link “Xem tất cả”.
- **QuickControl:** nút bật/tắt quạt/LED chỉ khi có quyền; không đánh đồng trạng thái lệnh `SENT` với thiết bị đã thực thi.
- Khi không có telemetry: hiển thị “Chưa có dữ liệu từ cảm biến”, nút thử lại; không hiển thị số 0 giả.

### 6.3. Lịch sử dữ liệu – `/telemetry`

- Header, bộ lọc metric (`TEMPERATURE`, `HUMIDITY`, `MQ135_RAW`), khoảng thời gian (gợi ý 1h/6h/24h/7d/tùy chọn), nút áp dụng.
- Recharts LineChart với trục X thời gian, trục Y theo đơn vị của metric; không vẽ 3 metric khác đơn vị lên cùng một trục Y không phân biệt.
- Thẻ tổng hợp min/max/avg tính từ tập dữ liệu **đã tải** (ghi rõ phạm vi), không gắn nhãn toàn bộ lịch sử nếu API chỉ trả về giới hạn mẫu.
- Bảng dữ liệu: measured_at, temperature_c, humidity_pct, mq135_adc_raw, quality_level, validation_status; có trạng thái VALID/INVALID/ANOMALY.
- API hỗ trợ `from`, `to`, `limit` tối đa 1000; phân trang UI nếu cần, không giả định API có offset. Xuất CSV phía client chỉ từ dữ liệu đã tải và ghi rõ phạm vi.

### 6.4. Cảnh báo – `/alerts`

- Header “Cảnh báo”, thống kê OPEN/ACKNOWLEDGED/RESOLVED từ danh sách tải về (ghi rõ nếu danh sách bị giới hạn).
- Tabs hoặc filter theo status, bảng: thời gian kích hoạt, node, rule, metric_value, mức độ (join với alert rules nếu có), trạng thái, thao tác.
- Modal chi tiết: nội dung quy tắc, giá trị, thời gian, người xác nhận, ghi chú xử lý.
- Nút “Xác nhận” chỉ khi OPEN; “Giải quyết” mở modal ghi chú, gọi API rồi cập nhật danh sách; thông báo 400/403/404 rõ ràng.
- Backend không cung cấp API delete alert: **không tạo nút xóa cảnh báo giả**.

### 6.5. Điều khiển – `/control`

- Node header, lifecycle và last seen, cảnh báo nếu thiết bị offline/không ACTIVE.
- Hai control cards: Quạt thông gió và LED cảnh báo; nút ON/OFF; nhãn trạng thái **không được khẳng định ON/OFF thực tế nếu backend chưa cung cấp actuator state xác nhận**.
- Modal xác nhận gửi lệnh; gọi POST command; hiển thị `PENDING → SENT → ACKED` hoặc `FAILED/TIMEOUT`; polling `GET /commands/{command_id}` trong khoảng thời gian hữu hạn và dừng khi kết thúc.
- Bảng lịch sử lệnh: command_id, command_type, payload, requested_by, created_at, status, ack_at, error_message.
- Không tự đổi trạng thái thiết bị khi nhận `201 Created` hay `SENT`; ACK xác nhận xử lý lệnh, muốn khẳng định trạng thái vật lý cần dữ liệu phản hồi phù hợp.
- Cú pháp `command_type` và `payload` **phải xác minh từ firmware/simulator hoặc docs/mqtt.md trước khi gửi**; ví dụ trong schema chỉ mang tính minh họa, không tự khẳng định payload chắc chắn chạy với ESP32.

### 6.6. Quy tắc cảnh báo – `/alert-rules`

- Bảng: name, metric, operator, threshold, severity, cooldown_seconds, is_enabled, device_id/room_id, thao tác.
- Nút “Tạo quy tắc” mở form: tên, metric, toán tử, ngưỡng, severity, cooldown, scope, enabled.
- **Lưu ý API:** POST cho phép khai báo đầy đủ; PATCH hiện chỉ hỗ trợ `name`, `threshold`, `severity`, `is_enabled`, `cooldown_seconds` — **không đưa metric/operator/scope vào form chỉnh sửa có khả năng lưu**; chỉ hiển thị read-only hoặc hướng dẫn tạo quy tắc mới.
- ConfirmDialog khi xóa; trạng thái loading/validation; giá trị ngưỡng và đơn vị theo metric.

### 6.7. Quản lý người dùng – `/users`

- Bảng: username, full_name, email, role, status, created_at; tìm kiếm/lọc client-side nếu API chưa hỗ trợ query.
- Modal “Thêm người dùng”: username, email, full_name, password, role; validation theo schema.
- Thay role: dropdown ADMIN/OPERATOR/VIEWER → PATCH role; thay trạng thái: ACTIVE/INACTIVE/LOCKED → PATCH status; xác nhận trước khi khóa tài khoản.
- **Không tạo chức năng xóa user hoặc sửa user bất kỳ nếu backend chưa có endpoint**; profile chỉ chỉnh tài khoản đang đăng nhập.
- Có thể thêm phần gán quyền node trong trang Device bằng endpoint assignments, không giả định API liệt kê mọi assignment.

### 6.8. Quản lý node – `/device`

- Ưu tiên trang **chi tiết một node**: device_id, display_name, room_id, firmware_version, mqtt_client_id, lifecycle, last_seen_at, created_at, updated_at.
- Thông tin môi trường và trạng thái hoạt động; các thao tác lifecycle phải xác nhận, gửi `reason` khi cần.
- Khối gán quyền: chọn user, permission VIEW/CONTROL/MANAGE, device_id hoặc room_id, expires_at; gửi POST assignment.
- Nếu API trả về nhiều node seed, cho phép chọn node; **không giả định có API GET danh sách assignment** (backend hiện có POST nhưng không có GET assignments).
- Có thể hiển thị đăng ký node (POST /devices) và tạo phòng (POST /rooms) trong phần quản trị nâng cao; không làm thành menu lớn nếu đồ án chỉ dùng một node.

### 6.9. Nhật ký hệ thống – `/audit-logs`

- Bảng: created_at, actor_type, actor_user_id/actor_device_id, action, target_type, target_id, result, ip_address, request_id.
- Filter `action`, `target_type`, giới hạn `limit`, `offset`; xem metadata trong modal JSON read-only.
- Không cho sửa/xóa log; chỉ ADMIN.

### 6.10. Hồ sơ cá nhân – `/profile`

- Thông tin username (read-only), full_name, email, role (read-only), status, thời gian tạo.
- Form cập nhật full_name/email qua PATCH `/auth/profile`.
- Tab đổi mật khẩu: current_password, new_password, confirm new password (confirm chỉ frontend), gửi PATCH `/auth/password`.
- Nút đăng xuất; trạng thái lưu và lỗi validation.

## 7. Hợp đồng API – đọc trực tiếp backend, không tự tạo endpoint

**Base URL:** `http://localhost:8000/api/v1` khi chạy local; Swagger `http://localhost:8000/docs`. Nếu `vite.config.js` hiện có proxy `/api`, có thể dùng `baseURL: '/api/v1'` để tránh CORS; chọn **một** phương án nhất quán. Env mẫu `VITE_API_BASE_URL=http://localhost:8000/api/v1` (không chứa bí mật).

| Nhóm      | Method | Endpoint                                | Mục đích                                            |
| --------- | ------ | --------------------------------------- | --------------------------------------------------- |
| Auth      | POST   | `/auth/login`                           | JWT login                                           |
| Auth      | GET    | `/auth/me`                              | User hiện tại                                       |
| Auth      | PATCH  | `/auth/password`                        | Đổi mật khẩu                                        |
| Auth      | PATCH  | `/auth/profile`                         | Sửa hồ sơ                                           |
| Auth      | POST   | `/auth/logout`                          | Đăng xuất phía API (kiểm tra hành vi token)         |
| Users     | GET    | `/users`                                | Danh sách                                           |
| Users     | POST   | `/users`                                | Tạo user                                            |
| Users     | PATCH  | `/users/{user_id}/status`               | Đổi trạng thái                                      |
| Users     | PATCH  | `/users/{user_id}/role`                 | Đổi vai trò                                         |
| Rooms     | GET    | `/rooms`                                | Danh sách phòng                                     |
| Rooms     | POST   | `/rooms`                                | Tạo phòng                                           |
| Devices   | GET    | `/devices`                              | Danh sách theo quyền                                |
| Devices   | GET    | `/devices/{device_id}`                  | Chi tiết node                                       |
| Devices   | POST   | `/devices`                              | Đăng ký node                                        |
| Devices   | PATCH  | `/devices/{device_id}/lifecycle`        | Đổi vòng đời                                        |
| Devices   | POST   | `/devices/{device_id}/assignments`      | Gán quyền                                           |
| Telemetry | GET    | `/devices/{device_id}/telemetry`        | Lịch sử, query `from`, `to`, `limit`                |
| Telemetry | GET    | `/devices/{device_id}/telemetry/latest` | Mẫu mới nhất hoặc null                              |
| Rules     | GET    | `/alert-rules`                          | Danh sách quy tắc                                   |
| Rules     | POST   | `/alert-rules`                          | Tạo quy tắc                                         |
| Rules     | PATCH  | `/alert-rules/{rule_id}`                | Sửa trường cho phép                                 |
| Rules     | DELETE | `/alert-rules/{rule_id}`                | Xóa quy tắc                                         |
| Alerts    | GET    | `/alerts`                               | Danh sách, query `status`                           |
| Alerts    | PATCH  | `/alerts/{alert_id}/acknowledge`        | Xác nhận                                            |
| Alerts    | PATCH  | `/alerts/{alert_id}/resolve`            | Giải quyết, có `resolution_notes`                   |
| Commands  | POST   | `/devices/{device_id}/commands`         | Gửi lệnh                                            |
| Commands  | GET    | `/commands/{command_id}`                | Trạng thái lệnh                                     |
| Commands  | GET    | `/devices/{device_id}/commands`         | Lịch sử lệnh, `limit`                               |
| Audit     | GET    | `/audit-logs`                           | Nhật ký, `action`, `target_type`, `limit`, `offset` |
| System    | GET    | `/health`                               | Liveness API, không chứng minh node online          |

**Schema cốt lõi (từ backend/app/schemas.py):**

```js
// POST /auth/login
{ username: 'admin', password: '<user-input>' }
// Response: { access_token, token_type, expires_in_seconds, user_id, username, role }

// GET /devices/{id}/telemetry/latest (có thể null)
{
  device_id: 'esp32-a-01', boot_id: '...', seq: 1,
  measured_at: 'ISO datetime', received_at: 'ISO datetime',
  temperature_c: 28.5, humidity_pct: 65,
  mq135_adc_raw: 420, quality_level: 'GOOD', validation_status: 'VALID'
}

// POST /devices/{id}/commands — cấu trúc chung, action/value phải đối chiếu firmware
{ command_type: 'FAN_SET', payload: { action: 'FAN_SET', value: 'ON' }, timeout_seconds: 15 }
// Response: { id, command_id, device_id, requested_by, command_type,
//             payload, status, created_at, sent_at, ack_at, timeout_at,
//             result_payload, error_message }

// PATCH /alerts/{id}/resolve
{ resolution_notes: 'Đã kiểm tra và xử lý' }
```

**Enum từ models.py:**

- UserRole: `ADMIN`, `OPERATOR`, `VIEWER`.
- UserStatus: `ACTIVE`, `INACTIVE`, `LOCKED`.
- DeviceLifecycle: `REGISTERED`, `PROVISIONED`, `ACTIVE`, `OFFLINE`, `FAULT`, `MAINTENANCE`, `LOCKED`, `DECOMMISSIONED`.
- AssignmentPermission: `VIEW`, `CONTROL`, `MANAGE`.
- QualityLevel: `GOOD`, `MODERATE`, `POOR`, `UNHEALTHY`.
- ValidationStatus: `VALID`, `INVALID`, `ANOMALY`.
- RuleMetric: `TEMPERATURE`, `HUMIDITY`, `MQ135_RAW`.
- RuleOperator: `GT`, `GTE`, `LT`, `LTE`, `EQ`.
- RuleSeverity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- AlertStatus: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`.
- CommandStatus: `PENDING`, `SENT`, `ACKED`, `FAILED`, `TIMEOUT`.

## 8. Cấu trúc file mục tiêu (có thể giản lược hợp lý)

```text
frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── axiosClient.js
│   │   └── endpoints.js
│   ├── assets/styles/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── responsive.css
│   ├── components/
│   │   ├── common/          # Button, Card, Input, Modal, Badge, EmptyState...
│   │   ├── layout/          # MainLayout, AuthLayout, Sidebar, Header, UserMenu
│   │   └── guards/          # ProtectedRoute, RoleGuard
│   ├── context/AuthContext.jsx
│   ├── features/
│   │   ├── auth/            # LoginPage, authService
│   │   ├── dashboard/       # DashboardPage, SensorCard, NodeStatusCard...
│   │   ├── telemetry/       # TelemetryPage, TelemetryChart, telemetryService
│   │   ├── alerts/          # AlertsPage, AlertTable, alertService
│   │   ├── control/         # ControlPage, FanControl, LedControl, commandService
│   │   ├── alertRules/      # AlertRulesPage, alertRuleService
│   │   ├── users/           # UsersPage, userService
│   │   ├── devices/         # DevicePage, deviceService
│   │   ├── audit/           # AuditLogsPage, auditService
│   │   └── profile/         # ProfilePage, profileService
│   ├── hooks/               # usePolling, useAuth, usePermissions
│   ├── utils/               # permissions, formatDate, formatSensor
│   ├── constants/           # roles, navigation, sensors
│   ├── mocks/               # Dữ liệu minh họa, chỉ dùng chế độ mock có chủ đích
│   ├── routes/AppRouter.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

**Yêu cầu:** Dùng chung service Axios, không gọi `fetch` rải rác; service riêng cho từng feature; component không gọi API trực tiếp khi có thể đặt logic ở page/hook; xử lý lỗi tập trung. Không tạo component/file nếu không dùng.

## 9. Quy tắc tích hợp, trạng thái và an toàn

1. JWT: gắn `Authorization: Bearer <token>`; kiểm tra `/auth/me` khi khôi phục phiên. Với demo có thể dùng `sessionStorage`, hiểu rằng không chống XSS; không ghi token vào log. Đăng xuất gọi API nếu phù hợp rồi xóa token phía client.
2. 401: xóa phiên và điều hướng login; 403: hiển thị không đủ quyền, không lặp request; 404: không tìm thấy; 422: hiển thị lỗi field; 5xx/network: retry thủ công.
3. Không lưu mật khẩu trong repo, `.env`, mock hoặc ảnh; không commit `.env` chứa bí mật; chỉ commit `.env.example`.
4. Không hiển thị MQ-135 raw dưới nhãn CO₂ ppm/AQI; chỉ hiển thị `mq135_adc_raw` (ADC raw) và `quality_level` do backend cung cấp.
5. Phân biệt `measured_at` (thời điểm đo) và `received_at` (thời điểm backend nhận); hiển thị giờ Việt Nam nhưng không tự thêm timezone nếu backend không bảo đảm; kiểm tra thực tế trước khi chuyển đổi.
6. Trạng thái `ACTIVE` của device lifecycle không đồng nghĩa online; thời gian last_seen không đủ mới thì ghi “Chưa xác định/Mất kết nối” tùy chính sách được cấu hình.
7. Không giả lập ACK hoặc trạng thái vật lý; dùng trạng thái command API; `SENT` không phải `ACKED`.
8. Hạn chế hành động gây thay đổi thật khi đang demo: xác nhận trước khi gửi lệnh, xóa rule, khóa user, đổi lifecycle.
9. Dùng semantic HTML, label cho input, focus keyboard, contrast tốt, icon có text hoặc aria-label, toast thông báo dễ hiểu.
10. Mock mode phải được bật rõ ràng (ví dụ `VITE_USE_MOCKS=true` chỉ ở local); không trộn mock và API thật không báo.

## 10. Kế hoạch thực hiện cho Codex

**Giai đoạn A – Kiểm tra repo:** đọc `frontend/`, `backend/app/schemas.py`, `backend/app/routers/`, `backend/app/models.py`, `vite.config.js`, `.env.example`; liệt kê file hiện có và các khác biệt với đặc tả. Không sửa backend.

**Giai đoạn B – Nền tảng:** thiết lập React Router, Axios, auth context, route guards, MainLayout, Sidebar, Header, design tokens, responsive; Login hoạt động với API.

**Giai đoạn C – ADMIN giao diện đầy đủ:** tạo 9 trang sau login theo mục 6; ưu tiên Dashboard, Telemetry, Alerts, Control; có loading/empty/error; dùng mock có chủ đích nếu API chưa sẵn.

**Giai đoạn D – Tích hợp API:** nối từng service với backend thật; kiểm tra response schema, quyền, lifecycle, ACK; không phát minh API.

**Giai đoạn E – OPERATOR/VIEWER:** sử dụng lại pages, menu theo role, chặn thao tác không đủ quyền; test với ba tài khoản role riêng (không nhúng mật khẩu).

**Giai đoạn F – Kiểm thử:** `npm install`/`npm ci` tùy lockfile, `npm run dev`, `npm run build`, lint nếu đã cấu hình; kiểm tra navigation, refresh, 401/403, empty data, offline, responsive.

## 11. Tiêu chí nghiệm thu

- [ ] Có 10 màn hình gồm Login và 9 màn hình sau đăng nhập, không có trang trắng hoặc route hỏng.
- [ ] ADMIN dùng đầy đủ chức năng frontend được backend hỗ trợ.
- [ ] OPERATOR và VIEWER dùng chung UI, menu và thao tác theo role/scope.
- [ ] Dashboard hiển thị đúng ba trường cảm biến, quality level, thời gian cập nhật và trạng thái node.
- [ ] Biểu đồ lịch sử đúng đơn vị, lọc thời gian; không giả mạo AQI/ppm.
- [ ] Alert acknowledge/resolve có xử lý trạng thái và lỗi.
- [ ] Lệnh điều khiển phân biệt PENDING/SENT/ACKED/FAILED/TIMEOUT.
- [ ] Quy tắc cảnh báo, users, device và audit đúng endpoint thực tế.
- [ ] Responsive desktop/tablet/mobile, có loading/empty/error, thao tác bàn phím cơ bản.
- [ ] `npm run build` thành công; không thay đổi backend/SQL/Docker ngoài phạm vi yêu cầu.


