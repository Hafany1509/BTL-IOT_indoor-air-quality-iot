# Sơ Đồ Tuần Tự Hệ Thống (D10, D11 - Sequence Diagrams)

Tài liệu này đặc tả sơ đồ tuần tự cho 2 quy trình vận hành cốt lõi nhất của hệ thống theo yêu cầu tại **Mục 6 của Đề bài Đồ án**:
1. **Quy trình 1 (D10)**: Thu thập dữ liệu cảm biến, lưu trữ chuỗi thời gian và kích hoạt cảnh báo ngưỡng (Telemetry & Alerting Flow).
2. **Quy trình 2 (D11)**: Gửi lệnh điều khiển hai chiều, nhận phản hồi ACK và giám sát Timeout (Command & ACK Flow).

---

## 1. Quy Trình 1: Thu Thập Telemetry & Kích Hoạt Cảnh Báo (D10)

```mermaid
sequenceDiagram
    autonumber
    actor Sensor as DHT22 / MQ-135
    participant ESP32 as ESP32 (Node)
    participant Broker as Mosquitto Broker
    participant Worker as FastAPI MQTT Worker
    participant DB as MySQL Database
    participant Frontend as React Dashboard

    Note over Sensor,ESP32: Chu kỳ lấy mẫu định kỳ (mỗi 10s)
    Sensor->>ESP32: Đọc tín hiệu nhiệt độ, độ ẩm & ADC MQ-135
    ESP32->>ESP32: Đóng gói JSON kèm boot_id, seq, timestamp UTC
    ESP32->>Broker: Publish QoS 1 (home/room-a/esp32-a-01/telemetry)
    Broker-->>ESP32: PUBACK (Xác nhận broker đã nhận tin)
    Broker->>Worker: Chuyển tiếp bản tin tới consumer đã subscribe
    
    Worker->>Worker: Validate schema Pydantic & Đánh giá mức khí
    Worker->>DB: INSERT INTO telemetry (ON DUPLICATE KEY UPDATE)
    Worker->>DB: UPDATE devices SET last_seen_at = now()
    
    Note over Worker,DB: Alert Rule Engine đánh giá ngưỡng
    Worker->>DB: SELECT * FROM alert_rules WHERE is_enabled = true
    alt Vượt ngưỡng cảnh báo & Hết thời gian cooldown
        Worker->>DB: INSERT INTO alerts (status = 'OPEN', metric_value, triggered_at)
    end

    Frontend->>DB: Polling GET /api/v1/devices/{id}/telemetry/latest (mỗi 5s)
    DB-->>Frontend: Trả về số đo mới nhất & trạng thái cảnh báo
    Frontend->>Frontend: Cập nhật giao diện & hiển thị cảnh báo đỏ nếu có
```

---

## 2. Quy Trình 2: Điều Khiển Hai Chiều & Theo Dõi ACK / Timeout (D11)

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Người vận hành (Operator)
    participant API as FastAPI REST API
    participant DB as MySQL Database
    participant Broker as Mosquitto Broker
    participant ESP32 as ESP32 (Actuator Node)
    participant Worker as FastAPI MQTT Worker

    Operator->>API: POST /api/v1/devices/esp32-a-01/commands (Bật Quạt)
    API->>API: Xác thực JWT & Kiểm tra quyền CONTROL trong device_assignments
    
    alt Quyền không hợp lệ hoặc là Viewer
        API-->>Operator: 403 Forbidden (Chặn lệnh điều khiển)
    else Hợp lệ
        API->>API: Sinh command_id duy nhất (UUID)
        API->>DB: Lưu lệnh (status = 'PENDING', timeout_at = now + 15s)
        API->>Broker: Publish QoS 1 + loop_start() – chờ PUBACK broker xác nhận
        API->>DB: Cập nhật lệnh (status = 'SENT', sent_at = now) – chỉ khi vẫn PENDING
        Note over API,DB: Nếu worker đã ghi ACKED trước khi API cập nhật,<br/>UPDATE có điều kiện WHERE status='PENDING' sẽ không ghi đè
        API-->>Operator: 201 Created (Trả về command_id & trạng thái SENT)
    end

    Broker->>ESP32: Chuyển tiếp lệnh điều khiển
    ESP32->>ESP32: Kích hoạt mạch driver bật quạt 5V
    
    alt ESP32 thực thi thành công
        ESP32->>Broker: Publish QoS 1 (home/room-a/esp32-a-01/ack) {"command_id":"...", "result":"OK"}
        Broker->>Worker: Chuyển tiếp gói tin ACK
        Worker->>DB: UPDATE commands SET status = 'ACKED', ack_at = now, result_payload = payload
        Operator->>API: Polling GET /api/v1/commands/{command_id}
        API-->>Operator: HTTP 200 (Trạng thái: ACKED - Thành công)
    else ESP32 mất nguồn / ngắt kết nối (Quá 15 giây không có ACK)
        Note over Worker,DB: Watchdog Thread quét định kỳ (mỗi 5s)
        Worker->>DB: UPDATE commands SET status = 'TIMEOUT' WHERE timeout_at < now AND status = 'SENT'
        Operator->>API: Polling GET /api/v1/commands/{command_id}
        API-->>Operator: HTTP 200 (Trạng thái: TIMEOUT - Cảnh báo lỗi phần cứng)
    end
```

