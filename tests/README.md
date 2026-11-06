# Kiểm thử

`test_starter.py` kiểm tra endpoint health và contract telemetry, không cần broker hoặc database. Lệnh chạy ở README gốc.

| Mã | Ca tích hợp cần chạy sau | Kết quả mong đợi |
|---|---|---|
| INT-01 | Chạy profile sim, truy vấn MySQL | Mẫu phòng B có đúng device_id và đơn vị |
| INT-02 | Publish hai lần cùng boot_id và seq | Một bản ghi |
| SEC-01 | Kết nối MQTT với mật khẩu sai | Broker từ chối |
| SEC-02 | Node B publish vào topic node A | Broker không chuyển bản tin; DB không có bản ghi sai |
| SEC-03 | Viewer gọi API điều khiển (sau khi triển khai) | 403, không phát command |
| SEC-04 | Operator đọc thiết bị ngoài phạm vi (sau khi triển khai) | Từ chối truy cập |
| PERF-01 | Đo ít nhất 30 mẫu từ thiết bị đến dashboard (sau khi tích hợp) | Ghi median, p95, điều kiện đo; p95 ≤ 3 giây là mục tiêu |

Ghi điều kiện thử, thời điểm, kết quả thực tế và bằng chứng. Bảng này là kế hoạch, không phải kết quả.

