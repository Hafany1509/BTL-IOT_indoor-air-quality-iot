# Kiểm thử bảo mật MQTT – xác thực broker và ACL (22/11/2026)

**Người thực hiện:** Lê Huy Hải
**Môi trường:** Docker Compose local, Mosquitto `eclipse-mosquitto:2` (bản chạy: 2.1.4), `allow_anonymous false`, password file sinh từ `.env`, ACL `deployment/mosquitto/acl`.
**Công cụ:** `mosquitto_pub` / `mosquitto_sub` chạy trong container broker, giao thức MQTT v5 để thấy mã lỗi (reason code) trả về. Một client `iot-backend` subscribe `home/#` suốt thời gian test để ghi nhận những gì thực sự đến được backend.
**Mục đích:** bằng chứng cho kịch bản bảo mật bắt buộc *"sai MQTT username/password hoặc publish vào topic không có quyền ACL → broker từ chối"*. Bổ sung cho mục 2.3 trong `tests/test-results.md`.

> Mật khẩu thật được lấy từ biến môi trường bên trong container (`$MQTT_ESP32_PASSWORD`, ...). Không mật khẩu nào xuất hiện trong lệnh hay tài liệu này.

## 1. Xác thực kết nối (CONNECT)

| Mã | Kịch bản | Kỳ vọng | Kết quả thực tế | KQ |
|---|---|---|---|---|
| MQ-S01 | `esp32-a-01` + **sai mật khẩu** | Broker từ chối | `CONNACK (135) Not authorized`, exit 135 | ✅ PASS |
| MQ-S02 | **Không** username/password (anonymous) | Broker từ chối | `CONNACK (135) Not authorized` | ✅ PASS |
| MQ-S03 | Username **không tồn tại** (`attacker`) | Broker từ chối | `CONNACK (135) Not authorized` | ✅ PASS |

Lệnh đại diện:

```sh
mosquitto_pub -h 127.0.0.1 -V mqttv5 -u esp32-a-01 -P wrong-password \
  -t home/room-a/esp32-a-01/telemetry -m test -d
# Client null sending CONNECT
# Client (null) received CONNACK (135)
# Connection error: Not authorized
```

## 2. ACL – quyền publish

Đăng nhập **đúng** mật khẩu, publish QoS 1 để broker trả PUBACK kèm reason code.

| Mã | User | Topic publish | Kỳ vọng | PUBACK | Backend có nhận? | KQ |
|---|---|---|---|---|---|---|
| MQ-S04 | `esp32-a-01` | `home/room-b/sim-b-01/telemetry` (phòng khác) | Chặn | **RC 135** (Not authorized) | Không | ✅ PASS |
| MQ-S05 | `esp32-a-01` | `home/room-a/esp32-a-01/command` (thiết bị tự giả lệnh) | Chặn | **RC 135** | Không | ✅ PASS |
| MQ-S06 | `sim-b-01` | `home/room-a/esp32-a-01/status` với `{"state":"offline"}` (giả mạo node khác) | Chặn | **RC 135** | Không | ✅ PASS |
| MQ-S07 (đối chứng) | `esp32-a-01` | `home/room-a/esp32-a-01/telemetry` (đúng quyền) | Cho phép | **RC 0** | Có | ✅ PASS |

**Kiểm tra chéo:** client `iot-backend` (subscribe `home/#`) **không nhận** bất kỳ thông điệp nào của MQ-S04, MQ-S05, MQ-S06. Chỉ nhận đúng thông điệp đối chứng MQ-S07. Thông điệp MQ-S06 bị chặn nên trạng thái `esp32-a-01` trong DB **không** bị đổi bởi kẻ giả mạo.

**Kết quả phụ (payload sai định dạng):** thông điệp đối chứng MQ-S07 cố ý là chuỗi `ACLTEST-telemetry`, không phải JSON. Worker từ chối và không lưu vào DB:

```
[WARNING] worker: Rejected invalid telemetry from home/room-a/esp32-a-01/telemetry:
  1 validation error for Telemetry  Invalid JSON ... [type=json_invalid]
```

## 3. ACL – quyền đọc (subscribe)

Mosquitto chấp nhận lệnh SUBSCRIBE (SUBACK granted) nhưng **lọc từng thông điệp theo ACL read** khi phân phối. Vì vậy cần kiểm tra bằng việc có thực sự nhận được tin hay không.

| Mã | Kịch bản | Kỳ vọng | Kết quả thực tế | KQ |
|---|---|---|---|---|
| MQ-S08 | `esp32-a-01` subscribe `home/#` (nghe lén mọi topic). Backend publish lệnh vào `home/room-b/sim-b-01/command` | Không nhận | **Không nhận** | ✅ PASS |
| MQ-S09 (đối chứng) | Cùng subscriber. Backend publish vào `home/room-a/esp32-a-01/config` (topic của chính nó) | Nhận | **Nhận** đúng 1 tin | ✅ PASS |

Output thực tế của subscriber `esp32-a-01` trên `home/#`:

```
home/room-a/esp32-a-01/config {"command_id":"ACLTEST-own","action":"SAMPLING_INTERVAL_SET","value":10}
Timed out
```

## 4. Kết luận

- Broker **từ chối mọi kết nối** sai mật khẩu, không đăng nhập hoặc user lạ.
- Mỗi thiết bị **chỉ ghi** được vào telemetry/status/ack của chính nó, **không** giả được lệnh, **không** giả mạo được node phòng khác.
- Mỗi thiết bị **chỉ đọc** được command/config của chính nó, kể cả khi cố subscribe wildcard `home/#`.
- Kết hợp kịch bản API đã test cùng ngày (Viewer gửi lệnh → **403**, không token → **401**), đồ án có **đủ 2 kịch bản bảo mật** có bằng chứng thực tế.

## 5. Phát hiện ngoài phạm vi test – Last Will (LWT) không được phát

Khi rút USB ESP32, broker ghi nhận `Client esp32-a-01 ... disconnected: exceeded timeout`, nhưng **không có** thông điệp `{"state":"offline"}` nào xuất hiện trên `home/room-a/esp32-a-01/status`. Backend vẫn chuyển thiết bị sang `OFFLINE`, nhưng là nhờ watchdog (mất heartbeat quá 60 giây), **không phải** nhờ LWT.

Nguyên nhân nằm ở firmware (`firmware/src/main.cpp`, hàm `beginMqtt`): `setWill()` nhận con trỏ `statusTopic.c_str()` của một `String` cục bộ. AsyncMqttClient **chỉ lưu con trỏ**, không sao chép chuỗi. Khi hàm kết thúc, chuỗi bị huỷ, nên lúc CONNECT topic của LWT trỏ vào vùng nhớ rác.

**Đã sửa và test lại cùng ngày:** topic LWT chuyển sang bộ đệm `static char willTopic[96]`. Kết quả với ESP32 thật:

| Thời điểm (UTC) | Sự kiện |
|---|---|
| 16:02:22 | Cắm USB sau khi nạp → `status online`; DB `OFFLINE → ACTIVE` (tự kết nối lại) |
| 16:13:02 | Telemetry cuối cùng (seq 56); sau đó rút USB |
| 16:13:47 | Broker: `esp32-a-01 disconnected: exceeded timeout` → phát LWT `{"state":"offline"}` trên `home/room-a/esp32-a-01/status` |
| 16:13:47.744 | Worker: `Device esp32-a-01 status received: OFFLINE` → DB `lifecycle = OFFLINE` |

LWT đến khoảng 45 giây sau gói cuối (keep-alive 30 giây × 1,5), **sớm hơn** watchdog 60 giây. Ca T11 giờ đạt nhờ cả hai cơ chế: LWT và watchdog.

> Ghi chú cho người tổng hợp test: `tests/test-results.md` đang ghi **T08** (gửi lệnh → ACKED) và **T11** (LWT) là PASS. Test với phần cứng thật ngày 22/11 cho thấy T08 bị chuyển thành TIMEOUT (xem `bao-cao-loi-backend-2026-11-22.md`, lỗi 1) và T11 hiện chỉ đạt nhờ watchdog, chưa nhờ LWT.
