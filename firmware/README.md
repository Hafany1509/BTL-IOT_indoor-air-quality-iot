# ESP32 phòng A

Mở thư mục này bằng PlatformIO. `pio run` để biên dịch, `pio run -t upload` để nạp và `pio device monitor` để xem Serial. Firmware starter chỉ kiểm tra khởi động qua Serial, chưa đọc cảm biến hoặc điều khiển tải.

Khi triển khai kết nối, sao chép `include/secrets.h.example` thành `include/secrets.h` (đã ignore). Device ID: `esp32-a-01`, phòng `room-a`. Xem [hợp đồng MQTT](../docs/mqtt.md) và [tài liệu phần cứng](../hardware/README.md).

