# Kế hoạch đo và nghiệm thu node phòng A

Tài liệu chuẩn bị trước khi lắp ráp. Các mục dưới đây là quy trình và tiêu chí cần ghi nhận, không phải kết quả đã đo. Chỉ đánh dấu đạt sau khi có log hoặc ảnh minh chứng.

## Trước khi cấp nguồn

- [ ] Hoàn tất biên dịch firmware bằng PlatformIO và lưu phiên bản/commit đã biên dịch.
- [ ] Đọc nhãn chân trên đúng module ESP32, DHT22, MQ-135 và relay đang có.
- [ ] Xác định đủ nguồn 5V cho MQ-135/quạt và điện trở 10kΩ, 20kΩ cho bộ chia áp nếu cần.
- [ ] Kiểm tra không có dây nối 5V vào GPIO ESP32; không sử dụng điện lưới 220V.
- [ ] Giữ `secrets.h` và mật khẩu MQTT ngoài Git.

## Thứ tự lắp và đo

1. **ESP32 riêng:** cấp nguồn USB, mở Serial 115200 baud, xác nhận khởi động và kết nối Wi-Fi/MQTT.
2. **DHT22:** thêm cảm biến, theo dõi nhiệt độ/độ ẩm và ghi lại mẫu lỗi nếu có.
3. **MQ-135:** cấp nguồn theo nhãn module nhưng chưa nối AO vào ESP32. Đo AO tại các điều kiện vận hành; nếu có khả năng vượt 3,3V, lắp bộ chia áp 20kΩ/10kΩ và đo lại tại GPIO34 trước khi nối. Ghi số ADC thô, không diễn giải thành CO₂ ppm hoặc AQI.
4. **LED:** nối GPIO25 qua điện trở 220Ω, thử lệnh bật/tắt và xác nhận ACK.
5. **Relay không tải:** xác nhận module nhận mức điều khiển 3,3V và xác định active-low/active-high. Cập nhật cấu hình firmware nếu cần.
6. **Quạt 5V:** chỉ nối sau khi relay đã được xác nhận; kiểm tra nguồn tải và trạng thái khi bật/tắt.
7. **Luồng MQTT:** xác nhận telemetry, heartbeat/LWT, reconnect, command và ACK theo `docs/mqtt.md`.

MQ-135 cần được làm nóng khoảng 24 giờ theo kế hoạch dự án trước khi đánh giá độ ổn định nền. Trong báo cáo chỉ mô tả ADC tương đối và cách nhóm chọn ngưỡng thực nghiệm; không khẳng định nồng độ ppm nếu chưa có chuẩn khí và hiệu chuẩn phù hợp.

## Tiêu chí ghi nhận

| Hạng mục | Cách xác nhận | Bằng chứng cần lưu |
|---|---|---|
| Nguồn và chia áp | Đo bằng đồng hồ trước khi nối GPIO34 | Ảnh phép đo và điện áp cao nhất |
| DHT22 | Theo dõi liên tiếp ít nhất 10 mẫu, không có giá trị lỗi | Serial log / MQTT payload |
| MQ-135 | Ghi ADC raw sau warm-up; chỉ kiểm tra xu hướng tương đối | Điều kiện thử và chuỗi ADC |
| LED/relay/quạt | Gửi ON/OFF, đối chiếu đầu ra thật với ACK | Video/ảnh và ACK theo command_id |
| MQTT/reconnect | Chạy tối thiểu 10 phút; ngắt rồi khôi phục Wi-Fi hoặc broker có kiểm soát | Log thời gian, số bản tin, trạng thái |
| ACL | Dùng credential node thử publish vào topic node khác; broker phải từ chối | Log broker và lệnh thử đã che mật khẩu |

Không điền kết quả mong muốn vào cột kết quả thực tế. Nếu phép đo chưa thực hiện, ghi `Chưa chạy`.

## Biểu mẫu ghi số liệu

Điền các lần đo vào [`measurement-log-template.csv`](measurement-log-template.csv). Đặt log Serial, ảnh mạch và bản tin mẫu vào thư mục `hardware/evidence/`; loại bỏ Wi-Fi password, MQTT password, JWT và dữ liệu cá nhân khỏi bằng chứng trước khi commit.
