# Hướng dẫn chạy Air Quality IoT trên Windows

Chạy FastAPI, MySQL, Mosquitto và worker bằng Docker Compose. Chạy giao diện React bằng Vite trong một cửa sổ PowerShell riêng.

## 1. Chuẩn bị

- Docker Desktop đã khởi động và đang dùng Linux containers.
- Node.js từ 22.12 trở lên và npm.
- Python 3.12 nếu cần tạo file `.env`.

Mở PowerShell tại thư mục gốc của repo, nơi có `compose.yaml`. Nếu chưa có `.env`, chạy:

```powershell
py -3.12 scripts/bootstrap.py
```

Nếu máy chỉ có lệnh `python` và phiên bản là 3.12, dùng `python scripts/bootstrap.py`. Script giữ nguyên file `.env` đã tồn tại.

## 2. Khởi động backend

Từ thư mục gốc, chạy:

```powershell
docker compose --profile sim up --build -d
docker compose --profile sim ps
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

Profile `sim` chạy thêm node mô phỏng `sim-b-01`. Cảm biến mô phỏng gửi mẫu qua Mosquitto, worker ghi mẫu vào MySQL và FastAPI trả dữ liệu cho giao diện. Nếu chỉ muốn dùng ESP32 vật lý, bỏ `--profile sim` khi khởi động và kết nối ESP32 đã cấu hình với broker.

Khi API sẵn sàng, health trả `status: ok`. Có thể xem hợp đồng API tại [Swagger UI](http://127.0.0.1:8000/docs). Health kiểm tra tiến trình API. Để kiểm tra dữ liệu đi qua toàn bộ hệ thống, xem mẫu mới trên Dashboard ở bước 4.

## 3. Chạy frontend

Mở PowerShell thứ hai tại thư mục gốc của repo:

```powershell
cd frontend
npm ci
npm run dev
```

Mở URL do Vite in ra, mặc định là [trang đăng nhập](http://localhost:5173/login). Vite chuyển tiếp `/api/v1` tới FastAPI ở `127.0.0.1:8000`. Giữ cửa sổ chạy Vite mở trong lúc sử dụng giao diện.

## 4. Đăng nhập và kiểm tra dữ liệu

1. Đăng nhập bằng tài khoản ADMIN hiện có. Nếu dùng cơ sở dữ liệu demo, xem thông tin tài khoản trong [tài liệu database](../database/README.md).
2. Trên **Tổng quan**, chọn node `sim-b-01` nếu chạy simulator. Giao diện thường chọn `esp32-a-01` trước nếu node này có trong danh sách. Chờ vài giây để thấy nhiệt độ, độ ẩm, giá trị MQ-135 và thời điểm nhận mẫu.
3. Mở **Lịch sử dữ liệu** để xem biểu đồ, bảng mẫu và thử xuất CSV.
4. Để thử OPERATOR hoặc VIEWER, đăng nhập bằng tài khoản tương ứng. Nếu mật khẩu demo bị từ chối, dùng ADMIN mở **Người dùng → Thêm người dùng**, rồi vào **Node ESP32 → Gán quyền node**. Gán `VIEW` cho VIEWER. Gán `CONTROL` cho OPERATOR cần gửi lệnh hoặc xử lý cảnh báo. Node thử nghiệm phải là node được gán.

Simulator hỗ trợ phản hồi lệnh quạt. Để kiểm tra LED hoặc điều khiển ESP32 vật lý, thiết bị cần chạy firmware hỗ trợ lệnh tương ứng.

## 5. Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Docker CLI báo không kết nối được daemon | Mở Docker Desktop, chờ engine sẵn sàng rồi chạy lại Compose. |
| Trang đăng nhập báo lỗi kết nối API | Gọi lại health ở bước 2. Kiểm tra `docker compose --profile sim ps` và `docker compose logs --tail 40 api`. |
| Dashboard chưa có số liệu | Chọn đúng node. Nếu dùng simulator, chạy `docker compose --profile sim logs --tail 40 simulator worker mosquitto`. |
| Mosquitto báo `/tmp/iot-passwords` đã tồn tại | Chạy `docker compose up -d --no-deps --force-recreate mosquitto`. Nếu đang dùng simulator, chạy tiếp `docker compose --profile sim restart simulator`. |
| OPERATOR hoặc VIEWER không thấy node hay nhận lỗi 403 | Kiểm tra quyền được gán cho tài khoản trên đúng node và thời hạn của quyền. |

## 6. Dừng hệ thống

Nhấn `Ctrl+C` trong cửa sổ Vite. Từ thư mục gốc của repo, chạy:

```powershell
docker compose --profile sim down
```

Lệnh này giữ volume dữ liệu MySQL cho lần chạy sau.
