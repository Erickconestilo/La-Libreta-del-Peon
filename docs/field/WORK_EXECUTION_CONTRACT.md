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

TopoField reutiliza `monitoring_rounds` y `monitoring_round_points` como el
trabajo asignado. No se crea un segundo gestor de tareas. Cada punto puede
recibir eventos operativos append-only, separados de la lectura metrológica.

## Flujo móvil

Desde una ronda, el operario puede abrir `Indicar resultado` para un punto y
seleccionar una única acción por vez:

- `Empezar`: el trabajo queda `En curso`.
- `Hecho`: el trabajo queda `Hecho`; no confirma por sí solo una lectura ni
  permite cerrar una ronda con una lectura pendiente.
- `No realizado`: exige motivo.
- `Repetir`: exige motivo.
- `Bloqueado`: exige motivo.

La nota de relevo es opcional. La acción se guarda localmente cuando no hay
red y se encola con `clientRequestId`; al reconectar se sincroniza mediante el
mismo outbox probado para lecturas y partes. La interfaz dice `Guardado
localmente` hasta que el servidor recibe el evento.

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
