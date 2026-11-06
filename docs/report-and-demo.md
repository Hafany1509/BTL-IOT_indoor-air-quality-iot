# Báo cáo và demo

## Dàn ý báo cáo 20–30 trang

1. Bài toán, mục tiêu và phạm vi hai phòng.
2. Yêu cầu chức năng, phi chức năng và phân quyền.
3. Kiến trúc: phần cứng, MQTT, REST, MySQL, cảnh báo và vòng đời thiết bị.
4. Triển khai: nêu phiên bản, module đã làm và cách chạy.
5. Kiểm thử: ca chức năng, tối thiểu hai ca bảo mật, đo độ trễ và bằng chứng.
6. Hạn chế và hướng phát triển: giới hạn MQ-135, tải demo 5V, bảo mật đường truyền.

Mỗi thành viên ghi lại cách chạy phần mình, commit/PR liên quan và ảnh/log đã bỏ thông tin nhạy cảm. Để trống kết quả khi chưa chạy. Không ghi p95 mục tiêu thành p95 đã đo.

## Kịch bản demo dự kiến

- Khởi động Compose với profile mô phỏng. Kiểm tra broker, worker, MySQL và web.
- Cho thấy node phòng B gửi mẫu; xác nhận MySQL có bản ghi và dashboard đọc đúng sau khi API tích hợp.
- Khi firmware thật sẵn sàng, kết nối node phòng A và trình diễn dữ liệu vật lý.
- Tạo tình huống vượt ngưỡng bằng node mô phỏng; kiểm tra cảnh báo và phản hồi lệnh có cùng command_id sau khi các luồng hoàn thành.
- Chạy hai ca bảo mật, ví dụ sai mật khẩu MQTT và publish nhầm topic; lưu log minh chứng.

## Mẫu ghi một lần thử

| Ngày / phiên bản | Ca thử | Điều kiện | Kết quả mong đợi | Kết quả thực tế | Bằng chứng |
|---|---|---|---|---|---|
|  |  |  |  | Chưa chạy |  |
