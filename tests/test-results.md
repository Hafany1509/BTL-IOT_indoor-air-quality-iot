# Báo Cáo Kết Quả Kiểm Thử Hệ Thống (Test Execution & Evidence Report)

Tài liệu này ghi nhận kết quả thực thi kiểm thử toàn diện đối với các thành phần **Backend API, Cơ sở dữ liệu MySQL, và Broker Mosquitto**, đối soát trực tiếp với 16 ca kiểm thử (T01 → T16) và các tiêu chí đánh giá an toàn thông tin của đồ án.

---

## 1. Bảng Tổng Hợp Kết Quả Thực Thi 16 Ca Kiểm Thử

| Mã Test | Tên ca kiểm thử | Phương thức thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **T01** | Xác thực đăng nhập, token hết hạn | Pytest / API Test | Đúng mật khẩu: HTTP 200 (JWT); Sai mật khẩu: HTTP 401; Khóa: HTTP 403. | HTTP 200 / HTTP 401 / HTTP 403 chính xác. | **PASS** ✅ |
| **T02** | Băm mật khẩu & Khóa tài khoản | Pytest / DB Query | `password_hash` được băm bằng bcrypt `$2b$12$...`; khóa user chặn login. | Mật khẩu được băm an toàn, tài khoản `LOCKED` bị cấm đăng nhập. | **PASS** ✅ |
| **T03** | Đăng ký & Vòng đời thiết bị | API Integration | Đăng ký node thành công, trạng thái chuyển tuần tự qua các bước vòng đời. | CSDL lưu đúng `REGISTERED` → `PROVISIONED` → `ACTIVE`. | **PASS** ✅ |
| **T04** | Nhận & Lưu Telemetry hợp lệ | Worker / DB Query | Bản tin JSON qua MQTT được decode, validate và ghi vào MySQL < 100ms. | Telemetry được lưu với timestamp UTC và giá trị hợp lệ. | **PASS** ✅ |
| **T05** | Xử lý payload lỗi / bất thường | Unit Test Pydantic | Loại bỏ gói tin thiếu trường, sai kiểu hoặc giá trị ngoài ngưỡng vật lý. | Pydantic bắt lỗi `ValueError`, worker không bị crash. | **PASS** ✅ |
| **T06** | Lọc lịch sử theo thời gian & node | API Telemetry Query | Trả về chuỗi số đo lọc theo `from`/`to`, sắp xếp giảm dần theo thời gian. | HTTP 200, phản hồi danh sách mẫu đúng khoảng thời gian. | **PASS** ✅ |
| **T07** | Vượt ngưỡng cảnh báo & Cooldown | Worker Alert Engine | Kích hoạt cảnh báo `OPEN`; mẫu lặp trong thời gian cooldown bị bỏ qua. | Cảnh báo được ghi vào bảng `alerts`; không bị bão spam. | **PASS** ✅ |
| **T08** | Operator gửi lệnh & Nhận ACK | API / MQTT Test | Lệnh chuyển `SENT` → `ACKED` sau khi ESP32 phản hồi thành công. | Lệnh lưu trạng thái `ACKED` kèm `result_payload`. | **PASS** ✅ |
| **T09** | Chặn Viewer gửi lệnh điều khiển | Pytest Security | Viewer gọi API điều khiển bị từ chối với HTTP 403 Forbidden. | Backend trả về HTTP 403 Forbidden, không phát MQTT. | **PASS** ✅ |
| **T10** | Chặn truy cập trái phạm vi (IDOR) | Pytest Security | Operator không thể xem/điều khiển thiết bị ngoài phạm vi được gán. | Backend trả về HTTP 403 Forbidden ("Outside assigned scope"). | **PASS** ✅ |
| **T11** | Ngắt kết nối & Khôi phục LWT | Mosquitto Test | Mất kết nối quá 60s chuyển `OFFLINE`; kết nối lại tự động chuyển `ACTIVE`. | Trạng thái cập nhật chính xác theo chu kỳ heartbeat và LWT. | **PASS** ✅ |
| **T12** | Khóa thiết bị cấm gửi/nhận tin | Backend / Broker | Node bị `LOCKED` không nhận lệnh từ API và bị worker từ chối telemetry. | API từ chối phát lệnh; worker bỏ qua dữ liệu từ node bị khóa. | **PASS** ✅ |
| **T13** | Xử lý lệnh không ACK (Timeout) | Watchdog Test | Lệnh không có phản hồi sau `timeout_seconds` tự động chuyển `TIMEOUT`. | Trạng thái chuyển thành `TIMEOUT` kèm thông báo lỗi rõ ràng. | **PASS** ✅ |
| **T14** | Khử trùng lặp (Idempotency) | MySQL Insert Test | Gửi lại cùng một bản tin telemetry (trùng boot_id & seq) không nhân đôi dữ liệu. | `ON DUPLICATE KEY UPDATE` giữ nguyên tính toàn vẹn 1 bản ghi duy nhất. | **PASS** ✅ |
| **T15** | Kiểm toán & Loại bỏ bí mật | Audit Log Query | Ghi nhận đầy đủ thao tác; trường nhạy cảm được che giấu `[REDACTED]`. | Bảng `audit_logs` lưu vết đầy đủ, không để lộ mật khẩu/token. | **PASS** ✅ |
| **T16** | Khả năng phục hồi hệ thống | Docker Restart | Khởi động lại API và Worker không gây mất dữ liệu hoặc lỗi kết nối. | Hệ thống tự kết nối lại broker và tiếp tục phục vụ bình thường. | **PASS** ✅ |

---

## 2. Báo Cáo Đánh Giá An Toàn Thông Tin & Phân Quyền (Security Evaluation)

### 2.1. Kiểm soát Xác thực & Lưu trữ Mật khẩu (Authentication & Hashing)
* **Kết quả**: Mọi mật khẩu người dùng đều được băm bằng thuật toán **bcrypt (cost factor = 12)** trước khi lưu vào bảng `users`. Tuyệt đối không tồn tại mật khẩu dạng rõ (plaintext) trong database, mã nguồn hoặc tệp cấu hình.
* **Cơ chế Token**: Sử dụng **JSON Web Token (JWT HS256)** có thời hạn hiệu lực rõ ràng (12 giờ). Khi tài khoản bị Admin chuyển sang trạng thái `LOCKED`, mọi request tiếp theo đều bị chặn tức thì với mã lỗi **HTTP 403 Forbidden**.

### 2.2. Kiểm soát Phân quyền Vai trò (RBAC) & Phạm vi Thiết bị (Device Scope)
* **Chống rò rỉ chức năng (T09)**: Vai trò `VIEWER` chỉ được cấp quyền xem dữ liệu đo. Khi Viewer cố ý gửi request `POST /api/v1/devices/{id}/commands` bằng các công cụ như cURL/Postman, hệ thống chặn ngay tại middleware tầng server và trả về **HTTP 403 Forbidden**, chứng minh tính bảo mật không phụ thuộc vào frontend.
* **Chống tấn công IDOR (Insecure Direct Object Reference - T10)**: Người dùng thuộc vai trò `OPERATOR` bị giới hạn nghiêm ngặt trong các thiết bị/phòng được chỉ định tại bảng `device_assignments`. Khi Operator cố ý thay đổi `device_id` trên URL sang thiết bị của người khác, hàm `check_device_scope()` lập tức phát hiện và từ chối truy cập.

### 2.3. Kiểm soát Phân quyền Tầng Giao thức MQTT (Mosquitto Broker ACL)
* **Nguyên tắc đặc quyền tối thiểu**: Mỗi node phần cứng (ESP32, Simulator) được cấp tài khoản MQTT riêng biệt.
* **Cô lập Topic**: File cấu hình ACL quy định node `esp32-a-01` chỉ được ghi vào `home/room-a/esp32-a-01/...` và không thể can thiệp hay đọc trộm các gói tin của `sim-b-01`.

### 2.4. Tính Toàn Vẹn & Khử Trùng Lặp (Deduplication & Idempotency)
* Mạng IoT không dây có thể gặp hiện tượng truyền lặp lại gói tin khi dùng `QoS 1`. Bằng cách thiết kế khóa chính phức hợp `(device_id, boot_id, seq)` cho bảng `telemetry` và khóa duy nhất `command_id` cho bảng `commands`, hệ thống đảm bảo **không bao giờ bị nhân bản bản ghi đo đạc** và **không bao giờ thực thi một lệnh vật lý hai lần**.

---

## 3. Kết Luận Nghiệm Thu

Bộ mã nguồn Backend và CSDL đã vượt qua **100% các tiêu chí kỹ thuật và ca kiểm thử (16/16 ca PASS)**. Hệ thống sẵn sàng cho việc tích hợp hiển thị trực quan trên giao diện Frontend React và kết nối với phần cứng ESP32 thật tại phòng thí nghiệm.

