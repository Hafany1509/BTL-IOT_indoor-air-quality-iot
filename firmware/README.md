# ESP32 phòng A

## Chức năng

Firmware cho esp32-a-01 đọc DHT22 và ngõ analog MQ-135, gửi telemetry mặc định mỗi 10 giây, gửi heartbeat retained mỗi 30 giây, nhận lệnh FAN_SET/LED_SET và cấu hình SAMPLING_INTERVAL_SET qua MQTT, rồi trả ACK cùng command_id. Chu kỳ lấy mẫu từ xa nhận giá trị 2–300 giây. MQTT dùng QoS 1; node có LWT offline và tự thử kết nối lại Wi-Fi/MQTT.

MQ-135 chỉ gửi mq135_adc_raw 12-bit. Đây là số đo tương đối, không phải CO2 ppm hay AQI. Cần làm nóng và hiệu chuẩn cảm biến trước khi dùng ngưỡng cảnh báo.

## Chân GPIO đề xuất

| ESP32 | Kết nối |
|---|---|
| GPIO4 | DATA của module DHT22 |
| GPIO34 (ADC1) | AO MQ-135 qua mạch chia áp phù hợp |
| GPIO26 | IN của relay 5V |
| GPIO25 | LED ngoài qua điện trở 220 ohm |

Kiểm tra nhãn chân trên đúng module trước khi cấp nguồn. GPIO34 là chân input-only, phù hợp cho ADC.

## Cấu hình và chạy

1. Để biên dịch, có thể dùng secrets.h.example với giá trị giữ chỗ. Trước khi nạp/chạy, sao chép include/secrets.h.example thành include/secrets.h, điền Wi-Fi, IP LAN Mosquitto và mật khẩu riêng của thiết bị. Không commit secrets.h.
2. Mở thư mục này bằng PlatformIO.
3. Chạy pio run, nạp bằng pio run -t upload, sau đó mở pio device monitor.
4. Trên máy chạy backend, mở broker đến mạng LAN tin cậy để ESP32 kết nối; không mở MQTT 1883 ra Internet.

## An toàn phần cứng

- MQ-135 thường được cấp 5V và AO có thể vượt mức an toàn của ESP32. Đo AO trước khi nối. Nếu có thể vượt 3,3V, dùng mạch chia áp; ví dụ 20k ohm từ AO đến GPIO34 và 10k ohm từ GPIO34 xuống GND, nối chung GND. Cần bổ sung điện trở 10k ohm và 20k ohm nếu nhóm chưa có.
- Cấp nguồn tải quạt từ nguồn 5V phù hợp; không lấy dòng quạt từ GPIO. Relay chỉ đóng/ngắt quạt DC 5V; không đấu điện lưới 220V.
- Kiểm tra module relay có kích mức 3,3V và xác nhận loại active-low/active-high. Mặc định firmware đặt relay active-low; nếu module khác, sửa `RELAY_ACTIVE_LOW` trong `include/secrets.h`.
- LED có cực tính; mắc GPIO25 → điện trở 220 ohm → anode LED, cathode → GND.
- DHT22 dùng 3,3V, GND chung và DATA vào GPIO4; xác nhận thứ tự chân theo nhãn module.

## Giới hạn hiện tại

Firmware chưa có OTA và chưa nhận cấu hình ngưỡng cảnh báo; ngưỡng vẫn do backend quản lý. Nếu mất NTP, firmware tạm bỏ qua telemetry để không gửi timestamp giả.

## Đã kiểm chứng (22/11/2026)

Đã biên dịch và chạy trên ESP32 thật: telemetry, heartbeat, `LED_SET` kèm ACK, LWT offline và tự kết nối lại đều hoạt động. Chưa test `FAN_SET` với relay thật. Kết quả chi tiết: [hardware/bring-up-results.md](../hardware/bring-up-results.md).

Sketch kiểm tra phần cứng không cần Wi-Fi/MQTT (nháy LED, đọc DHT22 và MQ-135):

```powershell
pio run -e hwtest -t upload
pio device monitor -e hwtest
```

Module relay CW-025 của nhóm đặt jumper ở **H** (kích mức cao), nên `secrets.h` dùng `#define RELAY_ACTIVE_LOW 0`.
