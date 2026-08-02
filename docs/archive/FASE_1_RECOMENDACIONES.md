<!-- doc-status
estado: archivado
congelado: 2026-08-02
superado-por: MEMORIA.md
-->

> 🧊 **Documento archivado el 02-08-2026.** Se conserva como historial verificable y no se actualiza. Para el estado actual del proyecto ver `ROADMAP.md`; para el porqué de cada decisión, `MEMORIA.md`.

# FASE 1 — RECOMENDACIONES SOBRE UNIFICACIÓN DE TABLAS

**Fecha:** 2026-07-26  
**Contexto:** ADR 001 (adopción del esquema "obras")  
**Decisor pendiente:** Erick

> ⚠️ **Corrección (2026-07-29):** ADR 001 quedó superseded — el esquema "obras" que este documento recomienda unificar con `projects` vive en el proyecto Supabase `topotask-backend`, no en `topofield`. No se adoptó ni se adopta `obras` como modelo de faenas. Erick decidió diseñar el modelo desde cero dentro de `topofield` (ver `MEMORIA.md` §8/§12, entradas 2026-07-29/30); el resultado fue reactivar `monitoring_rounds` (migración 019), no las preguntas de unificación que este documento plantea. Se conserva como registro histórico de la recomendación original, ya no vigente.

---

## Preguntas abiertas del ADR 001

El ADR 001 formalizó la adopción del esquema "obras" como modelo de dominio de faenas, pero dejó pendientes dos decisiones sobre unificación de tablas:

1. ¿`obras` se unifica con `projects` o conviven?
2. ¿`profiles` se unifica con `users` o conviven?

Este documento analiza ambas y entrega recomendaciones con justificación.

---

## 1. obras vs. projects — RECOMENDACIÓN: CONVIVIR

### Estado actual

**projects** (7 filas):
- Columnas: id (uuid), code, name, description, image_url, is_active, created_at, updated_at
- Usado en: migración 002, referenciado por `stations.project_id`, `prisms.project_id`, `project_memberships.project_id`
- Propósito: contenedor de stations/prisms/incidents (modelo inglés, Fase 0-2)

**obras** (6 filas):
- Columnas: id (bigint), nombre, ubicacion, tipo, estado, fecha_inicio, notas, created_at
- Usado en: referenciado por `campanas.obra_id`, `jornadas.obra_id`, `sensores.obra_id`, `mediciones.obra_id`
- Propósito: contenedor de campanas/jornadas/sensores/mediciones (modelo español, Fases 3-6)

### Diferencias estructurales

| Aspecto | projects | obras |
|---|---|---|
| PK | uuid | bigint |
| Código corto | Sí (code) | No |
| Imagen | Sí (image_url) | No |
| Ubicación | No | Sí |
| Tipo de obra | No | Sí (metro, edificación, etc.) |
| Estado | is_active (boolean) | estado (text: activa, pausada, cerrada) |
| Fecha inicio | No | Sí |
| Descripción | description (text largo) | notas (text) |

### Análisis de opciones

#### Opción A: Unificar obras → projects

**Acción:** Migrar `obras` a `projects` añadiendo columnas `ubicacion`, `tipo`, `estado_text`, `fecha_inicio`. Convertir todas las FKs de `obra_id` (bigint) a `project_id` (uuid).

**Ventajas:**
- Una sola tabla de "proyectos" en el sistema.
- Nomenclatura consistente en inglés.

**Desventajas:**
- **Breaking change masivo:** Requiere migrar 4 tablas con datos reales (campanas, jornadas, sensores, mediciones) de `obra_id: bigint` a `project_id: uuid`.
- **Riesgo RLS:** Todas las políticas RLS de esas 4 tablas filtran por `obra_id`. Cambiar la columna exige revisar 16 políticas (4 tablas × 4 policies cada una).
- **Pérdida semántica:** `projects` es genérico; `obras` tiene semántica específica del sector (ubicación, tipo de obra, estado activa/pausada/cerrada).
- **Conflicto de IDs:** Las 6 `obras` actuales no tienen correspondencia 1:1 con las 7 `projects`. No está claro cómo mapear.

#### Opción B: Convivir (recomendada)

**Acción:** Mantener ambas tablas con propósitos separados:
- `projects`: contenedor de stations/prisms/incidents (modelo topográfico simple, Fase 0-2).
- `obras`: contenedor de campanas/jornadas/sensores/mediciones (modelo de auscultación geotécnica, Fases 3-6).

Añadir tabla de mapeo `project_obra_links` (m:n) si en el futuro se necesita vincular ambos contextos.

**Ventajas:**
- **Cero breaking changes.** No se rompe nada existente.
- **RLS sigue funcionando** sin modificaciones.
- **Separación semántica clara:** `projects` es ligero (stations/prisms, sin campañas); `obras` es el modelo completo de auscultación.
- **Coherencia con plan maestro §8:** "introducir entidades nuevas junto al modelo legado... retirar el significado ambiguo al final". Convivencia temporal es explícitamente recomendada.

**Desventajas:**
- Duplicación conceptual ("proyecto" en dos tablas).
- Si en Fase 5 resulta confuso, requiere unificación posterior con más contexto de uso real.

#### Opción C: Deprecar projects, migrar hacia obras

**Acción:** Inverso de opción A. Migrar `stations.project_id` → `stations.obra_id`, deprecar `projects`.

**Desventajas:**
- Rompe migración 002 y todo el modelo de stations/prisms (más invasivo que opción A).
- `obras` usa nombres en español, crear inconsistencia en modelo inglés (stations, prisms).

### Recomendación

**Opción B (convivir).**

**Razones:**
1. No rompe nada existente (cero riesgo de pérdida de datos o policies).
2. Permite evaluar en Fase 3 con usuario piloto Erick si realmente necesitan unificarse.
3. MEMORIA.md §10 cita el plan maestro §8: convivencia temporal es la práctica recomendada.
4. Si en Fase 5 la duplicación resulta confusa, se unifica con evidencia de uso real, no antes.

**Acción inmediata:**
- Documentar en migración 015 (✅ ya hecho) que `obras` y `projects` coexisten con propósitos separados.
- Añadir comentario en `shared/types.ts` explicando la diferencia cuando se añadan tipos de `obras`.

**Acción futura (Fase 5 o posterior):**
- Evaluar con Erick si la duplicación genera confusión en uso real.
- Si sí: crear migración de unificación (preferiblemente obras → projects por ser projects el modelo más antiguo).
- Si no: mantener ambas como zonas del sistema con propósitos distintos.

---

## 2. profiles vs. users — RECOMENDACIÓN: UNIFICAR

### Estado actual

**users** (4 filas):
- Columnas: id (uuid), email, full_name, role, is_active, created_at, updated_at
- Usado en: migración 001, tabla auth principal
- Propósito: usuarios autenticados del sistema

**profiles** (11 filas):
- Columnas: id (uuid), legacy_usuario_id (bigint), nombre, email, rol, activo, puede_enviar_correo_operativo, puede_adjuntar_informe_topotask, created_at, updated_at
- Usado en: ninguna FK activa detectada, sin referencias en código TypeScript
- Propósito: snapshot de usuarios de TopoTask con flags de integración

### Análisis

#### Diferencias clave

- `profiles` tiene 11 filas vs. `users` 4 filas → **no es un mirror completo**.
- Flags TopoTask (`puede_enviar_correo_operativo`, `puede_adjuntar_informe_topotask`) **no son relevantes** para TopoField tras descartar las tablas de correo (ADR 001 §4).
- `legacy_usuario_id` (bigint) sugiere que `profiles` es un snapshot histórico de otro sistema.

#### FKs activas

**Verificado:** No hay FKs desde otras tablas hacia `profiles.id`.

Los campos `operador` (en `campanas`, `estacionamientos`) y `topografo` (en `jornadas`) son **TEXT** (texto libre), no FKs. Esto significa que no hay dependencias de integridad referencial hacia `profiles`.

#### Opciones

**A) Unificar profiles → users (recomendada)**

**Acción:**
1. Migrar las 11 filas de `profiles` a `users`:
   - Mapear `profiles.nombre` → `users.full_name`
   - Mapear `profiles.rol` → `users.role`
   - Mapear `profiles.activo` → `users.is_active`
   - Preservar `profiles.legacy_usuario_id` como nueva columna nullable `users.legacy_usuario_id` (para auditoría)
   - Descartar flags TopoTask (puede_enviar_correo_operativo, puede_adjuntar_informe_topotask)
2. Si hay UUIDs en `profiles` que ya existen en `users`, mapear; si no, crear nuevos.
3. DROP TABLE `profiles` tras verificar migración.

**Ventajas:**
- **Una sola fuente de verdad** para "quién es un usuario".
- **Elimina duplicación conceptual** sin pérdida de información útil.
- **No rompe nada:** No hay FKs activas hacia `profiles`.
- **Limpia flags TopoTask** que ya no se usan.

**Desventajas:**
- Riesgo menor: si `legacy_usuario_id` es útil para auditoría futura, debe preservarse (mitigado añadiéndolo a `users`).

**B) Mantener profiles como extensión**

**Acción:** Renombrar `profiles` a `user_metadata` o `user_profiles`, limpiar flags TopoTask.

**Desventajas:**
- Mantiene duplicación conceptual de usuarios.
- No aporta ventaja clara (los flags TopoTask se descartarían igual).

**C) Deprecar profiles sin migrar**

**Acción:** Marcar `profiles` como legacy, no crear nuevas filas.

**Desventajas:**
- Las 11 filas actuales quedan huérfanas (no se usan pero tampoco se eliminan).

### Recomendación

**Opción A (unificar hacia users).**

**Razones:**
1. Los flags TopoTask no tienen uso en TopoField post-descarte de tablas de correo (ADR 001).
2. `legacy_usuario_id` puede preservarse como columna nullable en `users` para auditoría.
3. No hay FKs activas → migración de bajo riesgo.
4. Reduce "quién es un usuario" a una sola fuente de verdad.

**Acción inmediata (Fase 2):**
1. Verificar manualmente si las 11 filas de `profiles` tienen correspondencia con las 4 de `users` (por email).
2. Crear migración 016 que:
   - Añade columna `users.legacy_usuario_id` (bigint nullable)
   - Inserta en `users` las filas de `profiles` que no existan (por email)
   - Actualiza `users.legacy_usuario_id` donde corresponda
   - Verifica que no hay referencias huérfanas
   - DROP TABLE `profiles`
3. Aplicar tras backup de Supabase.

**Acción futura:**
- Si en el futuro se necesita metadata extendida de usuarios (preferencias, configuración), crear tabla `user_preferences` con FK a `users.id`, no reutilizar `profiles`.

---

## 3. Tablas TopoTask (telegram/correo) — CONFIRMACIÓN DE DESCARTE

### Tablas en cuestión

- `incidencias` (0 filas)
- `incidencia_fotos` (0 filas, referencias a `telegram_file_id`)
- `obra_destinatarios` (0 filas, configuración de emails)
- `envios_correo` (0 filas, log de emails con flag `adjuntar_informe_topotask`)

### Análisis

**Verificado:**
- 0 filas en todas → no hay datos que perder.
- Referencias a infraestructura externa (telegram bot, email operativo TopoTask) que no forma parte de TopoField.
- `grep -r "incidencia|obra_destinatario|envio_correo" apps/backend/` → **0 resultados** (sin código TypeScript que las referencie).

### Recomendación

**CONFIRMAR DESCARTE.**

**Acción (Fase 2):**
1. Crear migración 017_drop_topotask_integration_tables.sql:
   ```sql
   -- Eliminar tablas de integración TopoTask
   -- Razón: referencias a infraestructura externa (telegram, correo operativo)
   -- que no forma parte del core de TopoField. ADR 001 §4.
   
   DROP TABLE IF EXISTS public.envios_correo;
   DROP TABLE IF EXISTS public.obra_destinatarios;
   DROP TABLE IF EXISTS public.incidencia_fotos;
   DROP TABLE IF EXISTS public.incidencias;
   ```
2. Aplicar tras verificar que no hay referencias activas (ya verificado).

**Rationale:**
- 0 filas → no hay pérdida de datos.
- 0 referencias en código → no hay breaking changes.
- Limpia el esquema de tablas que no se usarán nunca en TopoField.

---

## Resumen de recomendaciones

| Pregunta | Recomendación | Fase | Riesgo |
|---|---|---|---|
| obras vs. projects | **CONVIVIR** | Fase 1 (documentar), revisar Fase 5 | Bajo |
| profiles vs. users | **UNIFICAR** hacia users | Fase 2 (migración 016) | Bajo |
| Tablas TopoTask | **DESCARTAR** (DROP) | Fase 2 (migración 017) | Ninguno |

---

## Próximos pasos

**Fase 1 (hoy):**
- [x] ADR 001 formalizando adopción de esquema "obras"
- [x] Migración 015 (retroactiva, sin aplicar): esquema documentado
- [x] Mover 014_monitoring_rounds.sql a deprecated/ con README
- [x] Este documento de recomendaciones
- [ ] Commit de todo lo anterior en rama `phase-1-domain-contract`
- [ ] Push de rama y PR para revisión de Erick

**Fase 2 (próxima sesión):**
- [ ] Decidir si se acepta recomendación de unificar profiles → users
- [ ] Si sí: crear migración 016_unify_profiles_into_users.sql
- [ ] Crear migración 017_drop_topotask_integration_tables.sql
- [ ] Añadir tipos TypeScript en `shared/types.ts` para obras/campanas/faenas
- [ ] Aplicar migraciones 016-017 tras backup

---

**Documentado por:** Claude Code  
**Fecha:** 2026-07-26  
**Decisor pendiente:** Erick
