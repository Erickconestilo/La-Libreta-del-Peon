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

Usar `projects.code` como clave legible de la matriz:

| code | Obra |
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
| `topofield-topografo@topofield.local` | `topografo` | QA técnico acotado a `campus-nord` y `maragall` |

Estas cuentas no son un modelo para alta de usuarios reales.

Nota crítica: el topógrafo técnico dejó de tener acceso activo a todas las obras para poder validar aislamiento real por `project_memberships`. Si hace falta probar otra obra desde ese usuario, añadir explícitamente su `projectCode` a `data/project-memberships.json` y resincronizar; no volver a una política global implícita.

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

## Sincronización real de matriz en base de datos

Para pasar de QA a matriz real sin tocar móviles ni EAS:

1. Edita `topofield/data/project-memberships.json` con los correos reales y proyectos (`projectCodes`) que van a usar.
2. Ejecuta en el backend:

```bash
npm run sync:project-memberships --workspace apps/backend
```

Si quieres usar otro archivo:

```bash
npm run sync:project-memberships --workspace apps/backend -- data/project-memberships.json
```

Comportamiento:

- `topografo`: se normaliza la matriz contra `projects.code` explícito.
- Membresías anteriores del usuario que no estén en la lista nueva quedan en `is_active = FALSE` (no se borran).
- `admin` y `visitante` no se tocan aquí.
