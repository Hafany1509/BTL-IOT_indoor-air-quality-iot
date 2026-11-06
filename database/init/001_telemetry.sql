CREATE TABLE devices (
    device_id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    lifecycle ENUM('REGISTERED','PROVISIONED','ACTIVE','MAINTENANCE','DECOMMISSIONED') NOT NULL
);

CREATE TABLE telemetry (
    device_id VARCHAR(64) NOT NULL,
    boot_id CHAR(32) NOT NULL,
    seq BIGINT UNSIGNED NOT NULL,
    measured_at DATETIME(6) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    temperature_c DOUBLE NOT NULL,
    humidity_pct DOUBLE NOT NULL,
    mq135_adc_raw SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (device_id, boot_id, seq),
    INDEX ix_telemetry_device_measured (device_id, measured_at),
    CONSTRAINT fk_telemetry_device FOREIGN KEY (device_id) REFERENCES devices (device_id)
);

INSERT INTO devices (device_id, room_id, display_name, lifecycle) VALUES
    ('esp32-a-01', 'room-a', 'ESP32 Room A', 'ACTIVE'),
    ('sim-b-01', 'room-b', 'Simulator Room B', 'ACTIVE');

