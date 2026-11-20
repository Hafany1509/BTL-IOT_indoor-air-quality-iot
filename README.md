# Hệ thống IoT giám sát và cảnh báo chất lượng không khí trong nhà

Đồ án IoT và ứng dụng. Nhóm: Lê Huy Hải, Nguyễn Thu Thảo, Phạm Thu Hà.

Hai phòng: phòng A dùng ESP32 thật, phòng B dùng node Python mô phỏng. Starter chọn FastAPI, React/Vite, Mosquitto và MySQL để cả nhóm dùng chung một môi trường. MQ-135 cung cấp giá trị ADC tương đối, không phải CO₂ ppm hoặc AQI.

| Thư mục | Điểm bắt đầu |
|---|---|
| `backend/` | FastAPI health check và worker nhận/lưu telemetry |
| `frontend/` | React/Vite, giao diện khởi đầu và kiểm tra API |
| firmware/ | Mã PlatformIO ESP32 cho DHT22, MQ-135, MQTT, lệnh cơ cấu chấp hành và ACK; chưa kiểm chứng phần cứng |
| `simulator/` | Node phòng B, telemetry, heartbeat và ACK mô phỏng |
| `database/` | SQL khởi tạo thiết bị và bảng telemetry |
| `deployment/` | Cấu hình broker và ACL; Compose ở thư mục gốc |
| `hardware/` | BOM, sơ đồ đấu dây và ảnh prototype |
| `docs/` | Kiến trúc, MQTT/API, phân công và hướng dẫn GitHub |
| `tests/` | Kiểm tra API/contract và kế hoạch kiểm thử tích hợp |
| `.github/` | CI, mẫu issue và mẫu pull request |

## Chạy thử trên Windows

Cần Docker Desktop đang chạy, Python 3.12 và Node.js 22.12+ (hoặc 24 LTS). Từ thư mục gốc:

```powershell
py -3.12 scripts/bootstrap.py
docker compose --profile sim up --build -d
Invoke-RestMethod http://localhost:8000/api/v1/health
docker compose logs --tail 20 simulator worker
```

`bootstrap.py` tạo `.env` với mật khẩu riêng cho máy của bạn. Nếu không có lệnh `py`, dùng `python` khi đã cài Python 3.12. `/docs` của API ở http://localhost:8000/docs. API chỉ mở trên localhost; endpoint health kiểm tra tiến trình, không xác nhận broker hoặc DB.

Trong terminal khác, từ thư mục gốc:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Mở URL localhost do Vite in ra. Web hiện hiển thị khung hai phòng và trạng thái API; chưa đọc telemetry từ DB. Frontend gọi `/api` qua proxy Vite. Để xác nhận luồng mô phỏng tới MySQL, sau khi có vài mẫu, chạy từ thư mục gốc:

```powershell
docker compose exec mysql mysql -u iot_app -p air_quality -e "SELECT device_id,seq,temperature_c,humidity_pct,mq135_adc_raw FROM telemetry ORDER BY received_at DESC LIMIT 5;"
```

Nhập `MYSQL_PASSWORD` từ `.env` khi được hỏi. Khi kết thúc, chạy `docker compose --profile sim down` để dừng và giữ dữ liệu.

Broker mặc định chỉ publish cổng ra loopback. Khi thử ESP32 thật, cấu hình `MQTT_BIND_ADDRESS` là IP LAN của máy chạy Docker và dùng mạng lab tin cậy; chỉ mở cổng cần dùng. MQTT starter có xác thực và ACL nhưng chưa bật TLS; không mở cổng 1883 ra Internet.

## Làm việc độc lập

- Backend/test: `py -3.12 -m venv .venv`, `.\.venv\Scripts\python -m pip install -r backend/requirements-dev.txt`, rồi đặt `$env:PYTHONPATH = "backend"` và chạy `.\.venv\Scripts\python -m pytest -q` từ thư mục gốc.
- API không cần Compose để chạy riêng: `.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload`.
- Frontend không cần phần cứng để làm giao diện. Dùng mẫu payload ở `docs/mqtt.md` làm fixture và đánh dấu dữ liệu giả.
- Firmware: xem hướng dẫn PlatformIO; mã đã được chuẩn bị nhưng chưa biên dịch/nạp lên ESP32 thật.

**Mã nguồn hiện có:** FastAPI auth/RBAC và API thiết bị, MySQL schema/seed, MQTT worker/cảnh báo/watchdog, simulator có kịch bản, firmware ESP32 và tài liệu thiết kế. **Cần hoàn thiện:** ghép dashboard với API, xác nhận firmware khi có linh kiện, chạy kiểm thử tích hợp/bảo mật thật, đo độ trễ và bổ sung ảnh prototype.

Đọc [mục lục tài liệu](docs/README.md) để bắt đầu. Các bước đưa bộ khung lên repo nhóm nằm ở [hướng dẫn GitHub](docs/github.md).

