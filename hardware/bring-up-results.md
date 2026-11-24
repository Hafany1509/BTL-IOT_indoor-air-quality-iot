# Kết quả lắp ráp và kiểm thử node phòng A (22/11/2026)

**Người thực hiện:** Lê Huy Hải
**Firmware:** `hai/firmware-hw-test` – `ec386b8` (sketch test `hwtest`), `6f050a5` (firmware chính có bản sửa LWT)
**Công cụ đo:** chưa có đồng hồ vạn năng. Các điện áp ở chân GPIO34 bên dưới là số **ESP32 tự đo** (`analogReadMilliVolts`), không phải số đo bằng đồng hồ.

Tài liệu này ghi **kết quả thực tế**. Kế hoạch và tiêu chí nằm ở [validation-plan.md](validation-plan.md) và [bring-up-checklist.md](bring-up-checklist.md).

## 1. Bố trí thực tế: 2 breadboard

ESP32 DevKit V1 (30 chân) có hai dãy chân cách nhau 10 bước lỗ. Nếu cắm vắt qua khe giữa của breadboard MB-102 830 lỗ, một dãy chỉ còn 1 lỗ trống mỗi hàng, dãy kia **không còn lỗ nào**. Dãy bị che lại chứa các chân bắt buộc phải dùng: D25 (LED), D26 (relay), D34 (MQ-135, ADC1). Vì vậy nhóm ghép thêm một breadboard 170 lỗ:

- Gỡ thanh nguồn +/− cạnh cột **J** của MB-102.
- Dãy chân **3V3…D23** cắm vào **cột J** của MB-102, hàng 46–60 (3V3 ở hàng 60).
- Dãy chân **VIN…EN** cắm vào **cột ngoài cùng** của breadboard 170 lỗ, đặt ở chỗ thanh nguồn vừa gỡ.
- Kết quả: mỗi chân ở cả hai dãy đều còn **4 lỗ trống** cùng hàng.

> Số hàng trong tài liệu đọc theo **số in cạnh cột A** của MB-102. Hai nửa A–E và F–J của board này được in số ngược chiều nhau.

![Toàn cảnh mạch](evidence/2026-11-22-overview.jpg)
*(Ảnh sẽ bổ sung: toàn cảnh, cận chân ESP32, cận mạch chia áp MQ-135.)*

## 2. Bảng đấu nối đã lắp

### DHT22 (module 3 chân)

| Chân module | Vị trí | Nối tới |
|---|---|---|
| + | E30 | 3V3 (dãy 3V3, MB-102) |
| OUT | E31 | **GPIO4** (D4) |
| − | E32 | GND (dãy 3V3, ngay cạnh 3V3) |

### LED báo

| Linh kiện | Vị trí | Nối tới |
|---|---|---|
| LED chân dài (+) | E10 | — |
| LED chân ngắn (−) | E11 | Dây A11 → A32 (hàng GND của DHT22) |
| Điện trở 220 Ω | D10 ↔ D14 | Dây A14 → **GPIO25** (D25, breadboard 170) |

Đường dòng điện: GPIO25 → 220 Ω → LED → GND.

### MQ-135 (module "MH MQ Sensor", 4 chân)

| Chân module | Vị trí | Nối tới |
|---|---|---|
| VCC | E40 | Dây A40 → **VIN** (5V từ USB, breadboard 170) |
| GND | E41 | Dây A41 → GND (dãy VIN, breadboard 170) |
| DO | E42 | Không dùng |
| AO | E43 | Mạch chia áp (bên dưới) |

Mạch chia áp 20 kΩ / 10 kΩ, dùng 3 điện trở 10 kΩ:

```
AO (hàng 43) ─ R1 10k (C43–C46) ─ R2 10k (D46–D49) ─●─ R3 10k (C49–C52) ─ GND
                                                     │                      (A52 → GND)
                                               hàng 49 → A49 → GPIO34 (D34)
```

V(GPIO34) = V(AO) × 10k / 30k = **V(AO) / 3**. Với AO tối đa khoảng 5V, GPIO34 nhận khoảng 1,67V, dưới mức 3,3V của ESP32.

### Relay và quạt (đã lắp và test 24/11)

- Module relay 1 kênh, relay **SONGLE SRD-05VDC-SL-C** (cuộn dây 5V, tiếp điểm 10A), có opto cách ly và jumper chọn kích H/L.
- Jumper đặt ở **H** (kích mức cao), vì ESP32 xuất 3,3V. Firmware đặt `RELAY_ACTIVE_LOW 0` trong `secrets.h` cho khớp.
- Module đầu tiên (CW-025) điều khiển đúng, nhưng **vít COM bị siết kẹt** từ nhà máy, không mở được lỗ kẹp nên đã thay. Một module **SSR FC-80** (Omron G3MB-202P) cũng bị loại, vì đầu ra triac chỉ đóng/ngắt tải **AC**, không dùng được cho quạt DC 5V.

| Relay | Nối tới |
|---|---|
| DC+ | VIN (5V, breadboard 170) |
| DC− | GND (dãy VIN, breadboard 170) |
| IN1 | **GPIO26** (D26) |
| COM | VIN (5V) |
| NO | Dây **đỏ (+)** quạt |
| NC | Không dùng |

Dây **đen (−)** của quạt nối GND ở dãy 3V3 trên MB-102 (cột F–H, cùng hàng chân GND). Giắc 2 chân của quạt nhận vừa chặt đầu đực dây jumper, **không cần cắt dây**. Relay chỉ đóng/ngắt tải DC 5V, **không đấu điện lưới 220V**.

## 3. Kết quả kiểm thử phần cứng

Sketch test `hwtest` (`firmware/src/hw_test.cpp`) không dùng Wi-Fi/MQTT. Nó nháy LED mỗi 1 giây, đọc DHT22 mỗi 2,5 giây và in giá trị MQ-135.

| Hạng mục | Cách thử | Kết quả thực tế | KQ |
|---|---|---|---|
| Cấp nguồn lần đầu | Cắm USB, quan sát 10 giây, sờ ESP32/chip ổn áp | Đèn nguồn sáng, không nóng, Windows nhận COM3 (CP210x) | ✅ |
| LED (GPIO25) | Nháy 1 Hz | LED nháy đều; chân dài đã đúng chiều | ✅ |
| DHT22 (GPIO4) | Đọc liên tục > 25 mẫu (2 lần chạy) | 23,8–24,5 °C; 68,1–70,6 %; **0 lần lỗi** | ✅ |
| DHT22 phản hồi | Hà hơi vào cảm biến | Độ ẩm 68,2 → **80,4 %** | ✅ |
| MQ-135 nguồn | Cấp 5V từ VIN | Đèn POWER_LED sáng → đúng cực tính VCC/GND | ✅ |
| MQ-135 không khí trong phòng | Đọc `raw`, `gpio34 mV` | `raw = 0`, `gpio34 ≈ 142 mV` (ngưỡng thấp nhất ADC đọc được) | ✅ An toàn |
| MQ-135 phản ứng với cồn | Giấy thấm cồn cách 1–2 cm | `raw` tăng **0 → 235** (khoảng 0,33V ở GPIO34, AO khoảng 1V), rồi giảm lại | ✅ |
| MQ-135 sau khoảng 1 giờ cấp điện | Firmware chính | Có lúc `raw = 112` khi không thử khí (cảm biến đang burn-in) | Ghi nhận |

Ghi chú MQ-135:

- Lần đầu cấp điện có **mùi từ chụp lưới** (dây đốt nóng đốt bay tạp chất). Hiện tượng này bình thường với cảm biến mới. Không có mùi hay nhiệt bất thường ở chỗ khác.
- Module có điện trở tải nhỏ, nên AO trong không khí sạch rất thấp. Sau mạch chia 1/3, giá trị rơi vào vùng ADC đọc ra 0 (dưới khoảng 0,15V). Có thể đổi sang chia 1/2 (AO 5V → 2,5V) để tăng độ phân giải, cần thống nhất với ngưỡng backend.
- MQ-135 chỉ cho **chỉ số khí tương đối** (ADC raw), không phải CO₂ ppm hay AQI. Cần làm nóng vài phút trước mỗi lần đo và burn-in 24–48 giờ khi còn mới.

## 4. Kết quả kiểm thử kết nối (firmware chính)

Môi trường: Mosquitto, MySQL, API, worker chạy bằng Docker Compose trên PC. ESP32 vào Wi-Fi 2,4 GHz cùng mạng LAN.

| Hạng mục | Kết quả thực tế | KQ |
|---|---|---|
| Wi-Fi + MQTT | `MQTT connected; subscribed to command topic` | ✅ |
| Telemetry | Mỗi **10 giây** trên `home/room-a/esp32-a-01/telemetry`, `ts` ISO 8601 UTC | ✅ |
| Hợp đồng dữ liệu backend | 6/6 mẫu thật qua `contracts.Telemetry`; worker lưu `VALID` vào MySQL | ✅ |
| Heartbeat | `status online` mỗi **30 giây** (retained) | ✅ |
| Lệnh từ web/API | `LED_SET ON` → ESP32 bật LED, ACK `result: OK` trong < 0,1 giây | ✅ Thiết bị đúng (ngày 22/11 backend còn lỗi trạng thái; đã sửa, xem mục 4.1) |
| LWT khi mất kết nối | Rút USB → khoảng **45 giây** sau broker phát `{"state":"offline"}`, DB chuyển `OFFLINE` | ✅ (sau bản sửa `6f050a5`) |
| Tự kết nối lại | Cắm lại USB → `online`, DB `OFFLINE → ACTIVE` | ✅ |
| Bảo mật MQTT | Sai mật khẩu/ẩn danh/user lạ bị từ chối; ACL chặn publish/subscribe sai topic | ✅ 9/9 ca |

Chi tiết bảo mật: [docs/reports/kiem-thu-bao-mat-mqtt-2026-11-22.md](../docs/reports/kiem-thu-bao-mat-mqtt-2026-11-22.md).

### 4.1. Kiểm thử lại sau khi backend được sửa (24/11/2026)

Backend `main` @ `03b3e12` (đã sửa lỗi ACK/TIMEOUT, hạ ngưỡng MQ-135: GOOD < 50 ≤ MODERATE < 150 ≤ POOR < 300 ≤ UNHEALTHY; luật cảnh báo `MQ135_RAW > 150` → CRITICAL). Thao tác qua giao diện web, tài khoản `operator_a`.

| Hạng mục | Kết quả thực tế | KQ |
|---|---|---|
| Bật LED từ trang Điều khiển | Lệnh `cmd-e2a7ce59801f` → **"Node đã phản hồi"** (ACKED) ngay. LED trên mạch sáng. Các lệnh test ngày 23/11 trước khi sửa vẫn hiện "Hết thời gian chờ" trong lịch sử, làm bằng chứng trước/sau | ✅ |
| Hơ giấy thấm nước hoa (có cồn) sát MQ-135 | `mq135_adc_raw`: 0 → 75 → **393** (UNHEALTHY) → 141 → 90 → 28 → 1, trong khoảng 50 giây | ✅ |
| Cảnh báo CRITICAL trên dashboard | Cảnh báo #1 "Cảnh báo nồng độ khí MQ-135 bất thường" hiện ở trang Cảnh báo, mức Nghiêm trọng | ✅ |
| Operator xác nhận cảnh báo | Bấm "Xác nhận tiếp nhận" → `status = ACKNOWLEDGED`, `acknowledged_by = 2` (operator_a), lưu trong MySQL | ✅ |

**Phát hiện: báo động giả khi khởi động.** Cảnh báo #1 thực ra được tạo lúc **03:41:39 UTC**, ngay mẫu đầu tiên sau khi cắm USB (`raw = 234`), **trước** khi hơ nước hoa. Mẫu kế tiếp là 134, rồi 80, rồi về 0 sau khoảng 1 phút. Nguyên nhân: MQ-135 vừa cấp điện, dây đốt còn nguội, cho giá trị cao bất thường. Khi hơ nước hoa (đỉnh 393), worker **không tạo cảnh báo mới** vì cảnh báo #1 vẫn đang mở (chống trùng). **Đã sửa trong firmware:** trong **120 giây đầu** sau khởi động, ESP32 giữ lại telemetry, vì hợp đồng dữ liệu backend bắt buộc có `mq135_adc_raw` và cấm trường lạ, nên không gửi giá trị giả. Heartbeat vẫn gửi bình thường, kèm `"mq135_warming_up": true/false`. Kiểm chứng ngày 24/11 với khởi động nguội (rút USB khoảng 5 phút rồi cắm lại):

| Thời điểm (UTC) | Sự kiện |
|---|---|
| 03:59:31 | `status online`, `uptime 35 s`, `mq135_warming_up: true`, không có telemetry |
| 04:00:31 | `status online`, `uptime 95 s`, `mq135_warming_up: true`, không có telemetry |
| 04:00:56 | Telemetry đầu tiên (`seq 0`, khoảng 120 s sau khởi động): 25,5 °C, 72,5 %, **`mq135_adc_raw = 0`** |
| 04:01 trở đi | Telemetry đều mỗi 10 giây, MQ-135 = 0; **không có cảnh báo mới** |

Cảnh báo giả #1 được operator đóng (`RESOLVED`) kèm ghi chú nguyên nhân.

### 4.2. Relay và quạt (24/11/2026)

Lệnh gửi qua REST API bằng tài khoản `operator_a` (cùng đường đi với nút Quạt trên web), ESP32 cấp nguồn từ cổng USB 3.x (SS) của máy tính.

| Thời điểm (UTC) | Lệnh | Kết quả |
|---|---|---|
| 04:45:06 – 04:45:35 | `FAN_SET` ON, OFF, ON, OFF (chưa nối quạt) | Cả 4 lệnh **ACKED** với `fan_state` đúng; relay kêu "tách", đèn trạng thái sáng/tắt theo lệnh |
| 04:56:54 | `FAN_SET ON` (đã nối quạt) | **ACKED**; **quạt quay** |
| 04:57:30 | `FAN_SET OFF` | **ACKED**; **quạt dừng** |

Trong khoảng 36 giây quạt chạy, broker chỉ ghi nhận 1 lần ESP32 kết nối (lúc cắm USB), và heartbeat cho thấy uptime tăng liên tục (35 s lúc 04:57:09, 65 s lúc 04:57:39), nên **ESP32 không bị khởi động lại vì sụt áp**.

## 5. Nguồn điện

- Mạch đầy đủ (ESP32 + DHT22 + LED + MQ-135 + relay + quạt) lấy 5V từ chân VIN, tức nguồn USB.
- Ghi nhận **1 lần ESP32 tự khởi động lại** ngày 22/11, khoảng 35 giây sau khi nạp firmware (cổng USB thường, chưa có relay/quạt). Chưa xác định nguyên nhân.
- Ngày 24/11, với **cổng USB 3.x (SS)** và quạt chạy khoảng 36 giây, **không** có lần khởi động lại nào. Ước tính tổng dòng khoảng 550–650 mA (đỉnh tới khoảng 800 mA), vượt chuẩn USB 2.0 (500 mA) nhưng nằm trong chuẩn USB 3.x (900 mA).
- Khi demo, quạt có thể chạy lâu hơn, nên mang theo **sạc 5V ≥ 1A** (nhóm dùng sạc Xiaomi 5V/3A) làm nguồn dự phòng, cắm vào cổng USB của ESP32. Không cắt cáp sạc.

## 6. Việc còn lại

- [x] Đấu relay và quạt, test `FAN_SET` ON/OFF *(24/11)*.
- [ ] Đo điện áp AO và GPIO34 bằng đồng hồ vạn năng khi có, để bổ sung cho số đo của ESP32.
- [ ] Burn-in MQ-135, ghi giá trị nền ổn định, chốt ngưỡng cảnh báo cùng backend.
- [ ] Bổ sung ảnh mạch vào `hardware/evidence/`.
