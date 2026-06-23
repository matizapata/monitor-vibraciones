// ============================================================================
//  Simulador del ESP32 (para probar la API sin el hardware fisico).
//  Envia lecturas de vibracion aleatorias a /api/readings cada segundo.
//
//  Uso:
//    API_KEY=cambiar-esta-clave API_URL=http://localhost:3000/api/readings node simulate.js
// ============================================================================
const API_URL = process.env.API_URL || 'http://localhost:3000/api/readings';
const API_KEY = process.env.API_KEY || 'cambiar-esta-clave';

let t = 0;

async function sendOne() {
  // Vibracion base baja + picos ocasionales para disparar alertas
  const base = 0.4 + Math.random() * 0.4;
  const spike = Math.random() < 0.2 ? Math.random() * 3.5 : 0;
  const rms = base + spike;

  const payload = {
    device_id: 'esp32-sim-01',
    vibration_rms: Number(rms.toFixed(3)),
    vibration_peak: Number((rms * (1.5 + Math.random())).toFixed(3)),
    accel_x: Number((Math.sin(t) + (Math.random() - 0.5)).toFixed(3)),
    accel_y: Number((Math.cos(t) + (Math.random() - 0.5)).toFixed(3)),
    accel_z: Number((9.81 + (Math.random() - 0.5)).toFixed(3)),
    sample_count: 200,
    alert: false,
  };
  t += 0.3;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`enviado rms=${payload.vibration_rms}  ->  ${res.status}`, data);
  } catch (err) {
    console.error('error enviando:', err.message);
  }
}

console.log(`Simulando ESP32 -> ${API_URL}`);
sendOne();
setInterval(sendOne, 1000);
