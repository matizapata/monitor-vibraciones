# Sistema IoT de Monitoreo de Vibraciones

Prototipo IoT que captura vibraciones con un sensor **MPU6050** conectado a un **ESP32**, las envía por WiFi a una **API en la nube (Railway)**, las almacena en **PostgreSQL** y las muestra en un **dashboard web en tiempo real** con estadísticas y alertas.

**Curso:** TEI201 – Taller de Diseño en Ingeniería · Universidad Adolfo Ibáñez
**Avance #3 – Prototipo IoT Completo**

**Dashboard en vivo:** https://monitor-vibraciones-production.up.railway.app

## Integrantes del equipo

- Rafael Muñoz
- Diego Perez
- Antonia Traslaviña
- Matias Zapata

## Problema que resuelve

En el Avance 1 identificamos que los postes de luz rurales sufren fallas estructurales por vibración excesiva (viento, paso de vehículos, fatiga del material) sin que nadie lo detecte a tiempo. Nuestro sistema mide la vibración de forma continua, la registra en una base de datos y genera una alerta cuando supera un umbral seguro, permitiendo un mantenimiento preventivo antes de que el poste falle.

## Ciclo de datos (captura → información → decisión)

1. **Captura:** el MPU6050 mide aceleración en 3 ejes a 200 Hz.
2. **Procesamiento en el dispositivo:** el ESP32 calcula el índice de vibración **RMS** (componente AC de la aceleración, sin gravedad) y el pico, y lo envía cada 5 segundos.
3. **Almacenamiento:** la API recibe el dato por HTTP POST y lo guarda en PostgreSQL (histórico persistente).
4. **Visualización:** el dashboard muestra la vibración en tiempo real e histórico, con una tabla de recapitulación de la última hora.
5. **Información para decisión:** se calculan promedio, máximo y número de alertas, y se marca el estado (NORMAL / ALERTA) cuando se supera el umbral configurado.

## Arquitectura

```
[ MPU6050 ] --I2C--> [ ESP32 ] --WiFi/HTTP POST--> [ API Node.js (Railway) ] --> [ PostgreSQL ]
                                                            |
                                                     [ Dashboard web ] <-- navegador
```

## Estructura del repositorio

```
monitor-vibraciones/
├── README.md             <- este archivo
├── FUENTES.md            <- declaración de librerías, código externo e IA (OBLIGATORIO)
├── main.ino              <- firmware del ESP32 (captura MPU6050 + envío WiFi)
├── server.js             <- backend todo-en-uno: API + conexión a PostgreSQL + dashboard
├── index.html            <- dashboard web en tiempo real (Chart.js)
├── package.json          <- dependencias del backend (express, pg)
├── simulate.js           <- simulador del ESP32 para probar sin hardware
├── protocolo_pruebas.md  <- protocolo de pruebas (Testing)
├── db.js                 <- conexión a PostgreSQL (versión modular, opcional)
└── init.js               <- creación de la tabla (versión modular, opcional)
```

> Nota: `server.js` es **todo-en-uno** (incluye la conexión a la base de datos y la creación de la tabla), y es el archivo que se despliega en Railway. `db.js` e `init.js` son una versión modular alternativa y no son necesarios para el despliegue.

## Componentes necesarios (hardware)

| Componente | Cantidad | Función |
|---|---|---|
| ESP32 DevKit | 1 | Microcontrolador con WiFi |
| MPU6050 | 1 | Acelerómetro/giroscopio (mide vibración) |
| Cables Dupont | 4 | Conexión I2C (VCC, GND, SDA, SCL) |
| Cable USB | 1 | Alimentación y carga del firmware |

Conexión I2C: `MPU6050 SDA→GPIO21`, `SCL→GPIO22`, `VCC→3V3`, `GND→GND`.

## Cómo replicar

### 1. Desplegar el backend (base de datos + API + dashboard)

En [Railway](https://railway.com): **New Project → Deploy from GitHub repo** y elige este repositorio. Luego:

1. **New → Database → PostgreSQL** para crear la base de datos.
2. En el servicio del backend, agrega la variable **`DATABASE_URL`** referenciando la del Postgres.
3. Agrega las variables **`API_KEY`** (clave secreta) y **`ALERT_THRESHOLD`** (umbral de alerta, ej. `3.0`).
4. **Settings → Networking → Generate Domain** para obtener la URL pública.

La tabla `readings` se crea sola la primera vez que arranca el servidor.

### 2. Cargar el firmware

1. Abre `main.ino` en Arduino IDE.
2. Instala las librerías: *Adafruit MPU6050*, *Adafruit Unified Sensor*, *ArduinoJson*.
3. Edita `WIFI_SSID`, `WIFI_PASSWORD`, `API_URL` (la URL de Railway + `/api/readings`) y `API_KEY`.
4. Selecciona la placa **ESP32 Dev Module** y sube el código.
5. Abre el Serial Monitor (115200 baud): deberías ver `[HTTP] Respuesta 201`.

### 3. Ver el dashboard

Abre la URL pública de Railway en el navegador. Verás la vibración en tiempo real, el histórico y la tabla de recapitulación.

## Información que genera el sistema

- **Vibración actual** y su clasificación (NORMAL / ALERTA).
- **Promedio, máximo y mínimo** de la última hora.
- **Conteo de alertas** cuando se supera el umbral (configurable con `ALERT_THRESHOLD`).
- **Tabla de recapitulación** de la última hora, con las lecturas que superaron el umbral marcadas en rojo.

Esto permite tomar decisiones de mantenimiento preventivo: si las alertas aumentan o el promedio sube, el poste monitoreado requiere intervención.

## Probar sin el hardware

Con el backend corriendo y conectado a una base PostgreSQL, el simulador envía lecturas falsas:

```bash
npm install
npm start                                          # terminal 1: levanta el servidor
API_KEY=tu-clave node simulate.js                  # terminal 2: simula el ESP32
```

Luego abre `http://localhost:3000`.
