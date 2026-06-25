# Diseño 3D — Encapsulado del Monitor de Vibraciones

Carpeta con el diseño 3D del encapsulado del prototipo (TEI201 · Avance #3).

El encapsulado aloja todos los componentes (ESP32, MPU6050, batería 18650, módulo de carga y panel solar) y está pensado para la **reparación**: tapa atornillada (no pegada) y batería reemplazable. El **modelado y los planos** se hicieron en **Fusion 360**; el **render 3D** se generó con **Vizcom** a partir del diseño del equipo.

## Contenido de la carpeta

| Archivo | Qué es | Estado |
|---|---|---|
| `guia_diseno_3d.md` | Dimensiones de los componentes, medidas del encapsulado, aberturas y paso a paso de modelado | ✅ |
| `distribucion_3d.svg` | Diagrama acotado (vista superior y lateral) con la ubicación de cada componente | ✅ |
| `encapsulado.f3d` (o `.f3z`) | Modelo y ensamble completo en Fusion 360 (carcasa + componentes internos) | ⬜ por subir |
| `renders/` | Render exterior + render interior o explosionado (Vizcom / Fusion) | ⬜ por subir |
| `planos.pdf` | Planos técnicos: vistas ortogonales, cotas, tolerancias y escala (Fusion) | ⬜ por subir |

## Checklist de entrega (Diseño 3D — rúbrica)

- [ ] Archivo Fusion 360 (`.f3d` / `.f3z`) con el ensamble completo (carcasa + componentes con volúmenes reales).
- [ ] Render exterior.
- [ ] Render interior o explosionado.
- [ ] Planos en PDF con vistas, cotas y escala.
- [ ] Verificado que el hardware real cabe físicamente en el diseño.

## Especificaciones rápidas

- Dimensiones internas: 120 × 80 × 50 mm · pared 2.5 mm · externo ~125 × 85 × 55 mm.
- Tapa atornillada con 4 tornillos M3 · holgura tapa/base 0.3–0.4 mm.
- Aberturas: ranura USB (12 × 6 mm) y paso de cable del panel solar (⌀5 mm).
- MPU6050 fijado rígido al chasis (debe transmitir la vibración real de la estructura).

> Detalle completo de medidas y pasos en `guia_diseno_3d.md`.
