-- ============================================================================
-- ĐỒ ÁN: HỆ THỐNG IoT GIÁM SÁT VÀ CẢNH BÁO CHẤT LƯỢNG KHÔNG KHÍ TRONG PHÒNG
-- TỆP DDL SCHEMA: database/schema.sql
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. BẢNG PHÒNG / KHU VỰC LẮP ĐẶT (ROOMS)
DROP TABLE IF EXISTS rooms;
CREATE TABLE rooms (
    room_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN RBAC (USERS)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'OPERATOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    INDEX ix_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG THIẾT BỊ IoT & VÒNG ĐỜI (DEVICES)
DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
    device_id VARCHAR(64) NOT NULL,
    room_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    lifecycle ENUM(
        'REGISTERED',
        'PROVISIONED',
        'ACTIVE',
        'OFFLINE',
        'FAULT',
        'MAINTENANCE',
        'LOCKED',
        'DECOMMISSIONED'
    ) NOT NULL DEFAULT 'REGISTERED',
    firmware_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    credential_hash VARCHAR(255) NULL,
    mqtt_client_id VARCHAR(64) NULL,
    last_seen_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (device_id),
    UNIQUE KEY uq_devices_mqtt_client (mqtt_client_id),
    INDEX ix_devices_room_lifecycle (room_id, lifecycle),
    CONSTRAINT fk_devices_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG PHÂN QUYỀN PHẠM VI THIẾT BỊ (DEVICE_ASSIGNMENTS)
DROP TABLE IF EXISTS device_assignments;
CREATE TABLE device_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    device_id VARCHAR(64) NULL,
    room_id VARCHAR(64) NULL,
    permission ENUM('VIEW', 'CONTROL', 'MANAGE') NOT NULL DEFAULT 'VIEW',
    assigned_by BIGINT UNSIGNED NOT NULL,
    assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_assignment_user_device (user_id, device_id),
    UNIQUE KEY uq_assignment_user_room (user_id, room_id),
    INDEX ix_assignment_user (user_id),
    CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_assigner FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG TELEMETRY (DỮ LIỆU CẢM BIẾN CHUỖI THỜI GIAN)
DROP TABLE IF EXISTS telemetry;
CREATE TABLE telemetry (
    device_id VARCHAR(64) NOT NULL,
    boot_id CHAR(32) NOT NULL,
    seq BIGINT UNSIGNED NOT NULL,
    measured_at DATETIME(6) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    temperature_c DOUBLE NOT NULL,
    humidity_pct DOUBLE NOT NULL,
    mq135_adc_raw SMALLINT UNSIGNED NOT NULL,
    quality_level ENUM('GOOD', 'MODERATE', 'POOR', 'UNHEALTHY') NOT NULL DEFAULT 'GOOD',
    validation_status ENUM('VALID', 'INVALID', 'ANOMALY') NOT NULL DEFAULT 'VALID',
    PRIMARY KEY (device_id, boot_id, seq),
    INDEX ix_telemetry_device_measured (device_id, measured_at DESC),
    CONSTRAINT fk_telemetry_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG QUY TẮC CẢNH BÁO NGƯỠNG (ALERT_RULES)
DROP TABLE IF EXISTS alert_rules;
CREATE TABLE alert_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    room_id VARCHAR(64) NULL,
    device_id VARCHAR(64) NULL,
    metric ENUM('TEMPERATURE', 'HUMIDITY', 'MQ135_RAW') NOT NULL,
    operator ENUM('GT', 'GTE', 'LT', 'LTE', 'EQ') NOT NULL DEFAULT 'GT',
    threshold DOUBLE NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cooldown_seconds INT UNSIGNED NOT NULL DEFAULT 300,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX ix_alert_rules_metric_enabled (metric, is_enabled),
    CONSTRAINT fk_rules_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT fk_rules_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE,
    CONSTRAINT fk_rules_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG SỰ KIỆN CẢNH BÁO (ALERTS)
DROP TABLE IF EXISTS alerts;
CREATE TABLE alerts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    device_id VARCHAR(64) NOT NULL,
    rule_id BIGINT UNSIGNED NOT NULL,
    metric_value DOUBLE NOT NULL,
    status ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    triggered_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    acknowledged_by BIGINT UNSIGNED NULL,
    acknowledged_at DATETIME(6) NULL,
    resolved_by BIGINT UNSIGNED NULL,
    resolved_at DATETIME(6) NULL,
    resolution_notes TEXT NULL,
    PRIMARY KEY (id),
    INDEX ix_alerts_device_status (device_id, status),
    INDEX ix_alerts_status_triggered (status, triggered_at DESC),
    CONSTRAINT fk_alerts_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_rule FOREIGN KEY (rule_id) REFERENCES alert_rules (id) ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_acknowledger FOREIGN KEY (acknowledged_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG LỆNH ĐIỀU KHIỂN & ACK (COMMANDS)
DROP TABLE IF EXISTS commands;
CREATE TABLE commands (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    command_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    requested_by BIGINT UNSIGNED NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'SENT', 'ACKED', 'FAILED', 'TIMEOUT') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    sent_at DATETIME(6) NULL,
    ack_at DATETIME(6) NULL,
    timeout_at DATETIME(6) NOT NULL,
    result_payload JSON NULL,
    error_message VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_commands_command_id (command_id),
    INDEX ix_commands_device_status (device_id, status),
    INDEX ix_commands_status_timeout (status, timeout_at),
    CONSTRAINT fk_commands_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE RESTRICT,
    CONSTRAINT fk_commands_user FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. BẢNG NHẬT KÝ KIỂM TOÁN (AUDIT_LOGS - APPEND ONLY)
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_type ENUM('USER', 'DEVICE', 'SYSTEM') NOT NULL DEFAULT 'USER',
    actor_user_id BIGINT UNSIGNED NULL,
    actor_device_id VARCHAR(64) NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    result ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    ip_address VARCHAR(45) NULL,
    request_id VARCHAR(64) NULL,
    metadata JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX ix_audit_actor (actor_type, actor_user_id, created_at DESC),
    INDEX ix_audit_target (target_type, target_id, created_at DESC),
    CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

