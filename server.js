// ============================================================================
//  TEI201 - Avance #3 - Servidor API + Dashboard (version todo-en-uno)
//  ESP32 + MPU6050  ->  esta API  ->  PostgreSQL  ->  dashboard web
//
//  Todo esta en este unico archivo (conexion a la base, creacion de la tabla,
//  API y entrega del dashboard) para que sea facil de desplegar en Railway.
// ============================================================================
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Clave para que solo nuestro dispositivo pueda escribir (debe coincidir con el firmware)
const API_KEY = process.env.API_KEY || 'cambiar-esta-clave';
// Umbral de alerta de vibracion (m/s^2 RMS)
const ALERT_THRESHOLD = parseFloat(process.env.ALERT_THRESHOLD || '2.0');

// --- Conexion a PostgreSQL (Railway entrega DATABASE_URL automaticamente) ---
const connectionString = process.env.DATABASE_URL;
const needsSSL =
  process.env.PGSSL === '1' ||
  (connectionString && connectionString.includes('sslmode=require'));
const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});
pool.on('error', (err) => console.error('[DB] Error en el pool:', err.message));

// --- Crear la tabla si no existe (se ejecuta al arrancar) ---
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id             BIGSERIAL PRIMARY KEY,
      device_id      TEXT        NOT NULL,
      vibration_rms  REAL        NOT NULL,
      vibration_peak REAL,
      accel_x        REAL,
      accel_y        REAL,
      accel_z        REAL,
      sample_count   INTEGER,
      alert          BOOLEAN     DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings (created_at DESC);
  `);
  console.log('[DB] Tabla verificada/creada.');
}

app.use(express.json());

// --- Dashboard (sirve index.html que esta en la misma carpeta) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- POST: el ESP32 envia aqui cada lectura ---
app.post('/api/readings', async (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'API key invalida' });
  }
  const b = req.body || {};
  if (b.device_id == null || b.vibration_rms == null || isNaN(Number(b.vibration_rms))) {
    return res.status(400).json({ error: 'Faltan device_id y/o vibration_rms' });
  }
  const rms = Number(b.vibration_rms);
  const alert = rms > ALERT_THRESHOLD;
  try {
    const r = await pool.query(
      `INSERT INTO readings
         (device_id, vibration_rms, vibration_peak, accel_x, accel_y, accel_z, sample_count, alert)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        String(b.device_id), rms,
        b.vibration_peak != null ? Number(b.vibration_peak) : null,
        b.accel_x != null ? Number(b.accel_x) : null,
        b.accel_y != null ? Number(b.accel_y) : null,
        b.accel_z != null ? Number(b.accel_z) : null,
        b.sample_count != null ? parseInt(b.sample_count, 10) : null,
        alert,
      ]
    );
    res.status(201).json({ ok: true, id: r.rows[0].id, alert });
  } catch (err) {
    console.error('[API] Error guardando:', err.message);
    res.status(500).json({ error: 'Error al guardar en la base de datos' });
  }
});

// --- GET: historico para el dashboard ---
app.get('/api/readings', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
  try {
    const { rows } = await pool.query(
      `SELECT id, device_id, vibration_rms, vibration_peak, accel_x, accel_y, accel_z, alert, created_at
         FROM readings ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('[API] Error leyendo:', err.message);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// --- GET: recapitulacion de la ultima hora (para la tabla) ---
app.get('/api/history', async (req, res) => {
  const minutes = Math.min(parseInt(req.query.minutes, 10) || 60, 1440);
  try {
    const { rows } = await pool.query(
      `SELECT id, device_id, vibration_rms, vibration_peak, alert, created_at
         FROM readings
        WHERE created_at > NOW() - make_interval(mins => $1::int)
        ORDER BY created_at DESC
        LIMIT 1000`,
      [minutes]
    );
    res.json(rows);
  } catch (err) {
    console.error('[API] Error en history:', err.message);
    res.status(500).json({ error: 'Error al consultar el historico' });
  }
});

// --- GET: estadisticas / informacion util ---
app.get('/api/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) total, AVG(vibration_rms) promedio, MAX(vibration_rms) maximo,
              MIN(vibration_rms) minimo, COUNT(*) FILTER (WHERE alert) alertas
         FROM readings WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
    const last = await pool.query(
      `SELECT vibration_rms, alert, created_at FROM readings ORDER BY created_at DESC LIMIT 1`
    );
    const s = rows[0];
    const ultima = last.rows[0] || null;
    const actual = ultima ? Number(ultima.vibration_rms) : 0;
    res.json({
      umbral_alerta: ALERT_THRESHOLD,
      total_ultima_hora: Number(s.total),
      promedio: s.promedio != null ? Number(s.promedio) : 0,
      maximo: s.maximo != null ? Number(s.maximo) : 0,
      minimo: s.minimo != null ? Number(s.minimo) : 0,
      alertas_ultima_hora: Number(s.alertas),
      vibracion_actual: actual,
      estado: actual > ALERT_THRESHOLD ? 'ALERTA' : 'NORMAL',
      ultima_lectura: ultima ? ultima.created_at : null,
    });
  } catch (err) {
    console.error('[API] Error en stats:', err.message);
    res.status(500).json({ error: 'Error al calcular estadisticas' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- Arranque ---
(async () => {
  try { await initDb(); }
  catch (err) { console.error('[DB] No se pudo inicializar:', err.message); }
  app.listen(PORT, () => {
    console.log(`[Server] Escuchando en puerto ${PORT}`);
    console.log(`[Server] Umbral de alerta: ${ALERT_THRESHOLD} m/s^2 RMS`);
  });
})();
