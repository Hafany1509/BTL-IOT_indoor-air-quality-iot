# Phần cứng và đấu nối

## BOM node phòng A

- ESP32 DevKit V1
- Module DHT22/AM2302 3 chân
- Module MQ-135
- Relay 1 kênh 5V có cách ly quang
- Quạt DC 5V, 50mm
- LED 5mm và điện trở 220 ohm
- Breadboard, dây nối
- Bổ sung nếu chưa có: điện trở 10k ohm và 20k ohm làm mạch chia áp cho AO của MQ-135

## Sơ đồ kết nối dạng chữ

DHT22 VCC -> ESP32 3V3
DHT22 GND -> ESP32 GND
DHT22 DATA -> GPIO4

MQ-135 VCC -> nguồn 5V
MQ-135 GND -> GND chung
MQ-135 AO -> điện trở 20k -> GPIO34 (ADC1)
GPIO34 -> điện trở 10k -> GND

Relay IN -> GPIO26
Relay VCC -> nguồn 5V theo nhãn module
Relay GND -> GND chung theo sơ đồ module
Nguồn 5V+ -> Relay COM
Relay NO -> Quạt +
Quạt - -> nguồn 5V GND

GPIO25 -> điện trở 220 ohm -> LED anode
LED cathode -> GND

GPIO34 chỉ nhận tín hiệu analog. Mạch chia áp ví dụ đưa 5V xuống khoảng 1,67V; đo điện áp thực tế tại chân GPIO trước khi nối ESP32. Nếu module MQ-135 AO không vượt 3,3V trong toàn dải hoạt động thì vẫn cần xác nhận bằng đo đạc, không suy đoán từ giá trị ADC.

## Lưu ý an toàn

- Dùng tải DC 5V; không đấu relay vào điện lưới 220V.
- Không cấp quạt từ GPIO. Kiểm tra dòng định mức quạt và khả năng nguồn 5V.
- Chỉ nối GND theo sơ đồ của module relay cụ thể. Một số module có chân JD-VCC/cầu jumper; không tháo jumper hoặc cấp hai nguồn nếu chưa hiểu sơ đồ cách ly.
- Kiểm tra nhãn VCC/GND/DATA trên module DHT22 và chân AO/DO trên MQ-135 trước khi cấp nguồn.
- Lắp LED nối tiếp điện trở 220 ohm; không nối LED trực tiếp giữa GPIO và GND.
- Chụp ảnh mạch prototype và cập nhật BOM/điện áp đo thực tế sau khi lắp xong.

## Chân GPIO đã chọn trong firmware

| Tín hiệu | GPIO |
|---|---:|
| DHT22 DATA | 4 |
| MQ-135 AO | 34 |
| Relay IN | 26 |
| LED | 25 |

## Lắp ráp thực tế

ESP32 DevKit V1 quá rộng để cắm vắt qua một breadboard 830 lỗ mà vẫn còn lỗ trống ở cả hai dãy chân. Nhóm ghép MB-102 với một breadboard 170 lỗ: dãy 3V3…D23 cắm ở cột J của MB-102, dãy VIN…EN cắm trên breadboard 170 lỗ. Tọa độ từng dây, module relay đã chọn (CW-025, jumper H) và kết quả đo thực tế nằm ở [bring-up-results.md](bring-up-results.md).

Kịch bản trình diễn phần cứng và cách xử lý sự cố khi demo: [demo-script.md](demo-script.md).

## Chuẩn bị nghiệm thu

Trước khi cấp nguồn, xem [kế hoạch đo và nghiệm thu](validation-plan.md). Khi bắt đầu lắp, điền [`measurement-log-template.csv`](measurement-log-template.csv) và chỉ ghi PASS khi đã có kết quả thực tế.
