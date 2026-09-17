<!-- doc-status
estado: vivo
  verificado: 2026-09-18
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
FKs, índices, CHECKs, RLS y deny-all. La release móvil final `versionCode=15`
fue la base de la prueba física; la release instalada posterior v16 conserva el
mismo contrato. El CRUD autenticado ya se completó en Galaxy con versiones,
`completed_at`, soft-delete y separación de permisos. Las mutaciones de
weekly-work siguen siendo online y la caché offline es solo de lectura. La
validación física no convierte la planificación semanal en ejecución real ni
cierra por sí sola F5.

## Secuencia física QA completada — 17/18-09-2026

La prueba partió de `0` filas activas y creó una única fila QA
`E2E Stage4 v15`, id `4d9cb697-3fe1-433b-a980-623577a7ab93`, con
`client_request_id=31ffbd1d-134f-4d84-a887-0d1c318cfa2d`. La secuencia física
en Galaxy y la reconsulta read-only de PostgreSQL demostraron:

1. creación `planned`, `version=1`, `completed_at=null`;
2. edición de notas a `QA CRUD 030`, `version=2`, todavía `planned`;
3. `done`, `version=3`, `completed_at=2026-09-17T22:08:03.530Z`;
4. vuelta a `planned`, `version=4`, `completed_at=null`;
5. borrado lógico desde `planned`, `version=5`, con
   `deleted_at=2026-09-17T22:08:49.963Z` y `deleted_by` informado.

Tras el borrado, la UI volvió a `0/0` y `Día libre de planificación`, y la
consulta activa de la obra volvió a cero filas. No se intentó borrar un `done`:
el `409 WEEKLY_WORK_DELETE_NOT_ALLOWED` sigue siendo una regla contractual, no
una prueba que hubiera que provocar para cerrar el camino feliz.

La separación de sesión también quedó observada físicamente: al activar la
cuenta `supervisor-piloto@topofield.local`, Bitácora mostró la semana en modo
consulta sin `Añadir`, `Editar`, `Eliminar` ni acciones rápidas de estado. Por
tanto, 030 tiene evidencia de versiones, `completed_at`, soft-delete y permisos
en el dispositivo real, manteniendo separada la caché offline de solo lectura.
