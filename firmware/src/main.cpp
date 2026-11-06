#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("IoT starter: ESP32 room A (esp32-a-01)");
}

void loop() {
  // Add sensor acquisition and MQTT after checking the physical wiring.
  delay(1000);
}

