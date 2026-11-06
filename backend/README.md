# Backend

`app/main.py` là FastAPI REST API. `app/worker.py` là consumer MQTT độc lập: kiểm tra bản tin, đối chiếu thiết bị đang hoạt động và lưu telemetry vào MySQL. Không chạy nhiều consumer dùng cùng client ID. Endpoint hiện có: `GET /api/v1/health` (kiểm tra tiến trình API).

Các phần tiếp theo: router auth, devices, telemetry, alerts, commands; JWT/băm mật khẩu và quyền theo phòng; migration Alembic; cập nhật last_seen; xử lý ACK, cảnh báo, audit log, retry lưu dữ liệu. Xem [hợp đồng API](../docs/api.md).

