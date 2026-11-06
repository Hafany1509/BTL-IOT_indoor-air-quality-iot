# MySQL

Schema khởi tạo gồm `devices` và `telemetry`, với hai thiết bị demo. MySQL chạy script trong `init/` khi volume mới được tạo. Thay đổi file init không cập nhật database đã có dữ liệu; dùng migration cho thay đổi tiếp theo.

Thời gian đo lưu UTC. Khóa `(device_id, boot_id, seq)` chống ghi lại mẫu khi MQTT gửi trùng. Mô hình dự kiến bổ sung `rooms`, `users`, `device_assignments`, `alert_rules`, `alerts`, `commands`, `audit_logs`; không sửa/xóa volume để áp dụng schema mới nếu cần giữ dữ liệu.

