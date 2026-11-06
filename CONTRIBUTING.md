# Làm việc nhóm

1. Chọn issue, ghi mục tiêu và tiêu chí hoàn thành.
2. Cập nhật `main`, tạo nhánh riêng: `git switch -c feat/mqtt-simulator` hoặc `feat/dashboard`.
3. Mở pull request vào `main`, ghi cách kiểm tra và nhờ ít nhất một bạn review. Thay đổi contract MQTT/API/schema phải thông báo trong PR để cả ba phần cập nhật cùng nhau.
4. Không commit `.env`, `secrets.h`, token, dữ liệu thật, node_modules hay file build.
5. Mỗi PR tập trung vào một phần; ghi kết quả test đã chạy, không đánh dấu Pass khi chưa có bằng chứng.

