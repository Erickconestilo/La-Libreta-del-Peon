<!-- doc-status
estado: vivo
  verificado: 2026-09-13
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
registrar eventos. La migración no se ha aplicado en Supabase. Además de la
validación en el modelo, la migración preparada crea claves foráneas
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
- `GET /api/v1/readiness`: readiness de despliegue. Devuelve `200` únicamente
  cuando la capacidad 029 está disponible; devuelve `503` con estado
  `not_ready` cuando falta la migración o el esquema está incompleto.

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
objetos de Supabase. Por tanto, valida 029 y el gate contra PostgreSQL real,
pero la ejecución ordenada de migraciones sobre el proyecto remoto sigue
`PENDIENTE` y requiere autorización.

## Runbook de despliegue y rollback — preparado, no ejecutado

Los pasos siguientes son una receta de despliegue controlado. Todo lo que
modifique Supabase, Render, una cuenta real o el Galaxy requiere autorización
explícita de Erick en el momento.

1. **Prechecks.** Confirmar commit objetivo, batería local verde, ventana de
   prueba y estado remoto observado. No publicar backend nuevo si readiness de
   esquema no puede verificarse.
2. **Respaldo.** Obtener y verificar un backup/snapshot recuperable de la base
   antes de cualquier migración. No avanzar si el respaldo no está disponible.
3. **Migraciones actuales.** Leer `schema_migrations` y reconciliar el estado
   real. La última observación histórica era hasta 026; 027, 028 y 029 estaban
   pendientes. 027 (visitas de montaje) y 028 (idempotencia de adjuntos) son
   cambios distintos de este bloque. El runner del repo aplica pendientes en
   orden, así que **no** debe ejecutarse suponiendo que aplicará solo 029: si
   027/028 siguen pendientes, su aplicación conjunta necesita autorización y
   revisión explícitas.
4. **Aplicar 029.** Una vez decidido el tratamiento de 027/028, aplicar 029 con
   el mecanismo autorizado y registrar su versión. No aplicar SQL ad hoc a
   ciegas ni marcarla manualmente como ejecutada.
5. **Verificación SQL.** Confirmar tabla, columnas, `UNIQUE(client_request_id)`,
   índices, FK compuestas ronda/obra y punto/ronda, RLS y política deny-all.
6. **Desplegar backend.** Solo después del esquema compatible, publicar el
   commit aprobado. No promover una instancia que falle readiness.
7. **Health/readiness.** Exigir `/health = 200` y `/readiness = 200` con
   `workExecution.available=true`. Un `503` detiene el rollout.
8. **Prueba pública sin credenciales.** Ejecutar el verificador público: debe
   pasar health/readiness y las rutas protegidas deben responder `401`; con
   `TOPOFIELD_ROUND_POINT_ID`, `execution-events` también debe existir y
   responder `401`, no `404`.
9. **Prueba autenticada.** Con una cuenta autorizada, verificar `/auth/me`, `Mi
   jornada`, detalle/export de ronda, histórico, creación, replay idéntico del
   mismo `client_request_id` y rechazo `409` si ese UUID se reutiliza con otro
   payload. Verificar permisos: supervisor lectura; admin/topógrafo escritura
   según membresía.
10. **Build móvil.** La v12 instalada antes de esta misión es evidencia
    histórica y no demuestra estos cambios. Para validar work-execution debe
    usarse una build que contenga los commits de esta misión (v12 si se
    reconstruyera exactamente con ellos o, preferiblemente, un build posterior
    con versionado inequívoco), sin desinstalar datos locales por defecto.
11. **E2E offline en Galaxy.** Registrar una acción sin red, confirmar que la
    UI indica estado local y nunca recepción, reiniciar si forma parte del caso,
    reconectar, observar replay con el mismo UUID y confirmar finalmente el
    histórico recibido. Incluir al menos un caso terminal (backend antiguo/
    conflicto) y uno reintentable (red/`5xx`).
12. **Rollback.** Si falla antes del backend, detener el rollout. Si 029 ya está
    aplicada y falla el backend, el rollback preferido es volver al backend
    anterior y **dejar la tabla aditiva 029 intacta**, preservando eventos. La
    app se revierte reinstalando la build conocida compatible. Eliminar tabla,
    constraints o datos es una última medida destructiva: solo con backup,
    exportación previa de eventos y autorización explícita; nunca como rollback
    automático.

### Estado de autorización

Completado autónomamente en local: implementación, tests, gate de readiness,
verificador público y prueba PostgreSQL efímera. El 13-09-2026 Erick autorizó
la secuencia de despliegue por compuertas: backup remoto; revisión y aplicación
de 027 -> 028 -> 029 si los prechecks son verdes; despliegue y verificaciones de
backend; y, únicamente después, nueva build/instalación y E2E físico en Galaxy.

En la sesión que recibió esa autorización se intentó iniciar la comprobación
remota de solo lectura de `schema_migrations` usando el stack del backend, pero
el conector de ejecución bloqueó la operación antes de abrir la consulta. Por
tanto, la autorización existe pero **backup, migraciones, Render y Galaxy siguen
sin ejecutarse ni verificarse**. No se debe saltar esa compuerta: el backend
nuevo no se publica hasta demostrar backup recuperable, estado real de
migraciones y prechecks de 027/028/029.
