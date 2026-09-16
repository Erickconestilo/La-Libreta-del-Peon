<!-- doc-status
estado: vivo
verificado: 2026-09-16
-->

# Checklist de Piloto

El Paso 1 es la fase **F5** de `ROADMAP.md`, la única abierta ahora mismo. No se trata solo de comprobar que todo funciona: hay que registrar cómo se usa. Usa `docs/field/F5_FIELD_OBSERVATION_TEMPLATE_2026-09-12.md` durante la jornada y convierte después los hallazgos en `docs/field/F5_HALLAZGOS_<fecha>.md` siguiendo la plantilla de `UX_RESEARCH_PLAN.md`.

## Estado local automatizado - 16-09-2026

Estas casillas solo prueban el árbol local; no equivalen a despliegue ni a
validación en campo:

- [x] Backend compila y pasa `142/142` tests tras el hardening semántico de
  readiness de Stage 2.
- [x] Móvil pasa TypeScript, `25` suites y `137/137` tests; la batería cubre
  además los estados de entrega local, conflicto, reintento y backend
  incompatible.
- [x] Tooling local incluye compuertas pública y autenticada. La pública exige
  `/health=200`, `/readiness=200` con work-execution 029 y weekly-work 030 y
  falla cerrado si cualquiera falta. Stage 3 endureció además el verificador
  autenticado para rechazar un guest como evidencia técnica y comprobar
  weekly-work cuando se proporciona una obra; `npm run test:tooling` pasa
  `19/19`.
- [x] `docs:check` revisa `47 documentos revisados en raíz y docs/` sin errores
  ni avisos; `git diff --check` termina sin salida.
- [x] La release Android v7 está generada localmente, firmada como
  `CN=TopoField Android Release` y verificada con `jarsigner`, `bundletool
  validate` y `apksigner`.
- [x] La release Android v10 quedó preparada e instalada localmente con Gradle,
  firmada como `CN=TopoField Android Release` y con `versionCode=10`;
  `apksigner` confirmó el esquema V2, `adb install -r` devolvió `Success` y
  `dumpsys package` confirmó `lastUpdateTime=2026-09-13 11:52:50`.
- [x] La release Android v11 quedó preparada e instalada sobre la instalación
  existente con Gradle, firmada como `CN=TopoField Android Release` y con
  `versionCode=11`; `apksigner` confirmó el esquema V2, `adb install -r`
  devolvió `Success` y `dumpsys package` confirmó
  `lastUpdateTime=2026-09-13 12:12:48`. El smoke test abrió `MainActivity` y
  no mostró excepciones fatales; la prueba autenticada de campo sigue pendiente.
- [x] La release Android v12 quedó preparada e instalada sobre la instalación
  existente con Gradle, firmada como `CN=TopoField Android Release` y con
  `versionCode=12`; `apksigner` confirmó el esquema V2, `adb install -r`
  devolvió `Success` y `dumpsys package` confirmó
  `lastUpdateTime=2026-09-13 12:32:01`. El smoke test recuperó una ronda
  cacheada y mostró el progreso operativo y el cierre bloqueado con pendientes;
  la prueba autenticada de campo sigue pendiente.
- [x] La release Android v13 quedó preparada para el backend 029+030 ya
  desplegado: TypeScript y `25` suites/`137` tests pasan; la AAB terminó con
  `BUILD SUCCESSFUL in 11m 5s`, Bundletool la validó y generó una APK universal
  de `53.598.615` bytes con `versionCode=13`, firma V2 y certificado
  `CN=TopoField Android Release`. **No está instalada:** `adb devices -l`
  devolvió `List of devices attached` sin dispositivos.
- [x] La APK arm64 v7 quedó instalada históricamente en el Galaxy; `adb install -r`
  devolvió `Success` y `dumpsys package` confirmó `versionCode=7` y
  `lastUpdateTime=2026-09-13 07:39:25`. Se conserva como evidencia de esa
  ejecución, no como la versión activa.
- [x] La auditoría local cubre autenticación, roles, scope entre obras,
  adjuntos, idempotencia, caché por sesión, outbox y exportación.
- [x] La pantalla de resumen permite guardar CSV/XLSX en una carpeta elegida
  por el usuario mediante SAF, sin envío automático ni escritura al cancelar.
- [x] Publicar el backend vigente. PR #22 fusionó el snapshot limpio en GitHub
  `main` y Render auto-desplegó
  `349967a538a3a5e8f4c51245d02511b7ec6cce69`; `/health` devolvió ese SHA,
  `/readiness` devolvió `200` con 029+030 `ready` y el verificador público pasó.
  La exportación CSV/XLSX `200` desde Galaxy sigue siendo evidencia histórica
  de la v7 y debe repetirse con la release que se valide ahora.
- [x] Publicar el hardening semántico de readiness de Stage 2. `6a44d75` valida
  PK, columnas, FKs, índices, CHECKs, RLS y deny-all; el candidato limpio
  `69e8fd0` partió de `349967a`, contuvo solo cuatro archivos y pasó build +
  `142/142`. PR #23 quedó `CLEAN`/`MERGEABLE`, se fusionó por squash como
  `d3bef6ea0988e44524cd7cde8392906dc936e06f` y Render lo auto-desplegó. El
  verificador público posterior confirmó `/health=200` en ese SHA y
  `/readiness=200` con 029+030 `ready`.
- [x] Reconciliar Stage 3 sin mezclar capas: GitHub `main=d3bef6e...`; no hay
  GitHub Actions configuradas (`RUNS=[]`, sin `.github/workflows`), así que la
  regresión `142/142` es evidencia local y no CI. El tree del candidato
  `69e8fd0` coincide exactamente con el tree del squash publicado. Render muestra
  `dep-dalfq3bbc2fs7381i7vg` `Live`, commit `d3bef6e`, duración `32,1 s`.
  `/health=200`, `/readiness=200`; `/auth/me`, `Mi jornada`, execution-events y
  weekly-work no producen `404`: sin bearer dan `401`; con guest, `/auth/me=200`
  y los flujos técnicos `403`.
- [ ] Ejecutar el contrato remoto con una **cuenta técnica legítima**. El
  comando `npm run verify:remote:auth` sigue fallando cerrado con
  `TOPOFIELD_AUTH_TOKEN is required and is never printed`; no existe esa variable
  en Process/User/Machine ni en el `.env`. No sustituir esta prueba por el guest
  ni crear/resetear credenciales solo para marcar PASS.
- [x] Ejecutar en el Galaxy el E2E físico de lectura y foto offline con
  reinicio, reconexión y sincronización única; Supabase verificó una lectura y
  un adjunto para el mismo `client_request_id`.
- [ ] Validar con datos autorizados el parte y el cierre definitivo. La paridad
  estructural CSV/XLSX ya se comprobó read-only con la misma ronda real de
  Supabase: `EXPORT_ARTIFACTS_OK csvRows=15 xlsxRows=15
  worksheet=Auscultación utf8Bom=true`; falta repetir el guardado desde v13 y
  confirmar la aceptación del formato en el flujo de oficina.
- [x] El Galaxy mostró el diagnóstico seguro del fallo reproducido:
  `HTTP 500`, `ROUND_EXPORT_FAILED` y un código de soporte UUID. La causa del
  500 quedó corregida, desplegada y verificada con CSV/XLSX `200`.
- [x] Comparar estructuradamente CSV y XLSX de una misma ronda real: la lectura
  read-only de la ronda `db3a59e3-3756-4d95-9890-f026379f33db` produjo
  `15/15` filas y el verificador oficial devolvió `EXPORT_ARTIFACTS_OK`.
  La descarga/guardado SAF desde v13 y la aceptación de oficina permanecen
  como comprobaciones separadas.
- [x] El operario puede declarar por punto `Empezar`, `Hecho`, `No realizado`,
  `Repetir` o `Bloqueado`; los resultados no realizados exigen motivo y el
  guardado offline usa el outbox con idempotencia.
- [x] La entrega de work-execution se ha endurecido localmente: un resultado
  puede mostrarse como resultado operativo local, pero solo aparece como
  `Recibido servidor` tras una sincronización real. `404` de backend antiguo,
  `409`, `401/403`, red/timeout y `5xx` tienen estados de entrega diferenciados
  y no se reintentan indefinidamente.
- [x] Se probó 029 contra PostgreSQL local real en contenedor efímero con un
  fixture mínimo: probe `migration_missing` antes de 029 y `ready` después,
  reaplicación idempotente, FK compuestas/UNIQUE/RLS verificados y readiness
  HTTP `200` con la tabla frente a `503` sin ella. No equivale a probar la
  cadena completa de migraciones de Supabase.
- [x] La cabecera de la ronda resume hechos, en curso, pendientes y puntos por
  revisar, y permite continuar con el primer punto accionable respetando el
  orden de la jornada.
- [x] Reconciliar el ledger sin reejecutar 019–026: el `--write` autorizado
  registró 8 filas y la relectura posterior muestra las ocho como `PRESENTE`.
  Después se aplicaron 027–030 por gates separados y cada una quedó
  registrada/verificada.
- [x] Ampliar la compuerta de readiness a 030: `b6df031` exige 029+030, las rutas
  `weekly-work` fallan con `503` controlado si 030 falta y PostgreSQL 17 efímero
  pasó UNIQUE/CHECK/RLS. Render sirve ahora el hardening fusionado como
  `d3bef6ea0988e44524cd7cde8392906dc936e06f` y
  devuelve `/api/v1/readiness = 200` con ambas capabilities `ready`. La build
  v13 correspondiente está preparada; falta únicamente su validación física.

## Paso 1 - Erick usando datos reales en campo

Comprobaciones técnicas:

- [ ] Para un `topografo`, el alta de estación exige una obra asignada y no
  ofrece enviar `Sin obra`; probarlo en el dispositivo antes de una jornada.
- [ ] **Confirmar que Supabase "topofield" está activo, no pausado**, antes de salir a campo. El free tier lo pausa solo tras varios días de inactividad (pasó el 02-08-2026); si está pausado, login y toda la app fallan sin que haya ningún bug en el código. Reactivar es gratis y no destructivo, pero tarda 1-2 minutos en levantar.
- [x] Confirmar que la cuenta tecnica de Erick entra y que la sesión se
  conserva durante el recorrido offline y tras la reconexión; una revalidación
  explícita posterior también devolvió la vista operativa del topógrafo.
- [ ] Usar el AAB firmado localmente y guardar al menos dos copias externas del keystore y sus credenciales antes de distribuirlo.
- [x] Verificar login, una obra autorizada, una foto, una lectura offline y su
  sincronización en el dispositivo objetivo; la consulta remota confirmó una
  lectura y un adjunto únicos.
- [x] **Confirmar que Render publica el commit que se pretende probar**.
  Render está en `d3bef6ea0988e44524cd7cde8392906dc936e06f`; `/health` y
  `/readiness` devolvieron `200`, las rutas públicas protegidas sin token
  devolvieron `401` y el contrato público terminó correctamente.
- [ ] Mantener el backup de Git y no publicar la reescritura de historial sin la autorizacion separada de `push --force`.
- [ ] Revisar los elementos de outbox en error antes de cerrar una jornada y conservar capturas o identificadores de incidencia si falla una sincronizacion.
- [ ] Confirmar que la versión instalada contiene el mismo commit que el backend desplegado y que las migraciones de permisos, partes e instrumentos ya fueron aplicadas con autorización.
- [ ] Registrar una captura como testigo fotográfico, una lectura digital y los tres pares del potenciómetro sin cobertura; distinguir guardado local de recibido por servidor.
- [x] **Política de fotos:** mientras el bucket de la migración 007 siga
  público, quedan prohibidas las fotos sensibles de terceros. El piloto solo
  puede usar imágenes autorizadas/no sensibles y no compartir URLs de Storage.
  Antes de admitir material sensible se exige una tarea separada para bucket
  privado + URLs firmadas, con validación de API y móvil.
- [ ] Antes de usar otro instrumento, consultar [`INSTRUMENT_COVERAGE_MATRIX.md`](docs/field/INSTRUMENT_COVERAGE_MATRIX.md): una captura provisional no sustituye el procedimiento del equipo ni representa automáticamente pares, perfiles o referencias de carril.
- [x] Crear un parte parcial de zona y comprobar que no presenta el trabajo
  como 100 % completado si quedan puntos pendientes; el servidor registró
  `status=partial`, `completed_point_count=0` y `pending_point_count=1`.

Observación de uso (esto es lo que cierra F5, no lo anterior):

- [ ] Cronometrar seis escenarios reales: entrar a una obra, localizar una estacion, revisar memoria visual, anadir foto o nota, registrar una lectura de ronda, consultar historico.
- [ ] Anotar cada duda, bloqueo, paso sobrante y elemento que se ignora, en el momento y no de memoria al final de la jornada.
- [ ] Clasificar cada hallazgo en fallo real, friccion UX o deseo fuera de fase, y decidir por cada uno: se corrige antes del Paso 2, se corrige despues, o se acepta.
- [ ] Hablar con 5-8 profesionales o equipos comparables sobre su flujo actual,
  pérdidas de contexto y alternativas; registrar ejemplos concretos, no solo
  opiniones sobre la demo.
- [ ] No arreglar nada durante la jornada salvo un bloqueo total: anotar y seguir. Corregir sobre la marcha destruye la medicion.

## Paso 2 - Sumar a otra persona del equipo

- [ ] Ejecutar aceptacion API real con dos cuentas `topografo`, dos obras y membresias opuestas: lectura, alta, edicion, foto, mensaje, ronda y lectura cruzadas deben devolver `403` o `404`, nunca datos ajenos.
- [ ] Configurar y revisar el canal de feedback, la guia de instalacion y las credenciales/roles de cada persona piloto.
- [x] **D1 aplicada (02-08-2026):** rutas de auscultacion restringidas a
  sesiones autenticadas autorizadas; `admin` y `topografo` mantienen el flujo
  operativo, `supervisor` solo consulta mediante membresía activa y el token
  publico `visitante` ya no accede. Verificado antes que ninguna pantalla
  movil dependia de leerlas como invitado.
- [x] **D2 decidida (02-08-2026): no gastar por ahora.** Requiere plan Pro de Supabase (25 USD/mes); Erick decide quedarse en Free. Mitigación: comprobar que el proyecto no esté pausado antes de cada sesión (primer punto de este checklist). Se reabre si F5 muestra pausas frecuentes o al sumar una segunda persona (F8).
- [ ] Avisar a cualquier colaborador con un clon antes de pedir el `push --force` que publicaria el historial saneado.
- [ ] Establecer quien revoca cuentas, reasigna membresias y responde ante perdida de un dispositivo.
- [x] **Validado históricamente en Galaxy con release v4:** el supervisor usa una cuenta individual con membresía `read`, consulta obra, fotos, incidencias, lecturas y partes, y no dispone de escritura, adjuntos, exportación ni planificación. Repetir solo si una nueva release cambia este flujo.
- [ ] Repetir la jornada desde dos cuentas sin compartir credenciales y verificar que ningún dato local pendiente se muestra como recibido al supervisor.
