# Hướng Dẫn Vận Hành & Phát Triển Backend (FastAPI & MQTT Worker)

Thư mục `backend/` chứa toàn bộ mã nguồn tầng ứng dụng (Application Layer) của dự án **Hệ thống IoT giám sát và cảnh báo chất lượng không khí trong phòng**, bao gồm:
1. **RESTful API Service (`app/main.py`)**: Cung cấp giao diện API xác thực JWT, phân quyền RBAC đa cấp, kiểm soát phạm vi thiết bị (chống IDOR), điều phối lệnh điều khiển 2 chiều và quản trị hệ thống.
2. **MQTT Background Worker (`app/worker.py`)**: Tiến trình xử lý nền độc lập, chịu trách nhiệm nhận telemetry, kiểm tra luật cảnh báo (Alert Rule Engine), bắt trạng thái Online/Offline (Heartbeat & LWT), tiếp nhận ACK lệnh và giám sát timeout.

---

## 1. Yêu cầu Môi trường

* **Python**: Phiên bản `>= 3.12` (Khuyến nghị 3.12 hoặc 3.13).
* **MySQL**: Phiên bản 8.0 hoặc 8.4 LTS (InnoDB, `utf8mb4`).
* **Mosquitto MQTT Broker**: Phiên bản 2.0+ (đã kích hoạt xác thực và file phân quyền ACL).
* 

---

## 2. Cấu trúc Module Mã nguồn

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py            # Khởi tạo FastAPI app, cấu hình CORS và gắn kết các Routers
│   ├── worker.py          # MQTT consumer worker, Rule Engine và Watchdog thread
│   ├── database.py        # Cấu hình SQLAlchemy 2.0 Engine & Session dependency
│   ├── models.py          # Khai báo 9 bảng ORM models chuẩn hóa
│   ├── schemas.py         # Pydantic Schemas xác thực dữ liệu vào/ra
│   ├── auth.py            # Băm bcrypt, cấp/giải mã JWT, dependency RBAC & Device Scope
│   ├── audit.py           # Tiện ích ghi nhật ký kiểm toán bất biến (loại bỏ bí mật)
│   ├── mqtt_client.py     # Module publish lệnh điều khiển tới broker
│   ├── contracts.py       # Pydantic validator giải mã gói tin telemetry
│   └── routers/           # Các endpoint REST API phân theo nghiệp vụ
│       ├── auth.py        # Đăng nhập, thông tin tài khoản, đổi mật khẩu
│       ├── users.py       # Quản trị người dùng (Admin only)
│       ├── devices.py     # Quản lý thiết bị, vòng đời, phân quyền phạm vi, telemetry
│       ├── commands.py    # Gửi lệnh quạt/LED, theo dõi trạng thái ACK & Timeout
│       ├── alerts.py      # Quản lý luật cảnh báo, tiếp nhận & xử lý sự cố
│       └── audit.py       # Tra cứu nhật ký kiểm toán hệ thống (Admin only)
├── Dockerfile             # Container image cho API và Worker
├── requirements.txt       # Danh sách thư viện production
└── requirements-dev.txt   # Danh sách thư viện môi trường phát triển & kiểm thử
```

---

## 3. Cấu hình Biến Môi trường (`.env`)

Backend nạp cấu hình từ các biến môi trường hệ thống. Bạn có thể sinh tự động tệp `.env` cục bộ an toàn bằng script:
```powershell
python scripts/bootstrap.py
```

Các biến môi trường cốt lõi bao gồm:
| Tên biến | Giá trị mẫu | Diễn giải |
| :--- | :--- | :--- |
| `MYSQL_HOST` | `127.0.0.1` (hoặc `mysql`) | Địa chỉ máy chủ CSDL MySQL. |
| `MYSQL_PORT` | `3306` | Cổng kết nối CSDL. |
| `MYSQL_DATABASE`| `air_quality` | Tên cơ sở dữ liệu. |
| `MYSQL_USER` | `iot_app` | Tài khoản kết nối MySQL. |
| `MYSQL_PASSWORD`| *(Sinh ngẫu nhiên)* | Mật khẩu tài khoản CSDL. |
| `MQTT_HOST` | `127.0.0.1` (hoặc `mosquitto`) | Địa chỉ máy chủ MQTT broker. |
| `MQTT_PORT` | `1883` | Cổng kết nối MQTT không mã hóa. |
| `MQTT_BACKEND_PASSWORD`| *(Sinh ngẫu nhiên)* | Mật khẩu tài khoản MQTT `iot-backend`. |
| `JWT_SECRET` | *(Chuỗi ngẫu nhiên 32 hex)* | Khóa bí mật ký token JWT. |

---

## 4. Hướng dẫn Khởi chạy Hệ thống

### Cách 1: Khởi chạy bằng Docker Compose (Khuyến nghị cho Demo & Production)

Khởi chạy đồng thời cả cụm Database, Broker, Backend API, Worker và Simulator:
```powershell
# Dựng và chạy ngầm toàn bộ dịch vụ
docker compose up -d --build

# Xem log của API
docker compose logs -f api

# Xem log của MQTT Worker
docker compose logs -f worker
```
* API sẽ lắng nghe tại: `http://127.0.0.1:8000`
* Swagger UI tra cứu API trực quan tại: `http://127.0.0.1:8000/docs`

---

### Cách 2: Khởi chạy Cục bộ từng Tiến trình (Dành cho Lập trình viên)

1. **Tạo môi trường ảo và cài đặt thư viện**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

2. **Đảm bảo MySQL và Mosquitto đang chạy**:
   ```powershell
   docker compose up -d mysql mosquitto
   ```

3. **Chạy REST API Server (Terminal 1)**:
   ```powershell
   # Nạp biến môi trường và chạy FastAPI uvicorn
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Chạy MQTT Worker Consumer (Terminal 2)**:
   ```powershell
   cd backend
   python -m app.worker
   ```

---

## 5. Hướng dẫn Chạy Kiểm thử Tự động (Testing)

Dự án cung cấp bộ kiểm thử tự động sử dụng SQLite in-memory, kiểm tra độc lập không phụ thuộc vào việc có đang chạy MySQL hay Broker ngoài:

```powershell
# Cài đặt thư viện dev (pytest, httpx)
pip install -r backend/requirements-dev.txt

# Chạy toàn bộ test cases
pytest tests/test_backend.py -v
```

Các ca kiểm thử trong `test_backend.py` xác minh:
* Băm và so khớp mật khẩu bằng thuật toán `bcrypt` (T02).
* Đăng nhập thành công trả về JWT hợp lệ (T01).
* Xử lý lỗi đăng nhập sai mật khẩu và chặn tài khoản bị khóa `LOCKED` (T01).
* Phân quyền Admin xem toàn bộ thiết bị (T09).
* Phân quyền phạm vi Operator chỉ xem thiết bị được gán, chặn lỗ hổng IDOR (T10).
* Chặn quyền điều khiển đối với vai trò `VIEWER` trả về lỗi `403 Forbidden` (T09).
* Cho phép Operator gửi lệnh tới thiết bị được giao và lưu vết trạng thái `SENT` (T08).
* Lệnh chuyển trạng thái `ACKED` sau khi nhận phản hồi từ ESP32 mà không bị race condition ghi đè (T08).
* Watchdog chỉ chuyển lệnh sang `TIMEOUT` khi vẫn ở trạng thái `SENT`; lệnh đã `ACKED` được bảo toàn (T13).
* Hash mật khẩu trong `seed_demo.sql` phải vượt qua `bcrypt.checkpw("Demo@2026!", hash)` (T01, T02).
