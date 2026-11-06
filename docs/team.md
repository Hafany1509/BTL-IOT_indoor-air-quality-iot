# Điểm bắt đầu cho nhóm 3 người

Bảng là đề xuất chia theo mảng. Nhóm tự gán tên thành viên trong issue sau khi thống nhất.

| Mảng | Thư mục chính | Việc đầu tiên / tiêu chí |
|---|---|---|
| Thiết bị & MQTT | `firmware/`, `simulator/`, `hardware/`, `deployment/mosquitto/` | Kiểm tra Serial ESP32, chốt chân theo module thật, publish đúng hợp đồng và kiểm tra ACL chặn gửi nhầm phòng |
| Backend & dữ liệu | `backend/`, `database/`, `tests/` | Kiểm tra worker nhận mẫu, mở API đọc theo quyền, bổ sung JWT/RBAC, migration, cảnh báo và lệnh theo từng PR |
| Web & tích hợp | `frontend/`, `docs/`, `tests/` | Chạy Vite, dựng giao diện hai phòng với fixture, tích hợp API, viết checklist demo và ghi bằng chứng |

**Mốc ghép đầu tiên:** simulator → Mosquitto → worker → MySQL, sau đó thêm API đọc đã phân quyền và dashboard. Sau khi luồng mô phỏng ổn định mới thay bằng node ESP32. Kiểm thử luồng lệnh và ACK riêng.

