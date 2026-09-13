<!-- doc-status
estado: vivo
verificado: 2026-09-13
-->

# Checklist de Piloto

El Paso 1 es la fase **F5** de `ROADMAP.md`, la única abierta ahora mismo. No se trata solo de comprobar que todo funciona: hay que registrar cómo se usa. Usa `docs/field/F5_FIELD_OBSERVATION_TEMPLATE_2026-09-12.md` durante la jornada y convierte después los hallazgos en `docs/field/F5_HALLAZGOS_<fecha>.md` siguiendo la plantilla de `UX_RESEARCH_PLAN.md`.

## Estado local automatizado - 13-09-2026

Estas casillas solo prueban el árbol local; no equivalen a despliegue ni a
validación en campo:

- [x] Backend compila y pasa `113/113` tests con la batería local.
- [x] Móvil pasa TypeScript, `23` suites y `115/115` tests.
- [x] Tooling local pasa `13/13` tests; `verify:local` termina con
  `verify local completed successfully`.
- [x] `docs:check` revisa `44 documentos revisados en raíz y docs/` sin errores
  ni avisos; `git diff --check` termina sin salida.
- [x] La release Android v7 está generada localmente, firmada como
  `CN=TopoField Android Release` y verificada con `jarsigner`, `bundletool
  validate` y `apksigner`.
- [x] La APK arm64 v7 está instalada en el Galaxy; `adb install -r` devolvió
  `Success` y `dumpsys package` confirmó `versionCode=7` y
  `lastUpdateTime=2026-09-13 07:39:25`.
- [x] La auditoría local cubre autenticación, roles, scope entre obras,
  adjuntos, idempotencia, caché por sesión, outbox y exportación.
- [x] La pantalla de resumen permite guardar CSV/XLSX en una carpeta elegida
  por el usuario mediante SAF, sin envío automático ni escritura al cancelar.
- [x] Publicar el arreglo de scope de exportación mediante PR #19/#20 y
  repetir las comprobaciones autenticadas. Render sirve `df224f9` y las
  exportaciones CSV/XLSX responden `200` desde el Galaxy.
- [x] Ejecutar en el Galaxy el E2E físico de lectura y foto offline con
  reinicio, reconexión y sincronización única; Supabase verificó una lectura y
  un adjunto para el mismo `client_request_id`.
- [ ] Validar con datos autorizados el parte, cierre definitivo y paridad
  CSV/XLSX.
- [x] El Galaxy mostró el diagnóstico seguro del fallo reproducido:
  `HTTP 500`, `ROUND_EXPORT_FAILED` y un código de soporte UUID. La causa del
  500 quedó corregida, desplegada y verificada con CSV/XLSX `200`.
- [ ] Comparar estructuradamente el CSV y el XLSX descargados de una misma
  ronda y confirmar el formato que consume el flujo de oficina.
- [x] El operario puede declarar por punto `Empezar`, `Hecho`, `No realizado`,
  `Repetir` o `Bloqueado`; los resultados no realizados exigen motivo y el
  guardado offline usa el outbox con idempotencia.
- [x] La cabecera de la ronda resume hechos, en curso, pendientes y puntos por
  revisar, y permite continuar con el primer punto accionable respetando el
  orden de la jornada.
- [ ] Aplicar la migración local `029_monitoring_work_execution_events.sql`,
  desplegar el endpoint y validar en el Galaxy que el resultado sincronizado
  aparece para el supervisor sin presentarlo como lectura ni cierre de ronda.

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
  Render está en `df224f9`; `/health` devolvió `200`, las rutas protegidas sin
  token devolvieron `401` y la exportación autenticada CSV/XLSX desde el
  Galaxy devolvió `200`.
- [ ] Mantener el backup de Git y no publicar la reescritura de historial sin la autorizacion separada de `push --force`.
- [ ] Revisar los elementos de outbox en error antes de cerrar una jornada y conservar capturas o identificadores de incidencia si falla una sincronizacion.
- [ ] Confirmar que la versión instalada contiene el mismo commit que el backend desplegado y que las migraciones de permisos, partes e instrumentos ya fueron aplicadas con autorización.
- [ ] Registrar una captura como testigo fotográfico, una lectura digital y los tres pares del potenciómetro sin cobertura; distinguir guardado local de recibido por servidor.
- [ ] **Política de fotos:** hasta resolver el bucket público de la migración 007, usar únicamente imágenes autorizadas para el piloto y no compartir URLs de Storage fuera de las cuentas permitidas; decidir bucket privado/URLs firmadas antes de incluir fotos sensibles de terceros.
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
