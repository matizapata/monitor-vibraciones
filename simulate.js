# Guía de despliegue — Railway (con alternativa Aiven)

Esta guía despliega la base de datos PostgreSQL + la API + el dashboard. El ESP32 luego envía datos a esa URL.

---

## Opción A — Railway (recomendada: base de datos y API en un solo lugar)

### Paso 1. Subir el proyecto a GitHub
Sube toda la carpeta `proyecto-iot/` a un repositorio de GitHub (el backend debe quedar en la subcarpeta `backend/`).

### Paso 2. Crear el proyecto en Railway
1. Entra a https://railway.com e inicia sesión con GitHub.
2. **New Project → Deploy from GitHub repo** y elige tu repositorio.
3. En la configuración del servicio, fija el **Root Directory** en `backend` (porque el `package.json` está ahí).
   - Railway detecta Node.js y ejecuta `npm install` y luego `npm start` automáticamente.

### Paso 3. Agregar la base de datos PostgreSQL
1. Dentro del proyecto: **New → Database → Add PostgreSQL**.
2. Railway crea la base de datos y una variable `DATABASE_URL`.
3. Conéctala al servicio del backend: en el servicio Node, ve a **Variables → Add Reference → DATABASE_URL** (del plugin Postgres). Así el backend la lee automáticamente.

> La tabla `readings` se crea sola la primera vez que arranca el servidor (lo hace `db/init.js`).

### Paso 4. Configurar variables de entorno del backend
En el servicio Node → **Variables**, agrega:

| Variable | Valor | Para qué |
|---|---|---|
| `API_KEY` | una clave secreta tuya | Debe coincidir con `API_KEY` del firmware |
| `ALERT_THRESHOLD` | `2.0` | Umbral de vibración (m/s² RMS) para alertas |

(`DATABASE_URL` ya quedó referenciada en el Paso 3. `PORT` la entrega Railway sola.)

### Paso 5. Obtener la URL pública
1. En el servicio Node → **Settings → Networking → Generate Domain**.
2. Obtendrás algo como `https://tu-app.up.railway.app`.
3. El dashboard está en esa raíz. La API de datos está en `https://tu-app.up.railway.app/api/readings`.

### Paso 6. Conectar el ESP32
En `firmware/main.ino` edita:
```cpp
const char* API_URL = "https://tu-app.up.railway.app/api/readings";
const char* API_KEY = "la-misma-clave-que-pusiste-en-Railway";
```
Sube el firmware y abre el Serial Monitor: deberías ver `[HTTP] Respuesta 201`.

---

## Opción B — Aiven (solo base de datos)

Aiven entrega PostgreSQL gestionado, pero **no aloja el backend Node**. Si usas Aiven necesitas correr el backend en otro lado (tu PC, Render, etc.).

1. Crea una cuenta en https://aiven.io y un servicio **PostgreSQL** (plan free).
2. Copia el **Service URI** (empieza con `postgres://...?sslmode=require`).
3. En donde corras el backend, define la variable:
   ```bash
   export DATABASE_URL="postgres://avnadmin:...@...aivencloud.com:12345/defaultdb?sslmode=require"
   export API_KEY="tu-clave"
   npm install && npm start
   ```
   El código activa SSL automáticamente cuando la URL contiene `sslmode=require`.

> **Recomendación:** para la demo en vivo del Avance #3 (todo accesible por URL pública), Railway es más simple porque deja la base de datos, la API y el dashboard juntos y con una sola URL.

---

## Verificación rápida

Con el servicio arriba, prueba la API:

```bash
# salud
curl https://tu-app.up.railway.app/api/health

# enviar una lectura de prueba
curl -X POST https://tu-app.up.railway.app/api/readings \
  -H "Content-Type: application/json" \
  -H "x-api-key: TU_API_KEY" \
  -d '{"device_id":"prueba","vibration_rms":0.7,"accel_x":0,"accel_y":0,"accel_z":9.8}'

# ver el histórico
curl https://tu-app.up.railway.app/api/readings
```

Luego abre la URL en el navegador para ver el dashboard actualizándose.
