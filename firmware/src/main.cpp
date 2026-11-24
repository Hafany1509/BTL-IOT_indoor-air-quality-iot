#include <Arduino.h>
#include <WiFi.h>
#include <DHT.h>
#include <AsyncMqttClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <esp_system.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.h.example"  // Placeholders let CI compile; copy secrets.h before flashing.
#endif

#ifndef RELAY_ACTIVE_LOW
#define RELAY_ACTIVE_LOW 1
#endif

namespace {
constexpr char ROOM_ID[] = "room-a";
constexpr char DEVICE_ID[] = "esp32-a-01";
constexpr char FIRMWARE_VERSION[] = "1.0.0";

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t MQ135_ADC_PIN = 34;
constexpr uint8_t RELAY_PIN = 26;
constexpr uint8_t LED_PIN = 25;
constexpr uint8_t DHT_TYPE = DHT22;

constexpr uint32_t DEFAULT_TELEMETRY_INTERVAL_MS = 10'000;
constexpr uint32_t MIN_TELEMETRY_INTERVAL_MS = 2'000;
constexpr uint32_t MAX_TELEMETRY_INTERVAL_MS = 300'000;
constexpr uint32_t HEARTBEAT_INTERVAL_MS = 30'000;
// MQ-135 reads abnormally high while its heater is still cold (measured: 234 at boot,
// back to baseline after ~1 min), which raised false CRITICAL alerts. The backend
// telemetry contract requires mq135_adc_raw, so telemetry is held until warm-up ends.
constexpr uint32_t MQ135_WARMUP_MS = 120'000;
constexpr uint32_t RETRY_INTERVAL_MS = 5'000;
constexpr size_t RECENT_COMMAND_COUNT = 16;

char bootId[33] = {};
uint32_t sequenceNumber = 0;
uint32_t lastTelemetryAt = 0;
uint32_t lastHeartbeatAt = 0;
uint32_t lastMqttAttemptAt = 0;
uint32_t lastWifiAttemptAt = 0;
bool fanIsOn = false;
bool ledIsOn = false;
volatile bool mqttIsConnected = false;
volatile uint32_t telemetryIntervalMs = DEFAULT_TELEMETRY_INTERVAL_MS;

String recentCommandIds[RECENT_COMMAND_COUNT];
size_t nextRecentCommand = 0;

DHT dht(DHT_PIN, DHT_TYPE);
AsyncMqttClient mqtt;

String topic(const char* kind) {
  return String("home/") + ROOM_ID + "/" + DEVICE_ID + "/" + kind;
}

bool utcTimestamp(char* output, size_t outputSize) {
  const time_t now = time(nullptr);
  if (now < 1'700'000'000) {
    return false;
  }

  struct tm utc {};
  if (gmtime_r(&now, &utc) == nullptr) {
    return false;
  }
  return strftime(output, outputSize, "%Y-%m-%dT%H:%M:%SZ", &utc) > 0;
}

void setFan(bool enabled) {
  fanIsOn = enabled;
  const uint8_t level = (enabled ^ static_cast<bool>(RELAY_ACTIVE_LOW)) ? HIGH : LOW;
  digitalWrite(RELAY_PIN, level);
}

void setLed(bool enabled) {
  ledIsOn = enabled;
  digitalWrite(LED_PIN, enabled ? HIGH : LOW);
}

bool rememberCommand(const String& commandId) {
  for (const String& remembered : recentCommandIds) {
    if (remembered == commandId) {
      return false;
    }
  }
  recentCommandIds[nextRecentCommand] = commandId;
  nextRecentCommand = (nextRecentCommand + 1) % RECENT_COMMAND_COUNT;
  return true;
}

void publishAck(const String& commandId, const char* result,
                const char* reason = nullptr, const char* action = nullptr) {
  if (!mqttIsConnected || commandId.isEmpty()) {
    return;
  }

  char timestamp[25];
  JsonDocument document;
  document["command_id"] = commandId;
  document["result"] = result;
  document["fan_state"] = fanIsOn ? "ON" : "OFF";
  document["led_state"] = ledIsOn ? "ON" : "OFF";
  document["sampling_interval_seconds"] = telemetryIntervalMs / 1000;
  if (action != nullptr) {
    document["action"] = action;
  }
  if (reason != nullptr) {
    document["reason"] = reason;
  }
  if (utcTimestamp(timestamp, sizeof(timestamp))) {
    document["ts"] = timestamp;
  }

  String payload;
  serializeJson(document, payload);
  const String ackTopic = topic("ack");
  mqtt.publish(ackTopic.c_str(), 1, false, payload.c_str(), payload.length());
}

void onMqttMessage(char* incomingTopic, char* payload,
                   AsyncMqttClientMessageProperties properties,
                   size_t length, size_t index, size_t total) {
  (void)properties;

  if (index != 0 || length != total) {
    Serial.println("Rejected fragmented MQTT command");
    return;
  }

  JsonDocument command;
  const DeserializationError error = deserializeJson(command, payload, length);
  if (error) {
    Serial.printf("Rejected invalid command JSON: %s\n", error.c_str());
    return;
  }

  const String commandId = command["command_id"] | "";
  const char* action = command["action"] | "";
  const JsonVariantConst value = command["value"];
  if (commandId.isEmpty()) {
    Serial.println("Rejected command without command_id");
    return;
  }

  const String expectedCommandTopic = topic("command");
  const String expectedConfigTopic = topic("config");
  const String receivedTopic(incomingTopic);
  if (receivedTopic != expectedCommandTopic && receivedTopic != expectedConfigTopic) {
    publishAck(commandId, "REJECTED", "wrong_topic", action);
    return;
  }

  const bool fanCommand = strcmp(action, "FAN_SET") == 0;
  const bool ledCommand = strcmp(action, "LED_SET") == 0;
  const bool intervalCommand = strcmp(action, "SAMPLING_INTERVAL_SET") == 0;
  const char* stateValue = value.is<const char*>() ? value.as<const char*>() : "";
  const bool validState = strcmp(stateValue, "ON") == 0 || strcmp(stateValue, "OFF") == 0;
  const long intervalSeconds = value.is<long>() ? value.as<long>() : -1;
  const bool validInterval = intervalSeconds >= MIN_TELEMETRY_INTERVAL_MS / 1000 &&
                             intervalSeconds <= MAX_TELEMETRY_INTERVAL_MS / 1000;
  if ((fanCommand || ledCommand) && !validState) {
    publishAck(commandId, "REJECTED", "unsupported_action_or_value", action);
    return;
  }
  if (intervalCommand && !validInterval) {
    publishAck(commandId, "REJECTED", "sampling_interval_out_of_range", action);
    return;
  }
  if (!fanCommand && !ledCommand && !intervalCommand) {
    publishAck(commandId, "REJECTED", "unsupported_action_or_value", action);
    return;
  }

  if (rememberCommand(commandId)) {
    if (intervalCommand) {
      telemetryIntervalMs = static_cast<uint32_t>(intervalSeconds) * 1000;
    } else {
      const bool enabled = strcmp(stateValue, "ON") == 0;
      if (fanCommand) {
        setFan(enabled);
      } else {
        setLed(enabled);
      }
    }
  }

  publishAck(commandId, "OK", nullptr, action);
}

void publishStatus();

void onMqttConnect(bool sessionPresent) {
  (void)sessionPresent;
  mqttIsConnected = true;

  const String commandTopic = topic("command");
  const String configTopic = topic("config");
  mqtt.subscribe(commandTopic.c_str(), 1);
  mqtt.subscribe(configTopic.c_str(), 1);

  publishStatus();
  lastHeartbeatAt = millis();
  Serial.println("MQTT connected; subscribed to command topic");
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  (void)reason;
  mqttIsConnected = false;
  Serial.println("MQTT disconnected");
}

void beginMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setClientId(DEVICE_ID);
  mqtt.setCredentials(MQTT_USER, MQTT_PASSWORD);
  mqtt.setKeepAlive(30);
  mqtt.setCleanSession(true);

  // AsyncMqttClient keeps only the pointer, so the will topic must outlive this function.
  static char willTopic[96];
  snprintf(willTopic, sizeof(willTopic), "home/%s/%s/status", ROOM_ID, DEVICE_ID);
  static constexpr char offlinePayload[] = R"({"state":"offline"})";
  mqtt.setWill(willTopic, 1, true, offlinePayload, sizeof(offlinePayload) - 1);

  mqtt.onConnect(onMqttConnect);
  mqtt.onDisconnect(onMqttDisconnect);
  mqtt.onMessage(onMqttMessage);
}

void publishStatus() {
  if (!mqttIsConnected) {
    return;
  }

  char timestamp[25];
  JsonDocument document;
  document["state"] = "online";
  document["firmware_version"] = FIRMWARE_VERSION;
  document["uptime_seconds"] = millis() / 1000;
  document["sampling_interval_seconds"] = telemetryIntervalMs / 1000;
  document["mq135_warming_up"] = millis() < MQ135_WARMUP_MS;
  if (utcTimestamp(timestamp, sizeof(timestamp))) {
    document["ts"] = timestamp;
  }

  String payload;
  serializeJson(document, payload);
  const String statusTopic = topic("status");
  mqtt.publish(statusTopic.c_str(), 1, true, payload.c_str(), payload.length());
}

void publishTelemetry() {
  if (!mqttIsConnected) {
    return;
  }

  const uint32_t uptimeMs = millis();
  if (uptimeMs < MQ135_WARMUP_MS) {
    Serial.printf("MQ-135 warming up; telemetry held (%lu s left)\n",
                  static_cast<unsigned long>((MQ135_WARMUP_MS - uptimeMs) / 1000));
    return;
  }

  const float temperatureC = dht.readTemperature();
  const float humidityPct = dht.readHumidity();
  if (isnan(temperatureC) || isnan(humidityPct)) {
    Serial.println("DHT22 read failed; telemetry sample skipped");
    return;
  }

  char timestamp[25];
  if (!utcTimestamp(timestamp, sizeof(timestamp))) {
    Serial.println("NTP time is not ready; telemetry sample skipped");
    return;
  }

  JsonDocument document;
  document["schema_version"] = 1;
  document["device_id"] = DEVICE_ID;
  document["boot_id"] = bootId;
  document["seq"] = sequenceNumber;
  document["ts"] = timestamp;
  document["temperature_c"] = temperatureC;
  document["humidity_pct"] = humidityPct;
  document["mq135_adc_raw"] = analogRead(MQ135_ADC_PIN);

  String payload;
  serializeJson(document, payload);
  const String telemetryTopic = topic("telemetry");
  const uint16_t packetId = mqtt.publish(
      telemetryTopic.c_str(), 1, false, payload.c_str(), payload.length());

  if (packetId == 0) {
    Serial.println("MQTT did not queue telemetry publish");
    return;
  }

  Serial.printf("Queued telemetry seq=%lu, temp=%.1f C, humidity=%.1f%%\n",
                static_cast<unsigned long>(sequenceNumber),
                temperatureC, humidityPct);
  ++sequenceNumber;
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(100);

  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
  digitalWrite(LED_PIN, LOW);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  setFan(false);
  setLed(false);

  pinMode(MQ135_ADC_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(MQ135_ADC_PIN, ADC_11db);

  dht.begin();
  snprintf(bootId, sizeof(bootId), "%08lx%08lx%08lx%08lx",
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()));

  beginMqtt();
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  configTime(0, 0, "pool.ntp.org", "time.google.com");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptAt = millis();
  Serial.printf("Starting node %s in %s\n", DEVICE_ID, ROOM_ID);
}

void loop() {
  const uint32_t now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    mqttIsConnected = false;
    if (now - lastWifiAttemptAt >= 10'000) {
      Serial.println("Retrying Wi-Fi connection");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      lastWifiAttemptAt = now;
    }
    delay(20);
    return;
  }

  if (!mqttIsConnected && now - lastMqttAttemptAt >= RETRY_INTERVAL_MS) {
    mqtt.connect();
    lastMqttAttemptAt = now;
  }

  if (!mqttIsConnected) {
    delay(20);
    return;
  }

  if (now - lastTelemetryAt >= telemetryIntervalMs) {
    lastTelemetryAt = now;
    publishTelemetry();
  }

  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    publishStatus();
  }

  delay(10);
}
