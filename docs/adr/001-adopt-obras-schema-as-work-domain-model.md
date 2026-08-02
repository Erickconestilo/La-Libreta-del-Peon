<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# ADR 001: Adoptar el esquema "obras" como modelo de dominio de faenas

**Estado:** ⚠️ **SUPERSEDIDO (29-07-2026) — ver nota abajo. No usar esta decisión.**
**Fecha:** 2026-07-26
**Decisor:** Erick
**Contexto documentado en:** `MEMORIA.md` §3, §10; `FASE_0_INVENTARIO_COMPLETO.md` §6

---

## ⚠️ Nota de corrección (29-07-2026, Cowork)

**Esta decisión se basó en un error de proyecto Supabase.** Verificado directamente con `list_tables`/`information_schema` el 29-07-2026:

- Las 6 tablas `obras/campanas/jornadas/sensores/mediciones/estacionamientos` (con las mismas filas: 6/7/0/72/145/22) **no están en el proyecto `topofield`** (`tmlexrsnxpmykbpeebri`, el que usa realmente `apps/backend/.env`). **Están en el proyecto `topotask-backend`** (`jwckuoiossieiyankkvh`), que además tiene `organizations`/`portfolios`/`asset_nodes` — parece ser la base de datos real de TopoTask, no un simple resto de archivos.
- El backend de TopoField nunca ha podido leer esas tablas, aunque quisiera: están en otra base de datos.
- Todo el razonamiento de este ADR (Fase 0 hasta aquí) se basó en un inventario que mezcló los dos proyectos Supabase sin darse cuenta.

**Decisión de Erick (29-07-2026):** reconocer el error y diseñar el modelo de datos de faenas desde cero dentro de `topofield` — no migrar ni adoptar la familia `obras`.

**Hallazgo relevante para la nueva decisión:** el proyecto `topofield` ya tiene una migración completa y sin aplicar (`apps/backend/migrations/deprecated/014_monitoring_rounds.sql`) diseñada específicamente sobre la tabla `projects` real de este proyecto — `instrument_types`, `control_points`, `monitoring_rounds`, `monitoring_round_points`, `instrument_readings`, `reading_attachments`, `control_point_thresholds`, `project_code_catalog`, `project_rules` — con idempotencia ya resuelta (`client_request_id` UNIQUE) y lógica de umbrales ya escrita y probada (`monitoring-reading-evaluation.ts`, con tests en verde). Además hay código de controller/model ya escrito para una parte de esto (`monitoring.controller.ts`, `monitoring.model.ts`) y rutas ya montadas para 2 de sus endpoints. Ver discusión de continuación en `MEMORIA.md` §9/§12 (29-07-2026).

El resto de este documento se conserva sin editar como registro histórico de por qué se tomó (erróneamente) la decisión original.

---

---

## Contexto

Durante la Fase 0 de reconciliación (julio 2026) se descubrió que existen en producción (Supabase) 23 tablas sin archivo de migración local correspondiente. Entre ellas, una familia coherente de 6 tablas en español implementa un modelo completo de seguimiento de obra y faenas geotécnicas:

- `obras` (6 filas): proyectos de obra
- `campanas` (7 filas): ciclos de medición por obra
- `jornadas` (0 filas): sesiones de trabajo por topógrafo
- `sensores` (72 filas): catálogo de puntos de control por obra
- `mediciones` (145 filas): observaciones individuales con validación integrada
- `estacionamientos` (22 filas): setups de estación total

Esta familia contiene **datos operativos reales** (76 semanas-obra de historial) y fue construida por otra vía (probablemente Codex trabajando directo contra Supabase en sesión previa, sin commit en git).

Paralelamente, existe una migración local no aplicada (`014_monitoring_rounds.sql`) que propone un modelo alternativo de 9 tablas (`instrument_types`, `control_points`, `monitoring_rounds`, `monitoring_round_points`, `instrument_readings`, etc.) con diseño más genérico pero **0 datos** en producción.

El plan maestro de rework (enmienda 2) propone un modelo de faenas de 5 tablas nuevas (`work_items`, `project_work_items`, `work_events`, `work_evidence`, `import_batches`). La enmienda también especifica "no construir ambos" — solo un modelo debe sobrevivir.

## Decisión

**Adoptamos la familia "obras" como modelo de dominio de faenas** para las Fases 1-3 del rework. Específicamente:

1. Las 6 tablas core (`obras`, `campanas`, `jornadas`, `sensores`, `mediciones`, `estacionamientos`) se **adaptan y evolucionan** como contrato de faenas, no se descartan.

2. La migración 014 (`monitoring_rounds`) **no se aplica** para el propósito de faenas semanales. Queda descartada para este caso de uso. No se migran datos reales hacia ella.

3. Las 4 tablas de integración TopoTask (`incidencias`, `incidencia_fotos`, `obra_destinatarios`, `envios_correo`) se **descartarán** en una migración futura (Fase 2 o 3), ya que referencian infraestructura externa (telegram, correo operativo) que no forma parte del core.

4. Las familias `total_station_*` (7 tablas) y `leveling_*` (4 tablas) **se conservan sin cambios** — resuelven el problema de campañas de instrumento (Fase 6), no el de faenas semanales (Fase 3).

## Razones

### A favor de adaptar "obras"

1. **Datos reales existentes:** 72 sensores, 145 mediciones, 22 estacionamientos. Migrar este historial a un esquema nuevo sería trabajo adicional y riesgo de pérdida de datos.

2. **Estructura probada:** Las tablas están en uso (conteos no-cero en producción) y tienen RLS activo. La estructura `obra → campana → jornada → mediciones por sensor` coincide con el patrón del Excel que el plan maestro busca reemplazar.

3. **Menos trabajo, menos riesgo:** Adaptar lo existente (renombrar columnas, añadir constraints, documentar) es menos invasivo que construir un modelo nuevo y migrar.

4. **Validación integrada:** `mediciones` ya tiene columnas de validación (`movimiento`, `estado_match`, `coordenadas_ok`, `posible_typo`) que el modelo genérico de 014 delega a lógica externa.

5. **Coherencia con total_station_* / leveling_*:** Estos pipelines ya referencian conceptos como `campana_id` y `sensor_id`. Mantener `campanas` y `sensores` evita romper esas referencias.

### En contra de migración 014

1. **Cero datos:** Las 9 tablas de monitoring_rounds tienen 0 filas en producción. No hay pérdida al descartarlas.

2. **Blob genérico de lectura:** `instrument_readings` usa el antipatrón `valueNumeric | valueText + unit` (texto libre) + `rawPayload` JSON. MEMORIA.md §7 ya señala esto como el problema que el plan maestro advierte evitar.

3. **Sobreingeniería prematura:** El modelo de 014 contempla múltiples tipos de instrumento, thresholds por punto, rounds de medición — features que nadie ha pedido todavía. La enmienda 2 del plan prohíbe construir para "hipotéticos futuros".

4. **Conflicto con plan maestro §8:** El plan recomienda "una campaña real debe completarse antes de abrir la siguiente disciplina". monitoring_rounds no ha completado ninguna campaña; `campanas`/`mediciones` sí.

### Alternativa considerada y descartada

**Mantener ambos modelos temporalmente** (obras como legacy, monitoring_rounds como nuevo): descartada porque:
- Aumenta la superficie de testing y mantenimiento sin ventaja clara.
- La única ventaja de 014 (genericidad multi-instrumento) se resuelve mejor en Fase 6 con los pipelines ya existentes (`total_station_*`, `leveling_*`).
- El plan maestro (enmienda 2) especifica "no construir ambos".

## Consecuencias

### Positivas

- **Velocidad:** Fase 1 se reduce a documentar (migración 015 retroactiva, tipos TypeScript) y ajustar nombrado. No hay desarrollo de modelo nuevo.
- **Confianza:** El modelo ya está en uso con datos reales; los riesgos de validación/RLS están acotados.
- **Compatibilidad:** Los pipelines de estación total y nivelación no se rompen.

### Negativas / Trabajo pendiente

- **Nombrado en español:** Las tablas usan nombres en español (`obras`, `campanas`, `jornadas`). Decisión pendiente: traducir (breaking change) o mantener (convención mixta en el código). **Recomendación:** mantener como están, añadir alias en tipos TypeScript si es necesario.

- **Relación con `projects`:** Existe duplicación semántica entre `obras` (6 filas, en español) y `projects` (7 filas, en inglés). Decisión pendiente en §4 de este ADR.

- **Relación con `users`:** Existe `profiles` (11 filas) con flags TopoTask (`puede_enviar_correo_operativo`) paralela a `users` (4 filas). Decisión pendiente en §5 de este ADR.

- **Descarte de tablas TopoTask:** Las 4 tablas de integración (`incidencias`, `incidencia_fotos`, `obra_destinatarios`, `envios_correo`) deben eliminarse en una migración futura, previa verificación de que no hay referencias activas.

## Decisiones pendientes y recomendaciones

### 1. ¿Qué hacer con migración 014 (monitoring_rounds)?

**Recomendación:** Mover `apps/backend/migrations/014_monitoring_rounds.sql` a `apps/backend/migrations/deprecated/014_monitoring_rounds.sql` con un README explicando por qué no se aplicó. No borrar — es evidencia de diseño previo útil para futuras referencias.

**Commit asociado:** 1948c16 ("feat(backend): add monitoring rounds MVP") queda en `main` local pero no se hace push. Puede deshacerse con `git revert` o simplemente documentar en el README de deprecated/.

### 2. ¿obras se unifica con projects o conviven?

**Contexto:**
- `projects` (7 filas): código, nombre, descripción, imagen, created_at/updated_at. Usado en migración 002.
- `obras` (6 filas): nombre, ubicación, tipo, estado, fecha_inicio, notas. Sin código corto.

**Análisis:**
- Diferencias: `obras` tiene estado/tipo/ubicación; `projects` tiene código corto + imagen.
- Similitud: Ambas son "contenedor de trabajo por proyecto".
- Referencias: `stations.project_id` → `projects.id`; `campanas.obra_id` → `obras.id`.

**Opciones:**

**A) Unificar (migración destructiva):**
- Migrar `obras` → `projects` añadiendo columnas `ubicacion`, `tipo`, `estado`, `fecha_inicio`.
- Migrar todas las FKs de `obra_id` → `project_id`.
- **Riesgo:** Breaking change en RLS policies que filtran por `obra_id`. Requiere revisar todas las políticas.

**B) Convivir (mantener ambas):**
- `projects` sigue siendo el contenedor de stations/prisms/incidents (modelo actual inglés).
- `obras` es el contenedor de campanas/jornadas/sensores/mediciones (modelo español).
- Añadir una tabla de mapeo `project_obra_links` (m:n) si es necesario vincular ambos contextos.
- **Ventaja:** No se rompe nada existente. RLS sigue funcionando.
- **Desventaja:** Duplicación conceptual. Dos "proyectos" en el sistema.

**C) Deprecar projects, migrar hacia obras:**
- Inverso de opción A.
- **Riesgo:** Rompe migración 002 y todo el modelo de stations/prisms. Mayor invasividad.

**Recomendación:** **Opción B (convivir temporalmente)** con mapeo explícito. Razones:
- No rompe ninguna referencia existente.
- Permite evaluar en Fase 3 (con usuario piloto Erick) si realmente necesitan unificarse.
- Si en Fase 5 la convivencia resulta confusa, se unifica con evidencia de uso real, no antes.
- MEMORIA.md §10 cita el plan maestro §8: "introducir entidades nuevas junto al modelo legado... retirar el significado ambiguo al final". Aplica aquí.

**Acción inmediata:** Documentar en migración 015 que `obras` y `projects` coexisten con propósitos separados (campañas vs. stations). Añadir comentario en `shared/types.ts` explicando la diferencia.

**Condición de reconciliación obligatoria (no convivencia indefinida):**

La convivencia `obras`/`projects` es temporal y deliberada, no permanente. Se reconcilia cuando se cumple **cualquiera** de estos disparadores:

1. **Disparador de confusión operativa (Fase 5):** Al cerrar el piloto con usuario real (Erick), si reporta confusión sobre "en qué proyecto pongo esto" o "por qué hay dos listas de proyectos", se unifica inmediatamente.

2. **Disparador de venta a terceros (antes de demo):** Antes de la primera demo a cliente potencial o transferencia de repo a terceros, se unifica para evitar explicar convivencia a externos. La unificación es prerequisito de salida a terceros, no opcional.

3. **Disparador de feature cross-boundary (Fase 6+):** Si una feature requiere vincular datos de ambos contextos (ej: "mostrar stations y sensores en el mismo mapa"), se evalúa si el vínculo via tabla m:n `project_obra_links` es suficiente. Si genera complejidad, se unifica.

4. **Disparador de carga de mantenimiento (Fase 4-5):** Si mantener RLS policies, migraciones y tipos TypeScript duplicados para ambas tablas genera >20% de sobrecarga de tiempo en una fase, se unifica.

**Dirección de unificación cuando se dispare:**
- Si `projects` no tiene datos de campañas: migrar `obras` → `projects` (añadir columnas ubicacion, tipo, estado_text, fecha_inicio).
- Si `obras` se ha convertido en el modelo principal: deprecar `projects`, migrar stations/prisms a referencia de `obras`.

**Rationale:** Igual que el plan maestro prevé para `Station` (MEMORIA.md §10, plan maestro §8): "introducir entidades nuevas junto al modelo legado... retirar el significado ambiguo al final". La convivencia es explícitamente temporal, con criterios de salida claros. No es "hasta que alguien se acuerde", es "hasta que uno de estos 4 disparadores se active".

### 3. ¿profiles se unifica con users o conviven?

**Contexto:**
- `users` (4 filas): id, email, full_name, role, is_active, created_at/updated_at. Migración 001.
- `profiles` (11 filas): id, legacy_usuario_id, nombre, email, rol, activo, puede_enviar_correo_operativo, puede_adjuntar_informe_topotask, created_at/updated_at.

**Análisis:**
- `profiles` tiene 11 filas vs. `users` 4 filas → no es un mirror completo.
- Flags TopoTask (`puede_enviar_correo_operativo`, `puede_adjuntar_informe_topotask`) no son relevantes para TopoField (se descartaron las tablas de correo).
- `legacy_usuario_id` sugiere que `profiles` es un snapshot de usuarios de otro sistema.

**Opciones:**

**A) Unificar profiles → users:**
- Migrar las 11 filas de `profiles` a `users`, descartando los flags TopoTask.
- Mapear `profiles.id` → `users.id` si hay FKs.
- **Riesgo:** Perder trazabilidad de `legacy_usuario_id` si es útil para auditoría.

**B) Mantener profiles como extensión:**
- `users` sigue siendo la tabla auth principal.
- `profiles` se renombra a `user_profiles` o `user_metadata` y se limpia de flags TopoTask.
- **Ventaja:** Separación clara auth vs. metadata extendida.

**C) Deprecar profiles:**
- Si las 11 filas de `profiles` son históricas y no se usan activamente, marcarlas como legacy y no crear nuevas.

**Recomendación:** **Opción A (unificar hacia users)** con migración cuidadosa. Razones:
- Los flags TopoTask no tienen uso en TopoField post-descarte de tablas de correo.
- `legacy_usuario_id` puede preservarse como columna nullable en `users` para auditoría.
- Reduce duplicación conceptual ("quién es un usuario") a una sola fuente de verdad.
- Si hay FKs desde `campanas.operador` o similar hacia `profiles`, se migran a `users`.

**Acción inmediata:** Verificar si existen FKs activas desde otras tablas hacia `profiles.id`. Si no, crear migración 016 que unifique. Si sí, evaluar impacto de la migración en Fase 2.

### 4. ¿Tablas TopoTask (telegram/correo) — confirmar descarte?

**Tablas en cuestión:**
- `incidencias` (0 filas)
- `incidencia_fotos` (0 filas, referencias a `telegram_file_id`)
- `obra_destinatarios` (0 filas, configuración de emails)
- `envios_correo` (0 filas, log de emails con flag `adjuntar_informe_topotask`)

**Análisis:**
- 0 filas en todas → no hay datos que perder.
- Referencias a infraestructura externa (telegram, email operativo TopoTask) que no forma parte de TopoField.
- No hay FKs activas desde tablas core.

**Recomendación:** **Confirmar descarte.** Crear migración 017 (o incluir en 016) que ejecuta `DROP TABLE` para estas 4 tablas. Documentar en comentario de migración por qué se eliminan (integración TopoTask, fuera de scope).

**Acción antes de aplicar:** Verificar con `grep -r "incidencia|obra_destinatario|envio_correo" apps/backend/` que no hay código TypeScript que las referencie. Si hay, eliminar ese código primero.

## Estado de la implementación

- [x] Decisión formalizada en este ADR (2026-07-26)
- [ ] Migración 015 (retroactiva, sin aplicar): esquema de obras/campanas/faenas documentado
- [ ] Mover 014_monitoring_rounds.sql a deprecated/ con README
- [ ] Verificar FKs activas hacia `profiles`
- [ ] Verificar código TypeScript que referencie tablas TopoTask
- [ ] Decidir unificación obras/projects (recomendación: convivir)
- [ ] Decidir unificación profiles/users (recomendación: unificar)
- [ ] Actualizar `shared/types.ts` con tipos de obras/campanas/faenas
- [ ] Actualizar MEMORIA.md §10 con estado de implementación

---

**Firmado:** Erick (decisor), Claude Code (redactor)  
**Próxima revisión:** Cierre de Fase 1 o al detectar conflicto con decisión
