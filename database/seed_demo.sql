-- ============================================================================
-- ĐỒ ÁN: HỆ THỐNG IoT GIÁM SÁT VÀ CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ TRONG PHÒNG
-- TỆP SEED DATA DEMO: database/seed_demo.sql
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Phòng mẫu
INSERT INTO rooms (room_id, name, description) VALUES
('room-a', 'Phòng Thí Nghiệm IoT A', 'Khu vực demo phần cứng ESP32 + DHT22 + MQ-135'),
('room-b', 'Phòng Làm Việc B', 'Khu vực chạy kịch bản Python Simulator')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 2. Tài khoản mẫu cho 3 vai trò (Mật khẩu mặc định: Demo@2026!)
-- Hash được sinh bằng: bcrypt.hashpw(b'Demo@2026!', bcrypt.gensalt(12))
-- Đã verify: bcrypt.checkpw(b'Demo@2026!', hash) == True
INSERT INTO users (id, username, email, password_hash, full_name, role, status) VALUES
(1, 'admin', 'admin@iot.local', '$2b$12$JTQtBgcOUxOH6aFdXm1AkucF6WjGikzqXKddhCNa3D21hv3immkKi', 'Quản Trị Viên Hệ Thống', 'ADMIN', 'ACTIVE'),
(2, 'operator_a', 'operator.a@iot.local', '$2b$12$JTQtBgcOUxOH6aFdXm1AkucF6WjGikzqXKddhCNa3D21hv3immkKi', 'Người Vận Hành Phòng A', 'OPERATOR', 'ACTIVE'),
(3, 'viewer_user', 'viewer@iot.local', '$2b$12$JTQtBgcOUxOH6aFdXm1AkucF6WjGikzqXKddhCNa3D21hv3immkKi', 'Khách Xem Báo Cáo', 'VIEWER', 'ACTIVE')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role), status = VALUES(status);

-- 3. Thiết bị mẫu
INSERT INTO devices (device_id, room_id, display_name, lifecycle, firmware_version, mqtt_client_id) VALUES
('esp32-a-01', 'room-a', 'ESP32 Phòng A (Node Thật)', 'ACTIVE', '1.0.0', 'esp32-a-01'),
('sim-b-01', 'room-b', 'Simulator Phòng B (Node Ảo)', 'ACTIVE', '1.0.0', 'sim-b-01')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), lifecycle = VALUES(lifecycle);

-- 4. Phân công quyền theo phạm vi (Device Scope)
INSERT INTO device_assignments (user_id, device_id, permission, assigned_by) VALUES
(2, 'esp32-a-01', 'CONTROL', 1),
(3, 'esp32-a-01', 'VIEW', 1)
ON DUPLICATE KEY UPDATE permission = VALUES(permission);

-- 5. Quy tắc cảnh báo mẫu
-- Ngưỡng MQ135_RAW được hiệu chỉnh theo baseline đo thực tế (ADC 12-bit, mạch chia áp 20k/10k):
--   Phòng thường: 0–6, hơi cồn sát cảm biến: tối đa ~235
-- Cần tinh chỉnh sau khi cảm biến burn-in đủ thời gian.
INSERT INTO alert_rules (id, name, room_id, device_id, metric, operator, threshold, severity, is_enabled, cooldown_seconds, created_by) VALUES
(1, 'Cảnh báo nhiệt độ cao Phòng A', 'room-a', 'esp32-a-01', 'TEMPERATURE', 'GT', 32.0, 'HIGH', TRUE, 180, 1),
(2, 'Cảnh báo nồng độ khí MQ-135 bất thường', 'room-a', 'esp32-a-01', 'MQ135_RAW', 'GT', 150.0, 'CRITICAL', TRUE, 300, 1)
ON DUPLICATE KEY UPDATE threshold = VALUES(threshold), is_enabled = VALUES(is_enabled);

