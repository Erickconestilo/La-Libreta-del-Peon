<!-- doc-status
estado: vivo
verificado: 2026-09-13
rol: audit
-->

# F5: Auditoria Autonoma Local

## Alcance

Esta auditoria comenzo como revision local sin el Galaxy, sin aplicar
migraciones y sin modificar Supabase, Render, EAS o Play Store. El addendum
fisico de esta misma fecha incorpora la evidencia posterior del Galaxy, pero
no sustituye la jornada observada ni las entrevistas profesionales.

La comprobación pública del 13-09-2026 observó Render vivo: `/api/v1/health`
respondió `200` con commit `eb88db922a03b1e01a47f90dba8346542df3f212`, y las
rutas protegidas de rondas y `GET /api/v1/me/journey` respondieron `401` sin
bearer. Ese hash remoto es anterior a los hardenings locales posteriores; no
se ha desplegado desde esta sesión.

## Addendum fisico del 13-09-2026

La prueba posterior uso la release `versionCode=6` instalada en el Galaxy
`SM-S938B`/ADB `R5CY21X6FLE`. La lectura `825 mm` y una foto se guardaron sin
red, sobrevivieron al reinicio y el sincronizador registro dos elementos
completados tras restaurar LTE. La consulta de solo lectura en Supabase
verifico exactamente una lectura con `client_request_id` poblado y
`attachment_count=1`, junto con exactamente una fila en
`reading_attachments`. El detalle completo, incluidos los identificadores y
los logs literales, esta en `F5_HALLAZGOS_2026-09-13.md`.

La misma release cargo la lista de rondas en linea antes del corte. Tras
activar modo avion desde la interfaz del sistema y reabrir la app, la ruta
`Obras -> Campus Nord -> Rondas de auscultacion` mostro `Rondas sin actualizar`
y la ronda `E2E-Galaxy-20260731-Atc`. Esto confirma la correccion de cache por
proyecto incorporada en v6. El punto sigue `pending` porque no hay umbral
vigente y la lectura permanece `draft`; el cierre bloqueado es correcto.

## Hallazgos y acciones

1. La superficie de rutas de negocio exige `requireAuth` y un `requireRole`
   explicito. Se auditan proyectos, estaciones, prismas, incidencias, guia,
   change logs, jornada, rondas, puntos, lecturas, adjuntos y uploads.
2. `visitante` y `supervisor` solo aparecen en rutas `GET`; las mutaciones no
   se pueden habilitar por accidente mediante una lista de roles.
3. Se corrigio el listado de incidencias para no mostrar a una obra una fila
   heredada que relacione una estacion de una obra con un prisma de otra.
   La creacion ya rechazaba esa mezcla; ahora la lectura tambien es defensiva.
4. El catalogo semilla de obras nuevas usa solo datos neutros `EJ-*`, zonas
   genericas y umbrales ilustrativos. No contiene nombres ni codigos reales.
5. La release local v5 se recompilo despues de alinear Expo 56 y corregir
   fallos reproducibles del outbox. El manifiesto confirma `versionCode=5` y
   el paquete de TopoField. La AAB esta firmada como `CN=TopoField Android
   Release`; `bundletool validate` termino con codigo 0. No se genero un APK
   universal con Bundletool porque no pudo recibir la contraseña del keystore
   de forma autorizada en esta terminal. Gradle genero ademas la APK release
   `app-release.apk`, y `apksigner` confirmo `verified=true`, esquema V2, un
   firmante y el mismo certificado de release. El ultimo intento de
   build universal fallo durante `externalNativeBuildCleanRelease` de
   `react-native-reanimated` con `ninja: error: manifest 'build.ninja' still
   dirty after 100 tries`; la APK arm64 sigue siendo la variante adecuada para
   el Galaxy. No se instalo ni se toco el Galaxy.
6. Los listados de prismas y observaciones por estación descartan una
   referencia cuyo prisma pertenezca a otra obra; se mantiene visible un
   prisma legacy sin `project_id` cuando no contradice la obra de su estación.
   La regresión vive en `apps/backend/src/models/prisms.model.test.ts`.
7. Las consultas de visitas de montaje exigen además que la obra de la visita
   coincida con la obra de su estación, y que cada evidencia corresponda a la
   misma estación de la visita, incluso antes de aplicar la migración 027. El
   contrato backend de exportación quedó alineado con los instrumentos y lados
   definidos en `shared/types.ts`, incluyendo los protocolos F7. La migración
   027 preparada comprueba `pg_constraint` antes de crear sus dos claves
   foráneas compuestas y `pg_policies` antes de crear sus políticas RLS, por lo
   que un reintento tras una aplicación parcial no falla por objetos ya
   existentes; sigue sin aplicarse remotamente.
8. La revisión defensiva detectó que los enlaces internos de monitoring no
   expresaban siempre la relación `ronda -> punto de control -> lectura`. Detalle,
   histórico, contexto de adjunto y exportación ahora exigen que esas relaciones
   compartan obra; los partes también comprueban que su `project_id` coincide
   con el de la ronda. Esto evita exponer o mezclar datos si una escritura
   directa deja una referencia cruzada en PostgreSQL.
9. La deduplicación de adjuntos de lectura tenía una ventana de carrera entre
   su consulta previa y el `INSERT`, y el `ON CONFLICT` con columnas concretas
   fallaba si se desplegaba antes del índice de `028`. La API serializa ahora
   cada par lectura/ruta con `pg_advisory_xact_lock`, reconsulta tras un
   conflicto y usa `ON CONFLICT DO NOTHING` sin una inferencia de índice. La
   migración local preparada `028_reading_attachment_idempotency.sql` añade
   además el índice único permanente y falla deliberadamente si existen
   duplicados históricos. No se ha aplicado a Supabase ni se han borrado filas.
10. El deep link de `Parte de zona` podía mostrar el formulario a una cuenta
    supervisora o con membresía `read`, aunque el backend ya rechazaba la
    escritura. La pantalla ahora resuelve `allowed`, `loading` o `read-only`
    con la misma función de permisos efectivos y no muestra controles de alta
    cuando la ronda carece de permiso de escritura.
11. `canWriteProject` permitía un comportamiento fail-open para sesiones
    antiguas de `topografo` que no traían `projectAccess`: la interfaz mostraba
    controles aunque el mapa de permisos todavía no estuviera disponible. Se
    cambió a fail-closed; hasta recibir el mapa del servidor, solo `admin` o
    una membresía explícita `write` pueden habilitar escritura.
12. La misma deriva existía en el backend: `assertProjectWriteAccess` podía
    aceptar una sesión `topografo` que conservara `projectIds` pero no trajera
    `projectAccess`. `f90c995` la cierra: toda escritura de topógrafo exige el
    mapa efectivo y el nivel `write`; si falta, devuelve `PROJECT_ACCESS_REQUIRED`.
    Se añadió regresión en `apps/backend/src/lib/access-control.test.ts`.

13. El formulario móvil de `fissure_witness` exigía una foto, pero la interfaz
    la etiquetaba como opcional y enviaba la unidad por defecto `mm` aunque el
    registro solo contiene evidencia fotográfica. Se corrigió con
    `getReadingCaptureCopy`: la foto es obligatoria, la unidad queda oculta y
    el payload envía `unit: null`; las lecturas escalares mantienen su unidad.
    La regresión está en
    `apps/mobile/lib/__tests__/monitoring-reading-form.test.ts`.

14. El sincronizador offline de evidencias de montaje omitía el
    `clientRequestId` que exige `mountingEvidenceSchema`. Después de recuperar
    red, esa evidencia podía quedar en `error` aunque la foto y la visita
    estuvieran bien encoladas. `syncMountingEvidence` ahora reenvía el UUID
    original y la regresión comprueba el cuerpo del POST.

15. Una visita de montaje creada sin conexión podía quedarse siempre en
    `draft`: los controles de “realizada” y “no realizable” llamaban al
    `PATCH` con el id local, sin caché ni operación de outbox. Ahora el cambio
    se conserva por sesión y el sincronizador recrea primero la visita con su
    `clientRequestId` y después aplica el `PATCH`. La creación online también
    se guarda en caché para que un corte inmediato de red no pierda el contexto.

16. Si una visita creada offline se marcaba como realizada antes de añadir una
    foto, el replay de la evidencia podía reutilizar `status: completed` en el
    POST de creación. El backend solo acepta `draft` al crear; ahora ese replay
    fuerza `draft` y deja el estado terminal al PATCH encolado. La regresión
    comprueba el cuerpo enviado y evita un error 422 en ese orden de trabajo.

17. La secuencia completa de outbox se cubre ahora con SQLite y mocks de red:
    creación de visita, cambio de estado y evidencia se procesan en orden,
    terminan como `3/3` sincronizadas y la evidencia recrea la visita como
    `draft` antes de adjuntarse. Esto no sustituye la comprobación real de
    Storage ni la consulta a Supabase.

18. El catálogo móvil exponía todos los tipos de auscultación como si el
    formulario escalar fuera suficiente para su procedimiento. Ahora la
    captura distingue los slices confirmados del MVP (testigo fotográfico,
    potenciómetro, nivel digital y fisurómetro digital) de los formularios
    provisionales, tanto al añadir el punto como al abrir la captura. Para convergencia, peralte, piezómetro, inclinómetro,
    clinómetro, linómetro y distanciómetro se muestra la limitación concreta
    sin inventar pares, perfiles, referencias de carril ni parámetros de
    fabricante. La matriz está en
    `docs/field/INSTRUMENT_COVERAGE_MATRIX.md` y la regresión en
    `apps/mobile/lib/__tests__/monitoring-reading-form.test.ts`.

19. La auditoría de límites entre proyectos encontró una sustitución fija en
    `apps/mobile/lib/station-display.ts`: una combinación concreta de
    `externalId` y nombre devolvía una etiqueta de una obra específica para
    cualquier usuario. No era una importación de TopoTask ni una fuga de datos
    desde la API, pero sí un acoplamiento de datos reales dentro de una ruta
    activa de presentación. Se eliminó la sustitución; ahora se conserva el
    nombre entregado por el servidor y solo se usa `externalId` como fallback
    cuando el nombre está vacío. La regresión en
    `apps/mobile/lib/__tests__/station-display.test.ts` confirma ambas reglas.
    Los scripts `apps/backend/src/scripts/legacy/`, el fixture
    `data/legacy/` y `import-mapest-stations.ts` siguen siendo herramientas o
    artefactos históricos explícitos, no imports del runtime móvil/backend.

20. El importador manual de MapEst podía dejar `project_id` en `NULL` si el
    nombre no coincidía con su mapa o si el código resolvía cero o varias
    obras. Ahora el importador aborta antes del `UPSERT` de esa estación en
    cualquiera de esos casos. La lógica está aislada en
    `apps/backend/src/scripts/mapest-project-mapping.ts` y sus regresiones
    cubren ambos rechazos; el importador sigue protegido por
    `assertWriteAllowed` y no se ejecutó contra ninguna base remota.

21. Los scripts históricos `apply-migration-016.ts` y
    `apply-migration-017.ts` no tenían la guarda común antes de ejecutar SQL;
    eso dejaba una ruta manual de escritura sin la confirmación explícita de
    entorno que sí usan los scripts actuales. Ambos llaman ahora a
    `assertWriteAllowed` con un nombre propio. La regresión de `safety.ts`
    confirma que una base de producción probable se bloquea sin
    `TOPOFIELD_ALLOW_PRODUCTION_WRITE` y solo se permite con coincidencia
    explícita. No se ejecutó ninguna de las dos migraciones.
22. El Perfil solo mostraba elementos del outbox en `error`, aunque SQLite y
    el sincronizador también conservan conflictos `409`. Ahora el diagnóstico
    local lista ambos estados por sesión. Los errores mantienen `Reintentar`;
    los conflictos muestran `Revisión necesaria` sin reenvío automático y sin
    exponer `conflictData`, cuerpos HTTP, tokens ni payloads. La regresión está
    en `apps/mobile/lib/offline/__tests__/outbox-diagnostics.test.ts`.
23. La documentación de diseño describía una pantalla futura con acciones
    `Usar mío`, `Usar servidor` y `Descartar cambio local`, pero esas acciones
    no tienen todavía contrato de resolución ni prueba de concurrencia. Se
    actualizó `apps/mobile/lib/offline/DESIGN.md` para distinguir el diagnóstico
    disponible en Perfil de la resolución futura; así el diseño no promete una
    operación destructiva que el MVP no puede ejecutar de forma segura.
24. El sincronizador persistía el objeto de error completo al clasificar un
    conflicto `409`, lo que podía conservar `rawMessage` o detalles de la
    respuesta en SQLite aunque la interfaz no los mostrara. Ahora solo persiste
    `status` y un código técnico con formato validado; la regresión de
    `sync-engine.test.ts` confirma que cuerpos y tokens no entran en
    `conflictData`.
25. El lector del outbox asumía que `payload` y `conflict_data` siempre eran
    JSON válido; una corrupción local podía abortar la consulta completa de
    diagnósticos. El parseo ahora es tolerante y devuelve un registro vacío,
    dejando el item visible para que el sincronizador lo clasifique como error
    en vez de ocultar toda la cola. La regresión está en
    `apps/mobile/lib/offline/__tests__/outbox.test.ts`.
26. La observabilidad móvil pasaba objetos de error completos a varios logs;
    eso podía emitir `message` o `rawMessage` del servidor. Se añadió
    `apps/mobile/lib/safe-error-log.ts` y se sustituyeron esos logs por estado,
    código, request ID y tipo de error. La regresión
    `safe-error-log.test.ts` confirma que mensajes con contraseñas y cuerpos
    simulados no aparecen en la salida.
27. El reintento manual del outbox devolvía un item a `pending`, pero conservaba
    el contador y el backoff del ciclo anterior. Tras alcanzar el máximo de
    intentos, el botón `Reintentar` podía fallar de nuevo inmediatamente. Ahora
    `retryItem` reinicia el ciclo manual completo, mientras que los fallos
    automáticos usan `markPendingForRetry` y conservan el estado necesario para
    backoff. La regresión simula un item agotado y verifica `retryCount = 0`,
    fechas nulas y ausencia de estado de sincronización anterior.
28. `markError` persistía en SQLite el texto recibido de una excepción sin una
    barrera en el punto de escritura. Aunque la interfaz ya lo redactaba, una
    extracción local del outbox podía conservar bearer tokens o JWT. Ahora el
    guardado elimina esos patrones y limita el texto a `240` caracteres; la
    regresión comprueba que los secretos simulados no se almacenan.

29. La revisión final de observabilidad encontró dos logs móviles que todavía
    pasaban objetos de error completos: el diagnóstico del outbox en Perfil y
    el fallo de una migración SQLite. Ambos usan ahora `formatSafeErrorForLog`,
    por lo que el mensaje, cuerpo HTTP y credenciales no se leen ni se emiten.
    La regresión existente del helper mantiene esa garantía.

30. El preflight de release mezclaba checks locales con la verificación remota
     de membresías y, sin credenciales QA, no permitía comprobar el resto del
     proceso. Se añadió `verify:pre-apk:local`; ejecuta build backend,
     TypeScript móvil y export Android, mientras `verify:pre-apk` conserva el
     chequeo autenticado y falla cerrado cuando faltan credenciales.

31. La migración `007_storage_photo_bucket.sql` declara el bucket
    `topofield-photos` como público y los modelos conservan `public_url` en los
    DTO de estaciones, prismas, visitas y lecturas. La autenticación y el scope
    protegen el descubrimiento de filas en la API, pero no revocan una URL ya
    conocida: una persona con ese enlace puede intentar leer el objeto
    directamente desde Storage. No se cambia localmente a URLs firmadas porque
    hacerlo exige coordinar una migración del bucket, regenerar URLs en todas
    las consultas y validar el comportamiento móvil con datos existentes. Hasta
    decidirlo, no deben cargarse fotografías sensibles de terceros en el piloto
    ni compartirse enlaces de Storage fuera de los usuarios autorizados.

32. `getStationById` lanzaba en paralelo la consulta de la estación y la de
    `station_readings`. Aunque el controlador no devolvía la respuesta cuando
    la estación quedaba fuera del scope, el servicio podía leer previamente
    datos asociados de una obra no autorizada. Ahora la consulta de lecturas
    solo se ejecuta después de confirmar que la estación pasó el filtro de
    tenant; la regresión está en `monitoring.model.test.ts`.

33. El preflight Android local ahora valida la salida de Expo después de que
    el proceso termina: exige un `metadata.json` no vacío y al menos un
    archivo adicional de la exportación. La comprobación aislada cubre salida
    ausente, metadata vacía y exportación válida; así un proceso con código 0
    no se interpreta como artefacto utilizable si la carpeta está incompleta.

34. Se añadió `verify:local` como entrada única para repetir los checks que no
    necesitan servicios remotos ni hardware: build y tests backend, TypeScript
    y tests móviles, tooling, documentación y `git diff --check`. La variante
    `verify:local:pre-apk` añade el export Android. En Windows, el runner usa
    `cmd.exe` con la citación común del preflight para evitar que los
    ejecutables `.cmd` fallen antes de iniciar.

35. La reauditoría posterior no encontró cambios en la superficie de
    dependencias: `npm audit --workspace apps/backend --omit=dev --json`
    mantiene `2 moderate`, `0 high` y `0 critical`, por la cadena transitiva
    `exceljs -> uuid@8.3.2`; su código de salida no cero refleja esos avisos,
    no un fallo de compilación. Ejecutado desde `apps/mobile`, `npx expo
    install --check` devuelve `Dependencies are up to date` y código `0`.

36. La comprobación remota de solo lectura del 13-09-2026 confirma que Render
    sigue sirviendo `eb88db922a03b1e01a47f90dba8346542df3f212`: `/api/v1/health`
    devuelve `HTTP/1.1 200 OK`; las rutas de rondas y `GET /api/v1/me/journey`
    sin bearer devuelven `HTTP/1.1 401 Unauthorized` con `UNAUTHORIZED`. La
    petición de `adb devices -l` sigue mostrando solo `List of devices
    attached`, sin un Galaxy disponible. No se hizo deploy, fetch, pull,
    migración, cambio de datos ni instalación.

37. El runner local de migraciones queda serializado con `pg_advisory_lock`
    sobre un único `PoolClient`, que conserva la misma conexión durante la
    lectura de `schema_migrations`, cada transacción y el `unlock`. La
    regresión `migration runner serializes executions on one PostgreSQL client`
    evita volver a liberar la conexión mientras el bloqueo sigue asociado a
    ella. Esto solo protege ejecuciones locales autorizadas; no aplica ninguna
    migración remota ni cambia la política de Supabase.

38. La memoria visual de montaje tiene una consulta más utilizable en campo:
    filtros por tipo de evidencia y previsualización ampliada de `132px`.
    La proyección filtra evidencias sin cambiar sus identificadores ni
    interpretar la posición relativa como coordenada o orientación. Es una
    mejora local de UX; la migración `027` continúa sin aplicación remota.

39. Las miniaturas de esa memoria visual abren una vista ampliada que prioriza
    `localUri` durante la sincronización pendiente, muestra notas y permite
    cerrar mediante un control accesible. No cambia estados ni convierte la
    posición relativa en coordenada.

40. La misma pantalla permite filtrar visitas por estado operativo (`draft`,
    `completed`, `blocked`) además del tipo de evidencia, manteniendo el orden
    recibido y sin mutar la caché local.

## Evidencia local

```text
> @topofield/backend@1.0.0 build
> tsc -p tsconfig.json

ℹ tests 104
ℹ pass 104
ℹ fail 0

Test Suites: 22 passed, 22 total
Tests:       101 passed, 101 total

check-docs: 40 documentos revisados en raíz y docs/.

Sin errores ni avisos.

Dependencies are up to date
verify:pre-apk:local: completed successfully
pre-apk output directory=C:\Users\guill\AppData\Local\Temp\topofield-export-android-preapk
Export validation: metadata.json=6101 bytes; files=95
PRE_APK_COMMAND_EXIT=0
PRE_APK_METADATA_EXISTS=True
PRE_APK_METADATA_BYTES=6101
pre-apk lingering Expo/Metro processes=0
PRE_APK_RELATED_PROCESSES=0

verify local completed successfully.

npm audit --workspace apps/backend --omit=dev --json:
moderate=2; high=0; critical=0; total=2
transitive dependency: exceljs -> uuid@8.3.2
available fix would downgrade exceljs to 3.4.0; no --force fix applied

adb devices -l:
List of devices attached

BUILD SUCCESSFUL in 15m 8s
bundletool_exit=not-run (terminal policy blocked keystore credential transport)
gradle_bundle_exit=0
gradle_apk_exit=0
apksigner_verified=true; signers=1; scheme=V2
jarsigner_exit=0
android:versionCode="5"
package="com.ciudadanoinusual.topofield"
Propietario: CN=TopoField Android Release, OU=Mobile, O=TopoField, C=ES
apk=C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
apk_bytes=53,408,438
```

La verificacion `jarsigner -verify -strict` mantiene el aviso de certificado
local autofirmado y ausencia de timestamp. Esto es compatible con una firma
local de desarrollo controlado, pero no es una validacion de Play Store.

## Pendientes que no se pueden cerrar localmente

- E2E en Galaxy: lectura, foto, reinicio, reconexion y unicidad ya estan
  verificados una vez con la APK arm64 release `versionCode=6`. Siguen
  pendientes la repeticion con umbral autorizado, el cierre definitivo, la
  exportacion real y la observacion de jornada. La variante universal queda
  opcional para ampliar compatibilidad: el intento local fallo en
  `react-native-reanimated` con `manifest 'build.ninja' still dirty after 100
  tries`.
- Prueba real de parte parcial, cierre y exportacion con datos autorizados.
- Aplicar la migracion 027 y desplegar las visitas de montaje, si se autoriza.
- Revisar y aplicar la migracion 028 solo despues de comprobar en Supabase que
  no existen duplicados historicos de adjuntos; no se ha ejecutado remotamente.
- Piloto con segundo usuario/dispositivo.
- Dos jornadas observadas y cinco a ocho entrevistas.
- Revisar las dos vulnerabilidades moderadas transitivas de `uuid` sin usar
  `npm audit fix --force`, porque la solucion propuesta degrada `exceljs`.
- Resolver la política de fotos antes de datos sensibles: mantener el bucket
  público solo con una aceptación explícita del riesgo, o preparar una
  migración a bucket privado con URLs de lectura firmadas y pruebas de
  regresión para cada pantalla que muestra imágenes.

La comprobación no destructiva `npm audit fix --workspace apps/backend
--dry-run --json` confirma que no hay cambios de actualización seguros: el
remedio propuesto instala `exceljs@3.4.0` (`isSemVerMajor: true`) y la cadena
vulnerable procede de `exceljs/node_modules/uuid@8.3.2`. El exportador recibe
datos ya validados y no expone una ruta de ejecución de UUID v3/v5/v6 con
buffers controlados por el usuario; se mantiene la dependencia actual hasta
probar una sustitución compatible de `exceljs`.

La auditoria directa, con y sin dependencias de desarrollo, devuelve el mismo
resultado: `2 moderate`, `0 high`, `0 critical`; el remedio disponible elimina
paquetes transitivos de Express durante el dry-run y propone degradar
`exceljs`, por lo que no se aplico. La vulnerabilidad afectada esta en
`uuid@8.3.2` anidado bajo `exceljs`; la unica referencia de ExcelJS localizada
usa `uuid.v4`, no las variantes v3/v5/v6 que reciben un `Buffer` segun el aviso.
El riesgo no se ignora: queda abierto sustituir o actualizar ExcelJS con una
ruta compatible y volver a auditar antes del despliegue publico.

### Auditoría del árbol completo

La auditoría del monorepo (`npm audit --omit=dev --json`) devuelve
`23` vulnerabilidades (`7 high`, `16 moderate`, `0 critical`). No debe
interpretarse como `23` vulnerabilidades del backend en ejecución: el árbol
raíz incluye Expo, Metro, Xcode y otras herramientas de compilación móvil como
dependencias del workspace. El backend aislado mantiene el resultado anterior:
`2 moderate`, `0 high`, `0 critical`, únicamente `exceljs -> uuid@8.3.2`.

La revisión local no encontró importaciones directas de `uuid` en el código de
backend/móvil ni uso de UUID v3/v5/v6 con buffers controlados por usuario. La
vulnerabilidad no se corrige con `npm audit fix` sin degradar `exceljs` a
`3.4.0`, y la corrección propuesta para Expo exigiría una migración mayor que
debe validarse con una build completa. Decisión para F5: no usar `--force` ni
hacer un upgrade mayor mezclado con la validación de campo; abrir una tarea de
mantenimiento específica para actualizar Expo/Metro y volver a auditar el
árbol completo antes de una publicación pública.

## Criterio de lectura

El bloque local esta endurecido y verificable. F5 sigue abierta: no se afirma
estabilidad de campo hasta disponer de evidencia del dispositivo y de uso real.
