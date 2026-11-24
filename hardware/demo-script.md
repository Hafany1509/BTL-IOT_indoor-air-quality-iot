# Kịch bản demo phần cứng – node phòng A (ESP32 thật)

**Người phụ trách:** Lê Huy Hải
**Thời lượng phần cứng:** khoảng 6–8 phút, trong demo chung của nhóm
**Dựa trên:** các lần chạy thật ngày 22–24/11/2026 ([bring-up-results.md](bring-up-results.md))

Tài liệu này chỉ cho phần ESP32 thật. Kịch bản chung (simulator phòng B, dashboard, bảo mật) nằm ở [docs/report-and-demo.md](../docs/report-and-demo.md).

---

## 1. Chuẩn bị trước buổi demo (1 ngày trước)

- [ ] **Burn-in MQ-135:** cấp điện liên tục vài giờ (máy tính không ngủ hoặc dùng sạc 5V), đặt mạch trên mặt phẳng không cháy, có người trông.
- [ ] **Chạy thử toàn bộ kịch bản dưới đây ít nhất 1 lần**, ghi lại giờ và kết quả.
- [ ] Kiểm tra dây: không có đầu dây thả tự do; dây trong cầu vít relay kéo nhẹ không tuột.
- [ ] Mang đủ: ESP32 + 2 breadboard (đã lắp sẵn), cáp USB, **sạc 5V/3A Xiaomi**, quạt, **giấy thấm nước hoa trong túi zip**, tua vít, 2–3 dây jumper dự phòng.
- [ ] Chụp ảnh mạch hoàn chỉnh (cho báo cáo và để đối chiếu nếu dây bị xô lệch khi di chuyển).

### Mạng Wi-Fi tại nơi demo – rủi ro lớn nhất

ESP32 kết nối tới broker theo **tên Wi-Fi, mật khẩu và IP máy tính** đã nạp trong `firmware/include/secrets.h`. Ở lớp học, Wi-Fi và IP sẽ khác, nên ESP32 sẽ **không kết nối được**.

Cách chắc chắn nhất là dùng **điểm phát Wi-Fi từ điện thoại**:

1. Bật hotspot điện thoại ở **băng 2,4 GHz** (trên iPhone bật "Tối đa hoá tương thích"). Đặt tên và mật khẩu cố định.
2. Ở nhà, cho **máy tính kết nối hotspot đó**, xem IP máy tính:
   ```powershell
   ipconfig
   ```
   Lấy dòng `IPv4 Address` của adapter Wi-Fi.
3. Sửa `secrets.h`: `WIFI_SSID`, `WIFI_PASSWORD` theo hotspot, `MQTT_HOST` theo IP vừa xem. Lưu file (Ctrl+S), nạp lại firmware:
   ```powershell
   cd C:\Users\Legion\Desktop\BTL-IOT-github\firmware
   & "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" run -e esp32dev -t upload
   ```
4. **Điện thoại phải bật dữ liệu di động (có Internet).** Firmware lấy giờ chuẩn qua NTP (`pool.ntp.org`) để gắn `ts` cho telemetry. Không có Internet thì ESP32 vẫn online nhưng **bỏ qua mọi telemetry** (Serial báo `NTP time is not ready; telemetry sample skipped`).
5. Chạy thử toàn bộ demo trên hotspot. Hôm demo, **dùng đúng điện thoại đó**, và **ngay trước demo kiểm tra lại `ipconfig`**: nếu IP máy tính đổi thì phải sửa `MQTT_HOST` và nạp lại (mất khoảng 1 phút).

> Không gửi hay chụp màn hình `secrets.h` vào báo cáo/slide.

---

## 2. Dựng hệ thống (khoảng 5 phút trước khi đến lượt trình bày)

| # | Thao tác | Kết quả phải thấy |
|---|---|---|
| 1 | Mở Docker Desktop, đợi "Engine running" | |
| 2 | `docker compose --profile sim up -d` (thư mục repo) | mosquitto, mysql, api, worker, simulator đều Up |
| 3 | Chạy frontend: `cd frontend` rồi `npx vite` | Mở `http://localhost:5173` được |
| 4 | Đăng nhập `operator_a` trên trình duyệt | Dashboard hiện ESP32 phòng A |
| 5 | **Cắm điện ESP32** (sạc 5V hoặc cổng USB **SS**) | Đèn nguồn ESP32, POWER_LED MQ-135, PWR relay sáng |
| 6 | **Đợi 2 phút** cho MQ-135 làm nóng | Dashboard: node **Trực tuyến**. Telemetry chỉ bắt đầu sau khoảng 120 giây (firmware cố ý giữ lại) |

Có thể làm bước 5–6 **trong lúc** nhóm trình bày phần trước, để không mất thời gian chờ.

---

## 3. Kịch bản trình diễn

### Cảnh 1 – Thiết bị thật và dữ liệu thời gian thực (khoảng 1,5 phút)

**Làm:** chỉ vào mạch, giới thiệu ngắn từng khối:
- ESP32 DevKit V1, DHT22 (GPIO4), MQ-135 qua mạch chia áp 20k/10k vào GPIO34, LED (GPIO25), relay (GPIO26) điều khiển quạt 5V.
- Lý do dùng 2 breadboard: ESP32 quá rộng, một breadboard 830 lỗ không còn lỗ trống cho dãy chân VIN…EN.

**Trên web:** dashboard phòng A, nhiệt độ/độ ẩm cập nhật mỗi 10 giây.

**Tương tác:** **hà hơi vào DHT22** khoảng 5 giây → độ ẩm tăng rõ (đã đo: 68 → 80 %) ở lần cập nhật kế tiếp.

**Nói:** dữ liệu đi theo đường ESP32 → MQTT (Mosquitto, có tài khoản riêng + ACL) → worker → MySQL → REST API → web.

### Cảnh 2 – Điều khiển từ web và ACK (khoảng 1,5 phút)

**Làm:** trang **Điều khiển**, LED cảnh báo → **Bật** → Xác nhận.

**Kết quả:** LED trên mạch sáng; trên web lệnh chuyển **"Node đã phản hồi"** gần như ngay lập tức. Tắt lại bằng nút **Tắt**.

Làm tương tự với **Quạt thông gió** → nghe relay kêu "tách", **quạt quay**; Tắt → quạt dừng.

**Nói:** mỗi lệnh có `command_id`. ESP32 trả ACK cùng `command_id`, backend chuyển trạng thái `SENT → ACKED`. Lịch sử lệnh lưu ai gửi, lúc nào.

### Cảnh 3 – Cảnh báo chất lượng khí (khoảng 2 phút)

**Làm:** lấy giấy thấm nước hoa **từ túi zip** (đã xịt sẵn, **không xịt nước hoa gần mạch**), đưa sát chụp lưới MQ-135, cách 1–2 cm, giữ khoảng 15 giây, rồi cất đi.

**Kết quả** (đã đo: MQ-135 lên tới 393):
- Dashboard: chỉ số MQ-135 tăng vọt, mức chất lượng chuyển POOR/UNHEALTHY.
- Trang **Cảnh báo**: xuất hiện cảnh báo **Nghiêm trọng** "Cảnh báo nồng độ khí MQ-135 bất thường".
- Operator bấm **Xem chi tiết → Xác nhận** → trạng thái **Đã xác nhận**, ghi lại người xác nhận và giờ.

**Nói:**
- MQ-135 chỉ cho **chỉ số khí tương đối** (ADC raw), **không phải CO₂ ppm**. Ngưỡng 150 được chọn theo số đo nền thực tế của nhóm.
- Cảm biến cần làm nóng. Lúc mới cấp điện, nó cho giá trị cao giả (đã đo 234) và từng gây cảnh báo giả. Firmware đã xử lý bằng cách giữ telemetry 120 giây đầu.

### Cảnh 4 – Mất kết nối và tự phục hồi (khoảng 1,5 phút)

**Làm:** **rút nguồn ESP32.**

**Kết quả:** khoảng **45–60 giây** sau, dashboard chuyển node sang **Mất kết nối** (đã đo: LWT đến sau khoảng 45 giây). Nguyên nhân: broker phát bản tin LWT `{"state":"offline"}` khi ESP32 không còn gửi keep-alive.

**Làm tiếp:** cắm lại nguồn → node **Trực tuyến** trở lại sau vài giây (heartbeat). Số đo cảm biến có lại sau khoảng 2 phút (MQ-135 làm nóng).

**Nói:** có 2 lớp phát hiện offline: LWT của broker (khoảng 45 giây) và watchdog phía backend (60 giây không có heartbeat).

> Nếu thời gian gấp, có thể bỏ cảnh 4 hoặc chỉ nói, vì sau khi cắm lại phải chờ làm nóng.

---

## 4. Xử lý sự cố khi demo

| Hiện tượng | Kiểm tra nhanh | Cách xử lý |
|---|---|---|
| Node phòng A mãi "Mất kết nối" | ESP32 có vào đúng Wi-Fi hotspot không; IP máy tính có đổi không (`ipconfig`) | Sửa `MQTT_HOST` theo IP mới và nạp lại firmware. Nếu không kịp, chuyển sang demo bằng simulator phòng B |
| Trực tuyến nhưng không có số đo | Mới cắm điện chưa đủ 2 phút? | Đợi hết thời gian làm nóng |
| ESP32 tự khởi động lại khi bật quạt | Đang cấp nguồn từ cổng USB máy tính | Chuyển sang **sạc 5V/3A** |
| Gửi lệnh bị từ chối (backend báo thiết bị đang OFFLINE) | Node chưa Trực tuyến | Đợi node Trực tuyến rồi gửi lại |
| Không đăng nhập được `operator_a` | Database vừa được tạo lại từ seed (ví dụ đã chạy `docker compose down -v`): hash mật khẩu của `operator_a`/`viewer_user` trong seed hiện vẫn sai, chỉ `admin` đúng | Đặt lại mật khẩu demo trong DB local bằng lệnh ở mục 6, hoặc tạm dùng `admin` |
| Node online nhưng không có số đo sau 2 phút | Hotspot điện thoại không có Internet nên ESP32 không lấy được giờ NTP | Bật dữ liệu di động trên điện thoại |
| Hơ nước hoa nhưng không có cảnh báo mới | Còn cảnh báo MQ-135 cũ đang mở hoặc đã xác nhận nhưng chưa giải quyết (backend chống báo trùng) | Trước demo, vào trang Cảnh báo **giải quyết** hết cảnh báo cũ |
| DHT22 báo lỗi/không đổi | Dây OUT → D4 lỏng | Ấn lại dây; số liệu sẽ có ở lần đọc kế tiếp |
| Quạt không quay khi relay kêu "tách" | Dây COM/NO hoặc dây quạt lỏng | Rút nguồn, kiểm tra vít COM/NO và giắc quạt |

## 5. Ngay trước khi lên trình bày (checklist 1 phút)

- [ ] Node phòng A **Trực tuyến** và **đã có số đo** (đã qua 2 phút làm nóng).
- [ ] Trang Cảnh báo: **không còn cảnh báo MQ-135 đang mở/đã xác nhận** (giải quyết hết).
- [ ] LED và quạt đang **tắt**.
- [ ] Giấy thấm nước hoa trong túi zip, để **xa mạch**.
- [ ] Trình duyệt mở sẵn 3 tab: Tổng quan, Điều khiển, Cảnh báo (đã đăng nhập `operator_a`).

## 6. Đặt lại mật khẩu tài khoản demo (chỉ DB local)

Dùng khi database được tạo lại từ seed mà seed chưa có hash đúng cho `operator_a`/`viewer_user`. Lệnh chỉ đổi dữ liệu trong container MySQL trên máy demo, không sửa file nào trong repo:

```powershell
cd C:\Users\Legion\Desktop\BTL-IOT-github
docker compose exec -T api python -c "from app.auth import hash_password; from app.database import SessionLocal; from app.models import User; from sqlalchemy import update; s=SessionLocal(); s.execute(update(User).where(User.username.in_(['admin','operator_a','viewer_user'])).values(password_hash=hash_password('Demo@2026!'))); s.commit(); print('ok')"
```

**Không chạy `docker compose down -v`** trên máy demo nếu không cần: lệnh này xoá toàn bộ dữ liệu (lịch sử telemetry, lệnh, cảnh báo, mật khẩu đã đặt lại).
