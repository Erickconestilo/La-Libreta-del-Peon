# Auditoria Multi-Tenant - 2026-08-01

## Alcance

Revision estatica de todos los controladores, rutas y modelos de `apps/backend/src` que operan sobre datos por obra. El actor `topografo` recibe sus obras desde `project_memberships` durante la autenticacion y el backend usa esa lista como unica fuente de scope.

## Matriz revisada

| Familia | Lectura | Escritura | Resultado |
|---|---|---|---|
| Obras y catalogo | `projects` filtrado por `p.id` | admin o `assertProjectAccess` | Correcto |
| Estaciones, notas y foto principal | `stations.project_id` | scope en modelo y validacion de obra al crear | Correcto |
| Fotos y mensajes de estacion | join con estacion y scope | estacion bloqueada con scope | Correcto |
| Prismas, observaciones y cobertura | `prisms.project_id` o estacion asociada | foto bloqueada con scope | Correcto |
| Incidencias | join estacion/prisma con scope | Corregido en esta fase |
| Rondas, puntos, lecturas, umbrales y adjuntos | joins a ronda/punto con scope | scope en consulta de contexto | Correcto |
| Cargas firmadas | recurso de destino comprobado con scope | no firma para recurso no accesible | Correcto |
| Logs de cambio | estacion, prisma o obra filtrados | solo lectura | Correcto; guia global queda fuera del tenant |
| Guia y autenticacion | contenido global | solo admin escribe guia | Fuera del tenant por diseno |

## Hallazgos y correcciones

1. `createIncident` dependia de validaciones previas del controlador. Ahora recibe `projectScope` y vuelve a comprobar estacion y prisma dentro de su propia transaccion antes de insertar. Asi una llamada futura al modelo no puede saltarse el aislamiento.
2. Un `topografo` podia crear una incidencia sin estacion ni prisma, por tanto sin obra. Ahora se rechaza con `PROJECT_REQUIRED`; un admin conserva el caso global.
3. Actualizar o adjuntar una foto comprobaba Storage antes de comprobar el recurso. Se unifico el orden en un helper: primero se carga el recurso con scope y solo despues se verifica el objeto de Storage. Cubre foto de obra, estacion, prisma, memoria visual y adjunto de lectura.

## Cobertura automatizada

- Dos topografos de prueba con membresias separadas para las obras A y B.
- Cada familia de endpoint con recurso de obra comprueba acceso propio y deniega lectura/escritura cruzada por la misma regla central.
- Scope SQL de incidencias comprobado para estacion, prisma y ausencia de membresias.
- El helper de fotos verifica que un recurso inaccesible no llega a consultar Storage.

Estas pruebas son unitarias de la logica de scope y de las clausulas SQL. Antes de incorporar una segunda persona al piloto se mantiene como aceptacion adicional la prueba API real con dos cuentas y dos obras separadas.

## Supabase

El advisor de seguridad se ejecuto en modo solo lectura el 2026-08-01. No aparecen avisos nuevos de RLS o politicas. Sigue el aviso ya conocido `auth_leaked_password_protection`: la proteccion contra contrasenas filtradas esta desactivada. No se aplico ningun cambio remoto.

## Decision pendiente de producto y seguridad

El token `visitante` conserva scope global en todas las rutas `GET` que lo admiten. Esto es intencional para contenidos publicos como guia, estaciones y prismas con DTO reducido, pero varias rutas de auscultacion tambien lo admiten hoy. Una nota anterior del MVP excluia a visitante de lecturas de auscultacion, mientras que las rutas actuales permiten varias consultas de lectura. No se cambio esta politica sin confirmacion de Erick: antes del piloto de equipo debe decidirse si visitante puede consultar auscultacion y, si la respuesta es no, restringir esas rutas a `admin` y `topografo`.
