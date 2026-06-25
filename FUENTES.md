# Declaración de Fuentes e IA

Este archivo declara las librerías, el código externo y el uso de inteligencia artificial en el proyecto, según el código de honor UAI y los requisitos del Avance #3.



---

## Librerías utilizadas

### Firmware (ESP32 / Arduino)

| Librería | Versión | Uso en el proyecto | Fuente |
|---|---|---|---|
| Adafruit MPU6050 | 2.2.x | Leer aceleración del sensor MPU6050 por I2C | https://github.com/adafruit/Adafruit_MPU6050 |
| Adafruit Unified Sensor | 1.1.x | Capa base requerida por la librería del MPU6050 | https://github.com/adafruit/Adafruit_Sensor |
| ArduinoJson | 6.21.x | Construir el JSON que se envía a la API | https://github.com/bblanchon/ArduinoJson |
| WiFi.h / HTTPClient.h | core ESP32 | Conexión WiFi y envío HTTP POST | Incluidas en el core de ESP32 (Espressif) |

### Backend (Node.js)

| Librería | Versión | Uso en el proyecto | Fuente |
|---|---|---|---|
| express | 4.19.x | Servidor HTTP: API REST y entrega del dashboard | https://github.com/expressjs/express |
| pg | 8.11.x | Cliente de PostgreSQL para guardar y consultar lecturas | https://github.com/brianc/node-postgres |

### Dashboard (frontend)

| Librería | Versión | Uso en el proyecto | Fuente |
|---|---|---|---|
| Chart.js | 4.4.1 | Gráficos en tiempo real de vibración y aceleración | https://github.com/chartjs/Chart.js |

---

## Código externo adaptado

> Declarar aquí cualquier fragmento copiado de tutoriales, StackOverflow o documentación. Ejemplo de cómo declararlo (ajustar a lo que usaron):

### Reconexión WiFi y POST HTTP (main.ino)
- Fuente: documentación oficial de ESP32 Arduino core y ejemplos de HTTPClient
  https://randomnerdtutorials.com/esp32-http-get-post-arduino/
- Adaptación: se integró el envío dentro de un ciclo de muestreo no bloqueante y se agregó reintento de conexión WiFi con contador máximo de intentos.

### Lectura del MPU6050 (main.ino)
- Fuente: ejemplo `basic_readings` de la librería Adafruit MPU6050.
- Adaptación: en lugar de imprimir los valores, se acumulan para calcular el RMS de la vibración sobre una ventana de muestras.

---

## Uso de Inteligencia Artificial

### Estructura base del proyecto (firmware, backend, dashboard)
- **Herramienta:** Claude (Anthropic), junio 2026.
- **Uso:** generación de la estructura inicial del firmware, la API en Express, el esquema de PostgreSQL y el dashboard con Chart.js a partir de la especificación del equipo (sensor MPU6050, envío por HTTP POST, despliegue en Railway).
- **Comprensión del equipo:** el sistema sigue el ciclo captura → procesamiento → almacenamiento → visualización. El firmware muestrea a 200 Hz y envía el RMS cada 5 s; el backend valida, calcula el estado de alerta y guarda en la tabla `readings`; el dashboard consulta `/api/readings`, `/api/stats` y `/api/history` (recapitulación de la última hora) cada 5 s.

### Cálculo del índice de vibración RMS (main.ino)
- **Herramienta:** Claude (Anthropic), junio 2026.
- **Qué hace:** para cada muestra calcula la magnitud del vector de aceleración `sqrt(x²+y²+z²)`, le resta la gravedad (9.81) para aislar la componente de vibración, y promedia el cuadrado de esos valores para obtener el RMS de la ventana.
- **Adaptación / decisión de diseño:** se eligió RMS (y no el promedio simple) porque representa mejor la energía de la vibración; se separó la gravedad para que en reposo el índice sea ~0.

### Cálculo de estadísticas y alertas (server.js)
- **Herramienta:** Claude (Anthropic), junio 2026.
- **Qué hace:** una consulta SQL agrega promedio, máximo, mínimo y conteo de alertas de la última hora; el servidor compara la última lectura contra `ALERT_THRESHOLD` para definir el estado NORMAL/ALERTA.
- **Comprensión:** el equipo probó la lógica con datos conocidos y verificó que el promedio, el máximo y el conteo de alertas coinciden con el cálculo manual.

### Renderizado 3D del encapsulado
- **Herramienta:** Vizcom (herramienta de IA para renderizado/diseño industrial), junio 2026.
- **Uso:** se generó el renderizado 3D del encapsulado a partir del diseño realizado por el equipo.
- **Comprensión / adaptación:** el equipo definió la forma, las dimensiones y la disposición de los componentes; Vizcom se usó para producir la visualización/render del modelo. Los planos y el modelado se trabajaron en Fusion 360.

> **Pendiente del equipo:** si modifican prompts, parámetros (umbral, frecuencia) o agregan funciones, agréguenlo aquí con la misma estructura: herramienta, qué hace, adaptación y comprensión.
