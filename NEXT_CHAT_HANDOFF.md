<!-- doc-status
estado: vivo
  verificado: 2026-09-13
rol: handoff
-->

# NEXT_CHAT_HANDOFF.md — TopoField

## Fuente de verdad

Lee primero `ROADMAP.md`, después `MEMORIA.md` y `AGENTS.md`. Este archivo es
solo el punto de reanudación; no sustituye la bitácora ni el roadmap.

## Compuerta de procedencia del repositorio

La auditoria local del 13-09-2026 encontro una discrepancia que no debe
mezclarse con la prueba del Galaxy: el runtime actual de la rama de trabajo
esta neutralizado, pero la historia alcanzable conserva commits antiguos de la
etapa de purga. Ademas, `main` y `refs/remotes/origin/main` apuntan a historias
distintas. La evidencia y los identificadores de objetos estan en
`docs/field/HISTORY_PURGE_RECONCILIATION_2026-09-13.md`.

No ejecutar `filter-repo`, borrar refs, podar objetos, hacer fetch ni publicar
un `push --force` como parte del cierre autonomo local. Si se retoma esta
deuda, debe partirse del mirror original intacto y verificarse primero el
repositorio bare.

## Estado de la rama

- Rama activa: `codex/f5-field-stability`.

La validación física de la v7 es histórica. La comprobación ADB más reciente
de esta sesión devolvió `error: no devices/emulators found` y no mostró ninguna
fila bajo `List of devices attached`; no se debe afirmar que el Galaxy está
conectado ni instalar una build hasta que vuelva a aparecer como `device`.

## Slice implementado después del último estado remoto

El análisis local del control semanal de Excel llevó a una mejora operativa:
desde cada punto de una ronda el operario puede indicar `Empezar`, `Hecho`,
`No realizado`, `Repetir` o `Bloqueado`; los tres últimos exigen motivo. El
contrato está en `docs/field/WORK_EXECUTION_CONTRACT.md`, la migración local en
`apps/backend/migrations/029_monitoring_work_execution_events.sql` y las rutas
son `GET/POST /api/v1/round-points/:roundPointId/execution-events`.

La captura móvil usa el outbox existente y un `clientRequestId` estable, pero
el hardening más reciente la hace explícitamente local-first: persiste primero
la acción y separa el resultado operativo de su estado de entrega. `Pendiente
local`, `Reintento`, `Conflicto` o `Backend pendiente` nunca se presentan como
`Recibido servidor`; el histórico remoto sigue siendo la evidencia de recepción.
El bloque anterior (`6ed9a84`, `8aff703`, `3b5ed4b`, `2399de6`, `2d182a0`)
queda reforzado por `bb22bff` y `6a09c58`. La migración 029 no se ha aplicado
en Supabase, por lo que este slice aún no está desplegado en Render ni
instalado/validado físicamente en el Galaxy. La v12 instalada antes de esta
misión no prueba estos commits.

La lista de puntos incorpora también `Marcar hecho` en una pulsación para el
caso normal. `Más opciones` abre el formulario de `Empezar`, `No realizado`,
`Repetir` y `Bloqueado` con motivo. El atajo usa la misma mutación, outbox e
idempotencia; queda pendiente validarlo en el Galaxy cuando ADB detecte el
dispositivo y la migración 029 esté desplegada.

En visitas de montaje, `No realizable` exige ahora un motivo escrito tanto en
la pantalla como en la validación backend; las notas previas se conservan y
se añade una línea de relevo explícita. Este cambio está en `750153a` y aún no
está desplegado porque la migración 027 sigue pendiente.

La pantalla ofrece cuatro motivos neutros de selección rápida (`Sin acceso`,
`Sin visibilidad`, `Equipo o sensor dañado` y `Condición de campo adversa`),
manteniendo el campo libre para excepciones.

La migración local 029 fue endurecida con índices únicos auxiliares y claves
foráneas compuestas: un evento no puede enlazar una ronda, un punto y una obra
cruzados aunque se intente escribir directamente en PostgreSQL. La regresión
estática cubre ambas relaciones; sigue pendiente aplicarla remotamente.

El backend local incorpora desde `1b17380` una capacidad explícita de
work-execution. Si 029 falta o está incompleta, `/api/v1/readiness` responde
`503`, las rutas GET/POST de execution-events responden un `503` controlado y
detalle de ronda, `Mi jornada` y exportación degradan sin consultar la tabla
ausente. `57ef8fb` cambia el health gate local de Render a `/api/v1/readiness`,
de modo que `/health` queda como liveness y no puede sustituir la comprobación
de esquema. `99c212c` amplía el verificador público para exigir readiness `200`
y fallar cerrado ante `migration_missing`. La verificación formal posterior
detectó que ese verificador esperaba por error `workExecution` en la raíz,
mientras el backend responde `capabilities.workExecution`; `c71b680` alinea
ambos contratos y añade una regresión que rechaza la forma obsoleta.

El mismo backend endurece la idempotencia: repetir el mismo
`client_request_id` con el mismo contenido devuelve el evento existente;
reutilizarlo con actor, contexto o payload distinto devuelve `409`.

Existe evidencia PostgreSQL local real, no solo tests estáticos: en un
contenedor efímero PostgreSQL 17-compatible con un fixture mínimo, el probe
devolvió `migration_missing` antes de 029 y `ready` después; reaplicar el SQL
029 terminó sin error, las FK compuestas rechazaron cruces de obra/ronda/punto,
el UNIQUE rechazó un UUID duplicado y RLS deny-all ocultó el evento a `anon`.
El backend local devolvió `/readiness` `200` con 029 y `503` al retirar la tabla.
No se reprodujo la cadena completa 001–028 ni se tocó Supabase real.

El resumen de la ronda también aparece en `Mi jornada`: hechos, en curso,
pendientes y por revisar, calculados por el servidor a partir del último evento
recibido de cada punto. Las cachés antiguas omiten esos contadores hasta
refrescarse; no se presentan cambios locales como recibidos por el servidor.

Comprobación remota más reciente: Render sigue en `df224f9`; `/health`
respondió `200`, las rutas protegidas existentes sin bearer respondieron `401`
y `GET /api/v1/round-points/<uuid>/execution-events` respondió `404 Route not
found`. Ese `404` es evidencia del backend remoto anterior, no un fallo de la
UI local; la tabla y la ruta nuevas deben publicarse juntas.

La consulta de solo lectura a Supabase del 13-09-2026 confirma que el proyecto
`topofield` tiene aplicadas migraciones hasta `026_supervisor_role`; `027`,
`028` y `029` siguen pendientes. El advisor de seguridad mantiene únicamente
`auth_leaked_password_protection` en `WARN`; el de rendimiento informa `13`
claves foráneas sin índice y `40` índices sin uso. No se aplicó SQL remoto.

Antes de cualquier despliegue, revisar el runbook de
`docs/field/WORK_EXECUTION_CONTRACT.md`. Atención: el runner local de
migraciones aplica todos los archivos pendientes en orden. Si el remoto sigue
en 026, ejecutar el runner no significaría «solo 029»: también intentaría 027 y
028. Esas dos migraciones pertenecen a otros hardenings y necesitan una
autorización/revisión explícita propia; no deben colarse dentro de una
autorización genérica de 029.

**Autorización posterior (13-09-2026):** Erick autorizó expresamente el bloque
completo por compuertas: backup remoto; 027 -> 028 -> 029 tras prechecks verdes;
despliegue/verificación de backend; y después build/instalación/E2E Galaxy si
todo lo anterior pasa. En la sesión que recibió la autorización, la herramienta
de ejecución bloqueó antes de ejecutarse incluso la consulta remota de solo
lectura a `schema_migrations`. No confundir «autorizado» con «ejecutado»: no se
obtuvo backup nuevo, no se aplicó SQL, no se desplegó Render y no se instaló una
build nueva en ese intento. El próximo agente debe reanudar exactamente en
**backup + estado real de migraciones**, sin volver a cambiar Work Execution 029.

**Reanudación verificada posterior (13-09-2026):** el conector de Supabase sí
permitió lectura remota. El proyecto `topofield` está `ACTIVE_HEALTHY` y su
tracker de Supabase sigue exactamente hasta `026_supervisor_role`; 027/028/029
no aparecen. El precheck de 028 devolvió cero duplicados por
`(reading_id, storage_path)`. Se creó fuera del repo un backup local recuperable
del estado previo de las cuatro tablas existentes que 027-029 tocan
(`stations`, `reading_attachments`, `monitoring_rounds`,
`monitoring_round_points`), incluyendo filas, columnas, constraints e índices:
`C:\Users\guill\Documents\Aplicacion_Movil\topofield-backups\topofield-pre-027-029-2026-09-13T12-28-21-067Z.json`, 36.306 bytes, SHA-256
`5b53d73b936e3bde06bc35eb9bc6cbe13af708c6a75134dbb2d4cb0dd038828e`.
La primera llamada oficial `apply_migration` para 027 fue bloqueada por los
controles del entorno antes de ejecutar SQL. No se sustituyó por el runner
genérico porque `public.schema_migrations` solo registra hasta 018 mientras el
tracker de Supabase registra 019-026; ejecutarlo habría intentado reejecutar
migraciones ya aplicadas. Una nueva lectura del tracker de Supabase siguió
mostrando 026 como última migración, por lo que no hay evidencia de que 027 se
haya aplicado. Reanudar desde una vía oficial capaz de aplicar y registrar
027->028->029 sin reconciliar a ciegas ambos trackers.

La batería integrada de cierre local pasó con backend `120/120`, móvil `23`
suites y `130/130`, TypeScript móvil sin errores, tooling `15/15`,
`docs:check` sobre `44` documentos y `git diff --check` limpio. El árbol sigue
conservando fuera de esta misión el cambio previo de `apps/mobile/package.json`
y las capturas/XML no versionadas; no limpiarlos ni incluirlos en commits.

## Estado local actual tras instalar v12

La release local `versionCode=12` se generó con
`npm run mobile:build-local-android` y terminó con `BUILD SUCCESSFUL in 7m
21s` después del reintento incremental del script. La AAB quedó en
`C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`;
la APK arm64 quedó en
`C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`;
la firma es `CN=TopoField Android Release` con SHA-256
`95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`.
La APK pasó `apksigner verify --verbose` con `Verifies`, firma V2 válida, y
`aapt2 dump badging` identifica el mismo paquete y `versionCode=12`,
`versionName=1.0.0`. Esta v12 incorpora la vista `Semana operativa` en el
parte diario: lunes a viernes, rondas reales ordenadas por fecha y
`executionOrder`, acceso directo a cada ronda y un bloque `Otras fechas` para
no ocultar asignaciones. La AAB mide `40,154,257` bytes y la APK `53,450,274`
bytes. `adb install -r` devolvió `Success` y `dumpsys package` confirmó
`versionCode=12`, `firstInstallTime=2026-08-07 10:49:51` y
`lastUpdateTime=2026-09-13 12:32:01`, conservando la instalación existente. El
smoke test dejó `topResumedActivity` en
`com.ciudadanoinusual.topofield/.MainActivity`; `uiautomator dump` mostró
la ronda cacheada `E2E-Galaxy-20260731-Atc`, `Trabajo declarado`,
`Preparar sin conexión`, `Parte de zona` y el bloqueo de cierre por puntos
pendientes. El logcat de aplicación no mostró `FATAL EXCEPTION`; el recorrido
autenticado de campo sigue pendiente.

La pantalla de resultado también consulta el historial append-only protegido
del punto, mostrando estado, fecha, motivo y nota de cada acción recibida. No
confunde una acción pendiente del outbox con recepción del servidor.

Los verificadores aceptan `TOPOFIELD_ROUND_POINT_ID` para comprobar ese
endpoint cuando 029 esté desplegada: `npm run verify:remote:public` exige
`401` sin bearer y `npm run verify:remote:auth` acepta `200` o `403` según el
rol. Ambos solo imprimen códigos y estados, nunca tokens ni cuerpos. En la
sesión actual `adb devices -l` devolvió el Galaxy como `device`; se instaló la
release v12 con `adb install -r` y `dumpsys package` confirmó
`versionCode=12`. No se hicieron nuevas lecturas, fotos ni cambios remotos.

## Evidencia histórica verificada en Galaxy (13-09-2026, v7)

- El Galaxy `SM-S938B`/ADB `R5CY21X6FLE` está conectado como `device`.
- La release arm64 `versionCode=7` de
  `com.ciudadanoinusual.topofield` está instalada; `adb install -r` devolvió
  `Success` y `dumpsys package` confirmó `lastUpdateTime=2026-09-13 07:39:25`.
  La APK está firmada como `CN=TopoField Android Release`.
- El E2E físico del operador pasó la parte crítica: lectura `825 mm` y foto
  se guardaron sin conexión, sobrevivieron al reinicio y sincronizaron dos
  elementos automáticamente al volver LTE. Supabase verificó exactamente una
  lectura para el `clientRequestId` y exactamente un adjunto asociado.
- Con la caché preparada en línea, el modo avión activado desde los ajustes
  visibles y un arranque en frío, `Rondas de auscultación` mostró el aviso
  `Rondas sin actualizar. Última copia: 2026-09-13T05:00:36.436Z.` y la ronda
  `E2E-Galaxy-20260731-Atc`. La corrección local está en
  `apps/mobile/lib/offline/monitoring-cache.ts` y
  `apps/mobile/hooks/use-monitoring.ts`, con regresión enfocada `4/4`.
- El punto continúa `pending` porque la lectura llegó con estado `draft` y no
  existe umbral vigente; por tanto no se ha falseado el cierre como completo.
- Desde la misma ronda se creó un parte `partial` con `pending_point_count=1`;
  la UI mostró `Parte recibido por el servidor. El supervisor podrá
  consultarlo.` y la consulta de solo lectura verificó una única fila con
  `client_request_id` propio.
- La release v7 conserva ahora el diagnóstico seguro del fallo de exportación.
  Al pulsar `Compartir CSV`, la UI mostró literalmente `No se pudo completar
  la operación. Reintenta en unos segundos. (HTTP 500 · ROUND_EXPORT_FAILED ·
  Código de soporte: cd695cdf-da73-4b94-86eb-dc5bb187a0f2)`.
- Render registró esa misma petición como `GET
  /api/v1/rounds/db3a59e3-3756-4d95-9890-f026379f33db/export?format=csv 500`.
  La causa quedó aislada en el backend local: la segunda consulta de
  exportación pasaba el parámetro de scope sin interpolar `${scope.clause}`.
  Se corrigió con regresión, se publicó por PR #19/#20 y se repitió en el
  Galaxy: CSV y XLSX generaron archivos y Render registró ambos `200`.
- La conectividad se restauró y `ping` a Render devolvió `0% packet loss`.
- Render quedó publicado en `df224f9b7226c8aa5899a5e889898663b4642016` mediante
  el deploy `dep-daj3kenqj5pc73at1n50` (`live`). `/api/v1/health` devolvió
  `HTTP/1.1 200 OK` con ese commit y las rutas protegidas sin token devuelven
  `401 Unauthorized`. En esta validación no se hizo migración ni cambio de
  datos.
- La comparación estructurada de exportaciones ya tiene un verificador local:
  ejecutar `npm run build --workspace apps/backend` y después
  `npm run verify:export-artifacts -- <ronda.csv> <ronda.xlsx>`. La herramienta
  exige las 29 columnas, BOM UTF-8, hoja `Auscultación`, filtro `A1:AC1`, primera
  fila congelada y filas normalizadas idénticas. Las cinco últimas columnas
  reflejan el último resultado recibido del operario. Falta ejecutarla con los dos
  binarios de una misma descarga real, porque el selector nativo del Galaxy no
  los dejó accesibles en almacenamiento público.
- La pantalla de resumen ofrece ahora `Guardar CSV` y `Guardar Excel` mediante
  Storage Access Framework de Android. El selector empieza en `Download`, la
  carpeta se elige explícitamente y el archivo se crea con MIME correcto; al
  cancelar no se descarga ni se escribe nada. La evidencia y el procedimiento
  están en `docs/field/F6_EXPORT_SAVE_TO_ANDROID.md`. La nueva ruta todavía no
  está instalada en el Galaxy v7, así que la comparación de archivos reales
  queda pendiente de la siguiente instalación autorizada.
- El preflight local posterior terminó con `verify pre-apk local-only
  completed successfully`; Expo exportó `metadata.json=6101 bytes`, `files=95`
  y el bundle Android, sin procesos Expo/Metro retenidos. Esto verifica
  bundling, no instalación ni comportamiento nativo del selector en el Galaxy.
- La comprobación adicional en el Galaxy v7 generó literalmente los archivos
  `topofield-ronda-db3a59e3-3756-4d95-9890-f026379f33db-1789281332679.csv` y
  `topofield-ronda-db3a59e3-3756-4d95-9890-f026379f33db-1789281343797.xlsx`.
  El selector nativo ofreció destinos de compartir para ambos y no se envió
  ningún archivo. La paridad binaria/estructurada sigue pendiente porque la
  APK release no deja esos temporales accesibles para lectura local.
- Último slice funcional local: `750153a` (`feat: exigir motivo en visitas no realizables`), precedido por `137ba89` (`feat(mobile): añadir motivos rápidos de campo`), `10d76d7` (`fix(mobile): distinguir resultado local del recibido`), `ac7a44d` (`feat(mobile): atajo Marcar hecho`) y los slices anteriores de jornada, historial y exportación. La corrección backend equivalente `bf796b3` está publicada en `main` mediante el merge `df224f9`. La batería actual queda en `114/114` backend y `119/119` móvil; tooling mantiene `13/13` y `docs:check` revisa `44` documentos sin avisos. La build v12 del Galaxy contiene el slice de semana operativa y su smoke test no generó cambios remotos; la migración 029 sigue sin estar aplicada remotamente, por lo que no se debe usar la build nueva contra Render todavía. La evidencia de E2E offline completo en v7 permanece histórica y separada. Después de los commits funcionales de la memoria visual se mantiene separada la documentación. La
  secuencia inmediata anterior incluye `f3ad2aa` (runner local serializado),
  `0a36d5e`, `bddf7f9`, `689d356`
  (benchmark de mercado), `0ebe542`, `abbe5b1` y `b4f78ce` (hardening y
  trazabilidad de la migración 027). El runner local mantiene el bloqueo
  advisory y las transacciones en el mismo cliente PostgreSQL; su regresión
  forma parte de la batería backend actual `114/114`. La
  migración
  local `027_station_mounting_visits.sql` comprueba `pg_constraint` antes de
  cada clave foránea compuesta y `pg_policies` antes de crear sus políticas RLS
  para tolerar un reintento tras una aplicación parcial; su regresión está
  incluida en la batería backend. La migración
  continúa sin aplicar en Supabase.
- La mejora más reciente de memoria visual añade filtros por tipo de evidencia
  y previsualización de `132px` en la pantalla de visitas de montaje. La
  proyección mantiene la posición relativa solo como anotación de imagen, sin
  convertirla en coordenada, orientación o precisión métrica; la regresión está
  en `apps/mobile/lib/__tests__/mounting-visual.test.ts`.
- La última mejora añade además una vista ampliada al pulsar una evidencia;
  prioriza `localUri` para registros offline, muestra notas y permite cerrar
  con un botón accesible. La suite móvil queda en `22` suites y `99` tests;
  la regresión del selector de URI está en `mounting-visual.test.ts`.
- La memoria visual también permite filtrar por estado (`En curso`, `Realizadas`
  y `No realizables`) sin mutar ni reordenar las visitas. La regresión cubre la
  combinación con el filtro de evidencia; la suite móvil queda en `22` suites
  y `104` tests.
- La creación de una obra nueva siembra ahora las tres zonas ficticias del
  catálogo de ejemplo, incluida `Zona Centro`/`EJ-C-001`, alineada con
  `data/generic-project-code-catalog.csv`; el backend lo cubre con regresión.
- Hardening local anterior: `a475976` junto con `35fc885`, `f5de61d`, `f90c995`, `3465cde`, `4562d89` y `ce8bc40`, protege las relaciones
  internas de ronda, punto de control, lectura y adjuntos, preparan la
  migración 028 para deduplicación concurrente, bloquean los deep links de
  escritura y exigen en backend el mapa efectivo para cualquier escritura de
  topógrafo.
- `f5de61d` corrige un hueco adicional de tenant en la reconciliación automática
  de observaciones de prismas: la observación, el prisma y la estación deben
  compartir `project_id`, y una estación sin proyecto no recibe observaciones.
  La regresión se ejecuta desde `dist` para evitar falsos verdes del test.
- `35fc885` corrige otra relación defensiva de memoria de montaje: las
  evidencias se agregan solo si coinciden simultáneamente `visit_id` y
  `station_id`. La regresión está en `monitoring.model.test.ts`; el backend
  local queda en `106/106` tests.
- `a475976` corrige una lectura defensiva adicional: `getStationById` confirma
  primero el scope de la estación y solo después consulta sus lecturas
  asociadas. La regresión evita volver a ejecutar la carga de historial antes
  de la autorización de tenant.
- Corrección backend relevante: `b0572a0`, preserva el `projectId` real al
  firmar fotos de lecturas.
- Última corrección local: `c709fab` elimina una sustitución de nombre
  específica de una obra en la presentación de estaciones; `e3d24e5` deja la
  regresión con datos neutros. El escaneo de fuentes activas no encuentra
  nombres de obras ni referencias TopoTask/ARGOS fuera de scripts y datos
  legacy explícitos.
- Última mejora local de operación: el Perfil lista errores y conflictos del
  outbox por sesión; solo los errores admiten reintento y los conflictos quedan
  como revisión necesaria sin exponer payloads ni reintentar a ciegas.
- `423649d` separa el reintento manual del automático: el botón reinicia el
  ciclo completo, mientras que un fallo transitorio conserva contador y fecha
  para respetar el backoff.
- `markError` sanea antes de persistir los errores del outbox: elimina bearer,
  JWT y valores de autorización, y limita el texto local a 240 caracteres.
- La especificación offline está alineada con esa capacidad: la resolución
  `Usar mío`/`Usar servidor`/`Descartar` queda explícitamente fuera del MVP
  hasta tener contrato, permisos y prueba de concurrencia.
- El outbox tampoco persiste ya el error completo de un conflicto `409`:
  conserva únicamente estado y código técnico validado.
- El lector del outbox tolera JSON local corrupto y mantiene visible el item
  para diagnóstico; no descarta ni reinterpreta sus datos como válidos.
- La observabilidad móvil usa `formatSafeErrorForLog`: no imprime mensajes de
  error ni cuerpos HTTP, solo metadatos operativos validados.
- `12410aa` prepara la release local v5 y normaliza los dos últimos logs de
  error crudo detectados en Perfil y SQLite; no incluye el cambio previo de
  `apps/mobile/package.json`.
- `aaf1388` corrige la invocación Windows del preflight para que la exportación
  de Expo finalice y no deje procesos retenidos; `d43d06b` añade tres
  regresiones para rutas con espacios y metacaracteres. La ejecución actual
  devuelve `PRE_APK_EXIT=0`, crea `metadata.json` y deja cero procesos
  Expo/Metro relacionados.
- La regresión queda disponible como `npm run test:tooling` y no depende de
  credenciales, Expo ni un dispositivo físico.
- `32c177c` endurece `scripts/build-local-android.ps1`: si la limpieza de
  Gradle falla por `ninja: error: manifest 'build.ninja' still dirty after 100
  tries`, el mismo script reintenta `app:bundleRelease` sin `clean`. La prueba
  real del 13-09-2026 terminó con `BUILD SUCCESSFUL in 7m 15s` y generó la AAB
  v5 firmada; esto no equivale a instalación ni validación física.
- `verify:pre-apk:local` permite repetir build backend, TypeScript móvil y
  export Android sin credenciales; `verify:pre-apk` mantiene además la
  comprobación remota autenticada y falla cerrado si no existe la contraseña
  QA.
- La exportación Android del preflight se valida ahora después de ejecutar
  Expo: `metadata.json` debe existir, ser no vacío y acompañarse de archivos
  de assets. La última ejecución real devolvió `metadata.json=6101 bytes`,
  `files=95`, `PRE_APK_COMMAND_EXIT=0` y `PRE_APK_RELATED_PROCESSES=0`.
- `673fc15` versiona el validador de salida Expo y sus pruebas de tooling;
  el commit no incluye `apps/mobile/package.json` ni las capturas locales del
  Galaxy.
- `verify:local` encadena la verificación local completa y
  `verify:local:pre-apk` añade el export Android con validación de artefactos.
  La ejecución comprobada de `verify:local` termina con
  `verify local completed successfully`.
- El reintento manual del outbox reinicia el ciclo completo, incluido el límite
  de intentos y el backoff. Los fallos automáticos usan una operación separada
  que conserva `retry_count` y `last_sync_attempt_at`, por lo que no se puede
  saltar el backoff ni dejar inutilizado el botón de reintento tras agotar el
  límite.
- Commits anteriores de esta continuación: `d43d06b` cubre el preflight
  Windows; `aaf1388` corrige su ejecución; `600f4cb`, `9ed4805`, `9fa8dd5`,
  `339d022`, `5181dc4` y `d43d06b` actualizan la trazabilidad local. El
  historial de commits anteriores se conserva en la bitácora.
  `12410aa` prepara la release local `versionCode=5`; `a345ff8`, `5f44140`,
  `e52fde6` y `6c1c96b`
  actualizan handoff, evidencia de APK, documentación de piloto y estado de
  despliegue. El cambio previo de `apps/mobile/package.json` sigue fuera de
  todos esos commits.
- Después se añadieron `35fc885` (scope de evidencia por estación), `a475976`
  (scope previo a historial) y `f8ee24f`
  (documentación y evidencia local `104/104`). No se tocaron servicios
  remotos ni el Galaxy.
- `42f5727` corrige la apertura automática de `Mi jornada` para que el ciclo
  se reinicie al cambiar de usuario o volver desde modo invitado; la regresión
  queda en `apps/mobile/lib/__tests__/journey-navigation.test.ts`. La suite
  móvil actual pasa `22` suites y `98` tests; el backend actual pasa `104/104`.
- `f5de61d` y la continuación local endurecen la idempotencia de adjuntos: el
  endpoint usa bloqueo transaccional por lectura/ruta y `ON CONFLICT DO NOTHING`
  sin depender todavía de la migración 028. La migración 028 sigue pendiente
  en remoto como garantía de base de datos.
- Últimos commits locales de la rama: `18bf48a` (cifras activas de verificación),
  `84da8c4`/`a5d9c5b` (replay de evidencia de montaje desde `draft`),
  `c983f9e`/`112a858` (estado offline de visitas de montaje), `dc36014`/`a9b1513`
  (idempotencia de evidencias), `d8579ed`/`014b8af` (testigo fotográfico),
  `d63f04d` (cadena completa de outbox),
  seguidos de `aa5e523` (integridad SQL de visitas de
  montaje), `f6623b0` (handoff y auditoría de dependencias), `a868867` (scope de prismas y regresión),
  `cd82af6` (fixture genérico validado), `db088f2` (fixtures neutros y
  documentación), `15d9472` (auditoría autónoma local y documentación viva),
  `8ef354d` (scope defensivo de incidencias), `f4a0ae1` (auditoría estática de
  rutas), `703f36b` (verificación de release Android), `8150c68` (visitas de montaje
  offline-first), `c0d0e8e` (trazabilidad offline), `ee80825`/`534cc42`
  (croquis fotográfico relativo y documentación) y `5f92a66`/`3cce1dd`
  (borradores de lectura persistentes y documentación), seguidos de
  `1292aea`/`1cf27b0` (reconciliación documental y plantilla de campo) y
  `6d9f31c` (alineación de dependencias Expo) y `b7641c4` (evidencia de la
  alineación).
- Último commit local antes del hardening de caché: `18dee00` (paridad
  CSV/XLSX y regresión de exportación).
- Hardening local actual: `ef043b1` (caché de rondas separada por sesión y
  regresión de migración SQLite 005).
- Hardening local en `1d82a9f`: migración SQLite 006, outbox filtrado por sesión
  y cancelación por generación durante cambios de cuenta; 13 suites y 62 tests
  móviles pasan.
- GitHub `main` verificado por API tras fusionar la PR #17:
  `20d8520f0db6022cc2163a51cd9a3464c7600010`.
- El `origin/main` local puede estar atrasado; no usarlo como estado remoto
  sin refrescarlo o consultar GitHub.
- La release local v5 se recompiló el 13-09-2026 después de alinear Expo y
  corregir bugs reales del outbox:
  `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`,
  `40,136,245` bytes, firmada como `CN=TopoField Android Release`. El
  manifiesto confirma `versionCode=5` y `com.ciudadanoinusual.topofield`;
  `jarsigner -verify` y `bundletool validate` devuelven código 0. No se
  generó un APK universal con Bundletool porque el transporte de la
  contraseña de la clave quedó bloqueado por la política de terminal; la
  APK arm64 generada por Gradle sí quedó verificada con `apksigner`.
  Gradle generó también
  `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`,
  `53,408,438` bytes; `apksigner` confirmó `verified=true`, esquema V2 y
  `CN=TopoField Android Release`. La variante
  `jarsigner -verify -strict` conserva la advertencia esperable del certificado
  local autofirmado, no una validación de Play Store. El intento de ampliar el
  build a todos los ABI falló en `react-native-reanimated` con `ninja: error:
  manifest 'build.ninja' still dirty after 100 tries`; la APK arm64 es la
  variante preparada para el Galaxy. La v4 fue instalada y
  validada históricamente en el Galaxy para la consulta supervisora; la v5 no
  se instaló porque ADB no está disponible.

## Estado desplegado

- Render: `https://la-libreta-del-peon-1.onrender.com`.
- Último despliegue observado: `/api/v1/health` devolvió `200` y estado `ok`
  con commit `df224f9b7226c8aa5899a5e889898663b4642016` el 13-09-2026.
  Las rutas de rondas y `GET /api/v1/me/journey` sin bearer devolvieron
  `401 UNAUTHORIZED`, nunca `404`.
- El commit remoto observado (`df224f9`) contiene la corrección de exportación,
  pero el hardening local `f90c995` (`PROJECT_ACCESS_REQUIRED` cuando falta el
  mapa de membresías) no es antecesor de ese despliegue. No se debe presentar
  esa defensa como activa en Render hasta publicar y verificar el commit que la
  contenga.
- No aplicar migraciones ni cambiar Supabase Auth/RLS sin autorización explícita
  en el momento.

Para verificar el contrato autenticado sin exponer el token, usar una variable
de entorno temporal en PowerShell, nunca un argumento ni un archivo versionado:

```powershell
$env:TOPOFIELD_AUTH_TOKEN = '<token QA temporal>'
$env:TOPOFIELD_PROJECT_ID = '<uuid de obra autorizada>'
$env:TOPOFIELD_ROUND_ID = '<uuid de ronda autorizada>'
npm run verify:remote:auth
Remove-Item Env:TOPOFIELD_AUTH_TOKEN
Remove-Item Env:TOPOFIELD_PROJECT_ID
Remove-Item Env:TOPOFIELD_ROUND_ID
```

El verificador solo imprime estados HTTP y códigos de error; exige `200` en
`/auth/me`, acepta `200` o `403` en `Mi jornada` según el rol, y falla ante
`404` en rutas que deben existir. La suite de tooling cubre que no imprime
cuerpos ni credenciales.

## Estado móvil y Galaxy

- Release histórica instalada: `versionCode=4`, firmada como `CN=TopoField Android Release`.
- La consulta supervisora fue validada anteriormente en el Galaxy.
- La release arm64 `versionCode=7` se instaló el 13-09-2026 con `adb install -r`
  y `Success`; `dumpsys package` confirmó `lastUpdateTime=2026-09-13
  07:39:25`.
- El recorrido de operador con lectura y foto offline quedó verificado una vez:
  reinicio sin pérdida, sincronización automática `2/2` y exactamente una
  lectura más un adjunto en Supabase. El arranque en frío offline recuperó
  además la lista de rondas desde caché con aviso de antigüedad.
- La v7 se generó porque la UI descartaba metadatos accionables de un error API
  de exportación; el test móvil evita mostrar cuerpos o secretos. No generar
  otra release salvo que aparezca un nuevo bug móvil reproducible.
- No automatizar el modo avión con `adb shell settings`; debe activarse desde
  la interfaz real del dispositivo.
- La autorización de escritura es fail-closed en móvil y backend: una sesión
  topógrafo sin `projectAccess` no puede escribir aunque conserve `projectIds`.
  La regresión backend está en `f90c995`; este commit aún no está desplegado.

## Trabajo pendiente prioritario

1. Ejecutar `npm run verify:remote:auth` con un token QA temporal y los UUID
   autorizados, para comprobar `/auth/me`, `Mi jornada` y, si se proporcionan,
   la obra y ronda sin aceptar un `404`.
2. Ejecutar `npm run verify:export-artifacts -- <ronda.csv> <ronda.xlsx>` con
   los dos archivos de una misma ronda real; la generación autenticada ya
   responde `200` y la prueba local cubre la paridad del contrato.
3. Validar con datos autorizados el cierre positivo con umbral y el bloqueo de
   exportación para una membresía `read`.
4. Conservar respuestas HTTP, logcat y comprobaciones de Supabase sin secretos
   como evidencia del recorrido repetido.
5. Corregir solo fallos reproducibles, siempre con regresión y commit separado.
6. Validar visualmente desde la UI la semilla genérica al crear una obra, sin
   datos de obra real.
7. Autorizar/aplicar `027_station_mounting_visits.sql` y desplegar sus rutas;
   validar en campo la pantalla local de visitas de montaje, incluida cámara,
   Storage, reinicio y reconexión. La captura offline local ya usa caché
   SQLite por sesión y estación más el outbox (migración local 007). Después
   decidir el croquis fotográfico según evidencia y no según una demo.
8. Preparar piloto con segundo usuario/dispositivo y entrevistas de mercado.

## Cambios locales que no se deben mezclar

- `apps/mobile/package.json` tiene un diff previo de los scripts `android`/`ios`.
- Las capturas `topofield-*.png` son evidencia no versionada.
- El `package-lock.json` incluye la alineación de Expo 56 del commit `6d9f31c`
  además de la actualización segura de `morgan` y `qs`; build y tests backend
  pasan con él.
- La auditoría actual está archivada en
  `docs/archive/F5_SECURITY_SCOPE_AUDIT_2026-09-12.md`.
- La auditoría local vigente está en
  `docs/field/F5_AUTONOMOUS_LOCAL_AUDIT_2026-09-13.md`; documenta la revisión
  de rutas, las correcciones defensivas de incidencias, prismas, visitas de
  montaje y relaciones ronda-punto-lectura, el contrato de exportación F7, el
  fixture genérico y la evidencia de la release sin confundirlas con el E2E
  físico. La migración local 028 prepara unicidad para adjuntos concurrentes y
  aún no se ha aplicado remotamente.
 - El importador manual MapEst ahora falla cerrado si una estación no mapea a
   una obra única; la regresión está en
   `apps/backend/src/scripts/mapest-project-mapping.test.ts`.
 - La migración `007_storage_photo_bucket.sql` mantiene el bucket de fotos como
   público y los DTO devuelven `publicUrl`. El scope de la API está protegido,
   pero un enlace conocido puede leerse directamente; antes de usar fotos
   sensibles hay que decidir entre aceptar ese riesgo o migrar a lecturas
   firmadas. No se cambió Storage unilateralmente.
- Los scripts históricos de aplicación de migraciones 016 y 017 pasan ahora
  por `assertWriteAllowed`; la guarda está cubierta en
  `apps/backend/src/scripts/safety.test.ts` y no se ejecutó SQL remoto.
- La rama local añade `f5de61d` después del despliegue verificado de Render
  (`6a1b19f`); la corrección de scope de prismas todavía no se ha publicado
  remotamente.
- La plantilla de obra genérica está en
  `docs/field/GENERIC_PROJECT_TEMPLATE.md` y su fixture CSV en
  `data/generic-project-code-catalog.csv`; ambos usan únicamente códigos y
  zonas ficticias, sin datos de cliente.
- La cobertura móvil de instrumentos está explicitada en
  `docs/field/INSTRUMENT_COVERAGE_MATRIX.md`: testigo fotográfico,
  potenciómetro, nivel digital y fisurómetro digital tienen captura de MVP
  confirmada; los demás formularios genéricos muestran estado provisional y
  no afirman representar pares, perfiles, ambos carriles o protocolos de
  fabricante.
- La caché local de rondas y snapshots quedó separada por sesión en la
  migración SQLite 005; la caché anterior se invalida al actualizar para
  evitar contaminación entre cuentas.
- El outbox local quedó separado por sesión en la migración SQLite 006. Las
  filas antiguas se marcan `__unassigned__`, y un flush antiguo se abandona si
  cambia la sesión durante una request. Falta validarlo en un cambio real de
  cuenta en el Galaxy.
- Las consultas protegidas de React Query usan namespaces por sesión y las
  actualizaciones optimistas se limitan a la cuenta activa. El contrato
  `getSessionCacheKey` está cubierto por una regresión en `dedf77b`; la
  validación física de respuestas tardías entre cuentas sigue pendiente.
- Los borradores de lecturas usan la migración SQLite 008 y quedan separados
  por sesión y punto de ronda. Recuperan campos, notas y componentes del
  potenciómetro tras un reinicio; la foto solo se persiste para sincronización
  al pulsar Guardar lectura, sin base64 en SQLite.
- Las dependencias compatibles con Expo 56 quedaron alineadas en `6d9f31c` y
  `npx expo install --check` devuelve `Dependencies are up to date`. El plugin
  nativo de `expo-sqlite` está declarado en `apps/mobile/app.json`. El diff
  previo de scripts `android/ios` de `apps/mobile/package.json` permanece sin
  commit.
 - La rama prepara `027_station_mounting_visits.sql`, el contrato de visitas
  append-only, evidencias fotográficas y la pantalla móvil de `Visitas de
  montaje`, incluidos los estados de visita `draft`, `completed` y `blocked`.
  La captura offline local usa SQLite 007, caché por sesión/estación y el
  outbox existente. La posición relativa opcional usa una cuadrícula 3x3 y
  las consultas muestran el título como etiqueta sobre la miniatura, sin
   afirmar precisión métrica. No se ha aplicado la migración PostgreSQL ni se
   ha desplegado el endpoint; la validación física y la comprobación de Storage
   quedan pendientes.
- La migración local `028_reading_attachment_idempotency.sql` está preparada,
  con comprobación de duplicados históricos e índice único para carreras de
  adjuntos; no se ha aplicado remotamente.
- El reintento offline de evidencias de montaje conserva ahora el
  `clientRequestId` exigido por el backend; la regresión está en
  `apps/mobile/lib/offline/__tests__/sync-handlers.test.ts`.
- Los cambios de estado de visitas de montaje también son offline-first:
  actualizan la caché y encolan un `mounting_visit_update`; al sincronizar se
  resuelve primero la visita local y después se aplica el `PATCH`.
- El replay de una evidencia cuyo visit fue creado y marcado offline fuerza la
  recreación como `draft`; el estado `completed` o `blocked` se aplica después
  mediante su operación `PATCH`, porque el backend no acepta estados terminales
  en el POST de creación.
- La regresión móvil de `field-access` cubre el estado de carga y el bloqueo
  explícito de `Parte de zona` para supervisor/membresía `read`. La verificación
  posterior dejó `18` suites y `80` tests móviles en verde. El mismo contrato
  falla cerrado si una sesión topógrafo no trae aún `projectAccess`.
- Verificación local posterior al hardening más reciente: backend compila y
  tiene `104/104` tests; móvil TypeScript sale sin errores y Jest tiene `22`
  suites y `104` tests. La captura de `fissure_witness` marca la foto como
  obligatoria y no envía una unidad ficticia. `docs:check` revisa 40 documentos
  sin avisos y `npx expo install --check` devuelve `Dependencies are up to date`.

## Comandos de verificación

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield
npm run build --workspace apps/backend
npm test --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm test --workspace apps/mobile
npm run docs:check
git diff --check
git status --short
adb devices -l
```
