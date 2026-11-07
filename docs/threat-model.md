# Mô Hình Đe Dọa & An Toàn Thông Tin (D14 - Threat Model & Privacy)

Tài liệu này phân tích các ranh giới tin cậy (Trust Boundaries), mô hình hóa các nguy cơ an ninh (Threat Modeling), các biện pháp kiểm soát kỹ thuật và chính sách bảo vệ dữ liệu cá nhân theo yêu cầu bắt buộc tại **Mục 4.5 & Mục 6 của Đề bài Đồ án**.

---

## 1. Ranh Giới Tin Cậy (Trust Boundaries)

Hệ thống được chia thành 4 vùng tin cậy với các ranh giới kiểm soát nghiêm ngặt:
1. **Vùng 1: Trình duyệt người dùng (Untrusted)**: Có thể bị can thiệp bởi DevTools, gửi request giả lập hoặc thay đổi tham số URL. Mọi dữ liệu từ frontend đều không được tin cậy và bắt buộc phải xác thực lại tại backend.
2. **Vùng 2: Mạng kết nối IoT & Mosquitto Broker (Semi-trusted)**: Mạng không dây Wi-Fi nội bộ có thể chập chờn hoặc có nguy cơ nghe lén. Được bảo vệ bởi xác thực tài khoản riêng từng node và ma trận Mosquitto ACL.
3. **Vùng 3: Ứng dụng Backend API & Worker (Trusted Core)**: Nơi thực thi logic nghiệp vụ, kiểm tra JWT, băm mật khẩu bcrypt và đánh giá quyền truy cập.
4. **Vùng 4: Cơ sở dữ liệu MySQL (Isolated Storage)**: Chỉ mở cổng nội bộ trong Docker mạng riêng, không mở ra Internet bên ngoài.

---

## 2. Bảng Ma Trận Phân Tích Mối Đe Dọa & Biện Pháp Kiểm Soát (STRIDE)

| Mã | Mối đe dọa tiềm ẩn | Tác động an ninh | Biện pháp kiểm soát tại Hệ thống | Ca kiểm thử đối soát |
| :---: | :--- | :--- | :--- | :---: |
| **TH-01** | **Giả mạo danh tính (Spoofing)**<br>Kẻ tấn công đánh cắp hoặc dùng token giả mạo. | Chiếm quyền điều khiển tài khoản người dùng. | Xác thực JWT có chữ ký bí mật `HS256`, kiểm tra thời hạn hết hạn (`exp`) và trạng thái tài khoản `LOCKED`. | **T01** |
| **TH-02** | **Leo thang đặc quyền (Tampering/Elevation)**<br>Viewer gọi trực tiếp API điều khiển qua Postman. | Thao tác bật/tắt thiết bị vật lý trái phép. | Middleware `require_role(ADMIN, OPERATOR)` tại backend chặn và trả về HTTP 403 Forbidden. | **T09** |
| **TH-03** | **Truy cập chéo tài nguyên (IDOR)**<br>Operator A đoán `device_id` của Operator B. | Rò rỉ dữ liệu hoặc điều khiển nhầm phòng khác. | Hàm `check_device_scope()` bắt buộc kiểm tra quan hệ trong bảng `device_assignments`. | **T10** |
| **TH-04** | **Node giả mạo phát tin (Spoofing/Tampering)**<br>Node phòng B publish vào topic phòng A. | Làm sai lệch số đo telemetry phòng khác. | Cấu hình file `acl` của Mosquitto cô lập quyền publish/subscribe nghiêm ngặt theo username của từng node. | **SEC-02** |
| **TH-05** | **Thiết bị bị thu hồi vẫn hoạt động**<br>Node bị Admin khóa (`LOCKED`) vẫn gửi dữ liệu. | Dữ liệu rác tiếp tục tràn vào CSDL. | Backend worker từ chối telemetry từ node bị khóa; cập nhật ACL broker từ chối kết nối. | **T12** |
| **TH-06** | **Tấn công dữ liệu độc hại (Injection/DoS)**<br>Gửi payload sai cú pháp, giá trị ngoài miền. | Làm sập tiến trình backend worker. | Kiểm tra và làm sạch dữ liệu đầu vào bằng Pydantic v2 validator trước khi xử lý. | **T05** |
| **TH-07** | **Lệnh thực thi lặp lại (Replay Attack)**<br>Gói tin lệnh bị phát lại gây tác động lặp. | Động cơ/quạt bị bật tắt liên tục gây hỏng. | Mã `command_id` duy nhất (Idempotency key) và kiểm tra trạng thái lệnh trước khi thực thi. | **T14** |
| **TH-08** | **Lộ lọt thông tin bí mật (Information Disclosure)**<br>Lộ mật khẩu/token trong CSDL hoặc Git. | Chiếm toàn quyền hệ thống. | Băm mật khẩu bằng `bcrypt (rounds=12)`; loại bỏ mật khẩu `.env` khỏi Git; lọc `[REDACTED]` trong Audit Log. | **T02, T15, SC-07** |

---

## 3. Chính Sách Thu Thập Dữ Liệu Cá Nhân & Quyền Riêng Tư (Privacy Policy)

Tuân thủ nghiêm ngặt yêu cầu tại **Mục 4.5 và Mục 10 của Đề bài**:

1. **Nguyên tắc giảm thiểu dữ liệu (Data Minimization)**:
   * Hệ thống **chỉ thu thập thông tin người dùng tối thiểu cần thiết cho vận hành**: `username`, `email` (nhận thông báo) và `full_name`. Tuyệt đối không thu thập dữ liệu sinh trắc học, vị trí GPS cá nhân, âm thanh hay hình ảnh người dùng.
2. **Quyền riêng tư đối với dữ liệu cảm biến**:
   * Số đo nhiệt độ, độ ẩm và nồng độ khí MQ-135 chỉ phản ánh tình trạng chất lượng vi khí hậu của phòng học/văn phòng.
   * Hệ thống **không sử dụng dữ liệu cảm biến để suy đoán hành vi cá nhân hoặc đưa ra chẩn đoán y tế/sức khỏe lâm sàng**. Mức đánh giá khí MQ-135 chỉ mang tính cảnh báo tương đối trong phạm vi nghiên cứu đồ án.
3. **Bảo vệ tính toàn vẹn và bất biến (Immutable Audit)**:
   * Bảng `audit_logs` được thiết kế theo cơ chế chỉ ghi thêm (`append-only`). Mọi dữ liệu nhạy cảm như mật khẩu hay token xác thực đều tự động bị bóc tách và thay thế bằng chuỗi `[REDACTED]` trước khi lưu vào CSDL, đảm bảo quyền riêng tư của người vận hành.

