# ESP32 bring-up checklist (thực hiện khi có linh kiện)

Mục đích: kiểm tra tuần tự, mỗi lần chỉ thêm một phần mạch. Không chạy quạt hoặc relay trước khi xác nhận nguồn và cực tính.

## 1. Kiểm tra an toàn và chân nguồn

- [ ] Đối chiếu nhãn từng chân trên đúng module, không dựa riêng vào ảnh sản phẩm.
- [ ] Dùng đồng hồ đo xác nhận nguồn USB/5V và 3V3 của ESP32.
- [ ] Chưa cắm MQ-135 AO vào ESP32; cấp nguồn module và đo AO ở nhiều điều kiện.
- [ ] Nếu AO có thể vượt 3,3V, lắp bộ chia áp 20kΩ nối tiếp từ AO đến GPIO34 và 10kΩ từ GPIO34 xuống GND; đo lại điện áp tại GPIO34 trước khi nối.
- [ ] Chỉ nối chung GND theo sơ đồ đã chốt cho cảm biến, ESP32 và module relay.

## 2. Kiểm tra từng phần

- [ ] Nạp firmware và xác nhận Serial ở 115200 baud.
- [ ] Nối DHT22: kiểm tra số đo nhiệt độ/độ ẩm hợp lệ trước khi thêm cảm biến khác.
- [ ] Nối MQ-135 AO qua mạch bảo vệ vào GPIO34 (ADC1); xác nhận ADC thay đổi khi điều kiện khí thay đổi, không đổi thành ppm.
- [ ] Nối LED qua điện trở 220Ω vào GPIO25; thử bật/tắt bằng lệnh MQTT.
- [ ] Thử relay không tải và xác nhận active-low/active-high; cập nhật RELAY_ACTIVE_LOW trong secrets.h nếu cần.
- [ ] Chỉ sau khi relay hoạt động đúng mới nối quạt DC 5V qua COM/NO. Không đấu điện lưới 220V.

## 3. Kiểm tra kết nối đầu cuối

- [ ] Cấu hình Wi-Fi, IP LAN Mosquitto và credential riêng cho esp32-a-01; không commit secrets.h.
- [ ] Xác nhận broker chấp nhận credential đúng và ACL từ chối topic của node khác.
- [ ] Quan sát telemetry trên topic home/room-a/esp32-a-01/telemetry và đối chiếu JSON với docs/mqtt.md.
- [ ] Xác nhận status online/LWT offline và tự kết nối lại sau khi Wi-Fi/broker phục hồi.
- [ ] Gửi FAN_SET và LED_SET; xác nhận trạng thái phần cứng và ACK có cùng command_id.
- [ ] Chạy ít nhất 10 phút, lưu log Serial, log worker và ảnh prototype vào thư mục hardware/ hoặc docs/.

## Bằng chứng cần lưu

Ghi lại ngày, phiên bản firmware, điện áp AO tối đa đo được, chu kỳ gửi, số mẫu nhận thành công, thời gian mất/kết nối lại, kết quả lệnh/ACK và ảnh mạch. Chỉ ghi PASS khi đã thực hiện; các dòng chưa thử giữ nguyên chưa đánh dấu.
