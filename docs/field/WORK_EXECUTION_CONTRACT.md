<!-- doc-status
estado: vivo
  verificado: 2026-09-18
rol: contrato
-->

# Registro de trabajo realizado por el operario

## Decisión de producto

El control semanal de Excel sirve como referencia del problema, no como un
contrato para copiar. El archivo analizado tiene pestañas semanales, filas de
trabajo, marcas por día y un contador `HECHO`, pero no distingue planificación,
trabajo iniciado, resultado real, evidencia o recepción por el servidor.

La revisión del libro aportado confirma un patrón repetido de 59 pestañas:
matriz diaria de lunes a viernes, bloques separados para nivelación y trabajos
manuales, objetivos semanales o mensuales y un contador agregado. Sirve para
ver lo previsto, pero sus casillas no explican si una visita se completó, se
repitió, quedó bloqueada o si el dato y la foto llegaron al servidor. TopoField
incorpora esa necesidad sin copiar nombres ni filas del libro.

Para **ejecución real**, TopoField reutiliza `monitoring_rounds` y
`monitoring_round_points` como el trabajo asignado: no se crea un segundo gestor
editable que sustituya esos eventos. Cada punto puede recibir eventos operativos
append-only, separados de la lectura metrológica.

La **planificación semanal editable de Bitácora** es un dominio distinto y se
documenta en `docs/field/WEEKLY_WORK_PLANNING.md`. Sus estados expresan el plan y
no convierten una tarea planificada en un evento de ejecución confirmado.

## Flujo móvil

Desde una ronda, el operario puede abrir `Indicar resultado` para un punto y
seleccionar una única acción por vez:

- `Empezar`: el trabajo queda `En curso`.
- `Hecho`: el trabajo queda `Hecho`; no confirma por sí solo una lectura ni
  permite cerrar una ronda con una lectura pendiente.
- `No realizado`: exige motivo.
- `Repetir`: exige motivo.
- `Bloqueado`: exige motivo.

La nota de relevo es opcional. La acción se persiste primero en el outbox con
un `clientRequestId` estable y, si hay red, se intenta entregar inmediatamente;
al reconectar se reanuda el mismo elemento, sin generar otro UUID. La interfaz
separa el resultado operativo (`Hecho`, `Bloqueado`, etc.) de su estado de
entrega (`Pendiente local`, `Reintento pendiente`, `Backend pendiente`,
`Conflicto`, `Recibido servidor`, etc.). Solo un elemento realmente
sincronizado puede mostrarse como `Recibido servidor`.

Para el caso normal, la lista de puntos ofrece ahora `Marcar hecho` en la
misma tarjeta. Es un atajo explícito de una pulsación que crea el mismo evento
`completed`, respeta el alcance de la obra y usa el outbox si no hay conexión.
`Más opciones` conserva el formulario completo para `Empezar`, `No realizado`,
`Repetir` y `Bloqueado`, donde el motivo aporta información necesaria al relevo.
Para los tres resultados que exigen motivo, la app ofrece opciones neutras de
campo como `Sin acceso`, `Sin visibilidad`, `Equipo o sensor dañado`,
`Condición de campo adversa` y `Lectura dudosa, repetir`; el operario puede
escribir otro texto cuando ninguna encaja.
Cuando el evento ya está recibido, la tarjeta muestra `Hecho registrado` y no
invita a duplicarlo. Si todavía está en el outbox, muestra `Guardado
localmente`; los puntos cancelados u omitidos no ofrecen el atajo porque no son
trabajo accionable.

El `Parte diario` reutiliza esos mismos contadores para mostrar el trabajo
asignado a la obra seleccionada. Así el operario tiene una lectura rápida de
hechos, en curso, pendientes y por revisar sin crear una segunda lista de
tareas. Este resumen no cambia el estado de las lecturas ni sustituye el
cierre controlado de la ronda.

El mismo parte incluye `Semana operativa`: agrupa las rondas asignadas reales
de lunes a viernes, ordenadas por fecha y `executionOrder`, y permite abrir cada
ronda directamente. Las asignaciones de otras fechas se mantienen visibles en
`Otras fechas` para no ocultar trabajo. Es una vista de planificación y
progreso sobre rondas existentes, no una recurrencia semanal inventada ni una
confirmación de que el servidor recibió cambios que siguen pendientes en el
outbox.

Después de guardar o encolar una acción, el formulario limpia la selección,
el motivo y la nota. Así el operario no puede reenviar accidentalmente la
misma acción con otro `clientRequestId`; para registrar un cambio real debe
seleccionar de nuevo la acción correspondiente.

En la cabecera de la ronda, el operario ve un resumen separado del estado
metrológico: puntos `hechos`, `en curso`, `pendientes` y `por revisar`. El
botón `Continuar con <código>` abre el primer punto accionable respetando el
orden de `monitoring_round_points.sort_order`; un punto `bloqueado` no se
presenta como siguiente trabajo. Esto reduce navegación manual sin convertir
un resultado operativo en una lectura válida ni en un cierre de ronda.

El parte de zona repite esta separación antes de guardar: muestra por un lado
la lectura metrológica (`x/y puntos con estado final`) y por otro el trabajo
declarado (`hechos`, `en curso`, `pendientes` y `por revisar`). Así el operario
puede confirmar que terminó una tarea aunque la lectura todavía esté pendiente
de revisión, sin que la interfaz lo presente como un cierre técnico.

## Contrato de datos

La migración preparada `apps/backend/migrations/029_monitoring_work_execution_events.sql`
crea `monitoring_work_execution_events` con:

- relación a ronda, punto y obra;
- `event_type`, `reason`, `notes`, `occurred_at` y `recorded_by`;
- `client_request_id` único para reintentos;
- restricción que obliga a indicar motivo en `not_done`, `repeat_required` y
  `blocked`;
- índices por punto/fecha y obra/fecha;
- RLS deny-all para acceso directo desde anon/authenticated.

El backend exige que ronda, punto de ronda, punto de control y obra coincidan,
y aplica el alcance del actor autenticado antes de leer o escribir. Los roles
de consulta pueden obtener el histórico; solo `admin` y `topografo` pueden
registrar eventos. La migración 029 quedó aplicada y registrada en Supabase el
16-09-2026 y el backend que la consume está desplegado. Además de la validación
en el modelo, la migración crea claves foráneas
compuestas para impedir que un evento relacione una ronda, un punto y una obra
diferentes aunque la escritura se haga directamente en PostgreSQL.

## Estados que no se deben mezclar

`executionState` describe qué declara el operario sobre el trabajo. El campo
`monitoring_round_points.status` continúa describiendo el estado de la toma
metrológica y el cierre de la ronda. Por eso un punto puede estar `Hecho` en
la ejecución y seguir `Pendiente` en la lectura: es una señal honesta para
revisar el dato, no un falso 100 %.

La pantalla del supervisor verá únicamente eventos recibidos por el servidor.
Un evento en outbox no se presenta como recibido hasta que la sincronización
termine.

Los errores de entrega tampoco se reinterpretan como éxito. Red, timeout y
`5xx` conservan el elemento para reintentos acotados; `409` queda en conflicto
sin reenvío automático; `400/422`, `401`, `403` y errores terminales no entran
en un bucle. Un `404 Route not found` del backend anterior se presenta como
`Backend pendiente`: la acción local permanece trazable, pero no se afirma que
la ruta exista ni que el servidor la haya recibido.

`Mi jornada` puede mostrar, para cada ronda asignada, los contadores del último
resultado recibido por punto: `hechos`, `en curso`, `pendientes` y `por revisar`.
El backend calcula cada contador a partir del evento más reciente del punto,
manteniendo la ronda y el punto dentro de la misma obra. Si el móvil recupera
una caché anterior a este campo, omite el resumen hasta recibir una respuesta
actualizada; no inventa estados para completar la vista.

El operario y el supervisor pueden consultar el historial append-only del
punto. Las acciones anteriores no se sobrescriben: cada nueva acción añade un
evento con fecha, autor y contexto, y la interfaz muestra el último estado
junto con la secuencia recibida.

El replay es idempotente por contenido, no solo por UUID. Repetir exactamente
el mismo `client_request_id` con el mismo actor, punto, ronda, obra, tipo,
motivo, notas y `occurred_at` devuelve el evento ya creado. Reutilizar ese UUID
con un payload o contexto diferente devuelve `409`; no se acepta como replay
válido un UUID reciclado para otra acción.

### Evidencia física y server-side del 17/18-09-2026

La prueba v15 cerró la secuencia que antes solo tenía evidencia parcial. Con
Wi-Fi y datos móviles desactivados, el topógrafo registró un nuevo `Hecho`. La
UI mostró `Pendiente local` y literalmente `Guardado en este dispositivo. Aún
no existe confirmación del servidor.`. El mismo elemento sobrevivió a
`force-stop`/reinicio y la ronda siguió mostrando un cambio local por
sincronizar. Tras reconectar y revalidar la sesión, el outbox pasó de uno a
cero y el historial del punto mostró el segundo `Hecho` ya recibido.

La reconsulta read-only posterior confirmó dos filas `completed`, distintas y
sin duplicados, para el mismo actor, ronda, punto y obra:

- histórica: `client_request_id=7a113eb4-fac1-47e7-9be1-b123ca092cfc`,
  `occurred_at=2026-09-17T19:12:32.340Z`,
  `created_at=2026-09-17T19:24:38.076Z`, `count=1`;
- repetición v15:
  `client_request_id=f503bada-3ce2-4385-bd2b-45364cce4776`,
  `occurred_at=2026-09-17T21:54:23.433Z`,
  `created_at=2026-09-17T21:58:53.162Z`, `count=1`.

Ambas pertenecen a
`round_id=db3a59e3-3756-4d95-9890-f026379f33db`,
`round_point_id=ff4daa4c-63ef-49a3-bcdc-496f85c4cf25` y
`project_id=41fad7f5-23c7-4746-9213-ef4de8ab0cf9`; el actor de las dos filas es
`topofield-topografo@topofield.local`. La fila histórica no fue sobrescrita y
el UUID nuevo no se reutilizó. Esta evidencia cubre local-before-ACK,
persistencia, replay y recepción server-side del mismo resultado.

El parte de zona aplica la misma precaución de idempotencia a nivel de
interfaz: después de guardarlo o encolarlo, el botón queda bloqueado hasta que
el operario modifique explícitamente el borrador o vuelva a la ronda. Así no
se crean partes repetidos con nuevos UUID por una pulsación posterior.

## Entrega a oficina

El último evento recibido para cada punto se incluye en el contrato común de
exportación CSV/XLSX como `trabajo_estado`, `trabajo_motivo`, `trabajo_notas`,
`trabajo_fecha` y `trabajo_operador`. También aparece para puntos que todavía no
tienen lectura, porque declarar que el trabajo no se pudo realizar no equivale
a inventar una medición. El exportador conserva una fila por lectura; si el
punto está pendiente y no tiene lecturas, conserva una fila pendiente con el
resultado operativo que haya llegado al servidor.

## Siguiente ampliación

Este contrato todavía representa una ronda y sus eventos, no una recurrencia
semanal completa con una fila distinta por cada día. Por eso el atajo no
convierte una ronda en cinco tareas ficticias ni calcula un cumplimiento
semanal que el backend no pueda demostrar. La siguiente ampliación, si el uso
real lo confirma, será modelar ocurrencias planificadas por fecha y frecuencia
manteniendo separado el resultado operativo de la lectura metrológica.

## Reglas de diseño para futuras tareas

El contrato actual cubre trabajos ligados a puntos de auscultación. Para
fotografiar un montaje o registrar una incidencia se deben reutilizar las
visitas de montaje e incidencias existentes; no se deben convertir todos los
trabajos en una fila genérica sin confirmar su evidencia y procedimiento.

El orden recomendado de captura es: resultado breve, valor/unidad si aplica,
foto si corresponde, nota y siguiente punto. Los motivos deben ser lenguaje
de campo comprensible, no códigos internos.

## Compatibilidad de esquema y readiness

La versión de backend que incorpora este contrato comprueba de forma explícita
la capacidad de `monitoring_work_execution_events`. El probe valida la tabla y
los elementos mínimos de 029 (columnas, unicidad de `client_request_id`, claves
compuestas, índices y RLS/política) y publica dos señales distintas:

- `GET /api/v1/health`: liveness del proceso. No garantiza compatibilidad de
  esquema.
- `GET /api/v1/readiness`: readiness de despliegue. En el backend vigente
  devuelve `200` únicamente cuando todas las capacidades requeridas están
  disponibles, incluidas 029 y 030; devuelve `503` con estado `not_ready`
  si alguna falta o su esquema está incompleto.

`apps/backend/render.yaml` usa `/api/v1/readiness` como `healthCheckPath`, por
lo que una instancia incompatible no debe superar la compuerta de despliegue.
Además, si 029 falta, detalle de ronda, `Mi jornada` y exportación degradan de
forma explícita a ausencia de datos de ejecución sin consultar la tabla que no
existe. Las rutas GET/POST de `execution-events` fallan de forma controlada con
`503 WORK_EXECUTION_SCHEMA_UNAVAILABLE`. No se oculta el problema detrás de
`500` genéricos ni de `try/catch` repartidos.

### Evidencia PostgreSQL local (13-09-2026)

Se ejecutó una prueba real y aislada con PostgreSQL 17 compatible dentro de un
contenedor efímero, usando un fixture mínimo de las tablas de las que depende
029; no se usó Supabase real ni una `DATABASE_URL` remota. Resultado:

- antes de 029, el probe real devolvió `migration_missing`;
- tras aplicar el archivo 029 real, devolvió `ready`;
- reaplicar 029 con `ON_ERROR_STOP=1` terminó sin error;
- las FK compuestas rechazaron cruces ronda/obra y punto/ronda;
- el `UNIQUE(client_request_id)` rechazó un duplicado;
- con `SET ROLE anon`, la política RLS deny-all devolvió cero eventos visibles;
- el backend local respondió `/readiness` `200` con la tabla presente y `503`
  después de retirarla del fixture efímero.

Esta prueba **no** ejecutó toda la cadena 001–028 ni reproduce todos los
objetos de Supabase. Fue la evidencia local previa al rollout. El 16-09-2026
la secuencia remota quedó ejecutada por compuertas individuales: 019–026 se
registraron sin reejecutar SQL y 027, 028, 029 y 030 se aplicaron después, una
por una, con backup/prechecks y verificación posterior. La evidencia vigente
está en `docs/ai/RECONCILIACION-MIGRACIONES.md` y `MEMORIA.md` §12.

## Runbook de despliegue y rollback — backend y cadena física 029 completados

Los pasos siguientes siguen siendo la receta de referencia. El rollout remoto
de esquema/backend se ejecutó el 16-09-2026 con la autorización ya registrada;
las acciones autenticadas y físicas que aún falten mantienen sus propias
compuertas y no se presuponen superadas.

1. **Prechecks.** Confirmar commit objetivo, batería local verde, ventana de
   prueba y estado remoto observado. No publicar backend nuevo si readiness de
   esquema no puede verificarse.
2. **Respaldo.** Obtener y verificar un backup/snapshot recuperable de la base
   antes de cualquier migración. No avanzar si el respaldo no está disponible.
3. **Migraciones actuales.** Leer `schema_migrations` y reconciliar el estado
   real. Estado vigente: 019–026 están registradas tras reconciliación ledger-only;
   027, 028, 029 y 030 están aplicadas y registradas. El runner genérico no debe
   usarse para “demostrar” ese estado ni para reejecutarlas.
4. **Aplicar 029.** **Completado 16-09-2026** mediante su compuerta individual,
   después de 027/028 y antes de 030. Cualquier cambio futuro debe ser una nueva
   migración; no reejecutar 029 ni marcarla de nuevo a mano.
5. **Verificación SQL.** Confirmar tabla, columnas, `UNIQUE(client_request_id)`,
   índices, FK compuestas ronda/obra y punto/ronda, RLS y política deny-all.
6. **Desplegar backend.** **Completado.** PR #22 publicó el rollout 027–030 como
   `349967a`; la verificación independiente detectó después falsos positivos
   semánticos del probe y PR #23 publicó el hardening mínimo como
   `d3bef6ea0988e44524cd7cde8392906dc936e06f`. Render sirve ese SHA. No promover
   una instancia futura que falle readiness.
7. **Health/readiness.** **Completado para el rollout actual:** `/health = 200`
   y `/readiness = 200`, con `workExecution.available=true` y
   `weeklyWork.available=true`. Un `503` detiene cualquier rollout futuro.
8. **Prueba pública sin credenciales.** **Completada** para el backend actual. El
   verificador público debe
   pasar health/readiness y las rutas protegidas deben responder `401`; con
   `TOPOFIELD_ROUND_POINT_ID`, `execution-events` también debe existir y
   responder `401`, no `404`.
9. **Prueba autenticada.** Con una cuenta autorizada, verificar `/auth/me`, `Mi
   jornada`, detalle/export de ronda, histórico, creación, replay idéntico del
   mismo `client_request_id` y rechazo `409` si ese UUID se reutiliza con otro
   payload. Verificar permisos: supervisor lectura; admin/topógrafo escritura
   según membresía.
10. **Build móvil.** **Completado para la release instalada actual.** v15 cerró
    sesión, A/B, 029 y 030. Durante F7 apareció después un bug de replay ajeno
    a 029 y se generó una v16 incremental que conserva la misma firma y los
    datos de aplicación; `adb install -r` devolvió `Success`. Las releases
    anteriores permanecen como evidencia histórica de sus respectivas pruebas.
11. **E2E offline en Galaxy.** Registrar una acción sin red, confirmar que la
    UI indica estado local y nunca recepción, reiniciar si forma parte del caso,
    reconectar, observar replay con el mismo UUID y confirmar finalmente el
    histórico recibido. Incluir al menos un caso terminal (backend antiguo/
    conflicto) y uno reintentable (red/`5xx`).

    **Estado 18-09-2026:** sesión, aislamiento A/B y la secuencia completa de
    entrega 029 ya pasaron físicamente. El resultado nuevo se guardó sin red,
    sobrevivió al reinicio, no apareció como recibido antes del ACK, se
    reprodujo al reconectar y terminó como una segunda fila distinta con
    `count=1`, dejando intacta la histórica.
12. **Rollback.** Si falla antes del backend, detener el rollout. Si 029 ya está
    aplicada y falla el backend, el rollback preferido es volver al backend
    anterior y **dejar la tabla aditiva 029 intacta**, preservando eventos. La
    app se revierte reinstalando la build conocida compatible. Eliminar tabla,
    constraints o datos es una última medida destructiva: solo con backup,
    exportación previa de eventos y autorización explícita; nunca como rollback
    automático.

### Estado de autorización

El 13-09-2026 Erick autorizó la secuencia de despliegue por compuertas. El
16-09-2026 se completaron backup, reconciliación 019–026, aplicación individual
027 -> 028 -> 029 -> 030, publicación y verificación pública del backend. La
Stage 2 posterior revalidó el ledger en solo lectura y endureció los probes para
rechazar drift semántico; ese hardening quedó publicado como
`d3bef6ea0988e44524cd7cde8392906dc936e06f` y Render lo sirve con readiness
029+030. El verificador remoto de shell con una cuenta técnica sigue bloqueado
por ausencia de `TOPOFIELD_AUTH_TOKEN` y no se sustituye por guest. En Galaxy,
v15 pasó la regresión de sesión, la matriz A/B y la entrega 029 completa; la
release instalada se incrementó después a v16 únicamente por el bug físico de
replay F7 documentado en su contrato de campo. El contrato 029 no queda
pendiente de esa corrección.
