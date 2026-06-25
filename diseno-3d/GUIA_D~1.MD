# Guía de Diseño 3D — Encapsulado del Monitor de Vibraciones

**Proyecto:** Sistema IoT de Monitoreo de Vibraciones (ESP32 + MPU6050) · TEI201 · UAI

Esta guía contiene todo lo necesario para construir el **gemelo 3D** y el **encapsulado** en Fusion 360: dimensiones reales de cada componente, medidas del encapsulado, aberturas, montaje y criterios de diseño para reparación. (Las dimensiones son típicas/de catálogo — verifíquenlas con un pie de metro antes de imprimir.)

---

## 1. Dimensiones de los componentes (para el gemelo 3D)

El gemelo 3D no necesita modelar cada componente al detalle: basta con **sólidos simples (cajas/cilindros)** con el volumen y la posición real de cada pieza.

| Componente | Largo × Ancho × Alto (mm) | Forma para el gemelo | Notas de montaje |
|---|---|---|---|
| ESP32 DevKit (38 pines) | 55 × 28 × 13 | Caja | Atornillado a 2 postes; conector USB hacia una abertura |
| Sensor MPU6050 (GY-521) | 21 × 16 × 3 | Caja delgada | **Fijado rígido al chasis** (debe vibrar con la estructura) |
| Batería 18650 | 65 × ⌀18.5 | Cilindro | Va dentro del portabaterías |
| Portabaterías 18650 | 75 × 20 × 18 | Caja | Clip o tornillos; permite recambio de la batería |
| Módulo TP4056 | 26 × 17 × 5 | Caja delgada | Cerca de la abertura USB / entrada del panel |
| Panel solar | 165 × 65 × 3 | Placa delgada | Montado en la tapa / exterior, inclinado al sol |
| Protoboard (opcional) | 165 × 55 × 10 | Caja | Si usan perfboard pequeña, ajustar a su tamaño |

> Consejo: para el demo "abrir el encapsulado" que pide la rúbrica, dejen el MPU6050, el ESP32 y la batería **accesibles sin desarmar todo**.

## 2. Dimensiones propuestas del encapsulado

Caja tipo "base + tapa atornillada" en PLA:

| Parámetro | Valor sugerido |
|---|---|
| Dimensiones internas | 120 × 80 × 50 mm |
| Espesor de pared | 2.5 mm |
| Dimensiones externas | ~125 × 85 × 55 mm |
| Tapa | Atornillada con 4 tornillos M3 (esquinas) |
| Tolerancia de ensamble (tapa/base) | 0.3 – 0.4 mm de holgura |
| Postes de montaje (bosses) | ⌀6 mm exterior, agujero ⌀2.8 mm para tornillo M3 autorroscante |

El panel solar (165 × 65) es más grande que la cara superior: móntenlo **sobre la tapa con un soporte/bracket inclinado**, o en una pestaña que sobresalga.

## 3. Aberturas necesarias (funcionalidad del encapsulado)

- **Ranura USB** (≈12 × 6 mm) alineada con el conector del ESP32 → permite cargar el firmware sin abrir la caja.
- **Entrada de cable del panel solar** (⌀5 mm o prensaestopa) → para los cables del panel hacia el TP4056.
- **Ranuras de ventilación** pequeñas (opcional) para disipar calor.
- Si el TP4056 tiene su propio USB y lo usan para carga, alinéenlo con otra ranura.

## 4. Diseño para la reparación (criterio clave de la rúbrica)

La rúbrica penaliza encapsulados sellados. Asegúrense de:

- **Tapa atornillada** (no pegada): se abre con un destornillador y se vuelve a cerrar.
- **Batería en portabaterías**: se reemplaza sin soldar.
- **Componentes en postes/clips**: ESP32 y TP4056 atornillados o a presión, no encolados.
- **MPU6050 accesible** pero firmemente fijado (es el sensor que debe "sentir" la vibración del poste).

## 5. Distribución interna sugerida (ver `distribucion_3d.svg`)

- ESP32 en la zona izquierda, con el USB hacia la ranura.
- Portabaterías 18650 a lo largo del borde superior.
- TP4056 junto a la entrada del panel.
- MPU6050 atornillado al fondo/pared, rígido (acoplado a la estructura).

## 6. Paso a paso en Fusion 360

1. **Crear el sketch base:** rectángulo de 125 × 85 mm en el plano XY. Extruir 55 mm (cuerpo macizo).
2. **Vaciar (Shell):** usar *Shell* con 2.5 mm hacia adentro, dejando la cara superior abierta → así se forma la "base" tipo caja.
3. **Tapa:** crear un sólido aparte de 125 × 85 × 3 mm; agregar un labio interno (offset de ~2.8 mm) que entre en la base con 0.35 mm de holgura.
4. **Postes de tornillo (bosses):** 4 cilindros ⌀6 mm en las esquinas internas, con agujero ⌀2.8 mm. Replicar en la tapa los pasos para M3.
5. **Aberturas:** sketch en la cara lateral para la ranura USB y el agujero del cable solar; *Cut/Extrude*.
6. **Gemelo 3D (componentes):** crear cajas/cilindros con las medidas de la tabla 1 y ubicarlas dentro como un **ensamble** (componentes separados). No necesitan ser exactas, solo representar volumen y posición.
7. **Soporte del panel solar:** un bracket inclinado (~30°) sobre la tapa, con una placa de 165 × 65 mm representando el panel.
8. **Parametrizar:** definir las medidas clave como parámetros (*Modify → Change Parameters*): largo, ancho, alto, espesor — esto cumple el criterio de "modelo paramétrico".
9. **Exportar:** *File → Export* en formato **.f3d** (y/o .f3z). Para el repositorio suban ese archivo a la carpeta `diseno-3d/`.

## 7. Renders y planos (entregables)

- **Renders:** usar el entorno *Render* de Fusion. Mínimo: una **vista exterior** (con material PLA y el panel) y una **vista interior o explosionada** (mostrando los componentes). Exportar como PNG.
- **Planos técnicos:** usar *Drawing → From Design*. Incluir **vistas ortogonales** (frontal, lateral, superior), **cotas** de las dimensiones funcionales, escala y, si pueden, tolerancias. Exportar como **PDF**.

## 8. Checklist de entrega (Diseño 3D)

- [ ] Archivo Fusion 360 (.f3d / .f3z) con el ensamble completo (carcasa + componentes internos).
- [ ] Todos los componentes representados con volúmenes reales.
- [ ] Render exterior + render interior/explosionado (PNG).
- [ ] Planos en PDF con vistas, cotas y escala.
- [ ] El hardware real cabe físicamente en el diseño (verificado con medidas reales).
