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

## Estado verificado más reciente (13-09-2026)

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
- Último arreglo funcional local: `bf796b3` (`fix(export): enforce scope and preserve diagnostics`), validado con backend `105/105` y móvil `104/104`; su equivalente limpio está publicado en `main` mediante el merge `df224f9`. Después de los commits funcionales de la memoria visual se mantiene separada la documentación. La
  secuencia inmediata anterior incluye `f3ad2aa` (runner local serializado),
  `0a36d5e`, `bddf7f9`, `689d356`
  (benchmark de mercado), `0ebe542`, `abbe5b1` y `b4f78ce` (hardening y
  trazabilidad de la migración 027). El runner local mantiene el bloqueo
  advisory y las transacciones en el mismo cliente PostgreSQL; su regresión
  forma parte de la batería backend `105/105`. La
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
  local queda en `105/105` tests.
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
  con commit `eb88db922a03b1e01a47f90dba8346542df3f212` el 13-09-2026.
  Las rutas de rondas y `GET /api/v1/me/journey` sin bearer devolvieron
  `401 UNAUTHORIZED`, nunca `404`.
- El commit remoto observado (`eb88db9`) es anterior a los hardenings locales
  posteriores de esta rama; no contiene automáticamente los commits locales
  más recientes hasta una publicación mediante PR y despliegue.
- No aplicar migraciones ni cambiar Supabase Auth/RLS sin autorización explícita
  en el momento.

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

1. Publicar el arreglo de scope de exportación mediante PR y verificar Render.
2. Validar CSV/XLSX de la misma ronda real y el bloqueo de exportación para
   `read`; la paridad local ya está cubierta por
   `round-export-parity.test.ts`.
3. Registrar respuestas HTTP, logcat y comprobaciones de Supabase sin secretos.
4. Corregir solo fallos reproducibles, siempre con regresión y commit separado.
5. Validar visualmente desde la UI la semilla genérica al crear una obra, sin
   datos de obra real.
6. Autorizar/aplicar `027_station_mounting_visits.sql` y desplegar sus rutas;
   validar en campo la pantalla local de visitas de montaje, incluida cámara,
   Storage, reinicio y reconexión. La captura offline local ya usa caché
   SQLite por sesión y estación más el outbox (migración local 007). Después
   decidir el croquis fotográfico según evidencia y no según una demo.
7. Preparar piloto con segundo usuario/dispositivo y entrevistas de mercado.

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
