# Đưa starter lên GitHub

Repo nhóm đã có commit README trên `main`. Clone repo trước rồi chép starter vào bản clone để giữ lịch sử. Không chạy `git init` trong thư mục BTL IOT chứa slide và không dùng force-push.

Trong PowerShell, chạy:

```powershell
Set-Location "$env:USERPROFILE\Documents\ChatGPT\BTL IOT"
git clone https://github.com/Hafany1509/BTL-IOT_indoor-air-quality-iot.git repo-nhom
if ($LASTEXITCODE -ne 0) { throw "Clone thất bại. Đăng nhập GitHub bằng tài khoản được cấp quyền." }
robocopy .\iot-starter .\repo-nhom /E /XD .git .venv node_modules dist .pio __pycache__ .pytest_cache .npm-cache /XF .env secrets.h
if ($LASTEXITCODE -ge 8) { throw "Sao chép thất bại; kiểm tra thông báo của robocopy." }
Set-Location .\repo-nhom
git status --short
git add -A
git diff --cached --stat
git commit -m "chore: bootstrap indoor air quality IoT project"
git push origin main
```

- `robocopy` trả mã 0–7 khi không có lỗi sao chép. Dùng một thư mục clone mới nếu tên `repo-nhom` đã tồn tại. README starter sẽ thay phần giới thiệu trong bản clone, commit cũ vẫn còn trong lịch sử.
- Trước commit, kiểm tra không có `.env`, `secrets.h`, slide hoặc thư mục build trong danh sách staged.
- Nếu Git yêu cầu danh tính, đặt `git config user.name` và `git config user.email` trong bản clone. Nếu GitHub yêu cầu đăng nhập, hoàn tất qua cửa sổ xác thực của Git Credential Manager.
- Nếu push bị từ chối vì main đã có thay đổi, cập nhật bằng `git pull --rebase origin main`, xử lý xung đột nếu có, rồi push lại.
- Sau khi push, chủ repo mời các bạn qua [Settings → Collaborators](https://github.com/Hafany1509/BTL-IOT_indoor-air-quality-iot/settings/access). Mỗi bạn nhận lời mời, clone và tạo nhánh riêng.

