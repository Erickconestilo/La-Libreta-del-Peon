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

En la cabecera de la ronda, el operario ve un resumen separado del estado
metrológico: puntos `hechos`, `en curso`, `pendientes` y `por revisar`. El
botón `Continuar con <código>` abre el primer punto accionable respetando el
orden de `monitoring_round_points.sort_order`; un punto `bloqueado` no se
presenta como siguiente trabajo. Esto reduce navegación manual sin convertir
un resultado operativo en una lectura válida ni en un cierre de ronda.

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
registrar eventos. La migración no se ha aplicado en Supabase.

## Estados que no se deben mezclar

`executionState` describe qué declara el operario sobre el trabajo. El campo
`monitoring_round_points.status` continúa describiendo el estado de la toma
metrológica y el cierre de la ronda. Por eso un punto puede estar `Hecho` en
la ejecución y seguir `Pendiente` en la lectura: es una señal honesta para
revisar el dato, no un falso 100 %.

La pantalla del supervisor verá únicamente eventos recibidos por el servidor.
Un evento en outbox no se presenta como recibido hasta que la sincronización
termine.

El operario y el supervisor pueden consultar el historial append-only del
punto. Las acciones anteriores no se sobrescriben: cada nueva acción añade un
evento con fecha, autor y contexto, y la interfaz muestra el último estado
junto con la secuencia recibida.

## Entrega a oficina

El último evento recibido para cada punto se incluye en el contrato común de
exportación CSV/XLSX como `trabajo_estado`, `trabajo_motivo`, `trabajo_notas`,
`trabajo_fecha` y `trabajo_operador`. También aparece para puntos que todavía no
tienen lectura, porque declarar que el trabajo no se pudo realizar no equivale
a inventar una medición. El exportador conserva una fila por lectura; si el
punto está pendiente y no tiene lecturas, conserva una fila pendiente con el
resultado operativo que haya llegado al servidor.

## Reglas de diseño para futuras tareas

El contrato actual cubre trabajos ligados a puntos de auscultación. Para
fotografiar un montaje o registrar una incidencia se deben reutilizar las
visitas de montaje e incidencias existentes; no se deben convertir todos los
trabajos en una fila genérica sin confirmar su evidencia y procedimiento.

El orden recomendado de captura es: resultado breve, valor/unidad si aplica,
foto si corresponde, nota y siguiente punto. Los motivos deben ser lenguaje
de campo comprensible, no códigos internos.
