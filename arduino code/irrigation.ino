#include <SoftwareSerial.h>
#include <WiFiEsp.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <TimeLib.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ====== WiFi & MQTT Config ======
char ssid[] = "YOUR_WIFI_SSID";      
char pass[] = "YOUR_WIFI_PASSWORD";  
char mqtt_server[] = "broker.hivemq.com";
int mqtt_port = 1883;

// ====== Topics ======
const char* sensorTopic  = "iotricity2_bladebreakers/irrigation/data";
const char* controlTopic = "iotricity2_bladebreakers/irrigation/control";

// ====== Hardware Pins ======
#define RELAY_PIN 8
#define SOIL_SENSOR1 A0
#define SOIL_SENSOR2 A1
#define DHTPIN 9
#define DHTTYPE DHT22

// ====== Globals ======
SoftwareSerial espSerial(2, 3); // RX, TX for ESP8266
WiFiEspClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastMsg = 0;

// ====== MQTT Callback (AI Prediction) ======
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT message on [");
  Serial.print(topic);
  Serial.println("]");

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Payload: " + message);

  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.f_str());
    return;
  }

  int duration = doc["duration"]; // in seconds
  Serial.print("Relay ON for ");
  Serial.print(duration);
  Serial.println(" seconds");

  // Relay ON (active LOW modules usually require LOW)
  digitalWrite(RELAY_PIN, LOW);
  delay(duration * 1000);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("Relay OFF");
}

// ====== MQTT Reconnect ======
void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ArduinoClient")) {
      Serial.println("connected");
      client.subscribe(controlTopic);
      Serial.print("Subscribed to: ");
      Serial.println(controlTopic);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retry in 5s");
      delay(5000);
    }
  }
}

// ====== Setup ======
void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // OFF initially for active LOW relay

  Serial.begin(9600);
  espSerial.begin(115200); // ESP8266 baud
  WiFi.init(&espSerial);

  if (WiFi.status() == WL_NO_SHIELD) {
    Serial.println("ESP8266 not found!");
    while (true);
  }

  Serial.print("Connecting to WiFi...");
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi!");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  dht.begin();

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0);
  lcd.print("Temp & Humidity");
}

// ====== Main Loop ======
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 10000) { // every 10s
    lastMsg = now;

    // Read sensors
    int sm1 = analogRead(SOIL_SENSOR1);
    int sm2 = analogRead(SOIL_SENSOR2);

    float m1 = map(sm1, 0, 1023, 0, 100);
    float m2 = map(sm2, 0, 1023, 0, 100);

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("Failed to read from DHT22!");
      return;
    }

    lcd.setCursor(0,0);
    lcd.print("Temp: ");
    lcd.print(temp);
    lcd.print((char)223); 
    lcd.print("C    ");   

    lcd.setCursor(0,1);
    lcd.print("Hum: ");
    lcd.print(hum);
    lcd.print(" %    ");

    // Build JSON
    DynamicJsonDocument doc(256);
    doc["Soil_Moisture_Shallow"] = m1;
    doc["Soil_Moisture_Deep"] = m2;
    if (!isnan(temp)) doc["Atmospheric_Temp"] = temp;
    if (!isnan(hum))  doc["Humidity"] = hum;
    doc["Hour"] = hour();   
    doc["Month"] = month();

    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    // Publish to MQTT
    client.publish(sensorTopic, buffer, n);
    Serial.print("Published: ");
    Serial.println(buffer);
  }
}
