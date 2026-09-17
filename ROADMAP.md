<!-- doc-status
estado: vivo
rol: roadmap
  verificado: 2026-09-18
-->

# ROADMAP.md — TopoField

**Este archivo es la única fuente de verdad sobre en qué fase está el proyecto y qué viene después.**

Si otro documento contradice a este en materia de fases, prioridades o siguiente paso, manda este. Los demás documentos vivos cubren otras preguntas: `MEMORIA.md` el porqué de cada decisión y la bitácora, `PRODUCT_STRATEGY.md` para quién y con qué límites, `UX_RESEARCH_PLAN.md` cómo se valida, `LAUNCH_PLAN.md` y `PILOT_READINESS_CHECKLIST.md` cómo se pilota.

## Por qué existe este archivo (2026-08-02)

Hasta hoy había **dos numeraciones de fases distintas y simultáneas**: `PLAN.md` (fases 1-8, eje producto/UX) y `MEMORIA.md` §8 (fases 0-7, eje datos/backend). No eran la misma cosa con dos nombres, pero se citaban indistintamente, así que "Fase 3" significaba dos trabajos diferentes según quién lo dijera. Esa ambigüedad es la causa concreta de repetir conversaciones ya cerradas.

Se resuelve con un solo eje, numerado `F0`–`F9`, y una tabla de equivalencias con los nombres antiguos para que la bitácora histórica siga siendo legible sin reescribirla. `PLAN.md` queda archivado en `docs/archive/`.

## Estado por fase

| Fase | Objetivo | Estado | Nombre antiguo |
|---|---|---|---|
| **F0** | Reconciliación: una sola verdad de esquema antes de programar | ✅ Cerrada (26-07-2026) | MEMORIA Fase 0 |
| **F1** | Contrato de dominio de auscultación | ✅ Cerrada con corrección (29-07-2026) — ADR 001 quedó supersedido: las tablas `obras/*` estaban en otro proyecto Supabase, no en el que usa el backend | MEMORIA Fase 1 |
| **F2** | Base offline fiable (outbox SQLite, sync, idempotencia) | ✅ Cerrada y validada en Galaxy real (29-07-2026) | MEMORIA Fase 2 |
| **F3** | MVP de auscultación: rondas, puntos de control, lecturas, umbrales, histórico, foto adjunta | ✅ Cerrada y validada en Galaxy real (31-07-2026) | MEMORIA Fase 3 / PLAN Fase 5 punto 7 |
| **F4** | Seguridad multi-tenant y preparación de release | ✅ Cerrada y **desplegada** (02-08-2026, ver evidencia abajo): auditoría por endpoint, 3 correcciones aplicadas, RLS activo en las 24 tablas, keystore y AAB firmado, D1 y D2 decididas. | MEMORIA Fase 5 |
| **F5** | **Reactivación operativa, validación de campo y encaje de producto** | 🔵 **ABIERTA — la cadena técnica/física A/B + 029 + 030 quedó cerrada en Galaxy y la release instalada vigente es v16; el cierre de F5 sigue bloqueado por un umbral autorizado, la jornada observada de seis escenarios, las decisiones sobre fricciones y 5–8 conversaciones reales** | PLAN Fase 4 (nunca ejecutada) |
| **F6** | Entregable Excel/CSV: exportar histórico en el formato que consume el flujo real | 🟡 **Compuerta técnica completada:** además de la paridad read-only previa, v15 guardó físicamente CSV/XLSX mediante SAF, ambos se extrajeron y pasaron `15/15` filas, hoja `Auscultación` y BOM UTF-8. Sigue pendiente la aceptación del formato por el flujo real de oficina, que es una decisión humana separada. | parte de MEMORIA Fase 4 |
| **F7** | Instrumentos y evidencias de campo | 🟡 **Slice de visitas de montaje validado físicamente:** Galaxy demostró visita offline → reinicio → replay, segunda visita append-only, foto tomada con Cámara, persistencia local, Storage e idempotencia. Un bug real de replay de evidencia en v15 se corrigió de forma incremental en v16 y el mismo outbox/foto pendiente se recuperó sin recaptura ni pérdida de datos. Los protocolos no confirmados —incluidos convergencia/peralte— siguen fuera del PASS y requieren procedimiento real. | MEMORIA Fase 6 |
| **F8** | Piloto con una segunda persona del equipo | ⚪ Pendiente, depende de F5 | PLAN Fase 6 / MEMORIA Fase 5 paso 2 |
| **F9** | Integraciones con plataformas de cálculo | 🅿️ Aparcada, sin retorno claro hoy | MEMORIA Fase 7 |

Nota sobre las fases 1-4 de `PLAN.md` (enfoque de producto, diseño funcional, UX aplicada): su contenido no se pierde, vive en `PRODUCT_STRATEGY.md` y `UX_RESEARCH_PLAN.md`, que siguen vigentes y no dependen de la numeración.

## ✅ Deuda de despliegue — resuelta (02-08-2026)

Se detectó y se cerró el mismo día. Registro por trazabilidad, no como pendiente.

**Qué pasó:** todo el trabajo de seguridad de F4 estaba commiteado en la rama `codex/phase-5-multitenant-security`, 20 commits por delante de `main`, y `main` nunca se había publicado tras la purga de historial del 31-07. `/api/v1/health` de Render confirmaba que producción corría el commit `41e3cc3` (31-07-2026 12:00) — sin las 3 correcciones de aislamiento multi-tenant ni D1.

**Cómo se cerró:**
1. Merge fast-forward local de la rama a `main` (Cowork, sin publicar).
2. Erick autorizó y ejecutó `git push --force-with-lease origin main` desde PowerShell — la autorización explícita que exige la regla 6 de `AGENTS.md`, dada por él mismo en el momento.
3. Verificado con `/api/v1/health`: pasó de `41e3cc3` a `a0ba934` (el mismo commit publicado), confirmando que Render redesplegó automáticamente tras el push.
4. `tsc` limpio y 49/49 tests backend en verde sobre el `main` ya fusionado, verificado antes de dar el merge por bueno.

**Estado actual:** producción tiene todo lo correspondiente a F4, con D1 aplicada y D2 decidida. El 16-09-2026 se cerró la compuerta de esquema: `019`–`026` quedaron registradas en `public.schema_migrations` sin reejecutar sus SQL y `027`–`030` se aplicaron después, una por una, con backup previo y verificación posterior. PR #22 publicó primero `349967a538a3a5e8f4c51245d02511b7ec6cce69`; la verificación independiente de Stage 2 detectó después falsos positivos semánticos en readiness y PR #23 publicó el hardening mínimo como `d3bef6ea0988e44524cd7cde8392906dc936e06f`. Render auto-desplegó ese SHA (`dep-dalfq3bbc2fs7381i7vg`), `/api/v1/health` devolvió `200` con el mismo commit y `/api/v1/readiness` devolvió `200` con `workExecution.available=true` y `weeklyWork.available=true`; el verificador público terminó correctamente. Entre el 17 y el 18-09-2026, v15 cerró la regresión de sesión y después completó A/B, 029 y 030 físicos; F6 guardó y verificó sus archivos por SAF. F7 reprodujo un fallo concreto de replay de una foto de montaje ya asociada a una visita sincronizada; la corrección mínima se instaló como v16 preservando sesión, SQLite/outbox y foto, y el mismo ítem terminó sincronizado una sola vez. F5 permanece abierta exclusivamente por las compuertas de producto/campo que no puede fabricar ingeniería: umbral autorizado, jornada observada, decisiones de fricción, entrevistas y aceptación de oficina cuando corresponda.

## F5 — Reactivación operativa y validación de uso real en campo (fase actual)

**Por qué esta y no otra.** Todo el trabajo anterior fue técnico: motor offline, seguridad entre obras, RLS y firma de release. La reactivación añade solo la superficie mínima que falta para representar el trabajo real de campo, y deja la validación observada como puerta obligatoria antes de ampliar F6 o F7. Así no se confunde una implementación local con evidencia de uso o de mercado.

**Trabajo.** Ejecutar el Paso 1 de `PILOT_READINESS_CHECKLIST.md` (Erick, una obra real, un dispositivo, una jornada) registrando lo que pasa con la plantilla de investigación de `UX_RESEARCH_PLAN.md`: tiempo por tarea, errores, bloqueos, dudas repetidas, pasos sobrantes, elementos que se ignoran. Después realizar entrevistas cortas con profesionales del perfil objetivo para comprobar si el problema existe fuera de la experiencia personal de Erick. No basta con marcar "funciona / no funciona".

**Criterio de salida.** Existe `docs/field/F5_HALLAZGOS_<fecha>.md` con:

- los seis escenarios mínimos cubiertos (entrar a obra, localizar estación, revisar memoria visual, añadir foto o nota, registrar una lectura de ronda, consultar histórico);
- una lista priorizada de fricciones, separando fallo real de fricción UX de deseo fuera de fase;
- una decisión explícita por cada fricción: se corrige antes de F8, se corrige después, o se acepta;
- al menos cinco conversaciones con profesionales y una conclusión sobre el segmento inicial, problema repetido, alternativas actuales y disposición a probar.

**Qué NO hacer durante F5.** No abrir el alcance completo de F6 o F7 en paralelo. Los formularios iniciales de evidencia y equipos incluidos en la reactivación son un slice acotado, no la aprobación de todos los protocolos. No añadir features "ya que estamos". Si aparece un bug bloqueante, se corrige y se anota; cualquier otra cosa va a la lista de fricciones.

**Puerta de producto de F5.** TopoField solo pasa a F6/F7 cuando existe evidencia de una tarea repetida que la app resuelve mejor que el flujo actual y cuando el flujo mínimo de campo no tiene bloqueos P0/P1 abiertos. Una opinión aislada, una función atractiva o una respuesta generada por IA no cuentan como validación de mercado.

### Estado de F5 (revisado 18-09-2026)

F5 sigue abierta y está en **validación de producto/campo**, ya no bloqueada por la cadena técnica A/B + 029/030. Todavía no existe el informe de una jornada observada ni se cumple el criterio de entrevistas. El backend actual continúa desplegado en Render como `d3bef6e` con readiness 029+030 endurecido y verificado públicamente. La release móvil instalada vigente es `versionCode=16`: el cambio respecto de v15 es una corrección mínima del replay de evidencias F7 cuyo `visitClientRequestId` persistido es `null`, más su regresión y el incremento de `versionCode`. TypeScript pasa y Jest termina en `25` suites/`144` tests. La AAB v16 mide `40.173.432` bytes y tiene SHA-256 `4e3ca6d1a20a92ba3f26bc6c9fe39abf444f920fde9fecbf33a709aed6a6b48e`; Bundletool confirmó paquete, `versionCode=16`, `versionName=1.0.0`, minSdk 24 y targetSdk 36. La APK universal v16 mide `53.598.615` bytes, SHA-256 `171d37667c37a1752362588822906ff0db2a4d229c339b98e6fd96ddcf601276`, y conserva el certificado SHA-256 `9513a8db524e87ba92abfef224cfa2bdea3605c4f519ffb16bf072681ff25330`. `adb install -r` devolvió `Success` y mantuvo `firstInstallTime=2026-08-07 10:49:51`, evidencia de actualización in-place sin desinstalar.

La prueba física crítica empezó en v15 sobre el Galaxy `SM-S938B`: la regresión de sesión offline/reinicio/reconexión conservó `Topógrafo`, la cuenta técnica, `Mi jornada` y el aviso explícito de revalidación diferida. Después, la matriz A/B demostró que el supervisor no reutiliza detalle/puntos ni outbox pendientes del topógrafo y que un retry diferido no resucita la sesión anterior; al volver explícitamente a A, su outbox seguía intacto. Con ello queda cerrada la parte de aislamiento físico que seguía pendiente.

029 quedó cerrado físicamente en v15. Con Wi-Fi/datos en `0`, un nuevo `Hecho` mostró `Pendiente local` y `Guardado en este dispositivo. Aún no existe confirmación del servidor.`; sobrevivió a `force-stop`/reinicio y, tras reconectar, el mismo outbox pasó de `1` a `0` y el historial mostró el segundo `Hecho` recibido. La reconsulta read-only preservó la fila histórica `7a113eb4-fac1-47e7-9be1-b123ca092cfc` y añadió exactamente una fila nueva `f503bada-3ce2-4385-bd2b-45364cce4776`; ambas son `completed`, pertenecen al mismo actor/ronda/punto/obra y cada UUID tiene `count=1`. 030 también completó el camino físico `planned v1 → edit v2 → done v3 → planned v4 → soft-delete v5`, con `completed_at` presente solo en `done`; el supervisor vio Bitácora sin controles de escritura y el GET activo volvió a cero filas. Por tanto, la cadena física A/B + 029 + 030 que seguía abierta queda cerrada sin convertirla en cierre humano de F5.

F6 completó además el guardado SAF real desde v15. El CSV extraído mide `4.770` bytes (SHA-256 `b4e1962532509b3a76cffdaea624fdee1cb2385a08ccc6dc768671955c8e65ba`) y el XLSX `8.338` bytes (SHA-256 `ca50b19d664ec8a251f259144360bca056a131405d641c2e2e4ce290b6611785`); `npm run verify:export-artifacts` devolvió `EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15 worksheet=Auscultación utf8Bom=true`. Esto cierra la compuerta técnica SAF, no la aceptación de oficina.

La relectura read-only de la base del 18-09-2026 confirmó además que la ronda
E2E sigue `active`, el punto `pending`, hay `15` lecturas `draft` y `0`
umbrales para su combinación punto/instrumento. Por tanto el cierre positivo
de Stage 5 continúa bloqueado por datos de campo autorizados; no se crea un
umbral ni se aceptan lecturas para forzar un PASS.

La comprobación local unificada previa a Stage 2 del 16-09-2026 terminó con
`verify local completed successfully`: backend `139/139`, móvil `25` suites y
`137/137`, tooling `17/17`, `docs:check` sobre `47` documentos y
`git diff --check` sin errores. Tras `6a44d75`, el wrapper `verify:local` fue
bloqueado por el entorno antes de arrancar y se ejecutaron sus componentes por
separado: build backend PASS, backend `142/142`, TypeScript móvil PASS, móvil
`25` suites/`137` tests, tooling `17/17`, `docs:check` sobre `47` documentos y
`git diff --check` limpio. Estas cifras prueban el árbol local, no el despliegue
de Render ni una build nueva en el Galaxy.

Tras los fixes de sesión de v15 (`c05b7d0`, `14aa286`, `174d5e4`), TypeScript
móvil volvió a pasar y Jest terminó en `25` suites/`143` tests. Esta es evidencia
local del código de v15; la evidencia física se registra separadamente arriba.

Los commits `1dec6e9` y `97e70e4` añaden además una planificación semanal editable en Bitácora respaldada por `030_project_weekly_work.sql`. La migración 030 quedó aplicada y verificada en Supabase el 16-09-2026. `b6df031` añadió el probe de 030 y el snapshot de despliegue terminó fusionado en `main` como `349967a`; Render sirve el hardening posterior `d3bef6e` y readiness exige 029+030. La prueba PostgreSQL 17 efímera de 030 pasó reaplicación, UNIQUE/CHECK y RLS deny-all. El CRUD autenticado físico quedó completado en v15 con control de versiones, `completed_at`, soft-delete y separación supervisor/topógrafo; la planificación semanal sigue sin sustituir la validación humana de F5.

La verificación independiente de Stage 2 del 16-09-2026 encontró un falso
positivo local en los probes: una policy 029 o un índice 030 con el nombre
esperado pero definición distinta todavía podían aparecer como `ready`. El
árbol de trabajo se endureció en `6a44d75` para comprobar semántica de PK,
columnas, FKs, índices, CHECKs y deny-all. En PostgreSQL 17 efímero, `/readiness` devolvió
`503` con ambos esquemas ausentes, solo 029, solo 030, drift semántico de 029,
drift semántico de 030, ausencia de PK y fallo de probe; devolvió `200` solo con 029+030
íntegros. El mismo probe endurecido leyó Supabase real en modo read-only y
devolvió ambas capabilities `ready`. Para aislarlo de la historia divergida se
preparó un snapshot limpio basado exactamente en `349967a`: `69e8fd0` contiene
solo los cuatro archivos de capability/tests y pasa `142/142`. PR #23 se revisó
como `CLEAN`/`MERGEABLE` (`4` archivos, `+367/-7`) y se fusionó por squash como
`d3bef6ea0988e44524cd7cde8392906dc936e06f`; Render lo desplegó automáticamente
y el contrato público volvió a pasar con ese SHA exacto y readiness 029+030
`ready`.

Stage 3 revalidó por separado publicación y contrato remoto. GitHub `main`
continúa exactamente en `d3bef6ea0988e44524cd7cde8392906dc936e06f`; el
repositorio no tiene workflows de GitHub Actions (`RUNS=[]` y
`.github/workflows` ausente), por lo que **no existe un PASS de CI automática**
que deba confundirse con la regresión local. El tree SHA del candidato probado
`69e8fd0` y el del squash publicado son idénticos
(`a56c3e95ce84374e84bd405a906804fdb6d1ce41`). Render muestra
`dep-dalfq3bbc2fs7381i7vg` como `Live`, commit `d3bef6e`, duración `32,1 s`;
`/health=200` sirve ese SHA y `/readiness=200` mantiene 029 y 030 `ready`.
Las rutas `/auth/me`, `Mi jornada`, execution-events y weekly-work existen en
producción: sin bearer devuelven `401`; con el token guest legítimo `/auth/me`
devuelve `200` y los tres flujos técnicos `403`, nunca `404`. El contrato con
cuenta técnica sigue **bloqueado externamente** porque no existe
`TOPOFIELD_AUTH_TOKEN` en Process/User/Machine ni en las claves del `.env`; no se
crearon ni resetearon credenciales para fabricar un PASS. `ae3dfce` endurece el
verificador local para exigir `authProvider=supabase` con rol técnico y comprobar
también weekly-work; tooling pasa `19/19`. Este tooling no cambia el runtime de
Render.

La comprobacion de procedencia del repositorio se mantiene separada del estado
funcional de F5. El contenido actual del runtime de la rama de trabajo esta
neutralizado, pero la historia alcanzable todavia conserva objetos de la etapa
anterior de purga y `main`/`origin/main` no son referencias equivalentes. La
evidencia puntual de la reconciliacion no destructiva quedó archivada en
`docs/archive/HISTORY_PURGE_RECONCILIATION_2026-09-13.md`; la deuda sigue viva,
por lo que no se borraran refs ni se reescribira historial dentro de la
validacion autonoma local.

La auditoría local fechada de 13-09-2026 quedó archivada como evidencia en
`docs/archive/F5_AUTONOMOUS_LOCAL_AUDIT_2026-09-13.md`. Añadió una barrera
automatizada sobre todos los routers de negocio y corrige la lectura defensiva
de incidencias, prismas, estaciones y visitas de montaje con referencias cruzadas. También
deja el catálogo de ejemplo y sus fixtures sin nomenclatura de cliente. En esa
auditoría, el backend quedó en `120/120` tests en la batería integrada de
work-execution 029; la cifra
anterior de `114/114` queda como evidencia histórica previa a este hardening.
El contrato backend de exportación está alineado con
`shared/types.ts` para todos los instrumentos F7. La migración 027 también conserva claves foráneas compuestas
  para integridad de tenant, con regresión local. La reconciliación de prismas
  también exige ahora la igualdad de `project_id` entre observación, prisma y
  estación; la regresión local estaba incluida en la batería de aquel momento,
  `114/114` tests. La migración
  027 quedó aplicada y verificada en Supabase el 16-09-2026. Los hardenings de exportación se
publicaron mediante PR #19/#20 y el snapshot posterior `349967a` publica también
las rutas protegidas de visitas de montaje: el smoke público devuelve `401`, no
`404`, sin bearer. La memoria visual continúa pendiente de **validación física**
en Galaxy, no de publicación del esquema/API.
La auditoría de límites de proyecto también revisó el código ejecutable del
móvil y backend: no quedan nombres de obras ni referencias TopoTask/ARGOS en
las fuentes activas. Los restos localizados están confinados a scripts de
importación manual y artefactos `data/legacy` declarados como históricos; la
presentación móvil ya no contiene un override específico de una estación.
El importador manual MapEst también falla cerrado ante estaciones sin mapeo o
sin una obra única; no forma parte del runtime del servicio.
El diagnóstico local del outbox también distingue ahora errores reintentables
de conflictos que requieren revisión manual; el Perfil no reenvía conflictos
automáticamente ni muestra sus payloads.
El reintento manual reinicia el ciclo de backoff y límite de intentos, mientras
que los fallos automáticos conservan esos metadatos para que el sincronizador
no pierda su control de reintentos (`423649d`).
Los mensajes de error del outbox también se redactan antes de persistirse en
SQLite y quedan limitados a texto operativo acotado.
El Galaxy, la
exportación con datos autorizados y la validación observada siguen siendo
compuertas externas.

La barrera móvil de permisos también falla cerrado: una sesión de `topografo`
sin `projectAccess` todavía no puede mostrar controles de escritura hasta que
`/auth/me` entregue el mapa efectivo de membresías. La regresión está cubierta
en `apps/mobile/lib/__tests__/field-access.test.ts`. El backend aplica la misma
regla desde `f90c995`: `assertProjectWriteAccess` exige el nivel `write` explícito
del mapa efectivo y devuelve `PROJECT_ACCESS_REQUIRED` si el mapa falta; ese
contenido quedó incluido en el snapshot backend fusionado como `349967a`.

El login técnico del Galaxy ya quedó confirmado con la cuenta topógrafo. El primer bloqueo reproducible de código era de ergonomía y permisos: la pantalla permitía elegir `Sin obra` aunque el backend exige que un topógrafo cree la estación dentro de una obra asignada. El Bloque 1 de F5 corrige esa deriva y añade una pantalla de rondas vacía accionable, con reintento separado del estado "no hay datos". El Bloque 2 añade preparación offline y cierre controlado. En este bloque se aplicaron las migraciones F5, Render quedó actualizado al merge del rol supervisor, se generó, verificó e instaló la release local `versionCode=4` y la cuenta sintética de consulta quedó migrada con membresía `read`; la validación supervisora en Galaxy quedó completada. El arreglo posterior `b0572a0` corrige el scope de la firma de adjuntos y ya está desplegado en Render mediante el merge `6a1b19f`. El recorrido de operador offline quedó verificado en la release v7 con lectura, foto, reinicio, reconexión y unicidad; siguen pendientes el cierre positivo con umbral autorizado, la paridad estructurada de archivos y la observación de uso.

El Bloque 4 añade el contrato compartido de exportación y los endpoints CSV/XLSX con filas pendientes, scope y roles verificados; falta compararlo contra una ronda real y confirmar el formato que consume el flujo de oficina. La auditoría local posterior reforzó la integridad ronda-punto-lectura-adjunto; `028_reading_attachment_idempotency.sql` quedó aplicada el 16-09-2026 tras revalidar cero duplicados y se verificó el índice único `(reading_id, storage_path)`.

### Reactivación operativa — implementación local 12-09-2026

La rama `codex/f5-field-stability` incorpora un slice vertical para la jornada real:

- permiso efectivo por membresía (`read`/`write`) en backend y móvil, manteniendo los roles globales existentes;
- parte idempotente de finalización de zona con estados parcial, completado y bloqueado;
- outbox para partes offline y regresión de sincronización;
- captura inicial de testigo fotográfico, fisurómetro digital, potenciómetro y clinómetro/cinta como tipos explícitos, sin conversiones inventadas;
- tratamiento de una ronda como encargo ordenado por obra, fecha y responsable, reutilizando el dominio existente;
- recorrido móvil de consulta para membresías `read`, preparación sin conexión y resumen operativo de ronda;
- borradores locales de captura de lectura por sesión y punto de control (SQLite 008), para recuperar una toma interrumpida sin mezclar cuentas;
- histórico de lecturas con sus evidencias asociadas visibles en consulta, manteniendo escritura solo para membresías `write`;
- entrega manual de ronda en CSV/XLSX desde el resumen móvil mediante la hoja nativa, sin marcar envío o revisión automáticamente;
- exportación restringida a membresías con escritura; las membresías `read` solo consultan datos recibidos;
- documentación de cobertura de equipos, límites y puertas de piloto.

### Registro explícito del trabajo del operario (implementado localmente)

El análisis del control semanal mostró que las casillas por día no distinguen
planificación, ejecución, bloqueo ni recepción. Para corregir esa ambigüedad,
la ronda reutiliza sus puntos como trabajo asignado y añade un registro
append-only de resultados: `Empezar`, `Hecho`, `No realizado`, `Repetir` y
`Bloqueado`. Los tres últimos exigen motivo. El contrato está en
[`docs/field/WORK_EXECUTION_CONTRACT.md`](docs/field/WORK_EXECUTION_CONTRACT.md),
la migración preparada es
`apps/backend/migrations/029_monitoring_work_execution_events.sql` y la ruta
queda protegida por obra y rol. La captura móvil usa SQLite/outbox e
idempotencia; `Hecho` no cambia por sí solo el estado metrológico ni permite
cerrar una ronda con lecturas pendientes.

Para reducir pasos en campo, cada tarjeta ofrece además `Marcar hecho` en una
pulsación. El atajo crea el mismo evento `completed`, muestra `Hecho
registrado` cuando llega a la caché recibida y deja `Más opciones` para
resultados que necesitan motivo. No se copian filas reales del Excel ni se
simula todavía una ocurrencia distinta por cada día de la semana.

La cabecera de la ronda resume ahora el trabajo declarado por estado y ofrece
`Continuar con <código>` para abrir el primer punto accionable en el orden de
la jornada. Los puntos bloqueados se cuentan como `por revisar` y nunca se
presentan como completados ni como siguiente acción automática.

El `Parte diario` añade además `Semana operativa`: una vista de lunes a viernes
sobre las rondas asignadas existentes, ordenada por fecha y `executionOrder`,
con acceso directo a cada ronda y un bloque separado para otras fechas. No
crea ocurrencias semanales ficticias ni sustituye la validación del trabajo en
campo.

`Mi jornada` recibe además los contadores del último resultado operativo por
 punto (`hechos`, `en curso`, `pendientes` y `por revisar`), calculados en el
 servidor a partir del último evento de cada punto. Una caché antigua que no
 tenga esos campos omite el resumen hasta actualizarse; no se mezclan datos
 locales con recepción del servidor.

La migración 029 quedó aplicada y verificada en Supabase el 16-09-2026. El
contrato backend correspondiente está desplegado en Render y el hardening
vigente `d3bef6e` lo declara disponible en readiness. El 17-09-2026 quedó
registrada una única fila server-side `completed` procedente de una prueba
offline anterior, con `client_request_id=7a113eb4-fac1-47e7-9be1-b123ca092cfc`,
sin duplicado observado. Esto prueba parcialmente contrato/idempotencia; queda
pendiente repetir en v15 la UI local antes del ACK, el replay tras reinicio, la
recepción y una segunda fila con un `client_request_id` nuevo.

La migración 029 preparada también incluye índices únicos auxiliares y claves
foráneas compuestas para mantener la relación `evento -> punto -> ronda ->
obra` a nivel de PostgreSQL, además del scope defensivo en el modelo.

El hardening local de 13-09-2026 cierra el riesgo de publicar el backend nuevo
contra una base sin 029: el backend dispone de un probe explícito de capacidad,
`/api/v1/readiness` devuelve `503` si la tabla falta o el esquema está
incompleto y `apps/backend/render.yaml` usa esa ruta como health gate de
despliegue. Detalle de ronda, `Mi jornada` y exportación pueden seguir leyendo
datos legacy sin consultar una tabla inexistente; las rutas de execution events
fallan de forma controlada con `503`, no mediante `500` dispersos. El replay
del mismo `client_request_id` solo es idempotente cuando el contenido y el
contexto coinciden; reutilizarlo con otra acción devuelve `409`.

El móvil también queda local-first de forma explícita: conserva un único
`clientRequestId`, distingue resultado operativo de entrega y no llama
`Recibido servidor` a un cambio que solo vive en SQLite/outbox. Red, timeout y
`5xx` son reintentables con límite; `409` queda como conflicto y `404` de un
backend anterior se muestra como `Backend pendiente`, sin bucle automático.

La compuerta se probó además contra PostgreSQL local real en un contenedor
efímero con fixture mínimo: antes de 029 el probe devolvió
`migration_missing`; tras aplicar 029 devolvió `ready`; una segunda aplicación
fue idempotente; las FK compuestas, el UNIQUE de `client_request_id` y RLS
deny-all se comportaron como se esperaba. El backend local respondió readiness
`200` con 029 y `503` al retirar la tabla. Esto no equivale a ejecutar toda la
cadena de migraciones en Supabase ni a un despliegue real.

La reconciliación del 16-09-2026 cerró la divergencia del ledger: 019–026,
que ya existían funcionalmente, quedaron registradas en `public.schema_migrations`
sin reejecutar sus SQL. Después se obtuvo un backup nuevo y se aplicaron 027,
028, 029 y 030 por transacciones separadas, registrando cada filename solo tras
ejecutar su SQL. Las verificaciones posteriores confirmaron 027 (tablas/FK/RLS),
028 (índice único y cero duplicados), 029 (UNIQUE/FK/índices/RLS y capability
`ready`) y 030 (15 columnas/constraints/UNIQUE/índice/RLS y capability `ready`).
El runbook de Work Execution está en
[`WORK_EXECUTION_CONTRACT.md`](docs/field/WORK_EXECUTION_CONTRACT.md). El
subárbol local `docs/ai/` pertenece a una misión de reconciliación aún no
integrada en la jerarquía documental y no se adopta aquí como nueva fuente de
autoridad.

Como evidencia histórica del cierre de la misión Work Execution del 13-09-2026,
la batería integrada de aquel momento pasó con backend `120/120`, móvil `23`
suites y `130/130`, TypeScript móvil sin errores, tooling `14/14`, `docs:check`
sobre `44` documentos y `git diff --check` limpio. La cifra vigente del árbol
local está registrada arriba con la verificación del 16-09-2026. No se ejecutó
ninguna operación remota ni prueba física nueva en Galaxy durante esa misión.

Las migraciones `022_project_membership_access_level.sql`,
`023_work_completion_reports.sql`, `024_field_instrument_catalog.sql` y
`026_supervisor_role.sql` están aplicadas en el proyecto Supabase `topofield`.
El último despliegue funcional verificado sirve el commit
`d3bef6ea0988e44524cd7cde8392906dc936e06f`; `/health` devuelve ese SHA y
`/readiness` devuelve `200` con work-execution 029 y weekly-work 030 disponibles.
La release móvil instalada más reciente es `versionCode=16`, derivada de la
cadena física que comenzó con v15. La AAB v16 (`40.173.432` bytes, SHA-256
`4e3ca6d1a20a92ba...d6a6b48e`) pasó Bundletool y la APK universal
(`53.598.615` bytes, SHA-256 `171d3766...cf601276`) pasó `apksigner` con el
mismo certificado de release. `adb install -r` devolvió `Success` y preservó
la instalación existente. A/B, la UI/ACK de 029 y el CRUD de 030 quedaron
demostrados físicamente; v16 se necesitó después para recuperar el mismo
outbox de una evidencia F7 que v15 rechazaba cuando
`visitClientRequestId=null`.
La release histórica `versionCode=4` se instaló en el Galaxy
`SM-S938B` (`R5CY21X6FLE`) con `adb install -r`, que devolvió `Success`. La
consulta supervisora también quedó validada: login real, la única obra QA
autorizada, rondas, punto, histórico y evidencia visibles; la UI muestra
consulta sin escritura. La siguiente puerta es repetir con datos autorizados
el cierre positivo, guardar los artefactos CSV/XLSX en una ubicación legible y
ejecutar el verificador estructurado; la observación de uso permanece aparte.

El rol global `supervisor` está implementado en `026_supervisor_role.sql` y en
la app móvil: consulta acotada por membresía, sin Mi jornada ni controles de
escritura, outbox reintentable o exportación. La migración está aplicada en
Supabase, Render reconoce el rol y la cuenta `supervisor-piloto@topofield.local`
tiene una única membresía activa `read` en `campus-nord`. En Galaxy se
confirmaron el perfil `Supervisor`, la obra autorizada, la consulta de ronda,
el histórico y una evidencia, además de la persistencia de sesión tras
reinicio. La primera validación del operador offline quedó cerrada en la
release v7; la repetición con cierre positivo y exportaciones estructuradas
sigue pendiente.

El 12-09-2026 se corrigió una deriva local de seguridad: la caché de listas y
snapshots de rondas ahora usa la sesión técnica además de la obra/ronda. La
migración SQLite 005 invalida filas antiguas que no tenían propietario y sus
regresiones pasan localmente. La matriz A/B física del 17/18-09 demostró en el
Galaxy que el supervisor no reutiliza el detalle/puntos cacheados del
topógrafo y que A recupera su estado propio al volver explícitamente.

El mismo día se extendió el aislamiento al outbox: la migración SQLite 006
asocia cada operación nueva a su sesión local, exige `session_id`, filtra el
flush por esa sesión y deja en cuarentena las filas heredadas sin propietario.
Además, el motor cancela un flush antiguo por generación si la cuenta cambia
mientras espera una request. También se corrigió la reutilización de sesiones
guardadas por rol: ahora se emparejan por usuario Auth (o correo legado),
evitando enviar operaciones de otra cuenta bajo el token activo. Está
verificado en TypeScript/Jest local con `62` tests y quedó en el commit
`1d82a9f`; falta observarlo en el Galaxy durante un cambio real de cuenta.

También se separaron las claves de React Query por sesión para las consultas
protegidas y las actualizaciones optimistas. Así, una respuesta que llegue
después de cambiar de cuenta no puede repoblar la misma clave con datos de otra
obra. El código quedó en `dedf77b`; la validación A/B posterior observó el
aislamiento con tráfico y caché reales en el Galaxy.

### F7 — memoria visual de montaje preparada localmente (12-09-2026)

La rama incorpora una primera separación entre la galería histórica de una
estación y las visitas de montaje. Una visita conserva fecha, estado, notas y
el resumen de cambios; sus evidencias tienen `clientRequestId`, tipo, foto,
notas y posición relativa opcional. La pantalla ofrece una cuadrícula 3x3 para
marcar aproximadamente un código o elemento sobre la foto y lo muestra como
etiqueta al consultar, sin convertirlo en coordenada. Esto permite registrar
una foto general o de prisma sin sobrescribir visitas anteriores y deja el
contrato listo para un croquis fotográfico posterior.

La migración `027_station_mounting_visits.sql` quedó aplicada en Supabase el
16-09-2026 con RLS de denegación directa, índices y claves de idempotencia. La API exige que la estación pertenezca a una obra accesible,
que el actor tenga permiso `write`, que una evidencia use la ruta exacta de
su visita y que un prisma opcional pertenezca a la misma obra. El supervisor
puede consultar visitas a través de la ruta protegida, pero no crear visitas
ni evidencias. La pantalla móvil `Visitas de montaje` ya permite abrir una
visita, añadir fotos desde cámara/galería, marcarla como realizada o no
realizable y consultar el historial. La captura pendiente puede continuar sin
red: SQLite conserva la memoria por sesión y estación, el outbox ordena la
visita antes que sus evidencias y la foto queda persistida localmente hasta
el reintento.

El replay de una evidencia cuyo visit fue creado y marcado offline fuerza la
recreación idempotente como `draft`; el estado `completed` o `blocked` se
aplica después mediante `PATCH`, porque el backend no acepta estados
terminales en el POST de creación.

La compuerta física de este slice quedó completada el 18-09-2026. En CN2 se
creó una primera visita sin red, sobrevivió a `force-stop`/reinicio y se
reprodujo una sola vez al reconectar. Una segunda visita conservó la primera
intacta y recibió una foto neutra tomada con **Cámara**; la foto sobrevivió a
otro reinicio offline. v15 reprodujo entonces un bug real: el payload persistido
de evidencia para una visita ya sincronizada contenía
`visitClientRequestId=null` y el replay lo rechazaba como inválido. v16 acepta
ese `null`, conserva la ruta de visita remota y recuperó el mismo outbox/foto
sin recaptura. PostgreSQL quedó en dos visitas con UUIDs distintos, una única
evidencia con `count=1`, y Storage contiene exactamente un JPEG en la ruta
esperada. Esto valida cámara/Storage/offline/reinicio/replay del slice; **no**
valida procedimientos de convergencia/peralte ni demuestra todavía que los
códigos/posición relativa resuelvan una tarea repetida para usuarios reales.

## Decisiones tomadas el 02-08-2026 (criterio de ingeniería)

Tres decisiones que estaban abiertas y bloqueaban el avance. Se resuelven aquí con su razonamiento. Estado a 21-08-2026: **D1 aplicada y con test de regresión**, **D2 cerrada** (Erick decide quedarse en Free), **D3 vigente** como orden de fases. Ninguna queda pendiente de aplicar.

### D1 — El rol `visitante` no accede a datos de auscultación

**Decisión: restringir todas las rutas de rondas, puntos de control, lecturas, umbrales e histórico a `admin` y `topografo`. Aplicada el 02-08-2026.**

Razonamiento. `visitante` no es un usuario identificado: es un token público compartido (`GUEST_PUBLIC_TOKEN`) con alcance global, sin membresía de obra. Los datos de auscultación no son contenido divulgativo como la guía Leica; son mediciones de comportamiento estructural. Una lectura fuera de umbral puede implicar riesgo estructural, responsabilidad frente a un cliente, o información comercial de un tercero. Exponerlos tras un secreto compartido y sin trazabilidad de quién consultó es una asimetría mala: riesgo alto, beneficio nulo, porque nadie ha pedido esa consulta pública. Además, la nota original del MVP ya excluía a `visitante` de auscultación — el acceso actual es deriva acumulada, no una decisión que alguien tomara.

Contraargumento razonable, para no venderlo como obvio: si en algún momento se quiere enseñar la app a un cliente potencial sin darle cuenta, `visitante` es el atajo cómodo. Respuesta: para eso conviene una cuenta demo real con obra propia y datos de muestra, no un token global — y esa cuenta es trabajo de F8, no de ahora.

**Aplicación (02-08-2026):** el token `GUEST_PUBLIC_TOKEN` no ha circulado nunca fuera de esta máquina (confirmado por Erick), así que no hizo falta rotarlo. Se comprobó antes de tocar código que el móvil no depende de ese token para auscultación: `canRetryPublicReadAsGuest` en `apps/mobile/lib/api.ts` tiene una lista explícita de rutas que sí pueden reintentarse como invitado (`/projects`, `/stations`, `/guide-entries`, `/prisms/coverage/*`) y ninguna ruta de rondas, puntos de control, lecturas o umbrales está en esa lista. Se quitó `'visitante'` de `requireRole([...])` en 5 rutas: `apps/backend/src/routes/monitoring.routes.ts` (detalle de ronda, histórico de lecturas, umbrales) y `apps/backend/src/routes/projects.routes.ts` (listar rondas y puntos de control de una obra).

**Regresión cubierta (mismo día):** `requireRole` no tenía ninguna prueba propia — las de `access-control.ts` cubren el scope por obra, no la puerta por rol y ruta. Se añadieron dos capas: `middleware/auth.test.ts` prueba `requireRole` en aislamiento (401 sin usuario, 403 fuera de lista, paso libre dentro de lista), y `routes/route-role-audit.test.ts` audita los routers reales — camina `router.stack`, localiza el middleware `requireRole` de cada ruta de auscultación por su propiedad `allowedRoles` (se añadió esa propiedad a `requireRole` solo para poder auditarlo así, sin depender de un framework de integración nuevo) y falla si `'visitante'` reaparece en alguna. Se probó la prueba misma: se reintrodujo `'visitante'` a mano en una copia aislada y `route-role-audit.test.ts` lo detectó (`not ok ... visitante excluido`) antes de revertirlo. 49/49 tests backend en verde, `tsc` limpio.

### D2 — Activar la protección contra contraseñas filtradas en Supabase Auth

> ⚠️ **Corrección (02-08-2026): no es gratis.** Se intentó activar en el panel y el interruptor no persiste: la función está marcada "Only available on Pro plan and above" y el proyecto está en el plan **Free**. La decisión de abajo asumía coste cero; no es así. Queda repensada más abajo.

Razonamiento original (sigue siendo válido en cuanto a por qué interesa, no en cuanto al coste): es el único aviso de seguridad que quedaba abierto en el advisor. Rechaza, al registrar o cambiar contraseña, las contraseñas que aparecen en brechas conocidas. Con 11 usuarios existentes y un piloto por delante, cuanto antes se active, menos gente real tendrá que cambiar de contraseña después.

**Dato nuevo relevante (02-08-2026):** el mismo día se encontró que el proyecto Free se había pausado solo por inactividad (ver bitácora), tumbando la app hasta que se reactivó a mano. El plan Pro (25 USD/mes) **también elimina esa pausa automática** — no es solo el candado de contraseñas, es dos problemas reales resueltos por el mismo cambio de plan.

**Decisión de Erick (02-08-2026): no gastar por ahora.** Se queda en Free — la alternativa conservadora de abajo. Válido mientras el piloto sea solo Erick; se reabre si F5 muestra que el proyecto se pausa con más frecuencia de la tolerable, o al incorporar una segunda persona (F8).

- **Mejor opción:** subir a Pro. 25 USD/mes cubre tanto D2 como el riesgo de que el proyecto se vuelva a pausar solo antes de una sesión de campo — ese segundo problema es operativo, no cosmético, y ya costó una interrupción real hoy.
- **Alternativa conservadora:** quedarse en Free por ahora. D2 queda sin activar (no es catastrófico: es una capa extra, no la única defensa) y el riesgo de pausa se gestiona a mano, comprobando el estado del proyecto antes de cada sesión de campo (ya añadido a `PILOT_READINESS_CHECKLIST.md`).
- **Riesgo principal de esperar:** otra pausa automática justo antes o durante una sesión de campo real, con alguien más que Erick usando la app — ahí sí cuesta credibilidad, no solo una interrupción resoluble en dos minutos.
- **Información que cambiaría la decisión:** si F5 confirma que la app se usa con la frecuencia suficiente para que Supabase nunca la pause sola, el argumento operativo de subir a Pro desaparece y solo queda el candado de contraseñas, que es prescindible mientras el piloto siga siendo Erick solo.

No es configuración que un agente pueda aplicar: implica gasto recurrente, así que la decisión y el pago son de Erick.

### D3 — Orden entre Excel (F6) e instrumentos nuevos (F7)

**Decisión: F6 antes que F7, y dentro de F6, exportar antes que importar.**

Razonamiento. El motivo original del proyecto es sustituir un Excel. Pero "sustituir el Excel" tiene dos mitades muy distintas y se estaban tratando como una: **exportar** (producir el entregable que el jefe o el cliente espera recibir) e **importar** (traerse el histórico antiguo). Exportar es lo que cierra el bucle: si TopoField no puede generar el documento que el flujo real consume, la app queda como cuaderno paralelo por bueno que sea el motor offline, y el usuario acaba volviendo al Excel para el último paso. Importar el histórico, en cambio, es más caro, arrastra los errores del Excel viejo, y no aporta nada hasta que el flujo de captura esté validado — importar datos a un flujo no validado es importar problemas.

Los formularios especializados de F7 (piezómetro, inclinómetro, convergencia y
peralte) siguen después porque el procedimiento exacto de cada equipo aún no
está confirmado. El slice inicial solo conserva evidencia y valores observados
sin inventar semántica; no equivale a una integración de fabricante ni a una
validación del protocolo.

Contraargumento razonable: el blob genérico de `instrument_readings` es deuda técnica conocida y cuanto más tiempo pase, más datos habrá que migrar cuando se estructure. Es cierto, y es el mejor argumento para adelantar F7. Se acepta el riesgo: el volumen de lecturas hoy es mínimo, y migrar cien filas es barato comparado con diseñar un esquema para instrumentos que todavía no se sabe cómo se usarán en campo.

## Pendientes que no son fases

Se mantienen en `MEMORIA.md` §12a, que es su sitio. Resumen de los que solo puede resolver Erick (revisado 12-09-2026):

- **Resuelto (02-08-2026):** D1 aplicada por agente y cubierta con test de regresión; D2 cerrada por decisión de Erick (seguir en Free); `push --force-with-lease` de la reescritura de historial autorizado y ejecutado por Erick, con producción verificada por `/api/v1/health`.
- **Resuelto (24-08-2026):** el login técnico en el Galaxy dejó de ser un pendiente. Render devolvió `200` para la cuenta técnica con rol `topografo` y el perfil de la release local mostró esa cuenta activa (bitácora de `MEMORIA.md` §12, «Validación externa de login y release local»). Esta línea figuraba como «el único pendiente que frena el trabajo» hasta la revisión del 01-09-2026, contradiciendo lo que ya decía «Estado de F5» en este mismo archivo.
- **Abierto — validación humana/operativa pendiente:** la cadena física A/B + 029 + 030, el guardado SAF y la visita de montaje con Cámara/Storage ya están demostrados. Sigue faltando el cierre con umbral autorizado, la jornada observada de seis escenarios, la clasificación/decisión de fricciones, 5–8 conversaciones reales y la aceptación del formato por oficina. La release instalada vigente es v16; v15 y anteriores permanecen como evidencia histórica de sus respectivas pruebas.
- **Resuelto como política de seguridad; implementación privada pendiente:** mientras `topofield-photos` siga público, **queda prohibido usar fotos sensibles de terceros**. El piloto solo puede usar imágenes autorizadas y no sensibles y no debe compartir URLs de Storage. Antes de admitir material sensible deberá existir una tarea separada, revisada y autorizada, que migre a bucket privado y URLs de lectura firmadas y valide API+móvil. Esta decisión evita aceptar implícitamente el riesgo actual sin ejecutar unilateralmente un cambio de Storage que podría romper URLs existentes.
- **Abierto, sin urgencia:** capa (3) de `MEMORIA.md` §5, datos de terceros; no se reabre salvo que Erick la traiga.

## Cómo se mantiene este archivo

Al cerrar una fase: cambiar su estado en la tabla, actualizar `verificado:` en la cabecera, y añadir una línea a la bitácora de `MEMORIA.md` §12. No crear un documento nuevo de fase — los informes puntuales van a `docs/archive/` una vez leídos.

El chequeo automático (`npm run docs:check`) verifica que no exista un segundo archivo declarando `rol: roadmap`, que la fecha de `verificado:` no se quede rancia y que los enlaces entre documentos no apunten a archivos movidos. Ver `docs/DOC_MAINTENANCE.md`.
