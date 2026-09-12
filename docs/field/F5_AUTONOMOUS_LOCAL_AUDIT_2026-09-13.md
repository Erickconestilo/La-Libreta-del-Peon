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

## Evidencia local

```text
> @topofield/backend@1.0.0 build
> tsc -p tsconfig.json

ℹ tests 92
ℹ pass 92
ℹ fail 0

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

## Criterio de lectura

El bloque local esta endurecido y verificable. F5 sigue abierta: no se afirma
estabilidad de campo hasta disponer de evidencia del dispositivo y de uso real.
