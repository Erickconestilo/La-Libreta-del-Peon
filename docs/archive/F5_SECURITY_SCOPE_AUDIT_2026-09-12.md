<!-- doc-status
estado: archivado
congelado: 2026-09-12
superado-por: NEXT_CHAT_HANDOFF.md
-->

# Auditoria de scope y seguridad F5

## Alcance y limite

Revision estatica y automatizada del backend de TopoField realizada el
12-09-2026 sobre la rama `codex/f5-field-stability`. Se revisaron rutas,
controllers, models, middleware de autenticacion, validacion, uploads y
contratos de exportacion. No se aplicaron migraciones, no se modificaron
Supabase/RLS/Auth y no se usaron datos remotos durante este bloque.

Esta auditoria demuestra las barreras del codigo y sus regresiones. No
sustituye la prueba con dos cuentas reales en dos obras ni la validacion del
dispositivo fisico, que siguen condicionadas por ADB y por la participacion
real de usuarios.

## Resultado ejecutivo

No se encontro una nueva fuga multi-tenant explotable en la lectura del
codigo. El proyecto real del recurso se resuelve en servidor antes de
autorizar operaciones anidadas. Las rutas de auscultacion mantienen fuera al
rol `visitante`; `supervisor` puede consultar segun membresia, pero nunca
escribir ni exportar; una membresia `read` no concede escritura.

Se cerro una laguna de cobertura: `route-role-audit.test.ts` ahora inspecciona
tambien `roundPointsRouter`, incluyendo lecturas y adjuntos, y exige que
ambas rutas excluyan a `visitante` y solo admitan `admin` y `topografo`.

## Matriz revisada

| Recurso | Control de scope comprobado | Escrituras comprobadas |
|---|---|---|
| Proyectos | `listProjects` y `getProjectById` aplican el scope de membresia | alta y foto requieren permiso efectivo |
| Estaciones | listados aceptan filtro, pero siempre lo combinan con scope del actor; las lecturas por id cargan la obra real | alta, notas, foto y cambios vuelven a cargar la estacion scoped |
| Prismas | acceso directo, cobertura y prismas por estacion filtran por obra o por estacion scoped | fotos y reconciliacion requieren permiso apropiado |
| Mensajes de estacion | consultas y alta parten de una estacion dentro del scope real | el mensaje se crea solo despues de validar la estacion |
| Incidencias | estacion/prisma se resuelven antes de crear; el modelo aplica scope de obra | `assertProjectWriteAccess` bloquea `read` y supervisor |
| Fotos y uploads | el recurso propietario se resuelve antes de comprobar el objeto externo | firma, alta y borrado requieren permiso y path del recurso |
| Change logs | consultas reciben `getActorProjectScope` | no hay escritura publica del historial inmutable |
| Rondas y puntos | detalle, rondas de proyecto, puntos y contexto de lectura usan scope de obra | alta, edicion, puntos, lecturas y cierres validan la obra real |
| Adjuntos de lectura | exige simultaneamente `readingId`, `roundPointId`, ronda scoped y path bajo esa lectura | alta idempotente por lectura y `storage_path`; solo roles de escritura |
| Historicos y umbrales | se resuelve el punto de control dentro del scope antes de consultar | modificacion de umbrales requiere escritura |
| Partes y exportaciones | el round se carga con scope antes de cualquier operacion | parte idempotente; CSV/XLSX requiere permiso `write` |
| Jornada personal | se filtra por operador autenticado y scope de obra | el orden/asignacion queda administrativo |

## Garantias observadas

- El cliente no puede convertir un `projectId` de body o query en permiso. En
  recursos anidados, el controller obtiene primero el `projectId` del recurso
  persistido y despues llama a `assertProjectWriteAccess` o al model scoped.
- `getActorProjectScope` devuelve acceso global solo para `admin`; para
  `topografo` y `supervisor` devuelve membresias activas. `supervisor` se
  mantiene de solo lectura aunque una membresia tuviera `write`.
- `visitante` sigue excluido de rondas, puntos, lecturas, umbrales,
  historicos, adjuntos, partes y exportaciones.
- `createInstrumentReading` usa el round point resuelto en servidor y la
  idempotencia `(measured_by, client_request_id)`.
- `createReadingAttachment` comprueba scope antes de la verificacion externa
  de Storage, valida que el path pertenece al `readingId` y el modelo exige la
  relacion exacta entre reading y round point.
- Las respuestas de autenticacion y errores no incluyen cuerpos de peticion,
  contrasenas, tokens, cabeceras `Authorization`, SQL ni stack traces.

## Regresiones automatizadas

El test existente de acceso por obras cubre dos proyectos y membresias
separadas para impedir lectura o escritura cruzada en familias de recursos.
Tambien cubre `read`, supervisor, visitante y recursos derivados. En esta
sesion se amplió la auditoria de routers a los adjuntos.

Salida literal despues de compilar el cambio:

```text
> @topofield/backend@1.0.0 build
> tsc -p tsconfig.json

```

```text
roundPointsRouter POST /:roundPointId/readings: visitante excluido
roundPointsRouter POST /:roundPointId/readings/:readingId/attachments: visitante excluido
...
ℹ tests 77
ℹ pass 77
ℹ fail 0
```

## Dependencias

Se ejecuto la correccion segura:

```text
npm audit fix --workspace apps/backend
changed 2 packages, and audited 1069 packages in 2s
2 moderate severity vulnerabilities
```

La auditoria final sin dependencias de desarrollo mantiene dos avisos
transitivos de `uuid` bajo `exceljs@4.4.0`. `npm audit fix --force` propone
degradar `exceljs` a `3.4.0`, que es un cambio rompiente. No se aplico. La
dependencia solo se alcanza por el exportador XLSX y no se ha demostrado una
ejecucion de codigo arbitrario desde datos de campo; queda como riesgo de
dependencias aceptado temporalmente, pendiente de una actualizacion
compatible de ExcelJS o una decision explicita antes de produccion amplia.

## Riesgos que siguen abiertos

1. La prueba automatizada no sustituye el aislamiento en Render con dos
   cuentas y datos reales autorizados.
2. El E2E de lectura/foto offline, reinicio, reconexion, parte y cierre sigue
   sin poder cerrarse mientras `adb devices -l` no muestre el Galaxy como
   `device`.
3. Las lecturas conservan `public_url` del contrato historico; el bloque F5
   no lo transforma en URL firmada privada.
4. El baseline RLS del proyecto mantiene politicas deny-all porque el backend
   usa conexion directa y aplica el scope en la API; no se modifico esa
   arquitectura en esta auditoria.

## Decision

El backend queda apto para continuar con el piloto tecnico local y el
despliegue funcional ya verificado en Render. No se declara cerrado F5: faltan
la evidencia fisica offline, la comparacion de exportaciones con una ronda
real y la validacion multiusuario/mercado.
