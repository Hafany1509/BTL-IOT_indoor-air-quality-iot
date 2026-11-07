# Đặc Tả Kế Hoạch Kiểm Thử Hệ Thống (Test Cases Specification)

Tài liệu này đặc tả chi tiết 16 ca kiểm thử chức năng, phi chức năng và an toàn thông tin (T01 → T16) theo đúng yêu cầu tại Mục 10.1 của tài liệu Đề tài Đồ án môn học **"Hệ thống IoT giám sát và cảnh báo chất lượng không khí trong phòng"**.

---

## Danh Sách 16 Ca Kiểm Thử Chuẩn Hóa

### T01: Xác thực Đăng nhập, Đăng xuất và Hạn dùng Token
* **Mục tiêu**: Đảm bảo quy trình cấp phát và thu hồi JWT hoạt động chính xác; bảo vệ tài khoản khỏi tấn công brute-force cơ bản.
* **Tiền điều kiện**: Người dùng `admin` (hoạt động), `locked` (bị khóa).
* **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/login` với tài khoản/mật khẩu đúng (`admin`/`Demo@2026!`).
  2. Gửi request đăng nhập với mật khẩu sai.
  3. Gửi request đăng nhập với tài khoản bị khóa (`status = LOCKED`).
  4. Sử dụng token hết hạn hoặc token giả để gọi `GET /api/v1/auth/me`.
* **Kết quả mong đợi**:
  * Bước 1: Trả về HTTP 200 kèm `access_token` hợp lệ và vai trò `ADMIN`.
  * Bước 2: Trả về HTTP 401 Unauthorized ("Incorrect username or password", không tiết lộ tài khoản có tồn tại hay không).
  * Bước 3: Trả về HTTP 403 Forbidden ("Tài khoản đã bị khóa").
  * Bước 4: Trả về HTTP 401 Unauthorized ("Token is invalid or has expired").

---

### T02: Quản trị Tài khoản, Băm Mật khẩu và Khóa Người dùng
* **Mục tiêu**: Đảm bảo mật khẩu lưu trong MySQL luôn được băm bằng bcrypt và Admin có thể khóa tài khoản người khác.
* **Tiền điều kiện**: Đăng nhập với quyền `ADMIN`.
* **Các bước thực hiện**:
  1. Admin gửi `POST /api/v1/users` tạo tài khoản mới `operator_test`.
  2. Kiểm tra trực tiếp trong bảng `users` tại MySQL.
  3. Admin gửi `PATCH /api/v1/users/{id}/status` với `status: LOCKED`.
  4. Tài khoản `operator_test` thử đăng nhập lại.
* **Kết quả mong đợi**:
  * Bước 1: HTTP 201 Created.
  * Bước 2: Trường `password_hash` bắt đầu bằng `$2b$12$...`, tuyệt đối không chứa mật khẩu dạng rõ.
  * Bước 3: HTTP 200 OK, trạng thái chuyển sang `LOCKED`.
  * Bước 4: Bị từ chối đăng nhập với HTTP 403 Forbidden.

---

### T03: Đăng ký và Quản lý Vòng đời Thiết bị (Lifecycle)
* **Mục tiêu**: Xác minh quy trình chuyển trạng thái vòng đời phần cứng của node IoT.
* **Tiền điều kiện**: Admin đăng nhập.
* **Các bước thực hiện**:
  1. Admin gửi `POST /api/v1/devices` đăng ký node `esp32-new-01`.
  2. Chuyển trạng thái từ `REGISTERED` → `PROVISIONED` → `ACTIVE`.
  3. Chuyển sang `MAINTENANCE` và `DECOMMISSIONED`.
* **Kết quả mong đợi**:
  * Bản ghi trong MySQL lưu đúng `lifecycle`.
  * Thao tác được ghi lại vào bảng `audit_logs`.

---

### T04: Nhận và Lưu trữ Telemetry Hợp lệ
* **Mục tiêu**: Xác minh luồng dữ liệu từ cảm biến qua MQTT tới backend và MySQL (SC-01, SC-02).
* **Tiền điều kiện**: Thiết bị `esp32-a-01` ở trạng thái `ACTIVE`.
* **Các bước thực hiện**:
  1. ESP32 publish bản tin JSON chuẩn tới `home/room-a/esp32-a-01/telemetry`.
  2. Quan sát log của worker và kiểm tra bảng `telemetry` trong MySQL.
* **Kết quả mong đợi**:
  * Worker decode thành công, câu lệnh `INSERT` thực thi trong vòng < 100ms.
  * Bản ghi lưu đúng `device_id`, `temperature_c`, `humidity_pct`, `mq135_adc_raw`, `measured_at` (UTC).

---

### T05: Xử lý Bản tin Telemetry Lỗi / Bất thường
* **Mục tiêu**: Đảm bảo hệ thống bền vững khi nhận payload sai cú pháp, thiếu trường hoặc giá trị ngoài ngưỡng vật lý.
* **Tiền điều kiện**: Mosquitto và worker đang hoạt động.
* **Các bước thực hiện**:
  1. Gửi payload thiếu trường `boot_id` hoặc `seq`.
  2. Gửi giá trị `temperature_c: 150` (vượt ngưỡng cho phép của DHT22).
  3. Gửi chuỗi timestamp sai định dạng ISO 8601.
* **Kết quả mong đợi**:
  * Pydantic validator trong `contracts.py` bắt lỗi `ValueError`.
  * Worker ghi log cảnh báo và từ chối lưu vào DB, không làm crash tiến trình worker.

---

### T06: Truy vấn Lịch sử Telemetry theo Thời gian và Thiết bị
* **Mục tiêu**: Kiểm tra hiệu năng và độ chính xác của API truy vấn lịch sử phục vụ vẽ biểu đồ (FR-06).
* **Tiền điều kiện**: Bảng `telemetry` đã có dữ liệu mẫu.
* **Các bước thực hiện**:
  1. Gọi `GET /api/v1/devices/esp32-a-01/telemetry?from=2026-11-06T00:00:00Z&to=2026-11-07T23:59:59Z&limit=50`.
* **Kết quả mong đợi**:
  * Trả về danh sách mẫu đo sắp xếp theo `measured_at DESC`.
  * Thời gian phản hồi API p95 < 500ms nhờ chỉ mục `(device_id, measured_at DESC)`.

---

### T07: Kích hoạt Cảnh báo Vượt ngưỡng & Kiểm tra Cooldown
* **Mục tiêu**: Xác thực Rule Engine và cơ chế chống bão cảnh báo (FR-07).
* **Tiền điều kiện**: Luật cảnh báo nhiệt độ > 32°C, `cooldown_seconds = 180`.
* **Các bước thực hiện**:
  1. Gửi telemetry với `temperature_c = 34.5°C`.
  2. Quan sát bảng `alerts`.
  3. Gửi tiếp mẫu thứ 2 sau 10 giây với `temperature_c = 35.0°C`.
* **Kết quả mong đợi**:
  * Mẫu 1: Kích hoạt cảnh báo mới (`status = OPEN`, mức `HIGH`).
  * Mẫu 2: Bị chặn bởi cơ chế cooldown, không sinh thêm bản ghi trùng lặp trong 180 giây.

---

### T08: Operator Gửi Lệnh Điều khiển & Nhận ACK
* **Mục tiêu**: Xác thực quy trình điều khiển hai chiều và cập nhật ACK thành công (FR-08, SC-03).
* **Tiền điều kiện**: Operator có quyền `CONTROL` trên thiết bị `esp32-a-01`.
* **Các bước thực hiện**:
  1. Gửi `POST /api/v1/devices/esp32-a-01/commands` với hành vi bật quạt `{"action":"FAN_SET","value":"ON"}`.
  2. Thiết bị nhận lệnh từ MQTT và gửi lại ACK trên topic `/ack`.
  3. Gọi `GET /api/v1/commands/{command_id}`.
* **Kết quả mong đợi**:
  * Ban đầu lệnh ở trạng thái `SENT`.
  * Sau khi nhận ACK, lệnh chuyển sang `ACKED` kèm `ack_at` và `result_payload: {"fan_state":"ON"}`.

---

### T09: Phân quyền Vai trò - Chặn Viewer Gửi Lệnh Điều khiển
* **Mục tiêu**: Đảm bảo phân quyền ở tầng Backend API, không phụ thuộc vào việc ẩn nút trên giao diện web (SC-05).
* **Tiền điều kiện**: Đăng nhập với tài khoản `viewer_user` (vai trò `VIEWER`).
* **Các bước thực hiện**:
  1. Gọi trực tiếp API gửi lệnh `POST /api/v1/devices/esp32-a-01/commands`.
* **Kết quả mong đợi**:
  * Backend từ chối với HTTP 403 Forbidden ("Viewer role cannot execute control or management operations").

---

### T10: Phân quyền Phạm vi (Device Scope) - Chống Lỗ hổng IDOR
* **Mục tiêu**: Người dùng không thể xem dữ liệu hoặc gửi lệnh tới thiết bị ngoài phạm vi được phân công.
* **Tiền điều kiện**: `operator_a` chỉ được gán quyền trên `esp32-a-01`, không được gán trên `sim-b-01`.
* **Các bước thực hiện**:
  1. `operator_a` gửi yêu cầu `GET /api/v1/devices/sim-b-01`.
  2. `operator_a` gửi lệnh tới `POST /api/v1/devices/sim-b-01/commands`.
* **Kết quả mong đợi**:
  * Cả hai yêu cầu đều bị backend từ chối với HTTP 403 Forbidden ("Device is outside your assigned scope").

---

### T11: Ngắt Mạng, Phát hiện Offline và Khôi phục Reconnect
* **Mục tiêu**: Kiểm tra cơ chế Heartbeat/LWT và khôi phục sau mất kết nối (SC-04, FR-09).
* **Tiền điều kiện**: Thiết bị đang `ACTIVE`.
* **Các bước thực hiện**:
  1. Ngắt nguồn node hoặc ngắt Wi-Fi trong 60 giây.
  2. Kiểm tra trạng thái thiết bị trên API.
  3. Bật lại thiết bị, gửi lại telemetry.
* **Kết quả mong đợi**:
  * Sau timeout, thiết bị tự động chuyển sang `OFFLINE`.
  * Khi có tin mới, thiết bị tự động khôi phục sang `ACTIVE`.

---

### T12: Khóa Thiết bị và Kiểm tra Chặn Truy Cập
* **Mục tiêu**: Xác minh node bị Admin khóa (`LOCKED`) sẽ bị cấm toàn bộ luồng truyền tin (Mục 5.2).
* **Tiền điều kiện**: Admin chuyển `esp32-a-01` sang trạng thái `LOCKED`.
* **Các bước thực hiện**:
  1. Gửi lệnh điều khiển tới thiết bị qua API.
  2. Thiết bị gửi gói tin telemetry tới MQTT broker.
* **Kết quả mong đợi**:
  * API từ chối gửi lệnh với HTTP 400 Bad Request ("Device is LOCKED").
  * Backend worker bỏ qua telemetry, không ghi nhận vào DB.

---

### T13: Lệnh Điều khiển Không có ACK hoặc Quá Hạn (Timeout)
* **Mục tiêu**: Đảm bảo không hiển thị thành công giả tạo khi phần cứng gặp sự cố (FR-08).
* **Tiền điều kiện**: Thiết bị tắt hoặc ngắt kết nối MQTT.
* **Các bước thực hiện**:
  1. Gửi lệnh điều khiển quạt với `timeout_seconds = 10`.
  2. Đợi 12 giây rồi kiểm tra `GET /api/v1/commands/{command_id}`.
* **Kết quả mong đợi**:
  * Lệnh chuyển từ `SENT` sang `TIMEOUT` kèm thông báo lỗi rõ ràng.

---

### T14: Chống Trùng lặp Bản tin và Tính Lũy Đẳng (Idempotency)
* **Mục tiêu**: Đảm bảo việc gửi lại gói tin do QoS 1 retry không làm nhân đôi số đo hoặc tác động lệnh lặp (FR-05).
* **Các bước thực hiện**:
  1. Gửi 2 lần cùng một bản tin telemetry (trùng `device_id`, `boot_id`, `seq`).
* **Kết quả mong đợi**:
  * Trong CSDL chỉ tồn tại duy nhất 1 bản ghi số đo (nhờ khóa chính composite).

---

### T15: Kiểm toán An toàn và Quét Bí mật (Audit & Secrets)
* **Mục tiêu**: Đảm bảo mọi hành động nhạy cảm đều được ghi vết và không để lộ mật khẩu trong log hoặc mã nguồn (FR-10, SC-07).
* **Các bước thực hiện**:
  1. Admin gọi `GET /api/v1/audit-logs`.
  2. Rà soát trường `metadata` trong CSDL.
* **Kết quả mong đợi**:
  * Ghi nhận đầy đủ thao tác login, đổi mật khẩu, đổi lifecycle, gửi lệnh.
  * Các trường nhạy cảm (`password`, `token`, `secret`) đều được thay bằng `[REDACTED]`.

---

### T16: Khả Năng Phục Hồi Khi Khởi Động Lại Hệ Thống
* **Mục tiêu**: Hệ thống tự phục hồi trạng thái sau khi backend hoặc broker bị tắt đột ngột.
* **Các bước thực hiện**:
  1. Khởi động lại container backend API và worker (`docker compose restart api worker`).
  2. Gửi request kiểm tra health và tiếp tục gửi telemetry.
* **Kết quả mong đợi**:
  * `GET /api/v1/health` trả về 200 OK.
  * Worker tự động kết nối lại Mosquitto broker và tiếp tục nhận dữ liệu bình thường.

