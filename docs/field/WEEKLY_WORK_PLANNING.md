<!-- doc-status
estado: vivo
  verificado: 2026-09-16
rol: contrato
-->

# Planificación semanal de Bitácora

## Objetivo

Bitácora incorpora una vista de planificación semanal editable de **lunes a domingo**. El diseño toma como referencia el control semanal usado en campo, pero evita reproducir la hoja Excel: prioriza lectura rápida en móvil, pocas pulsaciones y separación clara entre plan y ejecución real.

El Excel de referencia mostró un patrón repetido de semanas, dos familias operativas principales (nivelación y trabajos manuales), marcas diarias de realizado y frecuencia de trabajo. En la app esas señales se convierten en fecha, tipo, estado y nota, sin codificar filas concretas del fichero.

## Modelo

Cada trabajo semanal pertenece a una obra y contiene:

- `workDate`: día concreto de lunes a domingo;
- `title`: descripción corta del trabajo;
- `category`: `leveling`, `manual` u `other`;
- `status`: `planned`, `in_progress`, `done` o `blocked`;
- `notes`: contexto operativo opcional;
- `version`: control optimista de concurrencia.

La planificación es editable. **No sustituye ni modifica** `monitoring_work_execution_events`, que sigue siendo la fuente append-only de ejecución real y trazable.

## UX de Bitácora

- `Semana` es la vista principal de planificación y `Actividad` conserva notas, incidencias y mensajes existentes.
- La semana siempre contiene lunes, martes, miércoles, jueves, viernes, sábado y domingo.
- En móvil se selecciona el día y se muestran sus trabajos; en pantallas anchas se muestran los siete días como tablero.
- Acciones rápidas: añadir, editar, marcar hecho, volver a pendiente y eliminar cuando el trabajo sigue `planned`.
- El estado se expresa con texto además de color.
- Supervisor: lectura. Admin/topógrafo: edición sujeta al control de acceso de obra del backend.

## Persistencia y concurrencia

Backend:

- `GET /api/v1/projects/:projectId/weekly-work?weekStart=YYYY-MM-DD`
- `POST /api/v1/projects/:projectId/weekly-work`
- `PATCH /api/v1/projects/:projectId/weekly-work/:itemId`
- `DELETE /api/v1/projects/:projectId/weekly-work/:itemId?version=N`

La migración local `030_project_weekly_work.sql` crea `project_weekly_work_items`. PATCH y DELETE bloquean la fila con `FOR UPDATE` y exigen `version`. El borrado es lógico y solo está permitido mientras el estado sea `planned`.

POST usa `clientRequestId` para deduplicación. La UI conserva el mismo identificador mientras el editor siga abierto, de modo que un reintento manual tras una respuesta perdida no genere una segunda planificación equivalente.

## Offline

La última semana recibida del servidor se guarda en SQLite (`weekly_work_cache`) separada por sesión, obra y lunes de la semana. Se puede consultar sin conexión, pero las mutaciones permanecen online en este bloque para no introducir una segunda semántica de sincronización parcial.

## Estado de despliegue

La migración PostgreSQL `030_project_weekly_work.sql` quedó aplicada y registrada
en Supabase el 16-09-2026. El backend que expone estas rutas está publicado en
Render mediante `d3bef6ea0988e44524cd7cde8392906dc936e06f`; el readiness remoto
verificado exige conjuntamente 029 y 030 y valida semánticamente PK, columnas,
FKs, índices, CHECKs, RLS y deny-all. La release móvil `versionCode=13` que
contiene este cliente está preparada y firmada, pero todavía no se ha instalado
ni validado físicamente en el Galaxy; tampoco se ha completado el CRUD
autenticado de QA. Por tanto, despliegue de esquema/backend no equivale a
validación de campo.
