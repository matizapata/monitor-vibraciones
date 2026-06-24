# Sistema IoT de Monitoreo de Vibraciones

Prototipo IoT que captura vibraciones con un sensor **MPU6050** conectado a un **ESP32**, las envía por WiFi a una **API en la nube (Railway)**, las almacena en **PostgreSQL** y las muestra en un **dashboard web en tiempo real** con estadísticas y alertas.

**Curso:** TEI201 – Taller de Diseño en Ingeniería · Universidad Adolfo Ibáñez
**Avance #3 – Prototipo IoT Completo**

## Integrantes del equipo

- Rafael Muñoz
- Diego Perez
- Antonia Traslaviña
- Matias Zapata

## Problema que resuelve

> En el Avance 1 identificamos que los postes de luz rurales sufren fallas estructurales por vibración excesiva (viento, paso de vehículos) sin que nadie lo detecte a tiempo. Nuestro sistema mide la vibración de forma continua, la registra y alerta cuando supera 0.70 m/s², permitiendo mantenimiento preventivo antes de una falla.

## Ciclo de datos (captura → información → decisión)

1. **Captura:** el MPU6050 mide aceleración en 3 ejes a 200 Hz.
2. **Procesamiento en el dispositivo:** el ESP32 calcula el índice de vibración **RMS** (componente AC de la aceleración, sin gravedad) y el pico, y lo envía cada 5 segundos.
3. **Almacenamiento:** la API recibe el dato por HTTP POST y lo guarda en PostgreSQL (histórico persistente).
4. **Visualización:** el dashboard muestra la vibración en tiempo real e histórico.
5. **Información para decisión:** se calculan promedio, máximo y número de alertas, y se marca el estado (NORMAL / ALERTA) cuando se supera el umbral configurado.

## Arquitectura

```
[ MPU6050 ] --I2C--> [ ESP32 ] --WiFi/HTTP POST--> [ API Node.js (Railway) ] --> [ PostgreSQL ]
                                                            |
                                                     [ Dashboard web ] <-- navegador
```

## Estructura del repositorio

```
proyecto-iot/
├── README.md
├── FUENTES.md            <- declaración de librerías, código externo e IA (OBLIGATORIO)
├── DEPLOY.md             <- guía paso a paso para desplegar en Railway
├── firmware/
│   └── main.ino          <- código del ESP32
├── backend/
│   ├── server.js         <- API + servidor del dashboard
│   ├── package.json
│   ├── simulate.js       <- simulador del ESP32 para pruebas
│   ├── db/
│   │   ├── schema.sql    <- esquema de la base de datos
│   │   ├── db.js         <- conexión a PostgreSQL
│   │   └── init.js       <- crea la tabla al arrancar
│   └── public/
│       └── index.html    <- dashboard (Chart.js)
├── hardware/             <- esquemático + BOM (completar)
├── diseno-3d/            <- archivos Fusion 360, renders y planos (completar)
├── testing/              <- protocolo de pruebas y resultados (completar)
└── docs/                 <- reporte final (completar)
```

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
Sigue la guía completa en **[DEPLOY.md](DEPLOY.md)**. En resumen: crear proyecto en Railway, agregar PostgreSQL, desplegar la carpeta `backend/`, configurar las variables `API_KEY` y `ALERT_THRESHOLD`.

### 2. Cargar el firmware
1. Abre `firmware/main.ino` en Arduino IDE.
2. Instala las librerías: *Adafruit MPU6050*, *Adafruit Unified Sensor*, *ArduinoJson*.
3. Edita `WIFI_SSID`, `WIFI_PASSWORD`, `API_URL` (la URL de tu app en Railway) y `API_KEY`.
4. Selecciona la placa **ESP32 Dev Module** y sube el código.
5. Abre el Serial Monitor (115200 baud) para ver las lecturas.

### 3. Ver el dashboard
Abre la URL pública de tu app en Railway (ej. `https://tu-app.up.railway.app`). Verás la vibración en tiempo real.

## Información que genera el sistema

- **Vibración actual** y su clasificación (NORMAL / ALERTA).
- **Promedio, máximo y mínimo** de la última hora.
- **Conteo de alertas** cuando se supera el umbral (configurable con `ALERT_THRESHOLD`).
- **Histórico graficado** para identificar tendencias y picos (ej. horarios de mayor vibración).

Esto permite tomar decisiones de mantenimiento preventivo: si las alertas aumentan o el promedio sube, el equipo monitoreado requiere intervención.

## Probar sin el hardware

Con el backend corriendo localmente puedes simular el ESP32:

```bash
cd backend
npm install
npm start                 # en una terminal
npm run simulate          # en otra terminal (envía datos falsos)
```

Luego abre `http://localhost:3000`.
