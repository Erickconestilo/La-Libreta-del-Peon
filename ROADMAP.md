<!-- doc-status
estado: vivo
rol: roadmap
  verificado: 2026-09-13
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
| **F5** | **Reactivación operativa, validación de campo y encaje de producto** | 🔵 **ABIERTA — E2E offline y exportación autenticada verificados en Galaxy v7; cierre con umbral, jornada observada y entrevistas pendientes** | PLAN Fase 4 (nunca ejecutada) |
| **F6** | Entregable Excel/CSV: exportar histórico en el formato que consume el flujo real | 🟡 Contrato, generación, compartir/guardado local y verificador estructurado CSV/XLSX implementados; validación con dos archivos de campo pendiente | parte de MEMORIA Fase 4 |
| **F7** | Instrumentos y evidencias de campo | 🟡 **Slice local ampliado:** testigo fotográfico, fisurómetro digital, potenciómetro, parte de zona y visitas de montaje append-only; memoria visual con filtros, vista ampliada y posición relativa orientativa; migración 027 preparada, no aplicada, y pares de convergencia/peralte aún requieren procedimiento confirmado. La cobertura actual está detallada en [`INSTRUMENT_COVERAGE_MATRIX.md`](docs/field/INSTRUMENT_COVERAGE_MATRIX.md). | MEMORIA Fase 6 |
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

**Estado actual:** producción tiene todo lo correspondiente a F4, con D1 aplicada y D2 decidida. F5 no tiene un bloqueo técnico local abierto: el arreglo de scope de exportación está publicado en Render como `df224f9`. El verificador local de artefactos ya está disponible; permanece abierta por el cierre con umbral autorizado, su ejecución sobre dos archivos reales y la validación observada de campo.

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

### Estado de F5 (revisado 13-09-2026)

F5 sigue abierta y está en **estabilización de campo**. La auditoría, el plan y la evidencia están versionados en `docs/field/`; todavía no existe el informe de una jornada observada ni se cumple el criterio de entrevistas. Expo 56 está alineado (`npx expo install --check` devuelve `Dependencies are up to date`) y la release Android `versionCode=7` está instalada en el Galaxy. La prueba física real con modo avión visible demostró lectura y foto guardadas en SQLite, reinicio sin pérdida, sincronización automática de dos elementos y unicidad de una lectura y un adjunto en Supabase. La v7 añade diagnóstico seguro para el fallo reproducido de exportación. El `500` de exportación por scope quedó corregido, publicado en Render como `df224f9` y verificado de nuevo desde el Galaxy: CSV y XLSX generaron archivos y abrieron el selector nativo, con respuestas `200` registradas por Render. La v7 además recupera la lista de rondas desde caché después de un arranque en frío sin red, mostrando `Rondas sin actualizar`. El cierre definitivo sigue correctamente bloqueado porque la lectura de prueba está en `draft` sin umbral vigente. El intento universal anterior falló en `react-native-reanimated` con `manifest 'build.ninja' still dirty after 100 tries`; la APK arm64 es la variante validada para el Galaxy. El verificador local `npm run verify:export-artifacts -- <ronda.csv> <ronda.xlsx>` ya comprueba la estructura y paridad de dos archivos concretos; la app también ofrece guardar cada binario mediante SAF para facilitar esa lectura estructurada. Esto no sustituye su ejecución con datos de campo, la validación observada ni las conversaciones profesionales.

La comprobacion de procedencia del repositorio se mantiene separada del estado
funcional de F5. El contenido actual del runtime de la rama de trabajo esta
neutralizado, pero la historia alcanzable todavia conserva objetos de la etapa
anterior de purga y `main`/`origin/main` no son referencias equivalentes. La
reconciliacion no destructiva esta documentada en
`docs/field/HISTORY_PURGE_RECONCILIATION_2026-09-13.md`; no se borraran refs ni
se reescribira historial dentro de la validacion autonoma local.

La auditoría local vigente de 13-09-2026 está en
`docs/field/F5_AUTONOMOUS_LOCAL_AUDIT_2026-09-13.md`. Añade una barrera
automatizada sobre todos los routers de negocio y corrige la lectura defensiva
de incidencias, prismas, estaciones y visitas de montaje con referencias cruzadas. También
deja el catálogo de ejemplo y sus fixtures sin nomenclatura de cliente. Backend
  local: `111/111` tests. El contrato backend de exportación está alineado con
`shared/types.ts` para todos los instrumentos F7. La migración 027 preparada también conserva claves foráneas compuestas
  para integridad de tenant, con regresión local. La reconciliación de prismas
  también exige ahora la igualdad de `project_id` entre observación, prisma y
  estación; la regresión local está incluida en los `111/111` tests. La migración
  027 sigue sin aplicarse en Supabase. Los hardenings de exportación se
publicaron mediante PR #19/#20; Render quedó verificado el 13-09-2026 en
`df224f9`. La memoria visual y la migración 027 continúan solo en la rama local
y siguen requiriendo su propia decisión de despliegue.
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
del mapa efectivo y devuelve `PROJECT_ACCESS_REQUIRED` si el mapa falta; este
commit aún debe publicarse antes de considerarlo activo en Render.

El login técnico del Galaxy ya quedó confirmado con la cuenta topógrafo. El primer bloqueo reproducible de código era de ergonomía y permisos: la pantalla permitía elegir `Sin obra` aunque el backend exige que un topógrafo cree la estación dentro de una obra asignada. El Bloque 1 de F5 corrige esa deriva y añade una pantalla de rondas vacía accionable, con reintento separado del estado "no hay datos". El Bloque 2 añade preparación offline y cierre controlado. En este bloque se aplicaron las migraciones F5, Render quedó actualizado al merge del rol supervisor, se generó, verificó e instaló la release local `versionCode=4` y la cuenta sintética de consulta quedó migrada con membresía `read`; la validación supervisora en Galaxy quedó completada. El arreglo posterior `b0572a0` corrige el scope de la firma de adjuntos y ya está desplegado en Render mediante el merge `6a1b19f`. El recorrido de operador offline quedó verificado en la release v7 con lectura, foto, reinicio, reconexión y unicidad; siguen pendientes el cierre positivo con umbral autorizado, la paridad estructurada de archivos y la observación de uso.

El Bloque 4 añade el contrato compartido de exportación y los endpoints CSV/XLSX con filas pendientes, scope y roles verificados; falta compararlo contra una ronda real y confirmar el formato que consume el flujo de oficina. La auditoría local posterior reforzó la integridad ronda-punto-lectura-adjunto y dejó preparada `028_reading_attachment_idempotency.sql`, aún sin aplicar.

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

La migración 029 no se ha aplicado en Supabase y este bloque no se considera
desplegado hasta aplicarla, publicar el backend y repetir la comprobación en el
Galaxy.

Las migraciones `022_project_membership_access_level.sql`,
`023_work_completion_reports.sql`, `024_field_instrument_catalog.sql` y
`026_supervisor_role.sql` están aplicadas en el proyecto Supabase `topofield`.
El último despliegue funcional verificado sirve el commit
`df224f9b7226c8aa5899a5e889898663b4642016`, que contiene la corrección de
exportación y el scope de adjuntos.
La fuente y la release móvil instalada más reciente están en
`versionCode=7`, firmada y verificada con el certificado local de release.
La AAB/APK arm64 quedó comprobada con Gradle y la instalación física devolvió
`Success`.
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
regresiones pasan localmente; falta observar este comportamiento en el Galaxy.

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
obra. La regresión móvil queda en `14` suites y `64` tests; falta observarlo
con tráfico real en el Galaxy. El código quedó en `dedf77b`.

### F7 — memoria visual de montaje preparada localmente (12-09-2026)

La rama incorpora una primera separación entre la galería histórica de una
estación y las visitas de montaje. Una visita conserva fecha, estado, notas y
el resumen de cambios; sus evidencias tienen `clientRequestId`, tipo, foto,
notas y posición relativa opcional. La pantalla ofrece una cuadrícula 3x3 para
marcar aproximadamente un código o elemento sobre la foto y lo muestra como
etiqueta al consultar, sin convertirlo en coordenada. Esto permite registrar
una foto general o de prisma sin sobrescribir visitas anteriores y deja el
contrato listo para un croquis fotográfico posterior.

La migración `027_station_mounting_visits.sql` está preparada con RLS de
denegación directa, índices y claves de idempotencia, pero no está aplicada
en Supabase. La API exige que la estación pertenezca a una obra accesible,
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

Este bloque es implementación local, no validación de campo: siguen
pendientes aplicar la migración con autorización, desplegar el contrato y
comprobar en Galaxy cámara, Storage, reinicio y reconexión. Solo después se
decidirá si los códigos manuales y la posición relativa resuelven una tarea
repetida antes de ampliar el croquis.

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
- **Abierto — validación pendiente:** repetir con umbrales autorizados el recorrido de cierre del operador y completar la comparación estructurada de los archivos exportados. El E2E offline de lectura/foto, reinicio, reconexión y unicidad ya está comprobado en el Galaxy; la release actualmente instalada es `versionCode=7`. El supervisor y las releases v4/v6 quedan como evidencia histórica.
- **Abierto — decisión de seguridad antes de datos sensibles:** `007_storage_photo_bucket.sql` deja `topofield-photos` público y los DTO conservan `publicUrl`. La API limita quién descubre las filas, pero no puede revocar un enlace directo ya conocido. Antes de incorporar fotos sensibles de terceros hay que aceptar explícitamente ese riesgo o migrar a bucket privado con URLs de lectura firmadas; no se cambia de forma unilateral porque afecta migraciones, API y móvil.
- **Abierto, sin urgencia:** capa (3) de `MEMORIA.md` §5, datos de terceros; no se reabre salvo que Erick la traiga.

## Cómo se mantiene este archivo

Al cerrar una fase: cambiar su estado en la tabla, actualizar `verificado:` en la cabecera, y añadir una línea a la bitácora de `MEMORIA.md` §12. No crear un documento nuevo de fase — los informes puntuales van a `docs/archive/` una vez leídos.

El chequeo automático (`npm run docs:check`) verifica que no exista un segundo archivo declarando `rol: roadmap`, que la fecha de `verificado:` no se quede rancia y que los enlaces entre documentos no apunten a archivos movidos. Ver `docs/DOC_MAINTENANCE.md`.
