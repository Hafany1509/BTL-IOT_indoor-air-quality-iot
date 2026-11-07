# Tài liệu Đặc tả REST API (D08 - API Specification)

Hệ thống cung cấp giao diện RESTful API phục vụ frontend React/Vite, các dịch vụ tích hợp và người vận hành.
* **Tiền tố gốc**: `/api/v1`
* **Định dạng dữ liệu**: `application/json`
* **Chuẩn xác thực**: JSON Web Token (JWT) theo chuẩn Bearer Token trong header `Authorization: Bearer <token>`
* **Quy ước thời gian**: Mọi trường timestamp gửi và nhận đều tuân theo chuẩn **ISO 8601 (UTC)**.

---

## 1. Bảng mã phản hồi HTTP chuẩn

| Mã lỗi | Tên chuẩn | Ý nghĩa trong hệ thống |
| :--- | :--- | :--- |
| `200 OK` | Thành công | Thao tác truy vấn hoặc cập nhật thành công. |
| `201 Created` | Đã tạo | Bản ghi mới (User, Command, Device, Rule) được tạo thành công. |
| `400 Bad Request` | Yêu cầu sai | Dữ liệu đầu vào không hợp lệ hoặc vi phạm logic nghiệp vụ. |
| `401 Unauthorized` | Chưa xác thực | Token thiếu, sai chữ ký hoặc đã hết hạn. |
| `403 Forbidden` | Bị từ chối | Tài khoản bị khóa, vai trò không đủ quyền hoặc truy cập thiết bị ngoài phạm vi (IDOR). |
| `404 Not Found` | Không tìm thấy | Thiết bị, người dùng hoặc tài nguyên không tồn tại. |

---

## 2. Danh mục Endpoints chi tiết

### 2.1. Nhóm Xác thực & Hồ sơ cá nhân (`/auth`)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả chức năng | Request Body mẫu | Response mẫu |
| :--- | :--- | :--- | :--- | :--- |
| `POST /auth/login` | Public | Đăng nhập tài khoản, nhận token JWT. | `{"username":"admin", "password":"..."}` | `{"access_token":"...", "role":"ADMIN", ...}` |
| `GET /auth/me` | User bất kỳ | Lấy thông tin hồ sơ của tài khoản đang đăng nhập. | *None* | `{"id":1, "username":"admin", "role":"ADMIN"}` |
| `PATCH /auth/password` | User bất kỳ | Đổi mật khẩu tài khoản cá nhân. | `{"current_password":"..", "new_password":".."}` | `{"status":"ok", "message":"Đổi mật khẩu thành công"}` |
| `PATCH /auth/profile` | User bất kỳ | Cập nhật tên hiển thị hoặc email cá nhân. | `{"full_name":"Nguyen Van A"}` | `{"id":1, "full_name":"Nguyen Van A", ...}` |
| `POST /auth/logout` | User bất kỳ | Ghi vết đăng xuất vào Audit Log. | *None* | `{"status":"ok"}` |

---

### 2.2. Nhóm Quản lý Người dùng (`/users` - Admin Only)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả chức năng | Request Body mẫu |
| :--- | :--- | :--- | :--- |
| `GET /users` | Admin | Lấy danh sách toàn bộ người dùng trong hệ thống. | *None* |
| `POST /users` | Admin | Tạo người dùng mới và chỉ định vai trò (`ADMIN`, `OPERATOR`, `VIEWER`). | `{"username":"op1", "email":"op@iot.vn", "password":"...", "role":"OPERATOR", "full_name":"..."}` |
| `PATCH /users/{id}/status` | Admin | Khóa (`LOCKED`), kích hoạt (`ACTIVE`), hoặc vô hiệu hóa tài khoản. | `{"status":"LOCKED"}` |
| `PATCH /users/{id}/role` | Admin | Thay đổi vai trò quyền hạn của người dùng. | `{"role":"OPERATOR"}` |

---

### 2.3. Nhóm Thiết bị & Vị trí (`/devices` & `/rooms`)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả chức năng & Kiểm tra phạm vi (Scope) |
| :--- | :--- | :--- |
| `GET /rooms` | User bất kỳ | Lấy danh sách các phòng giám sát. |
| `POST /rooms` | Admin | Tạo mới vị trí phòng (`room_id`, `name`, `description`). |
| `GET /devices` | User bất kỳ | Lấy danh sách thiết bị. Admin thấy tất cả; Operator/Viewer chỉ thấy thiết bị trong phạm vi phân công. |
| `GET /devices/{id}` | Scope VIEW | Lấy chi tiết một node phần cứng (kiểm tra quyền phạm vi). |
| `POST /devices` | Admin | Đăng ký thiết bị mới vào hệ thống (bắt đầu từ trạng thái `REGISTERED`). |
| `PATCH /devices/{id}/lifecycle` | Scope MANAGE | Chuyển đổi trạng thái vòng đời (`PROVISIONED`, `ACTIVE`, `OFFLINE`, `FAULT`, `MAINTENANCE`, `LOCKED`, `DECOMMISSIONED`). |
| `POST /devices/{id}/assignments`| Admin | Phân quyền một thiết bị/phòng cho Operator hoặc Viewer (`VIEW`, `CONTROL`, `MANAGE`). |

---

### 2.4. Nhóm Lịch sử Telemetry (`/devices/{id}/telemetry`)

| Phương thức & Endpoint | Tham số Query | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET /devices/{id}/telemetry` | `from`: datetime ISO<br>`to`: datetime ISO<br>`limit`: int (1–1000) | Lấy chuỗi thời gian số đo nhiệt độ, độ ẩm, MQ-135 ADC raw và chất lượng không khí để vẽ biểu đồ. |
| `GET /devices/{id}/telemetry/latest`| *None* | Lấy mẫu số đo mới nhất của node để cập nhật tức thời lên Dashboard. |

---

### 2.5. Nhóm Điều khiển 2 chiều & ACK (`/devices/{id}/commands` & `/commands`)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả & Quy trình 2 chiều |
| :--- | :--- | :--- |
| `POST /devices/{id}/commands` | Scope CONTROL | Gửi lệnh đến thiết bị chấp hành (bật/tắt quạt 5V, LED, config).<br>1. Sinh `command_id` duy nhất.<br>2. Lưu DB trạng thái `PENDING`.<br>3. Publish MQTT QoS 1 tới `home/{room_id}/{device_id}/command`.<br>4. Chuyển sang `SENT` kèm `timeout_at`. *(Viewer bị chặn 403 Forbidden)*. |
| `GET /commands/{command_id}` | Scope VIEW | Kiểm tra trạng thái thực thi lệnh: `SENT` → `ACKED` (nếu ESP32 phản hồi) hoặc `TIMEOUT` (nếu quá hạn). |
| `GET /devices/{id}/commands` | Scope VIEW | Lấy lịch sử 20 lệnh gần nhất của thiết bị. |

---

### 2.6. Nhóm Cảnh báo Ngưỡng (`/alerts` & `/alert-rules`)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET /alert-rules` | User bất kỳ | Lấy danh sách các quy tắc giám sát ngưỡng đang bật. |
| `POST /alert-rules` | Admin | Tạo luật cảnh báo mới (`metric`, `operator`, `threshold`, `severity`, `cooldown_seconds`). |
| `PATCH /alert-rules/{id}` | Admin | Sửa cấu hình ngưỡng hoặc bật/tắt luật. |
| `DELETE /alert-rules/{id}` | Admin | Xóa bỏ một quy tắc giám sát. |
| `GET /alerts` | Scope VIEW | Lấy danh sách sự kiện cảnh báo (lọc theo `status`: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`). |
| `PATCH /alerts/{id}/acknowledge`| Scope CONTROL | Người vận hành tiếp nhận xử lý sự cố (`status = ACKNOWLEDGED`). |
| `PATCH /alerts/{id}/resolve` | Scope CONTROL | Xác nhận đã khắc phục xong sự cố kèm ghi chú giải pháp (`status = RESOLVED`). |

---

### 2.7. Nhóm Nhật ký Kiểm toán An toàn (`/audit-logs`)

| Phương thức & Endpoint | Quyền tối thiểu | Mô tả chức năng |
| :--- | :--- | :--- |
| `GET /audit-logs` | Admin | Tra cứu nhật ký truy cập, thay đổi quyền, gửi lệnh và chuyển trạng thái thiết bị. Dữ liệu nhạy cảm (mật khẩu/token) đã được loại bỏ tự động trước khi lưu. |

---

## 3. Liveness Probe Hệ thống

* `GET /api/v1/health`: Trả về `{"status":"ok","service":"api"}` phục vụ kiểm tra trạng thái hoạt động của container.
