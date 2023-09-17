# IOT Pool Temperature Sensor and Web App

This project was inspired by my children, who kept asking to go outside to check if the pool was warm or not. Which prompted some questions:

1) How warm is warm enough for everyone?
2) How cold does the pool get in winter?
3) Why are you still asking me to check the pool? Just look at the app!

## AWS Infrastructure
The sensor is backed by AWS, which collects temperature readings and serves the web app. The CDK project includes:

- Route 53 hosted zones
- Cloudfront distribution
- S3 bucket
- API Gateway w/ read & write Lambda integrations
- RDS w/ MySQL

To install dependencies:
```bash
cd infrastructure
npm i
```

To deploy:
```bash
npm run deploy
```

To destroy:
```bash
npm run destroy
```

## Web App
The web app is a simple Gatsby site which pulls the latest temperature reading.

To install dependencies:

```bash
cd app
npm i
```

To run:

```bash
npm run develop
```

To build:

```bash
npm run build
```

## Arduino project
The code for the Arduino project is also included. You will need the following items for it to work:

- [Arduino Uno R3 (or similar)](https://core-electronics.com.au/arduino-uno-r3.html)
- [ProtoShield + Mini Breadboard for Arduino](https://core-electronics.com.au/protoshield-mini-breadboard-for-arduino.html
)
- [Temperature Sensor - Waterproof (DS18B20)](https://core-electronics.com.au/temperature-sensor-waterproof-ds18b20.html)
- [Flanged Weatherproof Enclosure With PG-7 Cable Glands](https://core-electronics.com.au/flanged-weatherproof-enclosure-with-pg-7-cable-glands.html)
- [5mm Pitch 2-Pin Screw Terminal Block](https://core-electronics.com.au/2-pin-screw-terminal-block-5mm-pitch.html)
- Wires


TODO:
- Fritzing diagram
- Add missing parts to README

To run:
```bash
cd arduino/iot-pool-temperature-sensor
cp credentials.h.example credentials.h
```

Update the credentials:
```c++
const char WIFI_SSID[] = "network";
const char WIFI_PASSWORD[] = "password";
const char API_GATEWAY_ENDPOINT[] = "api.{YOUR_DOMAIN}";
const int API_GATEWAY_PORT = 443;
const char API_KEY[] = "abc1234"; # Retrieve this value from Secrets Manager
```

Connect the Arduino to your computer and then deploy via the Arduino IDE.