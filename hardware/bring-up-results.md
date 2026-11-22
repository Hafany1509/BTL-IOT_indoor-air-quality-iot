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

### Relay và quạt (chưa đấu, chỉ đã xác định module)

- Module **CW-025**, relay **SONGLE SRD-05VDC-SL-C** (cuộn dây 5V, tiếp điểm 10A), có opto cách ly.
- Cầu vít điều khiển: **DC+ / DC− / IN**. Cầu vít tiếp điểm: **NC / COM / NO**.
- Jumper đặt ở **H** (kích mức cao), vì ESP32 xuất 3,3V. Firmware đặt `RELAY_ACTIVE_LOW 0` trong `secrets.h` cho khớp.
- Dự kiến: DC+ → VIN, DC− → GND, IN → **GPIO26**. Quạt 5V 0,2A đóng/ngắt qua COM/NO.
- Giắc 2 chân của quạt nhận vừa chặt đầu đực dây jumper, **không cần cắt dây**.
- Còn chờ: tua vít để kẹp dây vào cầu vít.

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
| Lệnh từ web/API | `LED_SET ON` → ESP32 bật LED, ACK `result: OK` trong < 0,1 giây | ✅ Thiết bị đúng (backend có lỗi trạng thái, xem báo cáo lỗi) |
| LWT khi mất kết nối | Rút USB → khoảng **45 giây** sau broker phát `{"state":"offline"}`, DB chuyển `OFFLINE` | ✅ (sau bản sửa `6f050a5`) |
| Tự kết nối lại | Cắm lại USB → `online`, DB `OFFLINE → ACTIVE` | ✅ |
| Bảo mật MQTT | Sai mật khẩu/ẩn danh/user lạ bị từ chối; ACL chặn publish/subscribe sai topic | ✅ 9/9 ca |

Chi tiết bảo mật: [docs/reports/kiem-thu-bao-mat-mqtt-2026-11-22.md](../docs/reports/kiem-thu-bao-mat-mqtt-2026-11-22.md).

## 5. Nguồn điện

- Hiện tại toàn bộ (ESP32 + DHT22 + LED + MQ-135) lấy nguồn từ **cổng USB của PC**. MQ-135 lấy 5V từ chân VIN.
- Ghi nhận **1 lần ESP32 tự khởi động lại** khoảng 35 giây sau khi nạp firmware. Sau đó chạy ổn định hơn 10 phút. Chưa xác định nguyên nhân: có thể do chạm cáp, hoặc sụt áp khi Wi-Fi phát cùng lúc với dây đốt MQ-135.
- Khi thêm relay (khoảng 70 mA) và quạt (0,2 A), tổng dòng có thể tới khoảng 600–700 mA, vượt mức an toàn của cổng USB 2.0 (500 mA). Khi chạy đủ tải hoặc demo, dùng **sạc 5V ≥ 1A** (nhóm dùng sạc Xiaomi 5V/3A) cắm vào cổng USB của ESP32. Không cắt cáp sạc.

## 6. Việc còn lại

- [ ] Đấu relay (DC+/DC−/IN) và quạt (COM/NO), test `FAN_SET` ON/OFF.
- [ ] Đo điện áp AO và GPIO34 bằng đồng hồ vạn năng khi có, để bổ sung cho số đo của ESP32.
- [ ] Burn-in MQ-135, ghi giá trị nền ổn định, chốt ngưỡng cảnh báo cùng backend.
- [ ] Bổ sung ảnh mạch vào `hardware/evidence/`.
