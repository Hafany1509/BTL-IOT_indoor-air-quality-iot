# Kiến trúc

- Phòng A: ESP32 + DHT22 + MQ-135 + relay/quạt 5V + LED. Phòng B: Python mô phỏng.
- Thiết bị trao đổi MQTT qua Mosquitto; frontend gọi REST API FastAPI.
- Worker MQTT riêng nhận telemetry và ghi MySQL, tránh nhân bản consumer khi tăng số API worker.
- Phân quyền dự kiến: Admin toàn hệ thống, Operator theo phòng được gán, Viewer chỉ đọc. MQTT ACL xác thực thiết bị độc lập với JWT/RBAC của người dùng web.
- Backend phải xác minh quyền trước khi gửi lệnh. `command_id` ghép ACK; xác nhận cảnh báo của người dùng là thao tác khác với ACK của thiết bị.
- Cảnh báo dự kiến xét ngưỡng dữ liệu hợp lệ, theo dõi heartbeat/LWT, lưu trạng thái và audit log. Offline và trạng thái vòng đời quản lý là hai khái niệm riêng.

Tài liệu kỹ thuật: [Mosquitto config](https://mosquitto.org/man/mosquitto-conf-5.html), [Eclipse Paho](https://eclipse.dev/paho/clients/python/docs/), [FastAPI module layout](https://fastapi.tiangolo.com/tutorial/bigger-applications/).

