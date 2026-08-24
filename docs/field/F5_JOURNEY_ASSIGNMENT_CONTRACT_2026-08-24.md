<!-- doc-status
estado: vivo
verificado: 2026-08-24
-->

# F5 — Contrato de Mi jornada

## Propósito

Una ronda de auscultación representa una jornada asignada. El administrador
organiza las rondas de una obra y el topógrafo recibe una cola personal para
ejecutarlas en el orden previsto, sin convertir `project_memberships` en una
tabla de tareas.

## Contrato backend

- `GET /api/v1/me/journey` devuelve las rondas `draft` y `active` asignadas al
  usuario autenticado, agregadas por obra y ordenadas por `roundDate`,
  `executionOrder` y `createdAt`.
- `GET /api/v1/projects/:projectId/operators` devuelve únicamente topógrafos
  activos con membresía activa en la obra y solo está disponible para `admin`.
- `PATCH /api/v1/rounds/:roundId` acepta estado para `admin`/`topografo`, pero
  `operatorId`, `roundDate` y `executionOrder` solo para `admin`.
- El operador asignado debe ser un topógrafo activo con membresía activa en la
  misma obra. `null` deja la ronda sin asignar.
- La migración `021_monitoring_round_assignment_order.sql` añade
  `execution_order`; queda preparada pero no se aplica sin autorización.

## Comportamiento móvil

- Obras muestra `Mi jornada` antes del listado de obras.
- En el arranque o login, la primera ronda no aplazada se abre una sola vez.
- `Después` aplaza la ronda localmente hasta el final del día sin cambiar el
  orden del administrador.
- La cola se conserva en SQLite por sesión y se muestra con aviso si procede
  de una copia sin actualizar.
- Si la planificación cambia mientras hay lecturas locales pendientes, la app
  conserva los datos y muestra un conflicto de asignación en la ronda.

## Límites de despliegue

El contrato queda verificado localmente con TypeScript y tests. Para usarlo en
Galaxy hay que aplicar la migración 021 con autorización explícita, publicar el
backend compatible y generar una release móvil; ninguna de esas acciones se
ejecuta como parte de este cambio local.
