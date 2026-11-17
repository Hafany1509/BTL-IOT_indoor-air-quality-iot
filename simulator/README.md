# Node mô phỏng phòng B

Node sim-b-01 dùng cùng cấu trúc telemetry, status, command và ACK với firmware ESP32. Nó publish MQTT QoS 1 mặc định mỗi 10 giây, gửi heartbeat retained mỗi 30 giây, đặt LWT offline, nhận FAN_SET/LED_SET và SAMPLING_INTERVAL_SET (2–300 giây), rồi mô phỏng trạng thái cơ cấu chấp hành. ACK ở đây chỉ là phản hồi giả lập, không điều khiển phần cứng thật.

## Chạy bằng Docker Compose

Từ thư mục gốc dự án, tạo .env bằng py -3.12 scripts/bootstrap.py, sau đó chạy:
docker compose --profile sim up --build -d
docker compose logs -f simulator worker

## Kịch bản dữ liệu

Đặt biến môi trường SIM_SCENARIO cho container simulator:
Trong PowerShell, ví dụ chạy kịch bản cảnh báo:
$env:SIM_SCENARIO = "alert"
docker compose --profile sim up --build -d

- normal: giá trị nhiệt độ, độ ẩm và MQ-135 tương đối ngẫu nhiên trong vùng bình thường.
- hot: nhiệt độ cố định 34,5°C để thử quy tắc nhiệt độ cao.
- high_gas: MQ-135 ADC cố định 1800 để thử quy tắc khí.
- alert: đồng thời nhiệt độ 34,5°C và MQ-135 ADC 1800.

Mặc định là normal. Có thể đổi chu kỳ ban đầu bằng `SIM_INTERVAL_SECONDS` (2–300 giây); node cũng nhận lệnh `SAMPLING_INTERVAL_SET` trong khoảng này. Để kịch bản sinh cảnh báo, backend cần có rule áp dụng cho room-b hoặc sim-b-01; các rule seed hiện tại chỉ gắn với node phòng A.

Các số đo mô phỏng không đại diện cho đo đạc môi trường thật. MQ-135 được gửi ở dạng ADC tương đối, không phải CO2 ppm/AQI. Node mô phỏng hỗ trợ kiểm tra tích hợp và không thay thế ESP32 vật lý.
