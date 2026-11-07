# MySQL Database

Cơ sở dữ liệu cho dự án **Hệ thống IoT giám sát và cảnh báo chất lượng không khí trong phòng** sử dụng MySQL 8.0 / 8.4 (InnoDB, bảng mã `utf8mb4`).

## Cấu trúc tệp (Chuẩn theo Mục 14 tài liệu đồ án)

```text
database/
├── README.md        # Tài liệu mô tả cơ sở dữ liệu
├── schema.sql       # Toàn bộ câu lệnh DDL khởi tạo 9 bảng thực thể cốt lõi
└── seed_demo.sql    # Dữ liệu mẫu khởi tạo phục vụ demo và kiểm thử
```

Hai tệp này được mount trực tiếp vào dịch vụ `mysql` trong `compose.yaml`:
```yaml
volumes:
  - mysql_data:/var/lib/mysql
  - ./database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
  - ./database/seed_demo.sql:/docker-entrypoint-initdb.d/02_seed.sql:ro
```
Khi MySQL container khởi chạy lần đầu, tệp `01_schema.sql` sẽ tự động thực thi để tạo bảng trước, sau đó `02_seed.sql` sẽ nạp dữ liệu mẫu.

---

## Danh mục 9 bảng thực thể cốt lõi

1. **`rooms`**: Quản lý phòng/khu vực lắp đặt (`room-a`, `room-b`).
2. **`users`**: Tài khoản người dùng, băm mật khẩu bcrypt và phân quyền RBAC (`ADMIN`, `OPERATOR`, `VIEWER`).
3. **`devices`**: Quản lý phần cứng và 8 trạng thái vòng đời (`REGISTERED`, `PROVISIONED`, `ACTIVE`, `OFFLINE`, `FAULT`, `MAINTENANCE`, `LOCKED`, `DECOMMISSIONED`), lưu trữ hash MQTT credential.
4. **`device_assignments`**: Phân quyền theo phạm vi thiết bị/phòng (Device Scope) cho Operator và Viewer, ngăn ngừa lỗ hổng IDOR.
5. **`telemetry`**: Dữ liệu chuỗi thời gian số đo DHT22 (nhiệt độ, độ ẩm) và MQ-135 (ADC raw). Khóa chính `(device_id, boot_id, seq)` triệt tiêu trùng lặp do cơ chế retry của MQTT QoS 1.
6. **`alert_rules`**: Quy tắc ngưỡng cảnh báo và thời gian giãn cách (`cooldown_seconds`) chống bão alert.
7. **`alerts`**: Quản lý sự kiện vượt ngưỡng và quy trình xử lý 3 bước (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`).
8. **`commands`**: Lưu trữ và điều phối lệnh điều khiển 2 chiều (quạt 5V, LED, config) với mã `command_id` duy nhất, trạng thái ACK và cơ chế timeout.
9. **`audit_logs`**: Nhật ký kiểm toán bảo mật (`append-only`) ghi lại mọi thao tác quan trọng, tự động bóc tách thông tin nhạy cảm.

---

## Dữ liệu mẫu (Seed Data)

* **Tài khoản mặc định** (Mật khẩu: `Demo@2026!`):
  * `admin` (`admin@iot.local`) - Quản trị viên toàn hệ thống.
  * `operator_a` (`operator.a@iot.local`) - Người vận hành (được gán quyền CONTROL trên `esp32-a-01`).
  * `viewer_user` (`viewer@iot.local`) - Người xem (được gán quyền VIEW trên `esp32-a-01`).
* **Thiết bị**:
  * `esp32-a-01` (`room-a`): Node phần cứng ESP32 thật.
  * `sim-b-01` (`room-b`): Node Python mô phỏng (Simulator).

---

## Hướng dẫn nạp lại Database khi thay đổi Schema

Khi container MySQL đã tạo volume dữ liệu trước đó, MySQL sẽ không chạy lại các script khởi tạo. Để xóa dữ liệu cũ và áp dụng lại toàn bộ schema + seed mới từ đầu:

```powershell
docker compose down -v
docker compose up -d mysql
```
