# Hợp đồng MQTT v1

Đây là contract khởi đầu của repo. Nếu báo cáo hoặc firmware đang dùng tên trường khác, cập nhật cùng một PR trước khi tích hợp.

`home/{room_id}/{device_id}/{kind}`

| Kind | Hướng | Retain |
|---|---|---|
| telemetry | Node → backend | Không |
| status | Node → backend (online, heartbeat, LWT offline) | Có |
| command | Backend → node | Không |
| ack | Node → backend | Không |

Device ID demo: `home/room-a/esp32-a-01` và `home/room-b/sim-b-01`. Username thiết bị bằng device ID. Topic và payload phải khớp. Simulator dùng QoS 1, telemetry khoảng 10 giây, heartbeat khoảng 30 giây. Có thể nhận lại bản tin; khóa chống trùng là device_id + boot_id + seq.

```json
{
  "schema_version": 1,
  "device_id": "sim-b-01",
  "boot_id": "0123456789abcdef0123456789abcdef",
  "seq": 1,
  "ts": "2026-11-06T08:00:00Z",
  "temperature_c": 27.4,
  "humidity_pct": 61.2,
  "mq135_adc_raw": 512
}
```

`boot_id` là 32 ký tự hex mới cho mỗi lần khởi động; `seq` tăng trong phiên. Timestamp có múi giờ, ưu tiên UTC. ADC là 0–4095 theo cấu hình demo, không quy đổi sang ppm. Payload `status` hiện là `{"state":"online"}` hoặc `{"state":"offline"}`.

Lệnh mẫu: `{"command_id":"cmd-001","action":"FAN_SET","value":"ON"}`. ACK mẫu: `{"command_id":"cmd-001","result":"OK","fan_state":"ON","ts":"2026-11-06T08:00:01Z"}`.

Simulator nhận lệnh và trả ACK. Backend starter mới subscribe telemetry. Theo dõi offline, timeout và chống thực thi lặp phía thiết bị thật là hạng mục triển khai tiếp theo.

