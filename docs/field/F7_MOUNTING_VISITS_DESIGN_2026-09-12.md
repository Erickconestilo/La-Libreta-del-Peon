<!-- doc-status
estado: vivo
rol: field-design
verificado: 2026-09-17
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
  esa estación. La migración aplicada añade una clave foránea compuesta para
  que la base también rechace una pareja estación/obra incoherente.
- Una visita tiene `visitedAt`, `status` (`draft`, `completed`, `blocked`),
  notas, resumen de cambios, autor y `clientRequestId` único.
- Una evidencia pertenece a una visita y a la misma estación. Puede tener
  `kind` (`general`, `prism`, `reference`, `access`, `other`), `prismId`
  opcional, título, notas, foto y posición relativa `0..1`.
- Otra clave foránea compuesta impide que una evidencia se guarde con una
  estación diferente a la de su visita.
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
- En la pantalla móvil, una evidencia de tipo `prism` puede vincularse
  opcionalmente a un prisma cargado para esa estación; si no hay catálogo
  disponible, se conserva el código en el título sin forzar una relación.
- Marcar una visita como `blocked`/`No realizable` exige un motivo escrito. La
  aplicación conserva las notas anteriores y añade `Motivo de no realización:`;
  el backend rechaza la transición si el motivo llega vacío.
- La UI ofrece motivos neutros de selección rápida y mantiene un campo libre
  para excepciones, sin convertirlos en códigos técnicos ni sustituir el
  procedimiento de campo.

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

Implementado mediante `d270da3`, `a83beeb`, `8150c68`, `ee80825` y
`5f92a66`. La migración PostgreSQL 027 quedó aplicada y registrada en Supabase
el 16-09-2026 tras backup/prechecks; el backend con estas rutas fue publicado en
PR #22 y Render sirve el hardening posterior `d3bef6e` con readiness 029+030
verde. Las regresiones cubren validación, ruta exacta de Storage, roles, scope
por `stations.project_id`, caché por sesión, sincronización ordenada de
evidencia y aislamiento de borradores de lectura. **F7 no está físicamente
cerrada:** la aceptación de campo aún requiere crear una visita, cerrar/reabrir
la app sin red, añadir una foto real autorizada/no sensible, reconectar y
comprobar que la segunda visita no altera la primera ni duplica la evidencia.
Mientras `topofield-photos` siga público, no se usarán imágenes sensibles de
terceros y una prueba solo con galería no se presentará como PASS de cámara.

### Preflight read-only para la prueba física — 17-09-2026

El estado remoto actual está limpio para una primera prueba de montaje:
`station_mounting_visits=0` y `mounting_visit_evidence=0`. El bucket
`topofield-photos` continúa con `public=true`; conserva límite de `5 MiB`, MIME
permitidos JPEG/PNG/WebP y versionado desactivado. Existen objetos históricos
de otros flujos de fotos, por lo que la prueba no debe usar el conteo total del
bucket como prueba de éxito: debe demostrar la ruta exacta de la nueva visita y
su evidencia asociada.

La prueba física segura debe usar una foto autorizada/no sensible tomada con
**Cámara**, crear la visita, conservarla durante reinicio/offline, reconectar y
verificar una única evidencia recibida. `Galería` puede comprobarse como ruta
secundaria, pero nunca sustituye el PASS de cámara. No se migrará el bucket a
privado ni se fabricarán evidencias server-side para cerrar esta compuerta.
