# MEMORIA.md — TopoField, estado de decisiones (rework)

**Última actualización:** 26 de julio de 2026
**Rol de este archivo:** punto de entrada único para saber qué se decidió, qué se verificó y qué sigue pendiente sobre el rework de TopoField. Si hay contradicción entre este archivo y un resumen anterior (incluida cualquier auditoría externa), **manda lo verificado aquí**, con fecha de verificación.

Documentos relacionados:
- `TOPOFIELD_PLAN_MAESTRO_REWORK_2026-07-26.md` (fuera del repo, en la carpeta compartida) — plan de rework auditado con Codex/ChatGPT/Claude.
- `TOPOFIELD_ADDENDA_APROBACION_2026-07-26.md` (fuera del repo) — enmiendas 1–5 al plan anterior.
- `PLAN.md` (este repo) — plan de producto/UX anterior, centrado en piloto y validación de usabilidad. **No sustituido**, pero desactualizado respecto al estado real de Supabase (ver §3).
- `PRODUCT_STRATEGY.md`, `UX_RESEARCH_PLAN.md`, `LAUNCH_PLAN.md` — siguen vigentes como referencia de producto/UX, no verificados en esta sesión.

---

## 1. Decisión tomada

**El plan maestro de rework está aprobado, con 5 enmiendas.** No se reescribe la aplicación. Se hace un rework por capas empezando por reconciliar el estado real (§3 de este archivo, ampliado hoy) antes de tocar nada.

Resumen de las enmiendas aprobadas:

1. **Validación de usuario:** el autor es el usuario piloto desde la semana 1; el piloto de varios trabajadores se pospone, no se cancela.
2. **Modelo de faenas reducido:** 5 tablas en vez de 10 (`work_items`, `project_work_items`, `work_events` append-only, `work_evidence`, `import_batches`). Se pospone `work_plans`/`work_occurrences`/`work_reviews` hasta que alguien pida reasignación o aprobación.
3. **Presupuesto de tiempo:** 5–10 h/semana declaradas. Fases 0→3 en un trimestre. El aislamiento multi-tenant (RLS) sustituye al planificador como prioridad, porque hay intención de venta a terceros.
4. **Regla de agentes:** un solo agente escribiendo en una rama a la vez; se descarta la jerarquía "Codex ejecutor / Claude revisor" (era circunstancial, no una capacidad real).
5. **Riesgo de titularidad:** el catálogo de faenas y los nombres de obra son activos operativos del empleador; los datos medidos pertenecen a terceros (clientes de auscultación). Ver §5.

Evaluación honesta de la app antes de esta expansión, con instrumentos aún sin terminar (solo estaciones/prismas/incidencias/guía/fotos, desplegado en producción): **6.5/10 como primera app**. Bien: backend en capas, migraciones incrementales, tests de backend, `expo-secure-store`, RLS realmente activo en producción (ver corrección en §4). Mal: sin cola offline pese a ser la promesa central, cero tests móviles, `Station` mezcla conceptos, datos reales de obra commiteados en el historial de Git.

---

## 2. Corrección — TopoTask no es contaminación

Una hipótesis previa (mía, basada en una auditoría externa sin acceso al repo) decía que TopoField y TopoTask compartían base de datos por error. **Verificado hoy contra Supabase real: es falso.**

- `topofield` (id `tmlexrsnxpmykbpeebri`, creado 2026-05-29, eu-north-1) y `topotask-backend` (id `jwckuoiossieiyankkvh`, creado 2026-06-13, eu-west-1) son **dos proyectos Supabase separados**, sin base compartida.
- El único vínculo real es una importación deliberada y cuidadosa (mayo 2026, documentada en `C:\Users\guill\Documents\Aplicacion_Movil\MEMORY.md` líneas ~452–514): `apps/backend/src/scripts/import-topotask-prisms.ts`, dry-run por defecto, deduplicación por hash, 171 prismas candidatos, 1889 lecturas históricas importadas a `prisms`/`prism_observations`. Es una migración de datos legítima, no un descuido.

No excluir estos datos de futuros análisis. Sí mantener la regla general de parar y preguntar cuando aparezcan datos de un proyecto distinto sin anunciar — esta vez la duda estaba justificada, la conclusión inicial no.

---

## 3. Hallazgo crítico — deriva de esquema no versionada (verificado 2026-07-26)

Esto es más grave que "6 commits locales por delante de `origin/main`" (que sigue siendo cierto y sigue pendiente de resolver). Verificado con las herramientas de Supabase, de solo lectura:

**Corrección importante (26-07-2026, tras el informe de Fase 0 de Claude Code):** dije antes "0 filas en todas, sin riesgo de datos". Es falso — verificado con `COUNT(*)` real, no con el campo `rows` de `list_tables` (que es una estimación estadística de Postgres, `pg_class.reltuples`, y puede mostrar 0 aunque haya datos reales sin actualizar). Conteos reales:

| Tabla | Filas reales |
|---|---:|
| `sensores` | 72 |
| `mediciones` | 145 |
| `estacionamientos` | 22 |
| `profiles` | 11 |
| `campanas` | 7 |
| `obras` | 6 |
| `total_station_imports` / `total_station_observations` | 2 (datos de prueba) |
| `jornadas`, `leveling_imports` | 0 |

**Consecuencia:** la familia "obras" (`obras`/`campanas`/`jornadas`/`sensores`/`mediciones`/`estacionamientos`) no es un experimento vacío — son 76 semanas-obra de datos operativos reales. Cualquier decisión de adaptar, migrar o descartar esta familia exige la misma disciplina de no-sobrescritura-silenciosa que el resto del proyecto (ver regla de oro metrológica del plan maestro). Ya no es una decisión de "cero riesgo".

**Lección de método:** para verificar filas reales en Supabase, usar `execute_sql` con `COUNT(*)`, nunca el campo `rows` de `list_tables`.

**8 migraciones aplicadas directamente en Supabase, sin archivo correspondiente en `apps/backend/migrations/`:**

| Versión | Nombre |
|---|---|
| 20260621124104 | total_station_staging |
| 20260621130517 | total_station_commit_traceability |
| 20260621131650 | commit_total_station_import_rpc |
| 20260621131925 | harden_total_station_commit_rpc_sequences |
| 20260621184721 | rollback_total_station_commit_batch_rpc |
| 20260622050516 | grant_total_station_commit_sequence_update |
| 20260627061243 | allow_campaign_delete_for_total_station_commit_history |
| 20260627061836 | allow_import_cleanup_for_total_station_commit_history |

**14 tablas en producción sin correspondencia en `shared/types.ts` local ni en las migraciones 001–014 versionadas:**

`obras`, `sensores`, `jornadas`, `campanas`, `estacionamientos`, `mediciones`, `incidencias`, `incidencia_fotos`, `obra_destinatarios`, `envios_correo`, `profiles`, `station_readings`, `work_sessions`, `capture_logs` — más toda la familia `total_station_*` (`total_station_imports`, `total_station_setups`, `total_station_observations`, `total_station_reduced_points`, `total_station_reduced_point_observations`, `total_station_commit_batches`, `total_station_commit_links`) y `leveling_*` (`leveling_imports`, `leveling_import_rows`, `leveling_import_issues`, `leveling_import_commits`).

**Lectura de esto:** ya existe en producción, construido por otra vía (probablemente Codex trabajando directo contra Supabase en otra sesión, sin dejar commit en git), buena parte de lo que el plan maestro propone construir — nivelación, estación total, e incluso una versión en español de "obras/jornadas/mediciones" que se parece al patrón que describiste del Excel (obra → faena por instrumento → cierre). **No se puede escribir un plan de "qué construir" sin inventariar primero qué de esto ya existe, qué sirve, y qué se descarta.**

**Esto se convierte en la ampliación obligatoria del encargo de Fase 0** (ver `TOPOFIELD_ADDENDA_APROBACION_2026-07-26.md` §7): antes de diseñar cualquier tabla nueva de faenas, inventariar estas 8 migraciones y 14+ tablas con detalle de columnas, políticas RLS reales y relaciones — sin aplicar nada, sin modificar nada.

---

## 4. Corrección — RLS sí está activo

Dije antes que las migraciones no tenían RLS y por tanto "no había RLS verificado". Eso era cierto solo de los **archivos locales** (001–014, cero sentencias `ENABLE ROW LEVEL SECURITY`). Verificado hoy contra la base real: **RLS está activo en las 37 tablas del proyecto `topofield`** (`rls_enabled: true` en todas, incluidas las 14 tablas no versionadas de §3). El advisor de seguridad de Supabase solo señala un aviso menor: protección de contraseñas filtradas desactivada (`auth_leaked_password_protection`, nivel WARN).

**Lo que sigue siendo cierto y sigue siendo un problema:** esas políticas RLS no están en ningún archivo versionado — existen solo en la base. Si se restaura el proyecto desde los archivos del repo, esas políticas no se recrean. Sigue pendiente volcarlas a un `NNN_rls_baseline.sql` de solo lectura (sin aplicar), tal como pedía la enmienda del encargo de Fase 0.

---

## 5. Riesgo de titularidad y exposición — estado

- Repositorio **privado** (confirmado por Erick, 26-07-2026) — baja la urgencia de exposición pública inmediata.
- Nombres reales de obra (***REMOVED***, ***REMOVED***, ***REMOVED***, etc.) están commiteados en `origin/main`, no solo en local (`apps/backend/migrations/002_projects_and_station_project_fk.sql`, `data/mapEst/stations.json`, `data/project-memberships.json`, varios `.md`).
- **"Purgar el historial de Git" en simple:** Git guarda cada versión de cada commit para siempre; borrar el archivo hoy no borra las versiones antiguas donde ya existía. Purgar significa reescribir el historial completo (herramienta: `git filter-repo`) para que esos datos nunca hayan estado ahí — cambia todos los hashes de commit y exige forzar esa versión sobre GitHub. Es una operación destructiva y no se ejecuta sin autorización explícita en el momento.
- **Disparador de esa purga:** antes de la primera demo a un cliente potencial, antes de dar acceso a un colaborador externo, o antes de plantear abrir el repositorio. No es urgente hoy porque el repo es privado.
- Tres capas de datos a distinguir (no dos): (1) patrón funcional genérico obra→faena→check — libre de usar; (2) proceso concreto del empleador (48 faenas, frecuencias) — solo con permiso, nunca como catálogo semilla del producto a vender; (3) datos de terceros (clientes reales de auscultación cuyos activos se miden) — nunca deben salir del uso interno.
- Pendiente: permiso por escrito del empleador que distinga "usar TopoField en obra" de "ser propietario del código".

---

## 6. Siguiente paso único (revisado)

El encargo de investigación de solo lectura de la Fase 0 (ver adenda §7) se amplía con un punto nuevo, y pasa a ser el más importante de la lista:

> Inventariar las 8 migraciones no versionadas (`total_station_*`) y las 14+ tablas sin correspondencia local (`obras`, `jornadas`, `mediciones`, `campanas`, etc.): qué columnas tienen, qué políticas RLS reales aplican, si tienen datos (hoy: 0 filas en todas, según `list_tables`), y si conviene versionarlas retroactivamente como migraciones locales o descartarlas.

Nada se aplica, nada se modifica, hasta cerrar ese inventario.

**Evidencia de que este archivo está al día:** cada sección lleva su propia verificación (`list_projects`, `list_tables`, `list_migrations`, `get_advisors`, `git log`) ejecutada el 26-07-2026. Si en una sesión futura estos hechos no coinciden con lo que se observa, gana lo observado, y este archivo se corrige de nuevo con la fecha nueva — igual que se corrigió hoy la hipótesis de TopoTask.

---

## 7. Decisión pendiente — fisurómetro, extensómetro, clinómetro

Erick preguntó (26-07-2026) si estos tres instrumentos estaban contemplados. Verificado:

- **No están diseñados** en el plan maestro ni en la adenda. Solo 4 disciplinas tienen estructura propia: nivelación, estación total, inclinometría, cuerda vibrante/piezómetro. Extensómetro aparece una vez, como referencia a un producto SISGEO, no como disciplina.
- **Sí existe una etiqueta genérica en el código ya desplegado** (`shared/types.ts`, `InstrumentType`, y `apps/backend/src/utils/monitoring-validation.ts`): 7 valores (`total_station`, `digital_level`, `piezometer`, `distometer`, `linometer`, `inclinometer`, `cant_rule`). `distometer`/`linometer` no son nombres estándar del sector — probablemente un intento rápido de traducir fisurómetro/clinómetro sin asentar vocabulario.
- **Hallazgo más importante:** detrás de los 7 tipos hay una sola tabla de lectura genérica (`createInstrumentReadingSchema`: `valueNumeric | valueText` + `unit` texto libre + `rawPayload` JSON). Es exactamente el antipatrón que el propio plan prohíbe en §8 ("un único InstrumentReading(value, unit) no es suficiente") — y ya está construido en migración 014 (monitoring rounds MVP, aún no publicada en `origin/main`), no solo propuesto. Ni inclinómetro ni piezómetro usan hoy una estructura propia real pese a estar "diseñados" en el papel.

**Familia estructural (para cuando llegue el momento, no ahora):** fisurómetro, extensómetro y clinómetro miden desplazamiento o inclinación relativa entre puntos fijos de referencia (mm o grados) — familia distinta de inclinómetro (perfil de profundidad en sondeo) y piezómetro (frecuencia/presión). Probablemente comparten una estructura de observación con validación propia por tipo, no una tabla por instrumento ni el blob genérico actual.

**Decisión:** no diseñar ni construir tablas para estos tres ahora. El plan exige que una disciplina complete una campaña real antes de abrir la siguiente (Fase 6), y ni piezómetro ni inclinómetro lo han hecho todavía. Construir esto ahora sería la sobreingeniería que el plan advierte evitar.

**Se añade al inventario de §6:** revisar si el blob genérico de `createInstrumentReadingSchema` debe entrar en el mismo inventario de deriva de esquema, ya que es el mismo problema de fondo (estructura genérica donde el dominio exige estructura propia).

---

## 8. Plan de fases consolidado (2026-07-26)

Este plan **sustituye** la lista de fases de `TOPOFIELD_PLAN_MAESTRO_REWORK_2026-07-26.md` para efectos de ejecución (las enmiendas de la adenda ya están incorporadas). `PLAN.md` sigue vigente como referencia de producto/UX donde no contradiga esto.

| Fase | Objetivo | Cambio respecto al plan original |
|---|---|---|
| **0 — Reconciliación total** | Una sola verdad antes de programar | **Ampliada.** Ya no es solo git vs `origin/main`. Incluye inventariar las 8 migraciones y 22+ tablas de §3 (0 filas cada una, sin riesgo de datos) y decidir por tabla: aprovechar/adaptar/descartar. Salida añadida: `015_rls_baseline.sql` con las políticas reales. |
| **1 — Contrato de producto y dominio** | Diseñar antes de crear tablas | **Completada 26-07-2026.** ADR 001: se adopta y adapta `obras/campanas/jornadas/sensores/mediciones/estacionamientos` (no el modelo de 5 tablas de la enmienda 2 desde cero — se descartó por tener 0 datos frente al historial real). Limpieza incluida: `profiles`→`users` unificado, 4 tablas TopoTask eliminadas. Catálogo semilla genérico/real (enmienda 5) sigue pendiente. |
| **2 — Base fiable y offline** | Motor que usan todas las operaciones | **Motor offline cerrado (28-07-2026).** SQLite versionado, outbox persistente, sync engine (flush/retry/backoff/conectividad), estados pending/syncing/synced/error/conflict, mock de test respaldado por SQLite real (`node:sqlite`) — 25/25 tests pasan, incluidos los 2 bugs reales que ese mock expuso y ya se corrigieron (backoff en UTC, desempate de orden). **Fase 2 completa sigue abierta:** faltan (a) soporte de `client_request_id` en backend para idempotencia real (diseño listo, ver §9 28-07-2026, implementación pendiente de Claude Code) y (b) prueba end-to-end en dispositivo real por cable (pendiente de Codex). Sin (a), un reintento de red puede duplicar un `station_message` en servidor; sin (b), el motor nunca se ha probado fuera de Jest. |
| **3 — MVP de faenas semanales** | Sustituir el Excel | **Bloqueada hasta cerrar Fase 2 completa** (dependencia explícita del plan maestro: Fase 3 depende de Fase 2, incluyendo idempotencia de backend y prueba en dispositivo, no solo el motor offline). Ahora se construye sobre `obras/campanas/jornadas/sensores/mediciones/estacionamientos` adaptadas, no sobre el modelo de 5 tablas. Erick es usuario piloto desde semana 1 (enmienda 1); no se espera reclutar equipo. |
| **4 — Migración y compatibilidad Excel** | Incorporar datos sin copiar errores | Sin cambios. |
| **5 — Seguridad, pruebas y piloto** | Revisión y firma | Foco añadido: pruebas de fuga entre obras (multi-tenant), por la intención de venta a terceros (enmienda 3). Piloto en dos pasos: Erick solo, luego equipo con permiso escrito. |
| **6 — Instrumentos y campañas** | Disciplinas geotécnicas | Orden: piezómetro/inclinómetro primero, reemplazando el blob genérico de lectura (§7) por estructura propia. Fisurómetro/extensómetro/clinómetro después, no ahora. |
| **7 — Integraciones** | Conectar con plataformas de cálculo | Sin cambios. |

**Aviso de calendario:** con 5–10 h/semana declaradas, el objetivo "Fases 0→3 en un trimestre" (enmienda 3) puede apretarse al haber ampliado la Fase 0. No se ajusta la cifra hoy; se revisa al cerrar el inventario de Fase 0.

**Herramienta recomendada para ejecutar (2026-07-26):** Claude Code para el trabajo de código (Fase 0 en adelante) — el repo ya usa la convención `AGENTS.md`/`CLAUDE.md` con imports, y las fases dependen de herramientas locales (adb, emulador, Expo) que un entorno Cowork no tiene de forma directa. Cowork para auditoría, decisiones de producto/IP y mantener este archivo al día entre sesiones. Regla que no cambia (enmienda 4): un solo agente escribiendo en una rama a la vez.

**Decisión de Erick (26-07-2026): usar ambos, Claude Code y Cowork, para hacer commits.** Aceptado, con protocolo obligatorio en `AGENTS.md` ("Reglas permanentes para cualquier agente") y registro de sesiones en §9 más abajo, para que nunca escriban a la vez sobre la misma rama.

**Estado del acceso de Cowork a GitHub (verificado 26-07-2026):** sin acceso funcional todavía. `git push --dry-run` falla por falta de credenciales en el entorno aislado de Cowork; no hay conector de GitHub conectado en el registro de MCP. Para habilitarlo: generar un token de acceso personal de GitHub de tipo *fine-grained*, limitado a este único repositorio (`Erickconestilo/La-Libreta-del-Peon`), con permiso de contenido lectura/escritura y expiración corta (30–90 días); no hace falta todavía porque la Fase 0 no genera commits.

---

## 9. Registro de sesiones (control de escritura entre agentes)

Regla: antes de modificar archivos o commitear, añadir una fila aquí con estado `abierto`. Al terminar, cambiar a `cerrado`. Si hay una fila `abierto` de otro agente sobre la misma rama, no escribir — avisar a Erick primero.

| Fecha | Agente | Rama | Tarea | Estado |
|---|---|---|---|---|
| 2026-07-26 | Cowork | — | Auditoría, adenda, evaluación, corrección TopoTask, inventario inicial Supabase, plan de fases consolidado | cerrado (solo lectura/documentación, sin commits) |
| 2026-07-26 | Claude Code | main | Fase 0: inventario completo de 8 migraciones no versionadas, 23 tablas Supabase, reconciliación 6 commits locales, análisis de riesgo y recomendaciones (sin aplicar nada) | cerrado |
| 2026-07-26 | Cowork | — | Segunda lectura del informe de Fase 0 de Claude Code: verificación de conteos reales (COUNT(*)), corrección de §3 (había datos, no cero), corrección de una cita errónea sobre §8 | cerrado (solo lectura) |
| 2026-07-26 | Claude Code | phase-1-domain-contract | Fase 1: ADR formalizando modelo obras/campanas/faenas, migración 015_obras_baseline.sql (retroactiva), recomendación obras/projects y profiles/users | cerrado |
| 2026-07-26 | Cowork | phase-2-fix-mocks | Arreglar mock de expo-sqlite en jest.setup.js para que los 21 tests fallidos de outbox.test.ts/sync-engine.test.ts pasen con un mock que simule estado real, no valores fijos. Excepción puntual a la regla 2 (reparto por área): tarea de solo Jest/Node, sin dispositivo ni emulador. | cerrado (23/25 verde; 2 fallos son bugs reales de producción, no del mock — ver §12) |
| 2026-07-26 | Claude Code | phase-2-cleanup | Limpieza de Fase 1 (mal etiquetada como "Fase 2"): migración 016 (unificar profiles→users), migración 017 (DROP tablas TopoTask) | cerrado |
| 2026-07-26 | Claude Code | phase-2-offline-engine | Fase 2 PARCIAL: PARTE 1 tipos TS obras/campanas/faenas (✅), PARTE 2 estructura base motor offline (test runner, SQLite schema, outbox API, diseño) — slice vertical pendiente | cerrado |
| 2026-07-26 | Claude Code | phase-2-offline-engine | Fase 2 CIERRE: verificar npm install/test, sync engine (flush/retry/conectividad), slice vertical 1 (station message por outbox), tests persistencia/sync/idempotencia | cerrado (parcial) |
| 2026-07-28 | Cowork | phase-2-fix-mocks | Arreglar los 2 bugs reales encontrados al validar el mock: (1) parseo de fecha como hora local en sync-engine.ts, (2) desempate de orden en outbox.ts. Erick autorizó explícitamente que siga Cowork ("sigue tu"), excepción puntual a regla 2, entrega luego a Codex para continuar con la app. | cerrado (25/25 tests verdes) |
| 2026-07-28 | Cowork | — | Diseño de ingeniería completo para clientRequestId en backend (migración 018, validación, modelo con INSERT ON CONFLICT idempotente, controller) — solo diseño y documentación, sin escribir código de apps/backend. Implementación queda para Claude Code. | cerrado (solo diseño/documentación) |

---

## 10. Segunda lectura del informe de Fase 0 (Cowork, 26-07-2026)

**Calidad del informe: buena.** Estructura correcta, separa commits seguros de bloqueados con motivo, y los tres documentos que dice haber entregado (`FASE_0_INVENTARIO_COMPLETO.md`, `FASE_0_INVENTARIO_RAW.txt`, `apps/backend/src/scripts/inventory-supabase-schema.ts`) existen de verdad con contenido, verificado por tamaño de archivo — no es un resumen inventado. Siguió el protocolo de §9 correctamente (registró y cerró su fila).

**Corrección aplicada:** los conteos de filas del informe eran correctos; la memoria de Cowork decía lo contrario y ya se corrigió en §3.

**Corrección a una afirmación del informe:** dice que la "Opción C" (mantener temporalmente el modelo `obras` y la migración 014 en paralelo) está "prohibida por el plan maestro §8". Revisado el documento original: no es así. La única frase sobre "no en paralelo" pertenece al §7 (Fase de integraciones con fabricantes, no a modelos de datos internos). El propio §8, para el problema equivalente de `Station`, recomienda explícitamente la convivencia temporal deliberada ("introducir entidades nuevas junto al modelo legado... retirar el significado ambiguo al final"), no la prohíbe.

**Recomendación de Cowork para la decisión de Fase 1** (input, no decisión final — la decisión formal es de Erick vía ADR):

Con los datos reales ahora confirmados, la familia "obras" deja de ser un experimento descartable: es 76 semanas-obra de historial ya poblado (72 sensores, 145 mediciones). Adaptarla como base del modelo de faenas es probablemente menos trabajo y menos riesgo que migrar ese historial real hacia una tabla nueva. La migración 014 (monitoring_rounds) tiene 0 datos y usa el blob genérico de lectura ya señalado como antipatrón en §7 de este archivo — no aporta ninguna ventaja sobre adaptar lo que ya funciona.

`total_station_*` y `leveling_*` no son parte de esta decisión: resuelven un problema distinto (campañas de instrumento, Fase 6), no el de faenas semanales (Fase 3), y ambos se conservan de forma independiente.

**Decisión formal de Erick (26-07-2026): adaptar la familia "obras" como base del modelo de faenas.** Migración 014 (monitoring_rounds) no se aplica — queda descartada para este propósito, no se migra el historial real hacia ella. `total_station_*`/`leveling_*` se conservan sin cambios, resuelven Fase 6.

**Siguiente paso concreto para Fase 1:** redactar el ADR de dominio (§1 de la adenda) formalizando `obras`→`campanas`→`jornadas`→`sensores`→`mediciones`→`estacionamientos` como el contrato de faenas, documentar sus columnas reales vía migración retroactiva (`015_obras_baseline.sql`, sin aplicar — ya existe en Supabase), y decidir el nombrado/ajustes mínimos necesarios (p. ej. si `obras` se unifica o convive con `projects`, y si `profiles` se unifica con `users`). Las 4 tablas de integración TopoTask (telegram, correo) quedan descartadas, confirmando la recomendación del informe de Fase 0.

---

## 11. Fase 2 aplicada — verificación de Cowork (26-07-2026)

**Resultado: correcto, con una afirmación falsa en el reporte que se corrige aquí.**

Verificado directo contra Supabase tras la ejecución de Claude Code (migraciones 016 y 017):

- `profiles` eliminada, 0 referencias en `information_schema`. `incidencias`, `incidencia_fotos`, `obra_destinatarios`, `envios_correo` eliminadas — confirmado, no solo reportado.
- `users`: 15 filas reales (antes 4). Datos consistentes: 10 filas con `legacy_usuario_id` 1–10 sin huecos ni duplicados, más 1 fila migrada (`remoteonly-...@topotask.local`) sin ID legacy porque nunca lo tuvo en origen — el reporte decía "11 migradas", que es correcto; la aparente discrepancia con "10" se explica y no es un fallo.
- Commits `77508b9`, `9c42512`, `87565fb` reales, sincronizados con `origin/main` (0 de diferencia).

**Corrección importante:** el reporte afirmó que `backups_topofield/backup_manifest_app_movil_2026-07-26.json` era "válido para rollback". Es falso — la nota interna del propio archivo dice explícitamente que **no** exporta filas y que su objetivo es solo comparar checksums, no restaurar. Además cubre las tablas nativas de TopoField, no `profiles`. El otro respaldo (`backup_topotask_tables_2026-07-26.json`) sí tiene datos fila por fila, pero tampoco incluye `profiles` — solo las 4 tablas TopoTask (que estaban vacías, así que ahí no hubo pérdida real). Ambos respaldos son de las 07:51 de esta mañana, de un trabajo de separación TopoTask anterior a esta sesión — **no se generó ningún respaldo nuevo específico para esta migración**, pese a que se pidió explícitamente en el encargo.

**Consecuencia:** las 11 filas reales de `profiles` se migraron sin un respaldo restaurable propio. No hay nada que corregir retroactivamente (la tabla ya no existe y el estado final se ve correcto por inspección directa), pero no se puede afirmar con certeza absoluta que no hay ninguna fila con un dato mal mapeado, más allá de lo que la inspección directa ya descartó (sin duplicados, sin huecos en la secuencia).

**Lección para próximas migraciones destructivas (aplica a Fase 3 en adelante):** exigir un respaldo fila-por-fila generado en el momento de la tabla específica que se va a modificar o eliminar, no aceptar la reutilización de un respaldo preexistente de otro propósito sin verificar que cubre exactamente las tablas afectadas.

---

## 12. Bitácora de avances (una línea por hito, con contexto)

Regla (26-07-2026): cada avance real —fase completada, decisión tomada, corrección aplicada, hallazgo importante— se añade aquí en el momento, con una frase corta que dé idea y contexto. No sustituye las secciones detalladas de arriba; es el resumen rápido para no tener que leer todo el archivo.

- **2026-07-26 — Auditoría inicial (Cowork):** plan maestro de rework aprobado con 5 enmiendas; modelo de faenas reducido de 10 a 5 tablas por presupuesto de tiempo real (5-10h/semana).
- **2026-07-26 — Corrección TopoTask:** no es contaminación, son dos proyectos Supabase separados; el único vínculo es una importación de datos históricos legítima de mayo.
- **2026-07-26 — Fase 0 (Claude Code):** reveló deriva de esquema masiva — 8 migraciones y 23 tablas ya construidas en Supabase sin archivo local, incluida una familia "obras" con datos reales (72 sensores, 145 mediciones).
- **2026-07-26 — Corrección de conteos:** Cowork había dicho "0 filas, sin riesgo" basado en una estimación de Postgres poco fiable; los datos reales existían desde el principio.
- **2026-07-26 — Decisión Fase 1:** adoptar la familia "obras" como modelo de faenas; migración 014 (monitoring_rounds) descartada por tener 0 datos y usar un blob de lectura genérico.
- **2026-07-26 — Fase 1 fusionada a main:** ADR 001 + migración 015 documental + `deprecated/014` con explicación; incluye condición explícita de reconciliación obras/projects (no convivencia indefinida).
- **2026-07-26 — Fase 2 aplicada a producción:** `profiles` (11 filas) unificada en `users`; 4 tablas TopoTask (0 filas) eliminadas. Primer cambio destructivo real del rework.
- **2026-07-26 — Corrección de respaldo:** el respaldo citado como "válido para rollback" en Fase 2 no lo era (solo checksums, no cubría `profiles`); no hubo pérdida de datos pero fue suerte, no proceso. Regla 9 añadida a `AGENTS.md`.
- **2026-07-26 — Limpieza de carpeta raíz:** 274 capturas de depuración obsoletas (68 MB) archivadas y luego eliminadas de `Aplicacion_Movil/`, sin tocar `topofield/`.
- **2026-07-26 — Tres agentes coordinados:** Codex sumado (track móvil/builds), Claude Code (backend/dominio), Cowork (auditoría/memoria); protocolo de un solo agente por rama en `AGENTS.md`.
- **2026-07-26 — Corrección de numeración de fases:** la limpieza de `profiles`/TopoTask se llamó "Fase 2" pero en realidad era limpieza dentro de Fase 1. La Fase 2 real (motor offline: SQLite, outbox, estados de sincronización) no se ha empezado. Fase 3 (pantallas de faenas) queda bloqueada hasta cerrarla — construir faenas sin motor offline no cumpliría la promesa central de la app (funcionar sin cobertura).
- **2026-07-26 — Fase 2 iniciada (PARCIAL):** PARTE 1 completa (tipos TS obras/campanas/faenas en `shared/obras-types.ts`). PARTE 2 estructura base: test runner (Jest), SQLite schema (migración 001, tabla outbox), outbox API, diseño documentado en `lib/offline/DESIGN.md`. Pendiente: sync engine, slice vertical completo (Station Message), tests. Fase 2 no cerrada, Fase 3 sigue bloqueada.
- **2026-07-26 — Fase 2 CIERRE PARCIAL (Claude Code):** npm test confirmado funcionando sin errores de binario. Sync engine implementado (flush/retry/backoff/conectividad), outbox API completo, slice vertical 1 (Station Message) integrado en hook. Tests escritos (21 fallan por mock de expo-sqlite simplificado, 4 pasan). Pendiente: mejorar mocks para que tests pasen, testing end-to-end en dispositivo, backend sin soporte clientRequestId todavía. Fase 2 no cumple criterio completo de salida, Fase 3 sigue bloqueada hasta resolver.
- **2026-07-28 — Mock de expo-sqlite arreglado (Cowork, rama `phase-2-fix-mocks`):** sustituido el mock de valores fijos por uno respaldado por `node:sqlite` (SQLite real embebido en Node 22, in-memory), que aplica CHECK/UNIQUE/datetime igual que producción. Resultado: 23/25 tests pasan. Los 2 que fallan son bugs reales, no defectos del mock — no se tocó `sync-engine.ts` ni `outbox.ts`: (1) `syncItem()` en `sync-engine.ts` parsea `last_sync_attempt_at` (string UTC que devuelve `datetime('now')` de SQLite) con `new Date(...)`, que en JS interpreta ese formato sin zona como hora **local**; en un huso distinto de UTC (ej. Europe/Madrid, UTC+2 en verano) el backoff exponencial queda roto — cree que ya pasó el tiempo de espera cuando no es así. Afectaría también en dispositivo real, no solo en tests. (2) `getPending()`/`getErrors()`/`getConflicts()` ordenan solo por `created_at` (precisión de 1 segundo); si dos items se encolan dentro del mismo segundo, el orden no está garantizado — falta un desempate (autoincrement o timestamp de mayor precisión). Pendiente decisión de Erick: quién arregla estos dos (por reparto de pistas le tocaría a Codex/apps-mobile, o excepción puntual como esta).
- **2026-07-28 — Los 2 bugs reales corregidos (Cowork, rama `phase-2-fix-mocks`):** Erick autorizó explícitamente seguir ("sigue tu"). (1) `sync-engine.ts`: nueva función `parseSqliteUtcDate()` fuerza el parseo del timestamp de SQLite como UTC (antes `new Date()` lo interpretaba como hora local, rompiendo el backoff fuera de UTC). (2) `outbox.ts`: `getPending/getErrors/getConflicts` añaden `rowid` como desempate tras `created_at` (que solo tiene precisión de 1 segundo), usando la columna implícita de SQLite que crece monótonamente con cada INSERT. **25/25 tests pasan.** Fase 2 queda con la suite de tests en verde; sigue pendiente el soporte de `clientRequestId` en el backend y la prueba end-to-end en dispositivo real antes de considerar Fase 2 cerrada del todo. Erick decidió que a partir de aquí retoma Codex para seguir con la app.
- **2026-07-26 — Falsa alarma de Cowork sobre "git status", corregida:** Cowork vio `git status --short` = 63 y Claude Code reportó 10, y concluyó (con la primera respuesta rápida de Erick a una pregunta de opción múltiple) que la sesión de Claude Code no era confiable. **Era al revés.** Erick pegó el output literal de su propia terminal: 10 archivos, coincidiendo con Claude Code. El entorno de Cowork tenía una **vista desactualizada de los cambios de archivo sin commitear** (los commits ya hechos y los datos de Supabase sí se verificaron bien durante todo el día; el problema es específico de archivos modificados en vivo por otro proceso, sin pasar por commit). **Corrección de proceso:** de aquí en adelante, para verificar `git status` de cambios *sin commitear*, confiar en el output que pegue Erick desde su propia terminal o el que reporte el agente, no en el bash de Cowork — Cowork sigue siendo fiable para commits ya hechos, contenido de archivos committeados, y consultas a Supabase.
