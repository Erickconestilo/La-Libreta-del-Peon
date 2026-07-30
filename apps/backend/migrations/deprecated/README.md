# Migraciones deprecadas

Este directorio contiene migraciones que fueron diseñadas pero **no se aplicaron** en producción, y fueron descartadas por decisión de diseño documentada en ADRs.

## 014_monitoring_rounds.sql

**Estado:** Descartado para el propósito de faenas semanales  
**Fecha de decisión:** 2026-07-26  
**ADR:** docs/adr/001-adopt-obras-schema-as-work-domain-model.md

### Razón del descarte

Durante la Fase 0 de reconciliación se descubrió que existe en producción una familia de tablas (`obras`, `campanas`, `jornadas`, `sensores`, `mediciones`, `estacionamientos`) con **datos operativos reales** (72 sensores, 145 mediciones) que implementa el modelo de faenas que esta migración 014 proponía construir desde cero.

### Decisión (ADR 001)

- **Se adoptó el esquema "obras"** como modelo de dominio de faenas (Fases 1-3).
- **Migración 014 no se aplica** para este propósito.
- Los datos reales no se migran hacia monitoring_rounds.

### Contenido de la migración descartada

9 tablas propuestas:
- `instrument_types`: catálogo de tipos de instrumento
- `control_points`: puntos de control (equivalente a `sensores` del esquema obras)
- `monitoring_rounds`: rondas de monitoreo (equivalente a `campanas`)
- `monitoring_round_points`: relación m:n entre rounds y points
- `instrument_readings`: lecturas genéricas con blob `valueNumeric | valueText + unit + rawPayload`
- `reading_attachments`: archivos adjuntos a lecturas
- `control_point_thresholds`: umbrales de alerta por punto
- `project_code_catalog`: catálogo de códigos de proyecto
- `project_rules`: reglas de validación por proyecto

### Problemas detectados

1. **Blob genérico de lectura:** `instrument_readings` usa el antipatrón `valueNumeric | valueText + unit (texto libre) + rawPayload JSON`. MEMORIA.md §7 señala esto como exactamente lo que el plan maestro advierte evitar ("un único InstrumentReading(value, unit) no es suficiente").

2. **Cero datos:** 0 filas en todas las tablas propuestas. No hay pérdida al descartarlas.

3. **Sobreingeniería prematura:** Contempla múltiples tipos de instrumento, thresholds, rounds — features que nadie ha pedido. El modelo `obras` es más simple y ya tiene datos.

### Código asociado

El commit `1948c16` ("feat(backend): add monitoring rounds MVP") añadió:
- Esta migración (014_monitoring_rounds.sql)
- Modelo TypeScript (`apps/backend/src/models/monitoring.model.ts`)
- Controlador (`apps/backend/src/controllers/monitoring.controller.ts`)
- Rutas (`apps/backend/src/routes/monitoring.routes.ts`)
- Validación (`apps/backend/src/utils/monitoring-validation.ts`)
- Tests (`apps/backend/src/lib/monitoring-reading-evaluation.test.ts`)

**Estado del código:** Queda en `main` local, no se hace push. El código TypeScript puede eliminarse en una futura limpieza de Fase 2, o conservarse como referencia de diseño alternativo.

### Posible uso futuro

El diseño de `monitoring_rounds` puede ser útil como referencia para:
- Fase 6 (instrumentos y campañas) si se necesita un modelo más genérico.
- Integración con sistemas externos que usen este patrón.

Por ahora, **no se aplica** y el modelo `obras` es la fuente de verdad para faenas semanales.

---

## Actualización 30-07-2026: reactivada como migración 019

El ADR 001 en el que se apoyaba el descarte resultó estar basado en un error de
proyecto Supabase: las tablas `obras/campanas/jornadas/sensores/mediciones/estacionamientos`
con datos reales viven en `topotask-backend`, no en `topofield`. El backend de
TopoField nunca pudo leerlas. Con esa premisa fuera de juego, Erick decidió
reactivar este diseño en `migrations/019_monitoring_rounds.sql`, con un ajuste:
se quita `total_station` del catálogo `instrument_types` porque ya tiene tabla
propia (`prism_monitoring_observations`, migración 005). El resto del diseño
(rounds, control points, thresholds, blob de lectura escalar) se mantiene: para
instrumentos de valor único (nivel digital, piezómetro, distanciómetro,
inclinómetro, regla de peralte) `valueNumeric + unit` es una representación
adecuada, no el antipatrón que sí sería forzar ahí datos vectoriales.

Este archivo (`014_monitoring_rounds.sql`) se conserva sin cambios como
registro histórico de la decisión original; no debe aplicarse.

---

**Última actualización:** 2026-07-26 (descarte original), 30-07-2026 (reactivación)
**Decisor:** Erick
**Documentado por:** Claude Code
