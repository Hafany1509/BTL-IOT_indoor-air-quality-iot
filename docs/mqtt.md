# Đặc tả Giao thức MQTT (D09 - MQTT Specification)

Tài liệu này đặc tả toàn diện kiến trúc trao đổi thông điệp qua giao thức MQTT trong hệ thống: bao gồm cây chủ đề (Topic tree), cấu trúc dữ liệu (Payload schema), mức dịch vụ chuyển giao (QoS), chính sách lưu giữ tin (Retain/LWT), ma trận kiểm soát truy cập (Broker ACL), và cơ chế chống trùng lặp dữ liệu (Deduplication).


---

## 1. Cấu trúc Cây Chủ đề (Topic Tree)

Hệ thống áp dụng tiền tố phân cấp chuẩn hóa theo phòng và thiết bị:
```text
home/{room_id}/{device_id}/{kind}
```
* `{room_id}`: Mã phòng (vd: `room-a`, `room-b`).
* `{device_id}`: Định danh phần cứng duy nhất (vd: `esp32-a-01`, `sim-b-01`).
* `{kind}`: Loại thông điệp trao đổi (`telemetry`, `status`, `command`, `ack`, `config`).

---

## 2. Bảng Tổng hợp Chủ đề & Mức QoS

| Tên Topic | Chiều truyền tin | QoS | Retained | Mô tả chức năng |
| :--- | :---: | :---: | :---: | :--- |
| `home/{room_id}/{device_id}/telemetry` | Node → Broker → Backend | **1** | **False** | Chuỗi số đo cảm biến (nhiệt độ, độ ẩm, MQ-135 ADC raw). |
| `home/{room_id}/{device_id}/status` | Node → Broker → Backend | **1** | **True** | Trạng thái kết nối: `online` (khi khởi động/heartbeat) và `offline` (cấu hình MQTT LWT). |
| `home/{room_id}/{device_id}/command` | Backend → Broker → Node | **1** | **False** | Lệnh điều khiển cơ cấu chấp hành (bật/tắt quạt 5V, LED). |
| `home/{room_id}/{device_id}/ack` | Node → Broker → Backend | **1** | **False** | Phản hồi xác nhận thực thi lệnh kèm kết quả từ firmware. |
| `home/{room_id}/{device_id}/config` | Backend → Broker → Node | **1** | **False** | Cấu hình chu kỳ lấy mẫu từ xa. |

> [!IMPORTANT]
> **Quy tắc Retain**: Chỉ duy nhất topic `status` được phép đặt cờ `Retain = True` (đặc biệt là bản tin Last Will and Testament - LWT) để các client mới kết nối ngay lập tức nắm được trạng thái online/offline hiện tại của node. Tuyệt đối **không bật Retain cho topic `command`** để tránh việc thiết bị vừa online lại tự động thực thi các lệnh cũ ngoài ý muốn.

---

## 3. Đặc tả Cấu trúc Dữ liệu (Payload Schemas)

### 3.1. Telemetry Payload (`/telemetry`)
Gửi định kỳ theo chu kỳ (mặc định 10 giây).

```json
{
  "schema_version": 1,
  "device_id": "esp32-a-01",
  "boot_id": "8f3b2a1c0d4e5f6a7b8c9d0e1f2a3b4c",
  "seq": 104,
  "ts": "2026-11-07T14:30:00Z",
  "temperature_c": 28.5,
  "humidity_pct": 62.4,
  "mq135_adc_raw": 12
}
```

* **Quy tắc trường dữ liệu**:
  * `schema_version`: Số nguyên phiên bản hợp đồng (cố định `1`).
  * `boot_id`: Chuỗi 32 ký tự hex ngẫu nhiên sinh mới ở mỗi lần khởi động ESP32.
  * `seq`: Số nguyên dương tăng dần theo từng mẫu trong một phiên khởi động (`0, 1, 2, ...`).
  * `ts`: Chuỗi thời gian đo đạc theo chuẩn ISO 8601 kèm múi giờ (khuyến nghị UTC `Z`).
  * `temperature_c`: Số thực nhiệt độ (°C, miền hợp lệ: `-40` đến `80`).
  * `humidity_pct`: Số thực độ ẩm không khí (%, miền hợp lệ: `0` đến `100`).
  * `mq135_adc_raw`: Số nguyên ADC 12-bit thô từ chân ngõ ra AO của MQ-135 (`0` đến `4095`). Không chuyển đổi giả lập sang ppm nếu chưa hiệu chuẩn.

---

### 3.2. Status & LWT Payload (`/status`)
Được thiết lập làm bản tin trăn trối (Last Will and Testament) tại thời điểm ESP32 kết nối tới Mosquitto, và được gửi định kỳ làm Heartbeat (mỗi 30 giây).

```json
{
  "state": "online",
  "firmware_version": "1.0.0",
  "uptime_seconds": 3600
}
```
* Khi thiết bị đột ngột mất nguồn hoặc mất Wi-Fi, broker Mosquitto sẽ tự động phát hành bản tin LWT đã lưu sẵn:
```json
{
  "state": "offline"
}
```

---

### 3.3. Command Payload (`/command`)
Lệnh gửi từ Backend API tới thiết bị để điều khiển cơ cấu chấp hành.

```json
{
  "command_id": "cmd-a1b2c3d4e5f6",
  "action": "FAN_SET",
  "value": "ON"
}
```
* `command_id`: Mã định danh lệnh duy nhất (UUID), dùng để đối soát tính duy nhất và chống thực thi lệnh lặp (Idempotency).
* `action`: Tên hành vi (`FAN_SET`, `LED_SET`, `SAMPLING_INTERVAL_SET`).
* `value`: `"ON"`/`"OFF"` cho quạt và LED; số nguyên từ `2` đến `300` cho chu kỳ lấy mẫu.

### 3.4. Cấu hình từ xa (`/config` hoặc `/command`)

Firmware và node mô phỏng chấp nhận `SAMPLING_INTERVAL_SET` trên cả topic `/config` và `/command` để tương thích với API lệnh hiện có. Khoảng lấy mẫu được tính bằng giây, giới hạn 2–300 giây.

```json
{
  "command_id": "cmd-interval-01",
  "action": "SAMPLING_INTERVAL_SET",
  "value": 15
}
```

Node áp dụng giá trị hợp lệ và trả ACK ở `/ack`, gồm `command_id`, `action`, `result` và `sampling_interval_seconds`. Giá trị ngoài khoảng bị từ chối. Backend hiện có thể gửi cấu hình này qua luồng command đã triển khai; việc phát riêng lên `/config` cần publisher tương ứng ở backend.

---

### 3.5. ACK Payload (`/ack`)
Node phản hồi sau khi xử lý lệnh; ACK của ESP32 xác nhận trạng thái phần cứng, còn ACK của simulator chỉ xác nhận trạng thái mô phỏng.

```json
{
  "command_id": "cmd-a1b2c3d4e5f6",
  "action": "FAN_SET",
  "result": "OK",
  "fan_state": "ON",
  "led_state": "OFF",
  "sampling_interval_seconds": 10,
  "ts": "2026-11-07T14:30:02Z"
}
```
* `result`: Trạng thái xử lý (`"OK"` nếu thành công, `"REJECTED"` nếu tham số sai, `"ERROR"` nếu lỗi phần cứng).

---

## 4. Ma trận Phân quyền Mosquitto Broker ACL

Hệ thống cấu hình danh sách kiểm soát quyền (Access Control List - ACL) nghiêm ngặt tại `deployment/mosquitto/acl` nhằm đảm bảo nguyên tắc đặc quyền tối thiểu:

| Tài khoản Client | Quyền đọc (Subscribe) | Quyền ghi (Publish) | Ý nghĩa bảo mật |
| :--- | :--- | :--- | :--- |
| **`iot-backend`** | `home/+/+/telemetry`<br>`home/+/+/status`<br>`home/+/+/ack` | `home/+/+/command`<br>`home/+/+/config` | Backend được phép lắng nghe toàn bộ cảm biến và phát lệnh tới mọi node. |
| **`esp32-a-01`** | `home/room-a/esp32-a-01/command`<br>`home/room-a/esp32-a-01/config` | `home/room-a/esp32-a-01/telemetry`<br>`home/room-a/esp32-a-01/status`<br>`home/room-a/esp32-a-01/ack` | Node Phòng A **chỉ được publish và subscribe đúng các topic mang mã của chính nó**. |
| **`sim-b-01`** | `home/room-b/sim-b-01/command`<br>`home/room-b/sim-b-01/config` | `home/room-b/sim-b-01/telemetry`<br>`home/room-b/sim-b-01/status`<br>`home/room-b/sim-b-01/ack` | Node Phòng B hoàn toàn bị cô lập khỏi các topic của Phòng A. |

> [!NOTE]
> Bất kỳ hành vi nào của Node B cố ý publish vào topic của Node A (ca kiểm thử **SEC-02**) đều bị Broker từ chối ngay lập tức ở tầng giao vận và không được chuyển tiếp tới Backend.

> [!WARNING]
> File `deployment/mosquitto/acl` hiện chưa cấp quyền đọc `/config` cho node hoặc ghi `/config` cho backend. Vì vậy, cấu hình lấy mẫu có thể gửi qua `/command` bằng API hiện tại; chỉ dùng `/config` sau khi chủ phần broker cập nhật ACL tương ứng.

---

## 5. Cơ chế Chống Trùng lặp & Xử lý Khi Node Bị Khóa

1. **Khử trùng Telemetry (Idempotency)**:
   * Do sử dụng `QoS 1`, mạng chập chờn có thể khiến broker gửi lại cùng một gói tin.
   * Bộ ba `(device_id, boot_id, seq)` tạo thành khóa chính duy nhất trong MySQL. Khi có gói tin trùng, câu lệnh SQL sẽ kích hoạt `ON DUPLICATE KEY UPDATE received_at = CURRENT_TIMESTAMP(6)` mà không tạo thêm bản ghi rác (T14).
2. **Quy trình khi Thiết bị bị Khóa (`LOCKED` / `DECOMMISSIONED`)**:
   * **Tại Backend**: Khi trạng thái thiết bị trong CSDL chuyển thành `LOCKED`, Backend API từ chối phát lệnh tới thiết bị, và Backend worker bỏ qua không lưu trữ các gói tin nhận được từ thiết bị này.
   * **Tại Broker**: Quản trị viên cập nhật file mật khẩu Mosquitto hoặc xóa quyền trong file ACL rồi chạy `kill -HUP <mosquitto_pid>` để nạp lại phân quyền mà không cần dừng broker. Khi đó thiết bị bị khóa sẽ bị broker từ chối kết nối (T12).
