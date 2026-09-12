<!-- doc-status
estado: vivo
rol: field-design
verificado: 2026-09-12
-->

# F7: Visitas De Montaje

## Decisión

La galería histórica de una estación no representa por sí sola una visita:
no conserva qué se revisó, qué cambió ni qué estado tenía el montaje. Se
añade una entidad `station_mounting_visits` append-only y una colección de
`mounting_visit_evidence`. Las visitas se reutilizan para memoria de montaje,
referencias y fotos cercanas de prismas sin sobrescribir datos anteriores.

## Contrato local

- Una visita pertenece a una estación y el servidor deriva su `project_id` de
  esa estación.
- Una visita tiene `visitedAt`, `status` (`draft`, `completed`, `blocked`),
  notas, resumen de cambios, autor y `clientRequestId` único.
- Una evidencia pertenece a una visita y a la misma estación. Puede tener
  `kind` (`general`, `prism`, `reference`, `access`, `other`), `prismId`
  opcional, título, notas, foto y posición relativa `0..1`.
- La foto se sube mediante URL firmada y usa una ruta exacta
  `mounting-visits/<visitId>/<uploadId>.<ext>`.
- Los reintentos de creación usan `clientRequestId`; una repetición devuelve
  el registro existente en vez de crear otro.
- En móvil, la visita y sus evidencias pendientes se guardan por sesión y
  estación en SQLite; el outbox conserva el orden visita → evidencia y la
  foto local sobrevive al cierre de la aplicación.
- Si una evidencia se encola antes de tener id remoto, el sincronizador crea o
  recupera primero la visita por su `clientRequestId` y luego sube la foto y
  crea la evidencia con su propia clave idempotente.

La pantalla de consulta puede mostrar una posición relativa aproximada sobre
la miniatura mediante una cuadrícula 3x3. Esa posición solo sirve para
reencontrar visualmente un elemento dentro de la fotografía: no representa
coordenadas, orientación ni una medición. Los borradores de lectura se
guardan aparte en SQLite 008, por sesión y punto de ronda, para recuperar
campos y notas tras una interrupción sin guardar fotos como base64.

## Rutas

- `GET /api/v1/stations/:stationId/mounting-visits`
- `POST /api/v1/stations/:stationId/mounting-visits`
- `PATCH /api/v1/stations/:stationId/mounting-visits/:visitId`
- `POST /api/v1/stations/:stationId/mounting-visits/:visitId/evidence`
- `POST /api/v1/uploads/photos/sign` con `entityType=mounting_visit`

Las lecturas exigen una sesión autenticada con acceso a la obra. Las
escrituras exigen permiso `write`; `supervisor`, membresías `read` y el token
público no pueden crear visitas ni evidencias. La migración 027 incluye RLS
`legacy deny all` para mantener el acceso exclusivamente por la API.

## Límites

La posición es relativa a la fotografía, no una coordenada geográfica. Esta
versión no afirma orientación norte, precisión métrica, visibilidad actual ni
soporte CAD. El `prismId` queda opcional para no obligar a inventar una
identidad cuando el código solo se puede leer visualmente en campo.

Una visita nueva siempre empieza en `draft`. Solo una actualización autenticada
con permiso `write` puede marcarla `completed` o `blocked`; eso evita que una
creación incompleta se presente como trabajo ya realizado.

## Estado Y Verificación

Implementado localmente en `codex/f5-field-stability` mediante `d270da3`,
`a83beeb`, `8150c68`, `ee80825` y `5f92a66`; la migración PostgreSQL no está
aplicada a Supabase y el endpoint no está desplegado. Las regresiones cubren
validación, ruta exacta de Storage, roles, scope por `stations.project_id`,
caché por sesión, sincronización ordenada de evidencia y aislamiento de
borradores de lectura. La aceptación de campo requiere crear una visita,
cerrar/reabrir la app sin red, añadir una foto real, reconectar y comprobar
que la segunda visita no altera la primera ni duplica la evidencia.
