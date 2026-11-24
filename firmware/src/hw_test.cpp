// Hardware bring-up test: DHT22 (GPIO4) + LED (GPIO25) + MQ-135 AO via divider (GPIO34).
// No Wi-Fi/MQTT. Build only with: pio run -e hwtest
#include <Arduino.h>
#include <DHT.h>

namespace {
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t LED_PIN = 25;
constexpr uint8_t MQ135_PIN = 34;          // ADC1; AO -> 20k -> GPIO34 -> 10k -> GND
constexpr float DIVIDER_RATIO = 3.0f;      // (20k + 10k) / 10k
constexpr uint32_t DHT_PERIOD_MS = 2500;  // DHT22 needs >= 2 s between reads
constexpr uint32_t LED_PERIOD_MS = 1000;

DHT dht(DHT_PIN, DHT22);
uint32_t lastDhtAt = 0;
uint32_t lastLedAt = 0;
bool ledOn = false;
uint32_t okCount = 0;
uint32_t failCount = 0;
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(MQ135_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(MQ135_PIN, ADC_11db);
  dht.begin();
  Serial.println();
  Serial.println("=== HW TEST: DHT22 GPIO4, LED GPIO25, MQ-135 GPIO34 ===");
  Serial.println("MQ-135 needs a few minutes of heater warm-up; early values drift.");
  Serial.println("LED should blink every 1 s; DHT22 is read every 2.5 s.");
}

void loop() {
  const uint32_t now = millis();

  if (now - lastLedAt >= LED_PERIOD_MS) {
    lastLedAt = now;
    ledOn = !ledOn;
    digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
  }

  if (now - lastDhtAt >= DHT_PERIOD_MS) {
    lastDhtAt = now;
    const float t = dht.readTemperature();
    const float h = dht.readHumidity();
    if (isnan(t) || isnan(h)) {
      ++failCount;
      Serial.printf("[DHT22] READ FAILED (ok=%lu, fail=%lu) - check +, OUT->GPIO4, -\n",
                    static_cast<unsigned long>(okCount),
                    static_cast<unsigned long>(failCount));
    } else {
      ++okCount;
      Serial.printf("[DHT22] temp=%.1f C  humidity=%.1f %%  (ok=%lu, fail=%lu)\n", t, h,
                    static_cast<unsigned long>(okCount),
                    static_cast<unsigned long>(failCount));
    }

    const int raw = analogRead(MQ135_PIN);
    const uint32_t pinMv = analogReadMilliVolts(MQ135_PIN);
    Serial.printf("[MQ135] raw=%d  gpio34=%lu mV  AO~%.2f V  (uptime %lu s)\n", raw,
                  static_cast<unsigned long>(pinMv), pinMv * DIVIDER_RATIO / 1000.0f,
                  static_cast<unsigned long>(now / 1000));
  }

  delay(10);
}
