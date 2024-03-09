#include "credentials.h"
#include <OneWire.h> 
#include <DallasTemperature.h>
#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>

#define MIN_RSSI -80
#define MAX_RSSI -50
#define NUM_BARS 7
#define INTERVAL 60000

OneWire oneWire(2); 
DallasTemperature sensors(&oneWire);
WiFiSSLClient client;

unsigned long lastMillis = 0;

// This code reboots the Arduino if we're having trouble connecting to the Wi-Fi
void(* resetFunc) (void) = 0;

void setup()
{
  Serial.begin(9600);
  sensors.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (millis() - lastMillis > INTERVAL || lastMillis == 0) {
    lastMillis = millis();
    publishMessage();      
  }
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print(F("Connecting to "));
  Serial.print(WIFI_SSID);
  Serial.println("");

  Serial.print("Signal strength: ");
  Serial.println(rssiBars());

  int connectionAttempts = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(6000);
    Serial.print('.');
    connectionAttempts++;

    if (connectionAttempts > 10) {
      Serial.println("Rebooting...");
      Serial.println("");
      resetFunc();
    }
  }

  Serial.println('\n');
  Serial.println(F("Connection established!"));
  Serial.print(F("IP address:"));
  Serial.println(WiFi.localIP());
}

int rssiBars() {
  auto rssi = WiFi.RSSI();
  if (rssi <= MIN_RSSI) {
    return 0;
  } else if (rssi >= MAX_RSSI) {
    return NUM_BARS;
  } else {
    float inputRange = (MAX_RSSI - MIN_RSSI);
    float outputRange = (NUM_BARS - 1);
    return (int)( ((float)(rssi - MIN_RSSI) * outputRange / inputRange) + 0.5 );
  }
}

void publishMessage() {
  sensors.requestTemperatures();
  
  String postData = "{\"temperature\": " + String(sensors.getTempCByIndex(0)) + "}";

  Serial.println(postData);

  if (client.connectSSL(API_GATEWAY_ENDPOINT, API_GATEWAY_PORT)) {
    client.print("POST ");
    client.print(API_GATEWAY_PATH);
    client.println(" HTTP/1.1");
    client.print("Host: ");
    client.println(API_GATEWAY_ENDPOINT);
    client.println("User-Agent: Pool/1.0");
    client.println("Content-Type: application/json");
    client.print("x-api-key: ");
    client.println(API_KEY);
    client.println("Connection: close");
    client.print("Content-Length: ");
    client.println(postData.length());
    client.println();
    client.println(postData);
    client.println();

    if (client.connected()) {  
      while (client.available()) {
        char c = client.read();
        Serial.write(c);
      }
    }

    Serial.println("Closing connection.");
    client.flush();
    client.stop();
  } else {
    Serial.println("Could not send data");
  }
}

