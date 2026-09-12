<!-- doc-status
estado: vivo
verificado: 2026-09-13
rol: audit
-->

# F5: Auditoria Autonoma Local

## Alcance

Esta auditoria cubre lo que puede verificarse sin el Galaxy, sin aplicar
migraciones y sin modificar Supabase, Render, EAS o Play Store. No sustituye
la prueba fisica, la jornada observada ni las entrevistas profesionales.

## Hallazgos y acciones

1. La superficie de rutas de negocio exige `requireAuth` y un `requireRole`
   explicito. Se auditan proyectos, estaciones, prismas, incidencias, guia,
   change logs, jornada, rondas, puntos, lecturas, adjuntos y uploads.
2. `visitante` y `supervisor` solo aparecen en rutas `GET`; las mutaciones no
   se pueden habilitar por accidente mediante una lista de roles.
3. Se corrigio el listado de incidencias para no mostrar a una obra una fila
   heredada que relacione una estacion de una obra con un prisma de otra.
   La creacion ya rechazaba esa mezcla; ahora la lectura tambien es defensiva.
4. El catalogo semilla de obras nuevas usa solo datos neutros `EJ-*`, zonas
   genericas y umbrales ilustrativos. No contiene nombres ni codigos reales.
5. La release local se recompilo despues de alinear Expo 56. El manifiesto
   confirma `versionCode=4` y el paquete de TopoField. El AAB no se instalo
   durante esta sesion porque ADB no detecto el Galaxy.
6. Los listados de prismas y observaciones por estación descartan una
   referencia cuyo prisma pertenezca a otra obra; se mantiene visible un
   prisma legacy sin `project_id` cuando no contradice la obra de su estación.
   La regresión vive en `apps/backend/src/models/prisms.model.test.ts`.
7. Las consultas de visitas de montaje exigen además que la obra de la visita
   coincida con la obra de su estación, incluso antes de aplicar la migración
   027. El contrato backend de exportación quedó alineado con los instrumentos
   y lados definidos en `shared/types.ts`, incluyendo los protocolos F7.
8. La revisión defensiva detectó que los enlaces internos de monitoring no
   expresaban siempre la relación `ronda -> punto de control -> lectura`. Detalle,
   histórico, contexto de adjunto y exportación ahora exigen que esas relaciones
   compartan obra; los partes también comprueban que su `project_id` coincide
   con el de la ronda. Esto evita exponer o mezclar datos si una escritura
   directa deja una referencia cruzada en PostgreSQL.
9. La deduplicación de adjuntos de lectura tenía una ventana de carrera entre
   su consulta previa y el `INSERT`. La migración local preparada
   `028_reading_attachment_idempotency.sql` añade un índice único por
   `reading_id, storage_path` y falla deliberadamente si existen duplicados
   históricos; la API usa `ON CONFLICT DO NOTHING`. No se ha aplicado a
   Supabase ni se han borrado filas.
10. El deep link de `Parte de zona` podía mostrar el formulario a una cuenta
    supervisora o con membresía `read`, aunque el backend ya rechazaba la
    escritura. La pantalla ahora resuelve `allowed`, `loading` o `read-only`
    con la misma función de permisos efectivos y no muestra controles de alta
    cuando la ronda carece de permiso de escritura.
11. `canWriteProject` permitía un comportamiento fail-open para sesiones
    antiguas de `topografo` que no traían `projectAccess`: la interfaz mostraba
    controles aunque el mapa de permisos todavía no estuviera disponible. Se
    cambió a fail-closed; hasta recibir el mapa del servidor, solo `admin` o
    una membresía explícita `write` pueden habilitar escritura.
12. La misma deriva existía en el backend: `assertProjectWriteAccess` podía
    aceptar una sesión `topografo` que conservara `projectIds` pero no trajera
    `projectAccess`. `f90c995` la cierra: toda escritura de topógrafo exige el
    mapa efectivo y el nivel `write`; si falta, devuelve `PROJECT_ACCESS_REQUIRED`.
    Se añadió regresión en `apps/backend/src/lib/access-control.test.ts`.

13. El formulario móvil de `fissure_witness` exigía una foto, pero la interfaz
    la etiquetaba como opcional y enviaba la unidad por defecto `mm` aunque el
    registro solo contiene evidencia fotográfica. Se corrigió con
    `getReadingCaptureCopy`: la foto es obligatoria, la unidad queda oculta y
    el payload envía `unit: null`; las lecturas escalares mantienen su unidad.
    La regresión está en
    `apps/mobile/lib/__tests__/monitoring-reading-form.test.ts`.

14. El sincronizador offline de evidencias de montaje omitía el
    `clientRequestId` que exige `mountingEvidenceSchema`. Después de recuperar
    red, esa evidencia podía quedar en `error` aunque la foto y la visita
    estuvieran bien encoladas. `syncMountingEvidence` ahora reenvía el UUID
    original y la regresión comprueba el cuerpo del POST.

## Evidencia local

```text
> @topofield/backend@1.0.0 build
> tsc -p tsconfig.json

ℹ tests 96
ℹ pass 96
ℹ fail 0

Test Suites: 18 passed, 18 total
Tests:       78 passed, 78 total

check-docs: 38 documentos revisados en raíz y docs/.

Sin errores ni avisos.

BUILD SUCCESSFUL in 17m 15s
bundletool_exit=0
jarsigner_exit=0
android:versionCode="4"
package="com.ciudadanoinusual.topofield"
Propietario: CN=TopoField Android Release, OU=Mobile, O=TopoField, C=ES
```

La verificacion `jarsigner -verify -strict` mantiene el aviso de certificado
local autofirmado y ausencia de timestamp. Esto es compatible con una firma
local de desarrollo controlado, pero no es una validacion de Play Store.

## Pendientes que no se pueden cerrar localmente

- E2E en Galaxy: lectura, foto, reinicio, reconexion, outbox y duplicados.
- Prueba real de parte parcial, cierre y exportacion con datos autorizados.
- Aplicar la migracion 027 y desplegar las visitas de montaje, si se autoriza.
- Revisar y aplicar la migracion 028 solo despues de comprobar en Supabase que
  no existen duplicados historicos de adjuntos; no se ha ejecutado remotamente.
- Piloto con segundo usuario/dispositivo.
- Dos jornadas observadas y cinco a ocho entrevistas.
- Revisar las dos vulnerabilidades moderadas transitivas de `uuid` sin usar
  `npm audit fix --force`, porque la solucion propuesta degrada `exceljs`.

La comprobación no destructiva `npm audit fix --workspace apps/backend
--dry-run --json` confirma que no hay cambios de actualización seguros: el
remedio propuesto instala `exceljs@3.4.0` (`isSemVerMajor: true`) y la cadena
vulnerable procede de `exceljs/node_modules/uuid@8.3.2`. El exportador recibe
datos ya validados y no expone una ruta de ejecución de UUID v3/v5/v6 con
buffers controlados por el usuario; se mantiene la dependencia actual hasta
probar una sustitución compatible de `exceljs`.

La auditoria directa, con y sin dependencias de desarrollo, devuelve el mismo
resultado: `2 moderate`, `0 high`, `0 critical`; el remedio disponible elimina
paquetes transitivos de Express durante el dry-run y propone degradar
`exceljs`, por lo que no se aplico. La vulnerabilidad afectada esta en
`uuid@8.3.2` anidado bajo `exceljs`; la unica referencia de ExcelJS localizada
usa `uuid.v4`, no las variantes v3/v5/v6 que reciben un `Buffer` segun el aviso.
El riesgo no se ignora: queda abierto sustituir o actualizar ExcelJS con una
ruta compatible y volver a auditar antes del despliegue publico.

## Criterio de lectura

El bloque local esta endurecido y verificable. F5 sigue abierta: no se afirma
estabilidad de campo hasta disponer de evidencia del dispositivo y de uso real.
