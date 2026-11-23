# QUY TẮC THIẾT KẾ GIAO DIỆN TOÀN HỆ THỐNG IoT

**Dự án:** Air Quality Monitoring System – Hệ thống giám sát và cảnh báo chất lượng không khí trong nhà  
**Frontend:** React + Vite  
**Backend:** FastAPI  
**Phạm vi:** Một node ESP32, ba vai trò `ADMIN`, `OPERATOR`, `VIEWER`  
**Phiên bản tài liệu:** 1.0

> Đây là **bộ quy tắc UI/UX đề xuất** để thống nhất thiết kế Figma và triển khai frontend, không phải đặc tả bắt buộc của backend.

## 1. Định hướng thiết kế

Phong cách **Modern IoT Dashboard**: hiện đại, tối giản, rõ ràng, dễ theo dõi dữ liệu cảm biến và trạng thái thiết bị.

### Nguyên tắc chung

1. **Nhất quán:** Dùng chung bảng màu, typography, icon, component và khoảng cách ở mọi màn hình.
2. **Ưu tiên dữ liệu:** Nhiệt độ, độ ẩm, dữ liệu MQ-135, tình trạng node và cảnh báo phải dễ nhận biết.
3. **Phù hợp một node:** Không cần luồng quản lý mạng lưới nhiều node hoặc nhiều phòng phức tạp.
4. **Phân quyền rõ ràng:** Một bộ giao diện chung; chỉ hiển thị chức năng theo vai trò và quyền trên thiết bị.
5. **Phản hồi trạng thái:** Mọi thao tác đều có trạng thái đang xử lý, thành công hoặc thất bại.
6. **Responsive:** Ưu tiên desktop để trình diễn đồ án, vẫn hỗ trợ tablet và mobile.
7. **Trung thực với dữ liệu:** Không hiển thị dữ liệu giả như dữ liệu cảm biến thực; không suy diễn đơn vị hay chỉ số chưa được đo/hiệu chuẩn.

## 2. Bảng màu (Design Tokens)

| Token                | Mã HEX    | Mục đích                            |
| -------------------- | --------- | ----------------------------------- |
| `--color-primary`    | `#2563EB` | Nút chính, menu đang chọn, liên kết |
| `--color-sidebar`    | `#0F172A` | Nền thanh điều hướng                |
| `--color-background` | `#F8FAFC` | Nền ứng dụng                        |
| `--color-surface`    | `#FFFFFF` | Card, form, bảng                    |
| `--color-success`    | `#16A34A` | Bình thường, thành công, online     |
| `--color-warning`    | `#F59E0B` | Cảnh báo, chờ xác nhận              |
| `--color-danger`     | `#DC2626` | Nguy hiểm, lỗi, thao tác xóa        |
| `--color-muted`      | `#64748B` | Chú thích, nội dung phụ             |

**Quy tắc:** Không chỉ dùng màu để thể hiện trạng thái; phải kèm nhãn văn bản hoặc icon. Bảo đảm độ tương phản dễ đọc, đặc biệt trên badge và nút.

## 3. Typography và bố cục

| Thành phần      | Quy chuẩn đề xuất              |
| --------------- | ------------------------------ |
| Font            | Inter hoặc Be Vietnam Pro      |
| Tiêu đề trang   | 24–28px, SemiBold              |
| Tiêu đề Card    | 16–18px, SemiBold              |
| Nội dung        | 14–16px                        |
| Chỉ số cảm biến | 28–36px, Bold                  |
| Sidebar desktop | 240–256px                      |
| Header desktop  | 64–72px                        |
| Hệ khoảng cách  | 8px, 16px, 24px, 32px          |
| Bo góc Card     | 12–16px                        |
| Bo góc Button   | 8–10px                         |
| Card            | Nền trắng, viền mảnh, bóng nhẹ |

- Trang sau đăng nhập dùng `MainLayout`: Sidebar trái, Header trên, vùng nội dung chính.
- Trang đăng nhập dùng bố cục riêng, không hiển thị Sidebar.
- Giữ lề, khoảng cách, kích thước tiêu đề và trạng thái loading đồng nhất.
- Dùng component tái sử dụng: `Button`, `Card`, `StatusBadge`, `ConfirmDialog`, `Loading`, `ErrorMessage`.

## 4. Quy tắc điều hướng và phân quyền

| Trang / Route đề xuất            | ADMIN |      OPERATOR      | VIEWER |
| -------------------------------- | :---: | :----------------: | :----: |
| `/login` – Đăng nhập             |   ✓   |         ✓          |   ✓    |
| `/dashboard` – Tổng quan         |   ✓   |         ✓          |   ✓    |
| `/telemetry` – Lịch sử & biểu đồ |   ✓   |         ✓          |   ✓    |
| `/alerts` – Cảnh báo             |   ✓   |         ✓          |   ✓    |
| `/control` – Điều khiển          |   ✓   | Theo quyền CONTROL |   —    |
| `/alert-rules` – Cấu hình ngưỡng |   ✓   |         —          |   —    |
| `/users` – Quản lý người dùng    |   ✓   |         —          |   —    |
| `/profile` – Hồ sơ cá nhân       |   ✓   |         ✓          |   ✓    |

- Đây là **route frontend đề xuất**, không phải endpoint FastAPI.
- `ADMIN` quản trị hệ thống; `OPERATOR` chỉ thao tác thiết bị trong phạm vi được cấp quyền; `VIEWER` chỉ xem.
- Kiểm soát quyền ở cả giao diện **và backend**. Ẩn nút không thay thế được kiểm tra quyền API.
- Có thể tích hợp điều khiển quạt/LED ngay trong Dashboard, thay vì bắt buộc tạo trang riêng.
- Vì chỉ có một node, không cần trang danh sách nhiều thiết bị hoặc phòng, trừ khi yêu cầu demo mở rộng.

## 5. Quy tắc từng màn hình

### 5.1. Đăng nhập (Login)

- Hiển thị tên/logo hệ thống và biểu mẫu username, password.
- Có nút hiện/ẩn mật khẩu; báo lỗi rõ ràng khi thông tin không đúng.
- Khóa nút hoặc hiển thị loading khi đang gửi yêu cầu.
- Không đưa mật khẩu mẫu hoặc token thật vào mã giao diện.

### 5.2. Dashboard

- Hiển thị ba thẻ chỉ số: **Nhiệt độ**, **Độ ẩm**, **MQ-135**.
- Có tên node ESP32, trạng thái kết nối, thời điểm nhận dữ liệu gần nhất.
- Có biểu đồ xu hướng ngắn, cảnh báo gần đây và trạng thái quạt/LED nếu backend cung cấp.
- Chỉ hiển thị điều khiển nhanh cho người có quyền.
- Nếu dữ liệu không có hoặc quá cũ, hiển thị `Chưa có dữ liệu` / `Dữ liệu chưa cập nhật`, không tự điền `0`.

### 5.3. Lịch sử dữ liệu & biểu đồ

- Biểu đồ đường theo thời gian, có lựa chọn khoảng thời gian và chú giải.
- Trục, nhãn và đơn vị phải đúng với trường dữ liệu API.
- Có trạng thái đang tải, không có dữ liệu, lỗi tải và thử lại.
- Không gọi giá trị MQ-135 là **AQI** hoặc **ppm** nếu chưa có cơ sở hiệu chuẩn/chuyển đổi tương ứng.

### 5.4. Cảnh báo

- Mỗi cảnh báo hiển thị: mức độ, nội dung, thời điểm, trạng thái xử lý.
- Màu sắc: xanh (bình thường/đã xử lý), vàng (cảnh báo/chờ), đỏ (nguy hiểm/chưa xử lý) theo ý nghĩa cụ thể.
- Nút xác nhận (`acknowledge`) hoặc giải quyết (`resolve`) chỉ xuất hiện khi người dùng có quyền.
- Sau thao tác, cập nhật từ phản hồi backend; thông báo rõ nếu thất bại.

### 5.5. Điều khiển quạt/LED

- Hiển thị trạng thái thiết bị và hành động được phép.
- Phân biệt **Đã gửi lệnh**, **Đang chờ ACK**, **Đã xác nhận**, **Thất bại/Timeout**.
- Không coi việc API chấp nhận lệnh là bằng chứng thiết bị đã thực thi.
- Ngăn gửi trùng lệnh khi đang xử lý; yêu cầu xác nhận với thao tác quan trọng nếu cần.
- Khi node offline, thông báo rõ và hạn chế thao tác không thể thực hiện.

### 5.6. Cấu hình ngưỡng cảnh báo

- Form có nhãn, đơn vị, mô tả ngưỡng và kiểm tra dữ liệu hợp lệ.
- Phân biệt trạng thái xem và chỉnh sửa.
- Có thông báo thành công/thất bại sau khi lưu.
- Chỉ Admin có quyền quản trị quy tắc theo phương án phân quyền đề xuất.

### 5.7. Quản lý người dùng

- Bảng gồm username, vai trò, trạng thái và thao tác phù hợp.
- Xác nhận trước khi thay đổi vai trò hoặc trạng thái tài khoản.
- Không hiển thị mật khẩu hay password hash.
- Chỉ Admin truy cập.

### 5.8. Hồ sơ cá nhân

- Hiển thị thông tin tài khoản và cho phép chỉnh sửa trường được API hỗ trợ.
- Có form đổi mật khẩu riêng, xác thực và thông báo lỗi.
- Hiển thị vai trò hiện tại, không cho tự nâng quyền.

## 6. Trạng thái tương tác toàn hệ thống

| Tình huống                   | Hành vi giao diện                                             |
| ---------------------------- | ------------------------------------------------------------- |
| Đang tải                     | Skeleton hoặc spinner                                         |
| Node mất kết nối             | Badge `Offline`, thời gian cập nhật cuối                      |
| Chưa có dữ liệu              | Empty state, không tạo giá trị mặc định giả                   |
| API thất bại                 | Thông báo ngắn, có nút thử lại nếu phù hợp                    |
| Gửi lệnh điều khiển          | Hiển thị pending/ACK, ngăn gửi trùng                          |
| Xóa hoặc thay đổi quan trọng | Hộp thoại xác nhận                                            |
| Không đủ quyền               | Ẩn/vô hiệu thao tác và chặn route; backend vẫn xác thực quyền |
| Hết hạn đăng nhập            | Yêu cầu đăng nhập lại                                         |

## 7. Responsive

| Kích thước        | Quy tắc                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| Desktop ≥ 1200px  | Sidebar cố định; ba thẻ cảm biến một hàng; biểu đồ và điều khiển chia cột |
| Tablet 768–1199px | Sidebar thu gọn; Card tự xuống hai cột                                    |
| Mobile < 768px    | Sidebar thành menu mở/đóng; Card một cột; bảng cuộn ngang khi cần         |

- Nút bấm và vùng chạm phải đủ lớn để thao tác trên điện thoại.
- Không để biểu đồ, bảng hoặc chuỗi trạng thái tràn khỏi màn hình.

## 8. Quy tắc dữ liệu và an toàn giao diện

- Không giả định có dữ liệu thời gian thực nếu API chưa trả về dữ liệu mới.
- Phải thể hiện rõ thời điểm cập nhật và trạng thái online/offline.
- Giá trị MQ-135 phải được đặt tên theo dữ liệu thực tế, không suy diễn AQI/ppm.
- Không lưu hoặc hiển thị mật khẩu, password hash, JWT trong UI.
- Token và quyền truy cập phải được xử lý cẩn thận; kiểm tra phân quyền phía frontend chỉ là lớp hỗ trợ trải nghiệm.
- Khi điều khiển thiết bị, chờ kết quả ACK thay vì tự khẳng định trạng thái vật lý đã đổi.

## 9. Tổ chức mã nguồn để áp dụng Design System

```text
frontend/src/
├── assets/styles/
│   ├── variables.css       # Màu sắc, typography, spacing, radius
│   └── global.css          # CSS nền và reset chung
├── components/
│   ├── common/             # Button, Badge, Card, Dialog, Loading...
│   └── layout/             # MainLayout, Sidebar, Header
├── features/               # Các trang theo chức năng
├── routes/                 # Router và route guards
└── utils/                  # Phân quyền, định dạng dữ liệu
```

## 10. Hình minh họa

![Minh họa Design System và Dashboard IoT](./a_clean_modern_ui_design_poster_for_an_iot_indoor.png)

_Hình minh họa là bản thiết kế ý tưởng, sử dụng số liệu mẫu, không phải ảnh chụp ứng dụng đã lập trình hoặc dữ liệu đo từ ESP32._

---

**Tiêu chí hoàn thành:** Tất cả màn hình dùng chung token màu, font, component và layout; hiển thị đúng dữ liệu, trạng thái, quyền thao tác; hoạt động được trên desktop và mobile.
