# Nhận xét bản nháp báo cáo (Google Docs, đọc ngày 24/11/2026)

Đối chiếu với code trên `main` @ `7496fcb` và kết quả test thật trên phần cứng (`hardware/bring-up-results.md`, `docs/reports/`).

Mức độ: 🔴 sai sự thật / dễ bị hỏi vặn khi bảo vệ · 🟠 sai chi tiết kỹ thuật · 🟡 nên bổ sung

---

## A. Lỗi cấu trúc

| # | Mức | Vị trí | Vấn đề | Đề xuất |
|---|---|---|---|---|
| A1 | 🔴 | Mục lục | Là mục lục của **đề tài khác** (đăng ký ảnh SIFT, Fiji, RANSAC…) | Xoá, tạo lại mục lục tự động (References → Table of Contents) sau khi gắn Heading |
| A2 | 🟠 | Đánh số | Nội dung bắt đầu từ "3. Tóm tắt", không có mục 1, 2; mục lục ghi "CHƯƠNG 1…6" | Thống nhất một kiểu đánh số chương |
| A3 | 🟡 | Bảng phân công | Ghi Hà = Backend & Database, Thảo = Frontend & Tích hợp | Cả nhóm xác nhận lại cho khớp thực tế (lịch sử GitHub) |

## B. Phần cứng và firmware (phần của Hải)

| # | Mức | Vị trí | Báo cáo ghi | Thực tế | 
|---|---|---|---|---|
| B1 | 🔴 | 6.2, 7.2, **16.2**, **Phụ lục C** | Lọc trung bình trượt 5 mẫu trên firmware | **Firmware không có bộ lọc này**. Đoạn code ở Phụ lục C **không phải code của dự án** (`StaticJsonDocument`, `sequence_number`, `connectWifi()`, gửi `fan_state` trong telemetry…). Thay bằng trích đoạn thật từ `firmware/src/main.cpp` |
| B2 | 🔴 | 8.2 BOM | Quạt 40×40 mm, 5000 RPM, 120 mA | Quạt **50 mm, model 5010HSL, 5V 0,20A** (có ảnh) |
| B3 | 🔴 | 8.2, 8.5, Phụ lục A | Nguồn adapter 5V/2A riêng; "chạy liên tục 48 giờ không reset" | Cấp nguồn qua **USB 3.x của máy tính** (đã đo quạt chạy không reset); sạc 5V/3A chỉ là dự phòng. **Chưa từng chạy thử 48 giờ** |
| B4 | 🟠 | 8.2 | Breadboard 400 lỗ; điện trở 20 kΩ; 2 LED | **MB-102 830 lỗ + breadboard 170 lỗ** (vì ESP32 quá rộng); **3 điện trở 10 kΩ** (2 nối tiếp = 20 kΩ); **1 LED** |
| B5 | 🟠 | 8.3 | DHT22 "Pin 1 / Pin 2 / Pin 4", INPUT_PULLUP | Dùng **module 3 chân (+, OUT, −)**, có sẵn trở kéo lên |
| B6 | 🔴 | 8.3 | Relay "Active-LOW" | Jumper đặt **H (kích mức cao)**, firmware `RELAY_ACTIVE_LOW 0`. Lý do: ESP32 xuất 3,3V, ở chế độ L relay có thể không tắt hẳn |
| B7 | 🟠 | 8.3 | LED "sáng khi quạt bật hoặc môi trường xấu" | LED điều khiển **độc lập** bằng lệnh `LED_SET` |
| B8 | 🔴 | 15.4 | MQ-135: phòng thường 350–550, 20 sinh viên 45 phút 650–900, cồn > 1500; trôi nhiệt 8–12 % | **Chưa đo các số này.** Số đo thật: không khí trong phòng **0**, hơ cồn **235**, hơ nước hoa **393**. Ngưỡng backend: GOOD < 50, cảnh báo > 150 |
| B9 | 🔴 | 15.4, UC02 | Cảnh báo "phát lệnh bật quạt tự động"; ngưỡng "> 1000 count" | Backend **không tự bật quạt**; ngưỡng thật **> 150** |
| B10 | 🟡 | 8 | Thiếu các vấn đề thực tế đã gặp và xử lý | Nên thêm, đây là điểm cộng: ESP32 quá rộng → ghép 2 breadboard; relay đầu tiên kẹt vít COM, SSR FC-80 chỉ dùng cho tải AC; MQ-135 cho giá trị cao giả khi mới cấp điện → giữ telemetry 120 giây; lỗi LWT (con trỏ chuỗi tạm) đã sửa; ADC ESP32 có vùng chết < 0,15V |

## C. Giao thức MQTT (mục 9) – sai so với code

| # | Mức | Báo cáo ghi | Thực tế |
|---|---|---|---|
| C1 | 🔴 | Topic `…/commands` và `…/commands/{command_id}/ack` | `home/{room}/{device}/command`, `…/ack`, `…/config` (cùng `telemetry`, `status`) |
| C2 | 🔴 | Telemetry: `room_id`, `sequence_number`, `timestamp`, `gas_level_relative`, `fan_state`, `led_state`; `boot_id` dạng UUID có gạch | `schema_version`, `device_id`, `boot_id` (32 ký tự hex), `seq`, `ts`, `temperature_c`, `humidity_pct`, `mq135_adc_raw`. Backend **từ chối** trường lạ |
| C3 | 🔴 | Status: `status: "OFFLINE"`, `reason`… | `{"state":"online"/"offline", "firmware_version", "uptime_seconds", "sampling_interval_seconds", "mq135_warming_up", "ts"}`; LWT là `{"state":"offline"}` |
| C4 | 🔴 | Lệnh: `action: "SET_FAN"`, `params: {state, speed_pct}` | `{"command_id", "action": "FAN_SET"/"LED_SET"/"SAMPLING_INTERVAL_SET", "value": "ON"/"OFF"/số giây}` |
| C5 | 🔴 | ACK: `status: "ACKED"`, `executed_at`, `relay_gpio`… | `{"command_id", "result": "OK"/"REJECTED", "reason", "fan_state", "led_state", "sampling_interval_seconds", "action", "ts"}` |
| C6 | 🟠 | Keep-alive 15 s × 1,5 = 22,5 s | Keep-alive **30 s**; LWT đo được sau **khoảng 45 s** |
| C7 | 🟠 | 13.3: ESP32 subscribe `…/commands` | ACL cho phép đọc `…/command` và `…/config` của chính nó |

Gợi ý: chép nguyên payload thật từ `docs/mqtt.md` hoặc từ log broker trong `docs/reports/`.

## D. Backend, frontend, triển khai – cần Hà/Thảo kiểm tra lại

| # | Mức | Báo cáo ghi | Code trên `main` |
|---|---|---|---|
| D1 | 🟠 | React 18 + TailwindCSS | `react 19.2.3`, **không dùng Tailwind** |
| D2 | 🟠 | Polling 3 giây | Telemetry 7 s, chi tiết thiết bị 9 s, cảnh báo 20 s, trạng thái lệnh 1,8 s |
| D3 | 🟠 | MySQL 8.0, Mosquitto 2.0, container `iot-mysql`… | Image `mysql:8.4`, `eclipse-mosquitto:2` (chạy 2.1.4); tên container `indoor-air-quality-iot-…`; `compose.yaml` nằm ở **thư mục gốc**, không phải `deployment/` |
| D4 | 🔴 | Bảng 29 endpoint: `/auth/change-password`, `/alerts/{id}/ack` (POST), `/telemetry/stats`, `/config`, `/health`, `/revoke` | Đúng là 29 route, nhưng **danh sách khác**: có `/rooms`, `/alert-rules` (CRUD), `PATCH /alerts/{id}/acknowledge`, `PATCH /me/password` + `/profile`, `POST /devices/{id}/assignments`…; **không có** stats, config, health, revoke |
| D5 | 🔴 | 11.2, 11.4: tự sinh credential, tự cập nhật `mosquitto_passwd`/ACL khi khoá thiết bị | Backend **không ghi** file mật khẩu/ACL; tài khoản MQTT tạo từ `.env` lúc broker khởi động, ACL là file tĩnh |
| D6 | 🟠 | 16.3: cooldown "cập nhật giá trị đỉnh vào cảnh báo đang mở" | Worker **bỏ qua** khi đã có cảnh báo OPEN/ACKNOWLEDGED, không cập nhật đỉnh |
| D7 | 🟠 | 14.2: `cp .env.example .env` | Phải chạy `python scripts/bootstrap.py` (sinh mật khẩu), đặt `MQTT_BIND_ADDRESS=0.0.0.0` để ESP32 kết nối được |
| D8 | 🟠 | 14.4: `python simulator/publish.py --room room-b --device esp32-b-01 --interval 10` | Simulator không có tham số dòng lệnh; thiết bị là `sim-b-01`; chạy bằng `docker compose --profile sim up -d`, kịch bản qua `SIM_SCENARIO` |
| D9 | 🟠 | 10.2 bảng telemetry: `sequence_number`, `recorded_at`, `gas_level_relative`, `fan_state`… | Đối chiếu `database/schema.sql` (thực tế dùng `seq`, `measured_at`, `received_at`, `quality_level`, `validation_status`) |
| D10 | 🟠 | 15.2 T10: thiết bị `esp32-b-01` | Thiết bị phòng B là `sim-b-01` |

## E. Số liệu kiểm thử chưa từng đo – 🔴 rủi ro lớn nhất

Các con số sau **không có trong bất kỳ log hay test nào của nhóm**. Nếu thầy hỏi cách đo, nhóm sẽ không trả lời được:

- Tóm tắt + 15.3: độ trễ trung bình 185 ms (P95 320 ms), lệnh khứ hồi 310 ms (P95 480 ms), bảng 5 chặng, "1.000 mẫu".
- 15.3: tỷ lệ mất gói 0,0 %; tự kết nối lại trong 3,2 s sau khi tắt router 15 s.
- Phụ lục A: chạy liên tục 48 giờ.

**Đề xuất:** hoặc **đo thật** (có thể làm: tính `received_at − measured_at` trong DB cho độ trễ telemetry; `ack_at − created_at` của bảng `commands` cho độ trễ lệnh), hoặc **xoá** và thay bằng số đã có bằng chứng:

| Đã đo thật (có log) | Giá trị |
|---|---|
| Chu kỳ telemetry / heartbeat | 10 s / 30 s |
| Lệnh LED/FAN → ACK | ACK về < 0,1 s (cùng giây theo log broker) |
| Phát hiện offline qua LWT | khoảng 45 s |
| Bảo mật MQTT | 9/9 ca đạt (sai mật khẩu, ẩn danh, ACL publish/subscribe) |
| Bảo mật API | Viewer gửi lệnh → 403; không token → 401; operator điều khiển phòng B → 403 |
| MQ-135 | 0 (phòng) → 235 (cồn) → 393 (nước hoa) |
| Quạt qua relay | ON/OFF đều ACKED, không reset ESP32 |

## E2. Hình trong báo cáo (10 ảnh, kiểm tra ngày 25/11)

| Hình | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| 8.1 Sơ đồ đấu nối | 🔴 | Sơ đồ khối chung chung, chữ bị chồng lên mũi tên ("GPIO 4 (DHT) -> GPIO 26"); ghi "20k/10k -> 3.3V" (thực tế ≈ 1,67V); chân ghi "Nguồn Adapter DC 5V/2A" (không đúng) | Thay bằng sơ đồ đúng từ `hardware/wiring.mmd` + bảng đấu nối ở `hardware/bring-up-results.md` + **ảnh mạch thật** `hardware/evidence/` |
| 15.1 Biểu đồ độ trễ | 🔴 | Vẽ từ số liệu chưa đo (mục E) | Xoá, hoặc thay bằng biểu đồ vẽ từ dữ liệu thật trong MySQL |
| 15.2 Đặc tính MQ-135 | 🔴 | Đường cong **giả lập** 350 → 1.580 trong 100 s, ngưỡng cũ 600/1.000 | Thay bằng dữ liệu thật đã lưu trong DB (ví dụ lần hơ nước hoa 24/11: 0 → 75 → **393** → 141 → 90 → 28 → 1) với ngưỡng 50/150/300 |
| 20.1 Ảnh dashboard | 🟠 | Chụp ngày 18/11 từ dữ liệu mẫu ("ESP32-01", MQ-135 = 420, tài khoản "Người kiểm thử"), không phải node thật | Chụp lại khi ESP32 thật đang chạy (trang Tổng quan, Điều khiển có lệnh "Node đã phản hồi", trang Cảnh báo đã xác nhận) |
| Phụ lục A | 🟠 | Có mô tả nhưng **không có ảnh** mạch | Chèn 4 ảnh trong `hardware/evidence/` |
| 7.1, 11.1 | 🟡 | Ổn về nội dung, nên kiểm tra lại cho khớp tên thành phần (Mosquitto 2.x, React 19) | |

## E3. So với yêu cầu đề bài – còn thiếu gì

| Yêu cầu | Trong báo cáo | Còn thiếu |
|---|---|---|
| Thiết bị vật lý ESP32 + cảm biến + cơ cấu chấp hành | Có | Ảnh thật, thông số đúng (mục B) |
| MQTT | Có | Topic/payload đúng (mục C) |
| Backend tự xây dựng | Có | Danh sách API đúng (D4) |
| Web dashboard | Có | Ảnh chụp thật (E2) |
| JWT, RBAC | Có | — |
| Vòng đời thiết bị | Có (8 trạng thái, khớp code) | Bỏ phần tự động sửa ACL (D5) |
| Giám sát trạng thái, cảnh báo | Có | Ngưỡng đúng 150, bỏ "tự bật quạt" |
| **≥ 2 kịch bản kiểm thử bảo mật** | Chỉ có 2 ca **API** (T09, T10) | **Thiếu kịch bản MQTT** đúng như kế hoạch nhóm: sai mật khẩu / publish sai topic → broker từ chối. Đã có bằng chứng 9/9 ca trong `docs/reports/kiem-thu-bao-mat-mqtt-2026-11-22.md` |
| Code, tài liệu, sơ đồ, kiểm thử trên GitHub | Có Phụ lục D | **Chưa có link repo**; ghi "Release v1.0.0" nhưng repo **chưa có tag/release** nào; cấu trúc thư mục ghi `deployment/compose.yaml` (sai) |
| Báo cáo 20–30 trang | — | Sau khi xoá mục lục sai và số liệu bịa, kiểm tra lại số trang |
| Demo trực tiếp | — | Kịch bản ở `hardware/demo-script.md` |

## F. Gợi ý bổ sung

- Thêm ảnh thật: `hardware/evidence/*.jpg` (mạch, relay, quạt), ảnh dashboard/trang cảnh báo.
- Thêm mục "Sự cố gặp phải và cách khắc phục": lỗi ACK bị TIMEOUT (backend, đã sửa), báo động giả MQ-135, LWT, hotspot iPhone ẩn SSID khi demo.
- Bảng T01–T16: nêu rõ ca nào test trên **phần cứng thật**, ca nào là **pytest**.
