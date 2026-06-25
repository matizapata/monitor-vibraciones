# Protocolo de Pruebas y Validación

**Proyecto:** Sistema IoT de Monitoreo de Vibraciones — ESP32 + MPU6050
**Curso:** TEI201 · Avance #3 · Universidad Adolfo Ibáñez
**Equipo:** Rafael Muñoz, Diego Perez, Antonia Traslaviña, Matias Zapata

---

## 1. Objetivo

Verificar que el sistema captura vibración de forma continua y confiable, la almacena de manera persistente, la visualiza en el dashboard y genera alertas cuando supera el umbral configurado, demostrando que responde al problema del Avance 1 (detección temprana de fallas por vibración en postes de luz rurales).

## 2. Condiciones de prueba

| Parámetro | Valor |
|---|---|
| Dispositivo | ESP32 DevKit + sensor MPU6050 (I2C) |
| Frecuencia de muestreo del sensor | 200 Hz |
| Intervalo de envío/registro | cada 5 segundos (RMS de la ventana) |
| Umbral de alerta configurado | 3.0 m/s² RMS (variable `ALERT_THRESHOLD`) |
| Backend / base de datos | API Node.js + PostgreSQL en Railway |
| Conectividad | WiFi 2.4 GHz |
| Dashboard | https://monitor-vibraciones-production.up.railway.app |

## 3. Procedimiento paso a paso

1. Alimentar el ESP32 y verificar en el Serial Monitor (115200 baud) la conexión WiFi y la inicialización del MPU6050.
2. Confirmar que las lecturas llegan a la API: el Serial Monitor debe mostrar `[HTTP] Respuesta 201`.
3. **Prueba A — Reposo:** dejar el sensor inmóvil sobre una superficie estable durante 60 s y registrar el RMS base.
4. **Prueba B — Vibración controlada:** aplicar vibración al sensor (golpear la superficie / motor / sacudida) y registrar el RMS y el pico.
5. **Prueba C — Alerta:** aumentar la vibración hasta superar el umbral (3.0 m/s²) y verificar que el estado cambia a ALERTA (banner rojo, fila roja en la tabla, contador de alertas +1).
6. **Prueba D — Persistencia:** recargar el dashboard y reiniciar el dispositivo; confirmar que el histórico de la última hora se mantiene en la base de datos.

## 4. Criterios de éxito

- RMS en reposo < 0.2 m/s².
- Al aplicar vibración, el RMS aumenta de forma clara y proporcional.
- Al superar 3.0 m/s², el sistema marca ALERTA e incrementa el contador.
- Los datos persisten tras reiniciar el dispositivo (siguen en el histórico).
- Tasa de éxito de envío (respuestas HTTP 201) ≥ 95 %.

## 5. Resultados (cuantitativos)

Datos reales extraídos de la base de datos del sistema (más de **1.270 lecturas** registradas a lo largo de varios días):

| Prueba | Métrica | Resultado esperado | Resultado obtenido (real) | Cumple |
|---|---|---|---|---|
| A — Reposo | RMS base | < 0.2 m/s² | **0.03 – 0.06 m/s²** | ✅ |
| B — Vibración manual | RMS | aumenta sobre el reposo | **0.17 – 0.79 m/s²** (picos hasta 2.1) | ✅ |
| C — Vibración fuerte | RMS → ALERTA | supera el umbral → `alert=true` | **RMS 7.69 m/s², pico 84.8 m/s², `alert=true`** (registro #1213, 22:46:51) | ✅ |
| D — Persistencia | histórico se mantiene | sí | **>1.270 lecturas** guardadas en distintos días/sesiones | ✅ |
| Envío | Tasa de éxito HTTP 201 | ≥ 95 % | **100 %** (tras configurar WiFi y URL) | ✅ |
| Latencia | dato → dashboard | ≤ 6 s | **~5 s** (intervalo de envío) | ✅ |

**Interpretación:** existe una separación clara y proporcional entre el reposo (~0.05 m/s²), la vibración manual leve (~0.2–0.8 m/s²) y un evento de vibración fuerte (7.69 m/s²) que disparó correctamente la alerta. Esto demuestra que el sistema distingue niveles de vibración y reacciona ante eventos anómalos.

**Evidencia a adjuntar (capturas):** dashboard en estado NORMAL, dashboard en estado ALERTA con la fila roja del evento de 7.69 m/s², Serial Monitor con `[HTTP] Respuesta 201`, y la tabla de recapitulación de la última hora.

## 6. Análisis de fallas encontradas y soluciones

Durante el desarrollo y las pruebas se encontraron y resolvieron las siguientes fallas reales:

| # | Falla observada | Causa raíz | Solución aplicada |
|---|---|---|---|
| 1 | El ESP32 no se conectaba al WiFi (`[WiFi] Fallo la conexion`) | Las credenciales eran las de ejemplo y el hotspot del iPhone emitía en 5 GHz (el ESP32 solo opera en 2.4 GHz) | Se escribieron el SSID y la contraseña reales y se activó "Maximizar compatibilidad" en el hotspot para forzar 2.4 GHz |
| 2 | La API respondía `HTTP 404` aunque el dato salía del ESP32 | La aplicación aún no estaba desplegada y el firmware apuntaba a una URL de ejemplo | Se desplegó el backend + PostgreSQL en Railway y se puso la URL real (`…/api/readings`) en el firmware. La respuesta pasó a `201` |
| 3 | Riesgo de rechazo `HTTP 401` por la clave API | La clave contenía el carácter `ñ`, que se codifica distinto entre el ESP32 y el servidor | Se cambió la `API_KEY` a solo letras y números (ASCII) en Railway y en el firmware |
| 4 | Error "no upload port provided" al subir el código | No había puerto COM seleccionado / faltaba el driver USB-serial | Se seleccionó el puerto en *Herramientas → Puerto* y se cerró el Serial Monitor durante la carga |

Estas fallas confirman la robustez del diseño final: el firmware incluye reconexión WiFi automática y el backend valida cada dato y responde con códigos claros (201 / 400 / 401), lo que facilitó el diagnóstico.

## 7. Validación contra el problema (Avance 1)

En el Avance 1 identificamos que los **postes de luz rurales** pueden sufrir fallas estructurales por vibración excesiva (viento, paso de vehículos, fatiga del material) sin que nadie lo detecte a tiempo.

Las pruebas demuestran que el sistema responde directamente a ese problema:

- **Detecta el fenómeno:** el RMS distingue claramente el reposo (~0.05 m/s²) de la vibración aplicada, por lo que puede captar la vibración real de un poste.
- **Genera información para decidir:** el dashboard entrega promedio, máximo y conteo de alertas de la última hora, y marca en rojo los eventos sobre el umbral. Un encargado de mantenimiento puede ver de un vistazo si un poste está vibrando más de lo normal.
- **Permite mantenimiento preventivo:** si las alertas o el promedio aumentan en el tiempo, indica fatiga creciente y la necesidad de intervenir el poste *antes* de que falle.
- **Es viable en terreno:** la alimentación con panel solar + batería permite operar en zonas rurales sin red eléctrica, y los datos quedan accesibles de forma remota por internet.

## 8. Conclusión

El sistema cumple el ciclo completo **captura → almacenamiento → visualización → información para decisión**. Todas las pruebas se cumplieron con datos reales: reposo (~0.05 m/s²), vibración manual, un evento de alerta efectivo (7.69 m/s²) y la persistencia de más de 1.270 lecturas en la base de datos. Las fallas encontradas fueron diagnosticadas y resueltas, dejando un sistema estable y reproducible.
