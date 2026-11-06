# Hợp đồng REST API

Tiền tố `/api/v1`. Endpoint **đã có**: `GET /health` trả `{"status":"ok","service":"api"}`.

| Endpoint dự kiến | Kết quả / phạm vi |
|---|---|
| POST /auth/token | JWT sau khi xác minh tài khoản |
| GET /devices | Danh sách thiết bị thuộc phạm vi người dùng |
| GET /devices/{device_id}/telemetry | Số đo theo from, to, limit; cần quyền xem |
| POST /devices/{device_id}/commands | Tạo lệnh, trả command_id và trạng thái ban đầu; cần quyền điều khiển |
| GET /commands/{command_id} | Trạng thái lệnh và ACK nếu có |
| GET /alerts | Danh sách cảnh báo theo phòng được cấp |
| PATCH /alerts/{alert_id}/acknowledge | Xác nhận cảnh báo; cần quyền vận hành |

Các endpoint trên chưa được triển khai, không dùng để báo cáo như tính năng đã hoàn thành. Dự kiến dùng 401 nếu chưa xác thực, 403 nếu không có quyền. Kiểm tra cả vai trò và quyền thiết bị/phòng tại backend.

