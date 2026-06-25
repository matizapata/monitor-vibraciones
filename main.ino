/*
 * ============================================================================
 *  TEI201 - Avance #3 - Sistema IoT de Monitoreo de Vibraciones
 *  Firmware ESP32 + MPU6050
 * ============================================================================
 *
 *  CICLO DE DATOS:
 *    1. Captura: el MPU6050 mide aceleracion en 3 ejes (X, Y, Z) a alta
 *       frecuencia (200 Hz).
 *    2. Procesamiento: el ESP32 calcula el indice de vibracion RMS sobre una
 *       ventana de muestras (componente AC de la aceleracion, sin gravedad).
 *    3. Envio: cada SEND_INTERVAL_MS el ESP32 envia un JSON por WiFi (HTTP POST)
 *       a la API en Railway, que lo guarda en PostgreSQL.
 *
 *  POR QUE 200 Hz DE MUESTREO:
 *    Las vibraciones mecanicas relevantes (motores, estructuras) suelen estar
 *    bajo los 100 Hz. Por el teorema de Nyquist, muestreamos a >2x esa
 *    frecuencia (200 Hz) para capturarlas sin aliasing. Se promedia (RMS) y se
 *    envia 1 dato/segundo para no saturar la red ni la base de datos.
 *
 *  CONEXION MPU6050 (I2C):
 *    MPU6050 VCC -> ESP32 3V3
 *    MPU6050 GND -> ESP32 GND
 *    MPU6050 SDA -> ESP32 GPIO21
 *    MPU6050 SCL -> ESP32 GPIO22
 *
 *  LIBRERIAS NECESARIAS (Arduino IDE -> Library Manager):
 *    - Adafruit MPU6050
 *    - Adafruit Unified Sensor
 *    - ArduinoJson
 *  (WiFi.h y HTTPClient.h vienen incluidas en el core de ESP32)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <math.h>

// ----------------------------------------------------------------------------
// CONFIGURACION - EDITAR ESTOS VALORES
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "TU_RED_WIFI";          // Nombre de tu red WiFi
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";     // Password de tu red WiFi

// URL de tu API en Railway. Ejemplo: https://miproyecto.up.railway.app/api/readings
const char* API_URL    = "https://TU-APP.up.railway.app/api/readings";
const char* DEVICE_ID  = "esp32-vibracion-01";      // Identificador de este dispositivo
const char* API_KEY    = "cambiar-esta-clave";      // Debe coincidir con API_KEY del backend

// ----------------------------------------------------------------------------
// PARAMETROS DE MUESTREO
// ----------------------------------------------------------------------------
const uint16_t SAMPLE_RATE_HZ   = 200;   // Frecuencia de muestreo del sensor
const uint16_t SEND_INTERVAL_MS = 5000;  // Cada cuanto se envia un dato a la nube (5 s)
const float    GRAVITY          = 9.81;  // m/s^2, para aislar la vibracion (AC)

// Umbral de alerta local (m/s^2 RMS). El backend tambien evalua su propio umbral.
const float    VIBRATION_ALERT_THRESHOLD = 3.0;

Adafruit_MPU6050 mpu;

// Acumuladores para el calculo RMS dentro de la ventana de envio
double   sumSquares = 0.0;   // suma de (magnitud_AC)^2
uint32_t sampleCount = 0;    // numero de muestras en la ventana
float    peakVibration = 0;  // pico de vibracion en la ventana

uint32_t lastSampleMicros = 0;
uint32_t lastSendMillis   = 0;
const uint32_t SAMPLE_PERIOD_US = 1000000UL / SAMPLE_RATE_HZ;

// ----------------------------------------------------------------------------
// CONEXION / RECONEXION WIFI
// ----------------------------------------------------------------------------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WiFi] Conectando a ");
  Serial.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] Conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WiFi] Fallo la conexion. Se reintentara mas tarde.");
  }
}

// ----------------------------------------------------------------------------
// SETUP
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== TEI201 - Monitor de Vibraciones ESP32 + MPU6050 ===");

  // Iniciar I2C y sensor
  Wire.begin(21, 22);  // SDA=21, SCL=22
  if (!mpu.begin()) {
    Serial.println("[ERROR] No se encontro el MPU6050. Revisa el cableado I2C.");
    while (true) { delay(1000); }  // Detener: sin sensor no hay sistema
  }
  Serial.println("[MPU6050] Sensor inicializado.");

  // Rango +-8g: suficiente para vibraciones fuertes sin saturar
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_94_HZ);

  connectWiFi();

  lastSampleMicros = micros();
  lastSendMillis   = millis();
}

// ----------------------------------------------------------------------------
// LECTURA DE UNA MUESTRA Y ACUMULACION RMS
// ----------------------------------------------------------------------------
void sampleSensor() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Magnitud total del vector de aceleracion (incluye gravedad)
  float mag = sqrt(a.acceleration.x * a.acceleration.x +
                   a.acceleration.y * a.acceleration.y +
                   a.acceleration.z * a.acceleration.z);

  // Componente de vibracion = desviacion respecto a la gravedad (parte AC)
  float vibration = fabs(mag - GRAVITY);

  sumSquares += (double)vibration * vibration;
  sampleCount++;
  if (vibration > peakVibration) peakVibration = vibration;
}

// ----------------------------------------------------------------------------
// ENVIO DEL DATO PROCESADO A LA API
// ----------------------------------------------------------------------------
void sendReading() {
  if (sampleCount == 0) return;

  // RMS de la vibracion en la ventana
  float rms = sqrt(sumSquares / sampleCount);
  float peak = peakVibration;
  bool alerta = rms > VIBRATION_ALERT_THRESHOLD;

  // Tambien capturamos una lectura instantanea de los 3 ejes para referencia
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Imprimir en Serial Monitor (debugging / evidencia)
  Serial.printf("[DATO] RMS=%.3f  Peak=%.3f  Muestras=%lu  %s\n",
                rms, peak, (unsigned long)sampleCount,
                alerta ? "*** ALERTA ***" : "OK");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Sin conexion, se omite el envio. Reintentando...");
    connectWiFi();
  } else {
    // Construir JSON
    StaticJsonDocument<256> doc;
    doc["device_id"]      = DEVICE_ID;
    doc["vibration_rms"]  = rms;
    doc["vibration_peak"] = peak;
    doc["accel_x"]        = a.acceleration.x;
    doc["accel_y"]        = a.acceleration.y;
    doc["accel_z"]        = a.acceleration.z;
    doc["sample_count"]   = sampleCount;
    doc["alert"]          = alerta;

    String payload;
    serializeJson(doc, payload);

    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", API_KEY);

    int code = http.POST(payload);
    if (code > 0) {
      Serial.printf("[HTTP] Respuesta %d\n", code);
    } else {
      Serial.printf("[HTTP] Error en POST: %s\n", http.errorToString(code).c_str());
    }
    http.end();
  }

  // Reiniciar acumuladores para la siguiente ventana
  sumSquares    = 0.0;
  sampleCount   = 0;
  peakVibration = 0;
}

// ----------------------------------------------------------------------------
// LOOP PRINCIPAL
// ----------------------------------------------------------------------------
void loop() {
  uint32_t now = micros();

  // Muestreo a frecuencia fija (no bloqueante)
  if (now - lastSampleMicros >= SAMPLE_PERIOD_US) {
    lastSampleMicros = now;
    sampleSensor();
  }

  // Envio periodico del dato procesado
  if (millis() - lastSendMillis >= SEND_INTERVAL_MS) {
    lastSendMillis = millis();
    sendReading();
  }
}
