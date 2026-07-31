# FASE 0 — INVENTARIO COMPLETO DE RECONCILIACIÓN

**Fecha:** 2026-07-26  
**Agente:** Claude Code  
**Estado:** COMPLETO (solo lectura, sin commits)

> ⚠️ **Corrección (2026-07-29/30):** las menciones de `obras/campanas/jornadas/sensores/mediciones/estacionamientos` en este inventario describen tablas que en realidad viven en el proyecto Supabase `topotask-backend` (`jwckuoiossieiyankkvh`), no en `topofield` (`tmlexrsnxpmykbpeebri`, el que usa `apps/backend/.env`). El inventario de esta fase conflacionó los dos proyectos — ver `FASE_0_INVENTARIO_RAW.txt` para el porqué técnico y la corrección al inicio de `docs/adr/001-adopt-obras-schema-as-work-domain-model.md`. Para el estado real y verificado de tablas, usar `MEMORIA.md`, no este documento.

---

## 1. COMMITS LOCALES NO PUBLICADOS (6 commits por delante de origin/main)

| Hash corto | Mensaje | Autor | Fecha |
|---|---|---|---|
| 2d116f0 | chore: isolate legacy imports and harden verification tooling | Guillermo | 2026-06-27 22:59 |
| d0ba873 | fix(backend): verify photo storage objects before linking | Guillermo | 2026-06-27 22:58 |
| 81ed26c | docs: align roadmap with monitoring MVP | Guillermo | 2026-06-27 22:58 |
| d129136 | fix(backend): harden monitoring audit findings | Guillermo | 2026-06-27 22:26 |
| d39cf48 | test(backend): add node test runner | Guillermo | 2026-06-27 22:16 |
| 1948c16 | feat(backend): add monitoring rounds MVP | Guillermo | 2026-06-27 22:15 |

### Intención y riesgo

**1948c16 — feat(backend): add monitoring rounds MVP**
- **Intención:** Migración 014 (7 tablas nuevas: instrument_types, control_points, monitoring_rounds, monitoring_round_points, instrument_readings, reading_attachments, control_point_thresholds) + 2 auxiliares (project_code_catalog, project_rules). Incluye modelo TypeScript, controlador, rutas, validación, evaluación de lecturas, tests.
- **Riesgo:** Esta migración NO está aplicada en Supabase (solo 001-013 en `schema_migrations`). El código TypeScript referencia estas tablas pero Supabase no las tiene. Aplicarla sin antes reconciliar las tablas ya existentes (`obras`, `campanas`, `mediciones`, etc.) crearía dos modelos paralelos.
- **Recomendación:** **REVISAR** — esperar a decidir modelo de faenas (Fase 1) antes de aplicar.

**d39cf48 — test(backend): add node test runner**
- **Intención:** Habilitar `node --test` en package.json, crear `all.test.ts` como entrada, agregar tests de access-control y monitoring-reading-evaluation.
- **Riesgo:** Bajo. Tooling de desarrollo, no afecta producción.
- **Recomendación:** **CONSERVAR** — infraestructura de testing útil.

**d129136 — fix(backend): harden monitoring audit findings**
- **Intención:** Agregar validación de permisos en controladores (projects, stations, prisms, station-photos, monitoring). Respuesta a audit de seguridad.
- **Riesgo:** Bajo si los tests pasan. Mejora de seguridad.
- **Recomendación:** **CONSERVAR** — validación de acceso necesaria.

**81ed26c — docs: align roadmap with monitoring MVP**
- **Intención:** Actualizar PLAN.md con el estado de monitoring rounds MVP, añadir PRODUCT_STRATEGY.md, UX_RESEARCH_PLAN.md, LAUNCH_PLAN.md, SECURITY_AUDIT_PROGRESS.md.
- **Riesgo:** Ninguno, solo documentación.
- **Recomendación:** **CONSERVAR** — contexto de producto.

**d0ba873 — fix(backend): verify photo storage objects before linking**
- **Intención:** Añadir validación de existencia de objeto en storage antes de crear station_photos.
- **Riesgo:** Bajo. Prevención de links rotos.
- **Recomendación:** **CONSERVAR**.

**2d116f0 — chore: isolate legacy imports and harden verification tooling**
- **Intención:** Mover scripts de importación TopoTask a `legacy/`, añadir README, mejorar script de pre-APK verification.
- **Riesgo:** Ninguno, organización de código.
- **Recomendación:** **CONSERVAR**.

**Recomendación global de commits:** Push de 5/6 commits (todos excepto 1948c16). La migración 014 debe esperar a Fase 1.

---

## 2. MIGRACIONES VERSIONADAS LOCALMENTE (apps/backend/migrations/)

| # | Archivo | Tablas creadas | Estado en Supabase |
|---|---|---|---|
| 001 | initial_schema.sql | users, stations, prisms, guide_entries, incidents, change_logs | ✅ Aplicada (2026-05-30) |
| 002 | projects_and_station_project_fk.sql | projects | ✅ Aplicada (2026-05-30) |
| 003 | station_map_data.sql | station_readings, work_sessions, capture_logs | ✅ Aplicada (2026-05-30) |
| 004 | station_external_ids.sql | (ninguna, solo ALTER) | ✅ Aplicada (2026-05-30) |
| 005 | prism_monitoring_observations.sql | prism_observations | ✅ Aplicada (2026-05-30) |
| 006 | expand_change_logs_entity_types.sql | (ninguna, solo ALTER) | ✅ Aplicada (2026-05-30) |
| 007 | storage_photo_bucket.sql | (ninguna, configuración storage) | ✅ Aplicada (2026-05-30) |
| 008 | station_visual_memory.sql | station_photos | ✅ Aplicada (2026-05-30) |
| 009 | reconcile_prism_observations_indexes.sql | (ninguna, solo índices) | ✅ Aplicada (2026-05-30) |
| 010 | project_images.sql | (ninguna, solo ALTER) | ✅ Aplicada (2026-05-30) |
| 011 | change_logs_project_entity.sql | (ninguna, solo ALTER) | ✅ Aplicada (2026-05-30) |
| 012 | station_messages.sql | station_messages | ✅ Aplicada (2026-05-30) |
| 013 | project_memberships.sql | project_memberships | ✅ Aplicada (2026-05-30) |
| 014 | monitoring_rounds.sql | instrument_types, control_points, monitoring_rounds, monitoring_round_points, instrument_readings, reading_attachments, control_point_thresholds, project_code_catalog, project_rules | ❌ NO aplicada |

**Total de tablas versionadas localmente (001-014):** 23 tablas  
**Aplicadas en Supabase:** solo las de 001-013 (13/14 migraciones)

---

## 3. TABLAS EN SUPABASE NO VERSIONADAS LOCALMENTE

**Total encontrado:** 37 tablas en `public`  
**Versionadas (001-013):** 14 tablas  
**NO versionadas:** 23 tablas

### 3.1. Familia "obras" (modelo en español, aparentemente TopoTask legacy)

| Tabla | Filas | RLS | Intención detectada | Recomendación |
|---|---|---|---|---|
| **obras** | 6 | ON | Proyectos de obra: id, nombre, ubicación, tipo, estado, fecha_inicio, notas. Equivalente a `projects` pero en español. | **REVISAR** — decidir unificar con `projects` o mantener separado (migración de TopoTask). |
| **campanas** | 7 | ON | Campañas de medición por obra: fecha, archivo_txt, estado, resumen estadístico (total_sensores, medidos, no_medidos, nuevos, cobertura_pct, mov_ok/prealerta/alerta, max_asiento/levante_mm). Incluye jornada_id FK. | **ADAPTAR** — estructura sólida para ciclos de medición. Evaluar si es el modelo correcto vs. monitoring_rounds (014). |
| **jornadas** | 0 | ON | Jornadas de trabajo por obra: topografo, fecha, notas, estado (abierta/cerrada). | **ADAPTAR** — patrón de sesión de trabajo. Equivalente potencial a `work_sessions` pero más explícito. |
| **sensores** | 72 | ON | Catálogo de puntos de control: código, lat/lng, cota_ref, east/north/z_local, itinerario, tipo_sensor (nivelacion por defecto), estado (activo). | **ADAPTAR** — equivale a `control_points` de 014 pero ya tiene datos reales. |
| **mediciones** | 145 | ON | Lecturas individuales: obra_id, campana_id, estacionamiento_id, sensor_id, point_id_csv, fecha_medicion, elev_medida, east_csv/north_csv, instrumento, comentario, desnivel, movimiento (ok/prealerta/alerta), estado_match, tipo_punto, coordenadas_ok, dist_xy_m, posible_typo, similar_a. | **ADAPTAR** — estructura rica de observación con validación integrada. |
| **estacionamientos** | 22 | ON | Setups de estación total: campana_id, nombre, fichero_origen, formato, operador, total_lecturas. | **ADAPTAR** — equivale a `total_station_setups` pero más simple. |
| **incidencias** | 0 | ON | Incidencias por jornada/sensor: motivo, notas. FK a jornada_id. | **CONSERVAR SI HAY FLUJO** — si el modelo de jornadas se mantiene. |
| **incidencia_fotos** | 0 | ON | Fotos de incidencias: telegram_file_id, bucket (topotask-incidencias), storage_path. | **DESCARTAR** — referencias a infraestructura TopoTask externa. |
| **obra_destinatarios** | 0 | ON | Configuración de envío de reportes por obra: empresa, email, formato (CSV), incluir_fotos, activo. | **DESCARTAR** — feature de integración TopoTask, no parte del core. |
| **envios_correo** | 0 | ON | Log de envíos de correo operativo: campana_id, enviado_por, destinatarios (JSONB), incidencias, temperatura, presión, adjuntar_rpd/informe_topotask, estado_envio (SIMULATED). | **DESCARTAR** — feature de integración TopoTask. |

**Análisis:** Este conjunto forma un modelo completo de auscultación geotécnica en español (`obra → campana → jornada → mediciones por sensor`). Es más maduro en términos de datos reales (6 obras, 72 sensores, 145 mediciones) que el modelo propuesto en migración 014 (0 filas en todas las tablas). Sin embargo, tiene referencias a TopoTask (telegram, correo operativo) que son infraestructura externa.

**Recomendación global:** **ADAPTAR las 6 tablas core** (obras, campanas, jornadas, sensores, mediciones, estacionamientos) como base del modelo de faenas en Fase 1, descartando las 4 de integración. Versionarlas retroactivamente como `015_legacy_monitoring_schema_baseline.sql` (sin aplicar, solo para documentar que ya existen).

### 3.2. Familia "total_station_*" (importación avanzada de estación total)

| Tabla | Filas | RLS | Intención | Recomendación |
|---|---|---|---|---|
| **total_station_imports** | 2 | ON | Control de importación de archivos de estación total: obra_id, filename, source_format, source_vendor, parser_version, file_hash, status (uploaded), imported_by. | **CONSERVAR** — trazabilidad de importación necesaria. |
| **total_station_setups** | 2 | ON | Configuración de setup: setup_code, setup_type, station_point_code, easting/northing/elevation, instrument_height, backsight_point_code/azimuth, orientation_method, coordinate_system, angular/linear_unit, raw_json. | **CONSERVAR** — estructura completa de setup topográfico. |
| **total_station_observations** | 2 | ON | Observaciones crudas: target_code, face, round_number, cycle_number, horizontal/vertical_angle, slope_distance, target_height, prism_constant, pressure/temperature/ppm, observed_at, quality_status (raw). | **CONSERVAR** — observaciones sin procesar. |
| **total_station_reduced_points** | 2 | ON | Puntos reducidos: target_code, easting/northing/elevation, reduction_method/version, quality_status (ok). | **CONSERVAR** — resultado de reducción de observaciones. |
| **total_station_reduced_point_observations** | 2 | ON | Relación m:n entre reduced_points y observations: role. | **CONSERVAR** — trazabilidad de qué observaciones generaron cada punto reducido. |
| **total_station_commit_batches** | 0 | ON | Control de commit de datos reducidos a mediciones: import_id, campana_id, confirmed_by, commit_mode (reduced_points_v1), status, summary_json, rolled_back_by/at, rollback_summary_json. | **CONSERVAR** — trazabilidad de commit con rollback. |
| **total_station_commit_links** | 0 | ON | Vínculos entre reduced_points y mediciones tras commit: measurement_id, sensor_id, elevation_source, reduction_method/version. | **CONSERVAR** — auditoría de qué medición proviene de qué punto reducido. |

**Análisis:** Pipeline completo de importación de estación total: `import → setup → observations → reduced_points → commit → links a mediciones`. Solo 2 filas de prueba, pero la estructura es sólida y tiene rollback. Es más avanzado que el modelo genérico de migración 014.

**Recomendación global:** **CONSERVAR** — versionar retroactivamente como `016_total_station_import_pipeline.sql` (sin aplicar). Es el pipeline de estación total que el plan maestro propone construir, ya construido.

### 3.3. Familia "leveling_*" (importación de nivelación)

| Tabla | Filas | RLS | Intención | Recomendación |
|---|---|---|---|---|
| **leveling_imports** | 0 | ON | Control de importación de archivos de nivelación: obra_id, target_campana_id, fecha_campana, filename, source_format (csv_normalized), parser_version, file_hash, status (uploaded), imported_by, confirmed_by. | **CONSERVAR** — pipeline de nivelación análogo al de estación total. |
| **leveling_import_rows** | 0 | ON | Filas importadas: row_number, codigo_punto_raw/normalized, fecha, desnivel_m, raw_json, resolved_sensor_id, resolution_note. | **CONSERVAR** — staging de datos de nivelación. |
| **leveling_import_issues** | 0 | ON | Issues de importación: code, severity, message, payload_json, resolved_by/at, resolution_type. | **CONSERVAR** — validación y resolución de errores. |
| **leveling_import_commits** | 0 | ON | Control de commit: campana_id, confirmed_by, summary_json. | **CONSERVAR** — trazabilidad de commit. |

**Análisis:** Pipeline análogo al de estación total, pero para nivelación. 0 filas (no usado todavía). Estructura sólida con staging + issues + commit.

**Recomendación global:** **CONSERVAR** — versionar como `017_leveling_import_pipeline.sql` (sin aplicar). Es el pipeline de nivelación que el plan maestro propone.

### 3.4. Tabla "profiles" (usuarios con roles de TopoTask)

| Tabla | Filas | RLS | Intención | Recomendación |
|---|---|---|---|---|
| **profiles** | 11 | ON | Perfiles de usuario: legacy_usuario_id, nombre, email, rol (topografo por defecto), activo, puede_enviar_correo_operativo, puede_adjuntar_informe_topotask. | **ADAPTAR** — tabla de usuarios paralela a `users`. Los flags de TopoTask no son relevantes. Evaluar unificar con `users` o mantener como extensión. |

**Recomendación:** **REVISAR** — decidir en Fase 1 si se unifica con `users` o se mantiene como tabla de perfil extendido.

---

## 4. ESTADO RLS

**Verificado:** TODAS las 37 tablas tienen `RLS: ON` en Supabase.  
**Contraste con MEMORIA.md §4:** Confirmado que RLS está activo en producción, pero las políticas no están versionadas.

**Pendiente:** Redactar `015_rls_baseline.sql` con las políticas reales (requiere acceso a pg_policy via UI de Supabase o RPC personalizada, no completado en este inventario porque el script no pudo acceder a pg_policy directamente).

---

## 5. RECONCILIACIÓN DE SCHEMA_MIGRATIONS

**Migraciones registradas en Supabase:** 13 (001-013)  
**Migraciones locales:** 14 (001-014)  
**Migración 014 (monitoring_rounds.sql):** NO aplicada en Supabase.

**Migraciones aplicadas sin registro en schema_migrations (inferidas por presencia de tablas):**
- Pipeline total_station_* (7 tablas) → ~8 migraciones mencionadas en MEMORIA.md §3 (20260621-20260627)
- Pipeline leveling_* (4 tablas) → no listadas en MEMORIA.md, pero claramente aplicadas
- Familia obras/campanas/jornadas/sensores/mediciones/estacionamientos (6 core + 4 integración TopoTask)
- profiles (1 tabla)

**Problema:** Las tablas existen pero no hay registro de cuándo ni cómo se aplicaron. No hay archivo SQL local que reproduzca estas estructuras.

**Recomendación:** Generar scripts SQL retroactivos de solo lectura (sin aplicar) que documenten estas estructuras:
- `015_legacy_monitoring_schema_baseline.sql` (obras, campanas, jornadas, sensores, mediciones, estacionamientos, incidencias, incidencia_fotos, obra_destinatarios, envios_correo, profiles)
- `016_total_station_import_pipeline.sql` (7 tablas total_station_*)
- `017_leveling_import_pipeline.sql` (4 tablas leveling_*)
- `018_rls_baseline.sql` (políticas RLS de todas las tablas)

Estos archivos NO se aplican (las tablas ya existen), solo documentan el estado real para que el repositorio sea fuente de verdad.

---

## 6. TABLA DE DECISIONES: COMMIT/TABLA → INTENCIÓN → RIESGO → ACCIÓN

### 6.1. Commits locales

| Commit | Intención | Riesgo | Acción |
|---|---|---|---|
| 2d116f0 | Organizar imports legacy | Ninguno | CONSERVAR → push |
| d0ba873 | Validar storage antes de link | Bajo | CONSERVAR → push |
| 81ed26c | Actualizar docs de producto | Ninguno | CONSERVAR → push |
| d129136 | Hardening seguridad | Bajo | CONSERVAR → push |
| d39cf48 | Añadir test runner | Ninguno | CONSERVAR → push |
| 1948c16 | Migración 014 (monitoring_rounds) | Alto — modelo paralelo a obras/campanas | REVISAR → esperar Fase 1, no push todavía |

**Acción inmediata:** Push de 5 commits, hold de 1948c16.

### 6.2. Tablas no versionadas (23 totales)

#### Familia "obras" (modelo de auscultación en español)

| Tabla | Filas | Intención | Riesgo | Acción |
|---|---|---|---|---|
| obras | 6 | Proyectos de obra | Duplica `projects` | ADAPTAR — unificar con projects o mantener separado, decisión Fase 1 |
| campanas | 7 | Ciclos de medición | Core del modelo | ADAPTAR — base del modelo de faenas |
| jornadas | 0 | Sesiones de trabajo | Core del modelo | ADAPTAR — equivalente a work_sessions mejorado |
| sensores | 72 | Catálogo de puntos de control | Core, tiene datos reales | ADAPTAR — equivale a control_points con datos |
| mediciones | 145 | Observaciones con validación | Core, tiene datos reales | ADAPTAR — equivale a instrument_readings con validación rica |
| estacionamientos | 22 | Setups de estación total | Core | ADAPTAR — equivale a total_station_setups simple |
| incidencias | 0 | Incidencias por jornada | Auxiliar, sin datos | CONSERVAR SI SE USA — depende de si jornadas se mantiene |
| incidencia_fotos | 0 | Fotos de incidencias | Referencias TopoTask | DESCARTAR — telegram_file_id no es local |
| obra_destinatarios | 0 | Config de envío de reportes | Integración TopoTask | DESCARTAR — no core |
| envios_correo | 0 | Log de emails operativos | Integración TopoTask | DESCARTAR — no core |

**Recomendación de familia:** Versionar las 6 core (obras, campanas, jornadas, sensores, mediciones, estacionamientos) como `015_legacy_monitoring_schema_baseline.sql`. Descartar las 4 de integración TopoTask. Decidir en Fase 1 si se adapta este modelo o se usa monitoring_rounds (014).

#### Familia "total_station_*" (pipeline avanzado de estación total)

| Tabla | Filas | Intención | Riesgo | Acción |
|---|---|---|---|---|
| total_station_imports | 2 | Control de importación | Trazabilidad | CONSERVAR — versionar como 016 |
| total_station_setups | 2 | Configuración de setup | Core pipeline | CONSERVAR |
| total_station_observations | 2 | Observaciones crudas | Core pipeline | CONSERVAR |
| total_station_reduced_points | 2 | Puntos reducidos | Core pipeline | CONSERVAR |
| total_station_reduced_point_observations | 2 | M:N observations-points | Trazabilidad | CONSERVAR |
| total_station_commit_batches | 0 | Control de commit | Trazabilidad | CONSERVAR |
| total_station_commit_links | 0 | Links a mediciones | Auditoría | CONSERVAR |

**Recomendación de familia:** CONSERVAR — versionar como `016_total_station_import_pipeline.sql`. Es el pipeline que el plan propone construir, ya construido.

#### Familia "leveling_*" (pipeline de nivelación)

| Tabla | Filas | Intención | Riesgo | Acción |
|---|---|---|---|---|
| leveling_imports | 0 | Control de importación | Trazabilidad | CONSERVAR — versionar como 017 |
| leveling_import_rows | 0 | Staging de filas | Core pipeline | CONSERVAR |
| leveling_import_issues | 0 | Validación y errores | Core pipeline | CONSERVAR |
| leveling_import_commits | 0 | Control de commit | Trazabilidad | CONSERVAR |

**Recomendación de familia:** CONSERVAR — versionar como `017_leveling_import_pipeline.sql`. Pipeline análogo al de estación total.

#### Tabla independiente

| Tabla | Filas | Intención | Riesgo | Acción |
|---|---|---|---|---|
| profiles | 11 | Perfiles de usuario con flags TopoTask | Duplica `users` parcialmente | REVISAR — decidir en Fase 1 si unificar con users |

---

## 7. ÚNICA RECOMENDACIÓN DE SIGUIENTE PASO

**Fase 0 está completa.** Los hallazgos críticos:

1. **Migración 014 (monitoring_rounds) NO está aplicada en Supabase** pese a estar commiteada localmente. El código TypeScript la referencia pero las tablas no existen.
2. **23 tablas existen en Supabase sin archivo de migración local**, organizadas en 3 familias coherentes:
   - **Familia "obras"** (6 core + 4 integración TopoTask) — modelo de auscultación en español con datos reales (72 sensores, 145 mediciones).
   - **Familia "total_station_*"** (7 tablas) — pipeline completo de importación de estación total con staging, reducción, commit y rollback.
   - **Familia "leveling_*"** (4 tablas) — pipeline análogo para nivelación.
3. **RLS está activo en todas las tablas** pero las políticas no están versionadas.

**Siguiente paso único (inicio de Fase 1):**

Decidir el modelo de faenas con evidencia en mano:
- **Opción A (aprovechar existente):** Adaptar la familia "obras" (campanas, jornadas, sensores, mediciones) como modelo de faenas, versionándola retroactivamente como 015 y descartando migración 014.
- **Opción B (partir de 014):** Aplicar migración 014 (monitoring_rounds) y migrar datos de "obras" a ese esquema, deprecando las tablas en español.
- **Opción C (híbrido):** Mantener ambos esquemas temporalmente, con obras/campanas como legacy y monitoring_rounds como nuevo, hasta validar que el nuevo cubre todos los casos de uso.

**Criterios de decisión:**
- La familia "obras" tiene **datos reales** (6 obras, 72 sensores, 145 mediciones) y estructura probada.
- Migración 014 tiene **diseño más genérico** (múltiples tipos de instrumento, thresholds por punto) pero 0 datos.
- El plan maestro (MEMORIA.md §8) prohíbe construir ambos — solo uno debe sobrevivir.

**Antes de esa decisión, completar la documentación:**
- Redactar (sin aplicar) `015_legacy_monitoring_schema_baseline.sql`, `016_total_station_import_pipeline.sql`, `017_leveling_import_pipeline.sql`.
- Redactar (sin aplicar) `018_rls_baseline.sql` extrayendo las políticas RLS reales desde la UI de Supabase.

**Pendiente de Erick:** Autorizar push de 5 commits (2d116f0, d0ba873, 81ed26c, d129136, d39cf48) y decidir opción A/B/C para modelo de faenas.

---

## 8. ANEXO: DETALLE DE COLUMNAS POR TABLA NO VERSIONADA

(Ver salida completa del script de inventario guardada en `/tmp/topofield-inventory.txt`)

---

**FIN DEL INVENTARIO DE FASE 0**
