// ============================================================================
//  TEI201 - Avance #3 - Servidor API + Dashboard
//  Sistema IoT de monitoreo de vibraciones (ESP32 + MPU6050 -> PostgreSQL)
//
//  Responsabilidades:
//    - Recibir las lecturas del ESP32     ->  POST /api/readings
//    - Entregar el historico al dashboard ->  GET  /api/readings
//    - Calcular informacion util (stats)  ->  GET  /api/stats
//    - Servir el dashboard web            ->  GET  /
// ============================================================================
const express = require('express');
const path = require('path');
const { pool } = require('./db/db');
const { initDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Clave simple para que solo nuestro dispositivo pueda escribir.
// Definir API_KEY como variable de entorno en Railway; debe coincidir con el firmware.
const API_KEY = process.env.API_KEY || 'cambiar-esta-clave';

// Umbral de alerta de vibracion (m/s^2 RMS). Configurable por variable de entorno.
const ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || '2.0');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
//  POST /api/readings  -> el ESP32 envia aqui cada lectura procesada
// ----------------------------------------------------------------------------
app.post('/api/readings', async (req, res) => {
  // Autenticacion minima por API key
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'API key invalida' });
  }

  const b = req.body || {};

  // Validacion basica: el dato principal debe venir y ser numerico
  if (b.device_id == null || b.vibration_rms == null || isNaN(Number(b.vibration_rms))) {
    return res.status(400).json({ error: 'Faltan campos: device_id y vibration_rms son obligatorios' });
  }

  // El servidor decide la alerta segun su propio umbral (fuente de verdad)
  const rms = Number(b.vibration_rms);
  const alert = rms > ALERT_THRESHOLD;

  try {
    const result = await pool.query(
      `INSERT INTO readings
         (device_id, vibration_rms, vibration_peak, accel_x, accel_y, accel_z, sample_count, alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        String(b.device_id),
        rms,
        b.vibration_peak != null ? Number(b.vibration_peak) : null,
        b.accel_x != null ? Number(b.accel_x) : null,
        b.accel_y != null ? Number(b.accel_y) : null,
        b.accel_z != null ? Number(b.accel_z) : null,
        b.sample_count != null ? parseInt(b.sample_count, 10) : null,
        alert,
      ]
    );
    res.status(201).json({ ok: true, id: result.rows[0].id, alert });
  } catch (err) {
    console.error('[API] Error guardando lectura:', err.message);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

// ----------------------------------------------------------------------------
//  GET /api/readings  -> historico para el dashboard
//  Parametros opcionales:  ?limit=200  &device_id=esp32-vibracion-01
// ----------------------------------------------------------------------------
app.get('/api/readings', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
  const deviceId = req.query.device_id;

  try {
    let rows;
    if (deviceId) {
      ({ rows } = await pool.query(
        `SELECT id, device_id, vibration_rms, vibration_peak,
                accel_x, accel_y, accel_z, alert, created_at
           FROM readings
          WHERE device_id = $1
          ORDER BY created_at DESC
          LIMIT $2`,
        [deviceId, limit]
      ));
    } else {
      ({ rows } = await pool.query(
        `SELECT id, device_id, vibration_rms, vibration_peak,
                accel_x, accel_y, accel_z, alert, created_at
           FROM readings
          ORDER BY created_at DESC
          LIMIT $1`,
        [limit]
      ));
    }
    // Devolver en orden cronologico (mas antiguo primero) para graficar
    res.json(rows.reverse());
  } catch (err) {
    console.error('[API] Error leyendo historico:', err.message);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// ----------------------------------------------------------------------------
//  GET /api/stats  -> INFORMACION UTIL generada a partir de los datos crudos
//  (estadisticas + estado + conteo de alertas en la ultima hora)
// ----------------------------------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
          COUNT(*)                                   AS total,
          AVG(vibration_rms)                         AS promedio,
          MAX(vibration_rms)                         AS maximo,
          MIN(vibration_rms)                         AS minimo,
          COUNT(*) FILTER (WHERE alert)              AS alertas
        FROM readings
        WHERE created_at > NOW() - INTERVAL '1 hour'`
    );

    // Ultima lectura (estado actual del sistema)
    const last = await pool.query(
      `SELECT vibration_rms, alert, created_at
         FROM readings
        ORDER BY created_at DESC
        LIMIT 1`
    );

    const s = rows[0];
    const ultima = last.rows[0] || null;
    const promedio = s.promedio != null ? Number(s.promedio) : 0;
    const actual = ultima ? Number(ultima.vibration_rms) : 0;

    res.json({
      umbral_alerta: ALERT_THRESHOLD,
      total_ultima_hora: Number(s.total),
      promedio,
      maximo: s.maximo != null ? Number(s.maximo) : 0,
      minimo: s.minimo != null ? Number(s.minimo) : 0,
      alertas_ultima_hora: Number(s.alertas),
      vibracion_actual: actual,
      estado: actual > ALERT_THRESHOLD ? 'ALERTA' : 'NORMAL',
      ultima_lectura: ultima ? ultima.created_at : null,
    });
  } catch (err) {
    console.error('[API] Error calculando stats:', err.message);
    res.status(500).json({ error: 'Error al calcular estadisticas' });
  }
});

// Endpoint de salud (util para verificar que el servicio esta vivo)
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ----------------------------------------------------------------------------
//  Arranque del servidor
// ----------------------------------------------------------------------------
async function start() {
  try {
    await initDb(); // crea la tabla si no existe
  } catch (err) {
    console.error('[DB] No se pudo inicializar el esquema:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`[Server] Escuchando en puerto ${PORT}`);
    console.log(`[Server] Umbral de alerta: ${ALERT_THRESHOLD} m/s^2 RMS`);
  });
}

start();
