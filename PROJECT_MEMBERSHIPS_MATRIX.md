# Matriz de project_memberships - TopoField

## Decisión - 2026-06-01

No usar la asignación actual del `topografo` a todas las obras como política para usuarios reales.

Esa asignación amplia existe solo para que el usuario técnico de QA pueda probar todas las obras actuales. Para usuarios reales, el acceso debe ser explícito: una fila activa en `project_memberships` por usuario y obra.

## Decisión sobre datos QA

Los registros QA creados en el Galaxy se dejan en producción por ahora como trazabilidad aceptada de prueba:

- Mensaje de estación: `e1037d58-f6e6-42c2-a222-c8e8fc389003`
- Propuesta de estacionamiento provisional / incidencia: `1f8153e3-d956-48c7-9ad6-00c0322c16cf`

Motivo:

- Borrarlos sería una mutación de producción sin petición explícita de limpieza.
- Demuestran que el flujo de escritura de `topografo` funcionó de extremo a extremo con la APK real y el backend de Render.
- Son registros internos restringidos por rol; `visitante` no ve mensajes de equipo ni propuestas provisionales.

Si se limpian más adelante, apuntar a estos IDs exactos y registrar la acción. No ejecutar borrados amplios por texto como `QA`.

## Claves actuales de obra

Usar `projects.external_id` como clave legible de la matriz:

| external_id | Obra |
| --- | --- |
| `campus-nord` | Campus Nord |
| `sarria` | Sarrià |
| `sant-gervasi-de-casoles` | Sant Gervasi de Casoles |
| `putxe` | Putxe |
| `sanllehy` | Sanllehy |
| `maragall` | Maragall |

## Cuentas técnicas actuales

| Cuenta | Rol | Alcance |
| --- | --- | --- |
| `topofield-admin@topofield.local` | `admin` | Global por rol |
| `topofield-topografo@topofield.local` | `topografo` | QA técnico, todas las obras actuales |

Estas cuentas no son un modelo para alta de usuarios reales.

## Regla para usuarios reales

Antes de añadir un usuario real de campo, rellenar esta matriz:

| Email usuario | Nombre completo | Rol | campus-nord | sarria | sant-gervasi-de-casoles | putxe | sanllehy | maragall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<pendiente>` | `<pendiente>` | `topografo` | si/no | si/no | si/no | si/no | si/no | si/no |

Reglas:

- `admin` no necesita `project_memberships`; su alcance es global por rol.
- `topografo` necesita al menos una membresía activa antes de operar.
- `visitante` es modo público de lectura mediante `GUEST_PUBLIC_TOKEN`, no un usuario con membresías de obra.
- Quitar a un usuario de una obra debe marcar esa membresía con `is_active = FALSE`, no borrar historial.
- Dar de baja del todo a un usuario debe marcar `users.is_active = FALSE`.

## Nota de implementación

La migración `013_project_memberships.sql` asignó cada `topografo` existente a cada obra existente para no romper QA después de introducir autorización por proyecto. Esa migración es un paso de compatibilidad inicial, no una política de acceso a largo plazo.
