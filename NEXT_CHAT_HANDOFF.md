<!-- doc-status
estado: vivo
  verificado: 2026-09-16
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
distintas. La evidencia fechada y los identificadores de objetos quedaron
archivados en `docs/archive/HISTORY_PURGE_RECONCILIATION_2026-09-13.md`; la
compuerta vigente es la descrita en este handoff y en `ROADMAP.md`.

No ejecutar `filter-repo`, borrar refs, podar objetos, hacer fetch ni publicar
un `push --force` como parte del cierre autonomo local. Si se retoma esta
deuda, debe partirse del mirror original intacto y verificarse primero el
repositorio bare.

## Estado de la rama

- Rama activa: `codex/f5-field-stability`.

La validación física completa de lectura/foto offline de la v7 es histórica.
La evidencia física más reciente registrada es la instalación de la
`versionCode=12` el 13-09-2026 (`adb install -r` → `Success`, `dumpsys package`
→ `versionCode=12`, `lastUpdateTime=2026-09-13 12:32:01`). Esta revisión
documental del 15-09 no ha ejecutado ADB, así que no debe afirmar que el Galaxy
esté conectado ahora.

La base local al iniciar Stage 2 era `55de481`; el hardening técnico de readiness
de Stage 2 quedó versionado en `6a44d75` (`fix: harden schema readiness probes`).
Los cambios documentales posteriores pueden dejar `HEAD` por encima de ese SHA;
para el valor exacto usar `git rev-parse HEAD`, no una referencia histórica del
handoff. El backend publicado se obtuvo mediante un snapshot limpio basado en
GitHub `main`: PR #22 quedó fusionada como
`349967a538a3a5e8f4c51245d02511b7ec6cce69` y Render auto-desplegó exactamente
ese SHA. `/health=200`, `/readiness=200`, `workExecution.available=true` y
`weeklyWork.available=true`; el verificador público terminó correctamente.

## Slice implementado después del último estado remoto

El análisis local del control semanal de Excel llevó a una mejora operativa:
desde cada punto de una ronda el operario puede indicar `Empezar`, `Hecho`,
`No realizado`, `Repetir` o `Bloqueado`; los tres últimos exigen motivo. El
contrato está en `docs/field/WORK_EXECUTION_CONTRACT.md`, la migración local en
`apps/backend/migrations/029_monitoring_work_execution_events.sql` y las rutas
son `GET/POST /api/v1/round-points/:roundPointId/execution-events`.

La captura móvil usa el outbox existente y un `clientRequestId` estable, pero
el hardening de Work Execution la hace explícitamente local-first: persiste primero
la acción y separa el resultado operativo de su estado de entrega. `Pendiente
local`, `Reintento`, `Conflicto` o `Backend pendiente` nunca se presentan como
`Recibido servidor`; el histórico remoto sigue siendo la evidencia de recepción.
El bloque anterior (`6ed9a84`, `8aff703`, `3b5ed4b`, `2399de6`, `2d182a0`)
queda reforzado por `bb22bff` y `6a09c58`. La migración 029 y las rutas están
ya desplegadas en Render mediante `349967a`. La v13 correspondiente está
preparada y firmada, pero no instalada/validada físicamente porque ADB no
detectó el Galaxy. La v12 instalada antes de esta misión no prueba estos commits.

La lista de puntos incorpora también `Marcar hecho` en una pulsación para el
caso normal. `Más opciones` abre el formulario de `Empezar`, `No realizado`,
`Repetir` y `Bloqueado` con motivo. El atajo usa la misma mutación, outbox e
idempotencia; queda pendiente validarlo en el Galaxy con v13.

En visitas de montaje, `No realizable` exige ahora un motivo escrito tanto en
la pantalla como en la validación backend; las notas previas se conservan y
se añade una línea de relevo explícita. Este cambio está en `750153a`; la
migración 027 y las rutas ya están desplegadas, pero falta validarlas físicamente.

La pantalla ofrece cuatro motivos neutros de selección rápida (`Sin acceso`,
`Sin visibilidad`, `Equipo o sensor dañado` y `Condición de campo adversa`),
manteniendo el campo libre para excepciones.

La migración 029 fue endurecida con índices únicos auxiliares y claves
foráneas compuestas: un evento no puede enlazar una ronda, un punto y una obra
cruzados aunque se intente escribir directamente en PostgreSQL. La regresión
estática cubre ambas relaciones y el esquema remoto ya fue aplicado/verificado.

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

Comprobación remota más reciente: Render sirve
`349967a538a3a5e8f4c51245d02511b7ec6cce69`. `/health` y `/readiness`
respondieron `200`; readiness informó 029 y 030 `ready`, y el verificador
público confirmó `401 UNAUTHORIZED` en las rutas protegidas sin bearer. El
`404` histórico de execution-events bajo `df224f9` queda supersedido.

La reconciliación del 16-09-2026 registró 019–026 en
`public.schema_migrations` sin reejecutar sus SQL. Después, con backup fresco
verificado, 027, 028, 029 y 030 se aplicaron y registraron por separado. Los
probes locales contra Supabase muestran 029 y 030 `ready`. El advisor de seguridad mantiene únicamente
`auth_leaked_password_protection` en `WARN`; el de rendimiento informa `13`
claves foráneas sin índice y `40` índices sin uso. El SQL remoto de 027–030 sí
fue aplicado por gates separados y no debe reejecutarse.

La Stage 2 independiente volvió a leer el ledger y confirmó que
`schema_migrations` solo guarda `id`, `filename` y `executed_at`: no existe hash
persistido. Los SHA-256 registrados en la reconciliación identifican los SQL
locales, **no** los bytes aplicados remotamente. 019–026 comparten una misma
marca de registro; 027–030 tienen cuatro marcas posteriores distintas. Los
gates de 027–030 se sostienen por la evidencia contemporánea del rollout, no por
inferirlos del timestamp. Durante esta revisión se reprodujeron falsos `ready`
con policy/índice de nombre correcto y definición alterada. `6a44d75` endurece
los probes 029/030 para validar PK, columnas, FKs, índices, CHECKs, RLS y la
policy deny-all. La matriz HTTP en PostgreSQL 17 devuelve `503` con ambos
ausentes, solo 029, solo 030, drift semántico, ausencia de PK o error de probe;
solo devuelve `200` con 029+030 íntegros. El probe endurecido leyó Supabase real
en modo read-only y devolvió ambas capabilities `ready`. Ese commit **aún no se
presenta como desplegado en Render**: el último deploy verificado sigue siendo
`349967a`.

Antes del despliegue, revisar el runbook de
`docs/field/WORK_EXECUTION_CONTRACT.md` y la evidencia de esta reconciliación.
La divergencia del ledger quedó cerrada, 027–030 ya están aplicadas y el backend
ya está publicado/verificado. La compuerta pendiente es la validación física y
autenticada del cliente, no repetir migraciones ni despliegue.

**Registro histórico de autorización (13-09-2026):** Erick autorizó expresamente el bloque
completo por compuertas: backup remoto; 027 -> 028 -> 029 tras prechecks verdes;
despliegue/verificación de backend; y después build/instalación/E2E Galaxy si
todo lo anterior pasa. En la sesión que recibió la autorización, la herramienta
de ejecución bloqueó antes de ejecutarse incluso la consulta remota de solo
lectura a `schema_migrations`. No confundir «autorizado» con «ejecutado»: no se
obtuvo backup nuevo, no se aplicó SQL, no se desplegó Render y no se instaló una
build nueva en ese intento. La instrucción de reanudar desde backup quedó
superada por la reconciliación y el dry-run posteriores; se conserva aquí como
evidencia, no como siguiente paso vigente.

**Reanudación verificada posterior (13-09-2026, evidencia histórica):** el conector de Supabase sí
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
haya aplicado. Este punto quedó superado como instrucción activa por el dry-run
posterior de 019–026; no se debe saltar directamente a 027->028->029 mientras
el ledger propio siga sin reconciliar.

La verificación local unificada previa a Stage 2, ejecutada el 16-09-2026,
terminó con `verify local completed successfully`: backend `139/139`, móvil `25`
suites y `137/137`, TypeScript móvil sin errores, tooling `17/17`, `docs:check`
sobre `47` documentos y `git diff --check` sin errores. Stage 2 añadió después
el hardening `6a44d75`. El entorno bloqueó la invocación agregada posterior de
`verify:local` antes de arrancar, por lo que se ejecutaron exactamente sus
componentes por separado: build backend PASS, backend `142/142`, TypeScript
móvil PASS, móvil `25` suites/`137` tests, tooling `17/17`, `docs:check` sobre
`47` documentos y `git diff --check` limpio. Las pruebas PostgreSQL controladas
descritas arriba también pasan. El árbol sigue
conservando fuera de esta misión el cambio previo de `apps/mobile/package.json`
y las capturas/XML no versionadas; no limpiarlos ni incluirlos en commits.

## Evidencia local de la v12 instalada (13-09-2026)

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
rol. Ambos solo imprimen códigos y estados, nunca tokens ni cuerpos. En aquella
sesión `adb devices -l` devolvió el Galaxy como `device`; se instaló la
release v12 con `adb install -r` y `dumpsys package` confirmó
`versionCode=12`. No se hicieron nuevas lecturas, fotos ni cambios remotos.

## Evidencia histórica verificada en Galaxy (13-09-2026, v7)

- El Galaxy `SM-S938B`/ADB `R5CY21X6FLE` estaba conectado como `device` en esa validación.
- La release arm64 `versionCode=7` de
  `com.ciudadanoinusual.topofield` quedó instalada en aquella validación; `adb install -r` devolvió
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
- La release v7 contenía ya el diagnóstico seguro del fallo de exportación.
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
- En ese bloque, `750153a` (`feat: exigir motivo en visitas no realizables`) quedó precedido por `137ba89` (`feat(mobile): añadir motivos rápidos de campo`), `10d76d7` (`fix(mobile): distinguir resultado local del recibido`), `ac7a44d` (`feat(mobile): atajo Marcar hecho`) y los slices anteriores de jornada, historial y exportación. La corrección backend equivalente `bf796b3` está publicada en `main` mediante el merge `df224f9`. La batería de aquel momento quedó en `114/114` backend y `119/119` móvil; tooling `13/13` y `docs:check` `44` documentos. La cifra vigente del árbol está en la sección superior de este handoff. La build v12 del Galaxy contiene el slice de semana operativa y su smoke test no generó cambios remotos; la migración 029 sigue sin estar aplicada remotamente, por lo que no se debe usar esa build contra Render para Work Execution. La evidencia de E2E offline completo en v7 permanece histórica y separada. Después de los commits funcionales de la memoria visual se mantiene separada la documentación. La
  secuencia inmediata anterior incluye `f3ad2aa` (runner local serializado),
  `0a36d5e`, `bddf7f9`, `689d356`
  (benchmark de mercado), `0ebe542`, `abbe5b1` y `b4f78ce` (hardening y
  trazabilidad de la migración 027). El runner local mantiene el bloqueo
  advisory y las transacciones en el mismo cliente PostgreSQL; su regresión
  formaba parte de la batería backend de aquel momento `114/114`. La
  migración
  local `027_station_mounting_visits.sql` comprueba `pg_constraint` antes de
  cada clave foránea compuesta y `pg_policies` antes de crear sus políticas RLS
  para tolerar un reintento tras una aplicación parcial; su regresión está
  incluida en la batería backend. La migración
  continúa sin aplicar en Supabase.
- Una mejora de memoria visual de ese bloque añade filtros por tipo de evidencia
  y previsualización de `132px` en la pantalla de visitas de montaje. La
  proyección mantiene la posición relativa solo como anotación de imagen, sin
  convertirla en coordenada, orientación o precisión métrica; la regresión está
  en `apps/mobile/lib/__tests__/mounting-visual.test.ts`.
- Una mejora posterior añade además una vista ampliada al pulsar una evidencia;
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
- Corrección local de aquel bloque: `c709fab` elimina una sustitución de nombre
  específica de una obra en la presentación de estaciones; `e3d24e5` deja la
  regresión con datos neutros. El escaneo de fuentes activas no encuentra
  nombres de obras ni referencias TopoTask/ARGOS fuera de scripts y datos
  legacy explícitos.
- Mejora local posterior de operación: el Perfil lista errores y conflictos del
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
  regresiones para rutas con espacios y metacaracteres. Esa ejecución
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
  queda en `apps/mobile/lib/__tests__/journey-navigation.test.ts`. En aquella
  verificación la suite móvil pasó `22` suites y `98` tests; el backend pasó
  `104/104`.
- `f5de61d` y la continuación local endurecen la idempotencia de adjuntos: el
  endpoint usa bloqueo transaccional por lectura/ruta y `ON CONFLICT DO NOTHING`
  sin depender todavía de la migración 028. La migración 028 sigue pendiente
  en remoto como garantía de base de datos.
- Secuencia local histórica de ese bloque: `18bf48a` (cifras activas de verificación),
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
- Hardening local de ese bloque: `ef043b1` (caché de rondas separada por sesión y
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
- Último despliegue observado: Render auto-desplegó el snapshot de PR #22 y
  `/api/v1/health` devolvió `200` con commit
  `349967a538a3a5e8f4c51245d02511b7ec6cce69`.
- `/api/v1/readiness` devolvió `200`, `status=ready`,
  `workExecution.available=true` y `weeklyWork.available=true`.
- `npm run verify:remote:public` terminó correctamente; las rutas protegidas
  sin bearer devolvieron `401 UNAUTHORIZED`.
- Smokes públicos adicionales confirmaron que las familias nuevas están
  publicadas: mounting-visits, weekly-work y execution-events devolvieron `401`
  sin bearer, no `404`.
- La validación autenticada automatizada sigue bloqueada porque no existe un
  `TOPOFIELD_AUTH_TOKEN` vigente disponible en el entorno/repo; no generar ni
  resetear credenciales solo para satisfacer esa prueba.
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

- Release activa más reciente demostrada: `versionCode=12`, instalada el
  13-09-2026 con `adb install -r` y `Success`; `dumpsys package` confirmó
  `lastUpdateTime=2026-09-13 12:32:01`. Incluye `Semana operativa`, pero no la
  planificación semanal editable añadida después en `97e70e4`.
- Release preparada más reciente: `versionCode=13` (`c15e793`). TypeScript y
  `25` suites/`137` tests pasan. La AAB (`40.170.854` bytes) terminó con
  `BUILD SUCCESSFUL in 11m 5s`; Bundletool `1.18.3` la validó y produjo una APK
  universal de `53.598.615` bytes. `apksigner` confirmó V2 y certificado
  `CN=TopoField Android Release`; `aapt2` confirmó package
  `com.ciudadanoinusual.topofield`, `versionCode=13`. `adb devices -l` quedó
  vacío, por lo que esta release no está instalada ni probada en Galaxy.
- Release histórica instalada: `versionCode=4`, firmada como `CN=TopoField Android Release`.
- La consulta supervisora fue validada anteriormente en el Galaxy.
- La release arm64 histórica `versionCode=7` se instaló el 13-09-2026 con `adb install -r`
  y `Success`; `dumpsys package` confirmó `lastUpdateTime=2026-09-13
  07:39:25`.
- El recorrido de operador con lectura y foto offline quedó verificado una vez:
  reinicio sin pérdida, sincronización automática `2/2` y exactamente una
  lectura más un adjunto en Supabase. El arranque en frío offline recuperó
  además la lista de rondas desde caché con aviso de antigüedad.
- La v7 se generó porque la UI descartaba metadatos accionables de un error API
  de exportación; el test móvil evita mostrar cuerpos o secretos. La instrucción
  histórica de no generar otra release salvo por un bug quedó superada por los
  cambios posteriores: cualquier build nueva debe corresponder a un backend y
  esquema explícitamente listos para la funcionalidad que se quiera validar.
- No automatizar el modo avión con `adb shell settings`; debe activarse desde
  la interfaz real del dispositivo.
- La autorización de escritura es fail-closed en móvil y backend: una sesión
  topógrafo sin `projectAccess` no puede escribir aunque conserve `projectIds`.
  La regresión histórica nació en `f90c995`; su contenido quedó incluido en el
  snapshot backend fusionado y desplegado como `349967a`.

## Trabajo pendiente prioritario

1. Reconectar el Galaxy por ADB e instalar v13 con `adb install -r` solo después
   de confirmar que la firma instalada coincide; no desinstalar automáticamente.
2. Repetir en v13 el flujo autenticado de work-execution, weekly-work, cambio de
   cuenta, caché/outbox, visitas de montaje y reconexión.
3. Ejecutar `npm run verify:remote:auth` con un token QA temporal y los UUID
   autorizados, para comprobar `/auth/me`, `Mi jornada` y, si se proporcionan,
   la obra y ronda sin aceptar un `404`; si no existe token legítimo, mantenerlo
   bloqueado y usar la sesión persistida del Galaxy como evidencia física.
4. Repetir desde v13 el guardado SAF de CSV/XLSX y obtener aceptación de
   oficina. La paridad estructural ya se cerró read-only con una ronda real de
   Supabase: `EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15
   worksheet=Auscultación utf8Bom=true`.
5. Validar con datos autorizados el cierre positivo con umbral y el bloqueo de
   exportación para una membresía `read`.
6. Conservar respuestas HTTP, logcat y comprobaciones de Supabase sin secretos
   como evidencia del recorrido repetido.
7. Corregir solo fallos reproducibles, siempre con regresión y commit separado.
8. Validar visualmente desde la UI la semilla genérica al crear una obra, sin
   datos de obra real.
9. Validar en campo las rutas ya desplegadas de `027_station_mounting_visits.sql`,
   incluida cámara,
   Storage, reinicio y reconexión. La captura offline local ya usa caché
   SQLite por sesión y estación más el outbox (migración local 007). Después
   decidir el croquis fotográfico según evidencia y no según una demo.
10. Preparar piloto con segundo usuario/dispositivo y entrevistas de mercado.

## Cambios locales que no se deben mezclar

- `apps/mobile/package.json` tiene un diff previo de los scripts `android`/`ios`.
- Las capturas `topofield-*.png` son evidencia no versionada.
- El `package-lock.json` incluye la alineación de Expo 56 del commit `6d9f31c`
  además de la actualización segura de `morgan` y `qs`; build y tests backend
  pasan con él.
- La auditoría de seguridad F5 del 12-09 está archivada en
  `docs/archive/F5_SECURITY_SCOPE_AUDIT_2026-09-12.md`.
- El informe autónomo local fechado del 13-09 está archivado en
  `docs/archive/F5_AUTONOMOUS_LOCAL_AUDIT_2026-09-13.md`; documenta la revisión
  de rutas, las correcciones defensivas de incidencias, prismas, visitas de
  montaje y relaciones ronda-punto-lectura, el contrato de exportación F7, el
  fixture genérico y la evidencia de la release sin confundirlas con el E2E
  físico. La migración 028 que ese informe trataba como pendiente quedó aplicada
  y verificada el 16-09-2026; el texto archivado sigue siendo evidencia histórica.
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
- Los estados de despliegue anteriores a PR #22 que aparecen en documentos
  históricos quedaron supersedidos por el backend `349967a`; no usarlos como
  estado remoto actual.
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
 - `027_station_mounting_visits.sql` ya está aplicada y sus rutas están
  desplegadas; el contrato de visitas append-only, evidencias fotográficas y la
  pantalla móvil de `Visitas de montaje` incluyen los estados `draft`,
  `completed` y `blocked`.
  La captura offline local usa SQLite 007, caché por sesión/estación y el
  outbox existente. La posición relativa opcional usa una cuadrícula 3x3 y
  las consultas muestran el título como etiqueta sobre la miniatura, sin
   afirmar precisión métrica. El esquema/backend están publicados; la validación
   física y la comprobación de Storage quedan pendientes.
- `028_reading_attachment_idempotency.sql` quedó aplicada y verificada el
  16-09-2026, con cero duplicados históricos y el índice UNIQUE esperado. No
  reejecutarla para verificar estado.
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
- Verificación local posterior a aquel hardening: backend compiló y pasó
  `104/104` tests; móvil TypeScript salió sin errores y Jest pasó `22` suites y
  `104` tests. La captura de `fissure_witness` marca la foto como
  obligatoria y no envía una unidad ficticia. `docs:check` revisa 40 documentos
  sin avisos y `npx expo install --check` devuelve `Dependencies are up to date`.

## Comandos de verificación

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield
$WT = (Get-Location).Path
$GD = (Resolve-Path -LiteralPath (((Get-Content -LiteralPath '.git' -Raw).Trim()) -replace '^gitdir:\s*','')).Path
npm run build --workspace apps/backend
npm test --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm test --workspace apps/mobile
npm run docs:check
git --no-optional-locks --git-dir="$GD" --work-tree="$WT" diff --check
git --no-optional-locks --git-dir="$GD" --work-tree="$WT" status --short
adb devices -l
```
