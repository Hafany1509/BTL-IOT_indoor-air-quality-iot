# Báo cáo lỗi backend – test đầu-cuối với ESP32 thật (22/11/2026)

**Người test:** Lê Huy Hải (phần cứng/firmware)
**Gửi:** Phạm Thu Hà (phụ trách sửa backend)
**Code được test:** backend `origin/main` @ `a713b75`, frontend `origin/feature/frontend-iot` @ `3e4478e`, firmware `hai/firmware-hw-test` @ `ec386b8` (firmware chính `src/main.cpp`).
**Môi trường:** Docker Compose trên máy local (mosquitto, mysql, api, worker), ESP32 thật `esp32-a-01` qua Wi-Fi.

## Tóm tắt

| # | Lỗi | Mức độ | Ảnh hưởng demo |
|---|---|---|---|
| 1 | Lệnh điều khiển đã được ESP32 ACK nhưng bị chuyển thành `TIMEOUT` | **Cao** | Mọi lệnh bật/tắt quạt/LED trên web đều hiện thất bại dù thiết bị đã thực hiện |
| 2 | Hash mật khẩu trong `seed_demo.sql` không khớp mật khẩu ghi trong tài liệu | **Cao** | Không đăng nhập được tài khoản demo nào |
| 3 | Ngưỡng MQ-135 không phù hợp số đo thật | Trung bình | Cảnh báo chất lượng khí không bao giờ bật khi demo |

Những phần **đã chạy đúng** trong cùng lần test: ingest telemetry (6/6 mẫu thật qua `contracts.Telemetry`), lưu MySQL, chuyển lifecycle sang `ACTIVE`, cập nhật `last_seen_at`, API trả dữ liệu cho dashboard, RBAC chặn Viewer (**403**) và request không token (**401**).

---

## Lỗi 1 – Lệnh đã ACK bị ghi đè thành SENT rồi TIMEOUT

### Cách tái hiện

1. Chạy `docker compose up -d mosquitto mysql api worker`, ESP32 `esp32-a-01` online.
2. Đăng nhập `operator_a`, gửi:
   ```http
   POST /api/v1/devices/esp32-a-01/commands
   {"command_type":"LED_SET","payload":{"action":"LED_SET","value":"ON"},"timeout_seconds":15}
   ```
3. Đợi khoảng 15 giây rồi gọi `GET /api/v1/commands/{command_id}`.

**Kỳ vọng:** `status = ACKED`.
**Thực tế:** `status = TIMEOUT`, dù LED trên ESP32 đã bật và `ack_at` có giá trị.

### Bằng chứng (command `cmd-cd51d74ec430`)

| Thời điểm (UTC) | Sự kiện | Nguồn |
|---|---|---|
| 15:29:17.245 | API tạo lệnh (`created_at`) | DB |
| 15:29:17 | ESP32 publish ACK `{"command_id":"cmd-cd51d74ec430","result":"OK","led_state":"ON",...}` | broker log |
| 15:29:17.289 | `worker: Command cmd-cd51d74ec430 updated to ACKED` | worker log |
| **15:29:20.258** | API ghi `status = SENT`, `sent_at` (**sau** ACK ~3 giây) | DB |
| 15:29:32+ | Watchdog thấy `SENT` và `timeout_at < now` → `TIMEOUT` | DB |

Kết quả cuối: `status=TIMEOUT`, `ack_at=15:29:17.280725`, `sent_at=15:29:20.258050`, tức `sent_at` **muộn hơn** `ack_at`.

### Nguyên nhân

**(a)** `backend/app/mqtt_client.py` dòng 20–31: client paho được `connect()` nhưng **không chạy network loop** (`loop_start()`/`loop()`). Vì vậy `info.wait_for_publish(timeout=3)` (dòng 30) luôn chờ đủ 3 giây. Thông điệp chỉ thực sự được gửi đi khi `disconnect()`. Ngoài ra hàm vẫn trả `True` kể cả khi publish chưa được xác nhận.

**(b)** `backend/app/routers/commands.py` dòng 69–72: sau khi `dispatch_device_command` trả về, API gán `status = SENT` **vô điều kiện**, ghi đè `ACKED` mà worker đã lưu trong 3 giây đó.

**(c)** `backend/app/worker.py` dòng 143–151: watchdog chuyển mọi lệnh `SENT` quá hạn sang `TIMEOUT`, nên lệnh đã ACK bị đánh dấu lỗi.

### Gợi ý sửa

`mqtt_client.py`:

```python
def dispatch_device_command(room_id, device_id, command_payload) -> bool:
    topic = f"home/{room_id}/{device_id}/command"
    client = None
    try:
        client = get_mqtt_publisher()
        client.loop_start()                      # chạy network loop
        info = client.publish(topic, json.dumps(command_payload), qos=1)
        info.wait_for_publish(timeout=3)
        if not info.is_published():             # không báo thành công giả
            raise TimeoutError("broker did not confirm PUBLISH")
        return True
    except Exception as exc:
        log.error("Failed to publish command to MQTT topic %s: %s", topic, exc)
        return False
    finally:
        if client is not None:
            client.loop_stop()
            client.disconnect()
```

`commands.py`: chỉ chuyển sang `SENT` nếu lệnh **vẫn đang `PENDING`**. Dùng UPDATE có điều kiện để tránh race với worker:

```python
now = datetime.now(timezone.utc).replace(tzinfo=None)
if sent:
    db.execute(
        update(Command)
        .where(Command.id == command_record.id, Command.status == CommandStatus.PENDING)
        .values(status=CommandStatus.SENT, sent_at=now)
    )
else:
    db.execute(
        update(Command)
        .where(Command.id == command_record.id, Command.status == CommandStatus.PENDING)
        .values(status=CommandStatus.FAILED,
                error_message="Failed to publish message to MQTT broker")
    )
db.commit()
db.refresh(command_record)
```

**Test đề xuất:** giả lập worker ghi `ACKED` trước khi `dispatch_device_command` trả về, rồi kiểm tra trạng thái cuối vẫn là `ACKED`.

---

## Lỗi 2 – Mật khẩu demo trong seed không khớp tài liệu

### Cách tái hiện

1. Tạo DB mới: `docker compose down -v`, rồi `docker compose up -d mysql api`.
2. `POST /api/v1/auth/login` với `admin`, `operator_a` hoặc `viewer_user` và mật khẩu `Demo@2026!` (theo `database/README.md`).

**Kỳ vọng:** 200 kèm token.
**Thực tế:** **401** `Incorrect username or password` với cả 3 tài khoản.

### Bằng chứng

Kiểm tra trực tiếp trong container `api`:

```python
bcrypt.checkpw(b"Demo@2026!", b"$2b$12$K1d0N4W8fV7N4zZ7Y9B3MeO5p0nL7w2bL5Q2pG8mX4yV1xZ2c9B1e")
# -> False
```

Cả 3 user trong `database/seed_demo.sql` (câu `INSERT INTO users`, dòng 15–18) dùng chung hash này. Hash không tương ứng với `Demo@2026!`, nhiều khả năng là chuỗi giả.

### Gợi ý sửa

Sinh hash thật rồi thay vào seed:

```powershell
docker compose exec api python -c "import bcrypt; print(bcrypt.hashpw(b'Demo@2026!', bcrypt.gensalt(12)).decode())"
```

Sau đó chạy `docker compose down -v` để seed lại. Nên thêm test: đọc hash từ `seed_demo.sql` và `verify_password("Demo@2026!", hash)` phải trả `True`.

> Ghi chú: để test tiếp hôm nay, mình đã đặt lại mật khẩu 3 tài khoản **chỉ trong DB local trên máy mình**, không sửa file nào trong repo.

---

## Lỗi 3 – Ngưỡng MQ-135 không phù hợp số đo thật

Số đo thật từ ESP32 (MQ-135 qua mạch chia áp 20k/10k vào GPIO34, ADC 12-bit):

| Điều kiện | `mq135_adc_raw` |
|---|---|
| Không khí trong phòng | 0 (thỉnh thoảng 6) |
| Đưa giấy thấm cồn sát cảm biến | tối đa **235** |

Ngưỡng hiện tại:

- `worker.py` dòng 40–48: `GOOD < 600 ≤ MODERATE < 1200 ≤ POOR < 2000`.
- `seed_demo.sql` luật số 2: `MQ135_RAW GT 1500` → `CRITICAL`.

Với các ngưỡng này, khi demo **luôn hiện GOOD và không bao giờ có cảnh báo khí**. Đề xuất: thống nhất ngưỡng theo baseline đo thực tế. Ví dụ tạm: cảnh báo khi `raw > 150`, sau đó tinh chỉnh khi cảm biến đã burn-in. Phía phần cứng có thể đổi mạch chia áp sang 1/2 (AO tối đa 5V → 2,5V ở GPIO34, vẫn an toàn) để tăng độ phân giải. Hai bên cần chốt cùng nhau.

MQ-135 chỉ cho **chỉ số khí tương đối**, cần thời gian làm nóng và hiệu chuẩn. Báo cáo không nên mô tả nó như cảm biến CO2 chính xác.

---

## Lỗi 4 – Mosquitto không khởi động lại được (bổ sung 25/11/2026)

**Mức độ:** Cao cho buổi demo.

**Tái hiện:** `docker compose stop`, rồi bấm **Start** trong Docker Desktop (hoặc `docker compose start` / `up -d`, hoặc khởi động lại máy). Container `mosquitto` thoát ngay với mã 1:

```
Error: Unable to open file /tmp/iot-passwords for writing. File exists.
```

**Nguyên nhân:** `deployment/mosquitto/start.sh` gọi `mosquitto_passwd -c /tmp/iot-passwords …`. Khi container được **khởi động lại** (không tạo mới), `/tmp/iot-passwords` từ lần chạy trước vẫn còn, `mosquitto_passwd -c` từ chối ghi đè. Container mới tạo lần đầu thì chạy được, nên lỗi không lộ ra khi chỉ dùng `up` trên máy sạch.

**Hậu quả:** broker tắt → ESP32, simulator, worker không kết nối được; dashboard "Mất kết nối" toàn bộ.

**Gợi ý sửa** (`start.sh`, trước dòng `mosquitto_passwd -b -c`):

```sh
rm -f /tmp/iot-passwords
```

**Cách tạm thời:** `docker compose up -d --force-recreate mosquitto` (tạo mới container, không mất dữ liệu vì broker không lưu dữ liệu bền).

**Trạng thái:** Hải đã thêm dòng `rm -f` vào `start.sh` trên máy demo (25/11) và kiểm chứng: `docker compose stop mosquitto` rồi `start` → broker chạy lại bình thường. Thay đổi sẽ nằm trong lần commit chung của Hải; Hà không cần sửa trùng.

## Ghi chú thêm (không phải lỗi)

- Mosquitto log cảnh báo file `/iot/acl` có quyền đọc rộng và owner không phải `mosquitto`. Hiện vẫn chạy, nhưng phiên bản sau có thể từ chối load. Có thể copy ACL sang `/tmp` và `chmod 0600` trong `start.sh`, giống cách làm với file password.
- Lần test này chạy backend từ **working tree local**, gồm các thay đổi chưa commit: `JWT_SECRET` bắt buộc trong `auth.py`/`compose.yaml`, thêm topic `config` trong ACL. Các thay đổi này không liên quan đến 3 lỗi trên; 3 lỗi đều có trong `origin/main`.
