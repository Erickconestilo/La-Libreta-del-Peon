# Auditoría de Seguridad TopoField - Progreso 2026-05-31

## Alcance Revisado

- Backend Express, rutas `/api/v1`, middleware de auth/roles, rate limit y errores.
- Modelos SQL con `pg`, validaciones Zod, fotos Supabase Storage, incidencias y mensajes de estación.
- Cliente móvil: API fetch, sesión/token, subida de fotos, guía, estación y prismas.
- Dependencias npm backend/mobile.
- Deploy backend Render/Docker.

## Cambios de Seguridad Aplicados

- Backend valida usuarios Supabase contra tabla local `users`; no confía en `user_metadata`.
- Rutas GET principales ya requieren `Authorization`; visitante usa token público solo para GET.
- Mensajes de estación e incidencias/propuestas provisionales quedan restringidos a `admin` y `topografo`.
- `photoUrl` arbitrario fue eliminado de creación de estación/incidencia; las fotos se vinculan por `storagePath` generado para la entidad.
- Validación de paths de foto exige prefijo por entidad: `stations/:id`, `projects/:id`, `prisms/:id`.
- Scripts de escritura contra base probable de producción requieren `TOPOFIELD_ALLOW_PRODUCTION_WRITE`.
- Docker/Render backend cambian de `npm install` a `npm ci` con lockfile propio para despliegues reproducibles.
- Rutas con UUID en params/query validan el formato antes de llegar a SQL; esto evita depender del cast de PostgreSQL para entradas malformadas.
- Modelo de seguridad por alcance de proyecto implementado para estaciones, prismas, proyectos, mensajes y fotos de estación.
- Nuevo flujo de autorización: `project_memberships` + `projectIds` en usuario autenticado; topógrafo solo opera sobre obras asignadas.
- `getActorProjectScope` y `assertProjectAccess` aplicados en controladores de lectura/escritura para evitar acceso cruzado por UUID.
- DTO público inicial para `visitante`: estaciones, fotos de estación, prismas, observaciones, cobertura y guías ya omiten campos internos no necesarios.
- Migración `013_project_memberships.sql` aplicada y script local `create:session-tokens` añadido para generar sesiones técnicas de QA.

## Verificación Realizada

- `npm run build --workspace apps/backend`: OK.
- `npx tsc --noEmit --project apps/mobile/tsconfig.json`: OK.
- `npm run build --workspace apps/backend` y `npx tsc --noEmit --project apps/mobile/tsconfig.json`: OK.
- `npm audit --workspace apps/backend --json`: sin vulnerabilidades.
- `npm audit --workspace apps/mobile --json`: 11 vulnerabilidades moderadas en tooling Expo/xcode/uuid, sin high/critical.
- Revisión de rutas objetivo: mensajes (`/stations/:id/messages`), incidencias (`/incidents`) y firma de subida (`/uploads/photos/sign`) requieren `admin` o `topografo`.
- QA Galaxy real quedó limitada por despliegue antiguo de Render al momento de validar escritura en backend; lectura de guías/obras ya valida cambios de permisos y no cae por 404.
- Continuación auditoría Fase 1 backend: Render responde `GET /health` con commit `5c5752c9e7d6417e759165c0a45061fb8f10167d`.
- Producción sin token: `/projects`, `/stations`, `/guide-entries`, `/prisms/coverage/CN1` e `/incidents` devuelven `401`.
- Producción con `GUEST_PUBLIC_TOKEN`: `/projects`, `/stations`, `/guide-entries` y `/prisms/coverage/CN1` devuelven `200`; `/incidents` devuelve `403`.
- Producción con token visitante en escritura: `POST /uploads/photos/sign`, `POST /guide-entries` y `PATCH /projects/:id/photo` devuelven `401`.
- UUID malformados en rutas públicas verificadas devuelven `400` antes de SQL.
- Arreglo correcto aplicado localmente tras decidir que `visitante` puede seguir leyendo datos públicos: `change-logs` recibe `projectScope`, prismas por estación validan la estación como ancla de autorización, y foto de proyecto para `topografo` corrige alias SQL.
- Verificación post-arreglo local: `npm run build --workspace apps/backend` OK, `npm audit --workspace apps/backend --json` sin vulnerabilidades, y consultas de solo lectura a `listChangeLogs`, `listPrismsByStationId` y `listPrismObservationsByStationId` ejecutan sin error SQL.
- Commit `beeef8a2820947594657cf11fafa897a31571e47` empujado y desplegado en Render.
- Smoke QA Render tras deploy: visitante mantiene `200` en lecturas públicas y `403` en incidencias; anónimo mantiene `401`; `topografo` obtiene `200` en `/auth/me`, `/change-logs`, `/stations` y `/stations/:id/prisms`.

## Resultado Actual de la Auditoría

- No hay hallazgos críticos o altos validados en el código revisado tras la última tanda.
- Se corrigió una clase de IDOR entre proyectos para roles de operación.
- No se encontró bypass directo para que `visitante` escriba mensajes, incidencias, fotos o guía.
- Decisión de producto cerrada para Fase 1: `visitante` puede ver coordenadas, notas y fotos públicas; esto no se trata como vulnerabilidad del MVP.
- Hallazgos corregidos, empujados y verificados en Render: historial de cambios con scope por proyecto para `topografo`, endpoints de prismas por estación anclados a la obra de la estación, y bug funcional de foto de proyecto para `topografo` por alias SQL.
- Hallazgo de membresías acotado operativamente: `PROJECT_MEMBERSHIPS_MATRIX.md` deja claro que la auto-asignación global solo aplica al usuario técnico de QA y no es política para usuarios reales. Sigue pendiente rellenar la matriz nominal antes de alta real de usuarios.
- La revisión queda en estado de auditoría aplicada (no certificación), con pasos de hardening pendiente.

## Actualización de Auditoría - 2026-06-05

- Hallazgo funcional/security corregido en `c7bdea4`: `PATCH /stations/:stationId/photo` y `/notes` fallaban para `topografo` porque el scope generaba `s.project_id` pero la query usaba `FROM stations` sin alias. Ahora usan `FROM stations s`.
- Hallazgo de scope corregido en `c7bdea4`: `/prisms/coverage/:groupCode` agrupaba mal el `OR`, permitiendo que una coincidencia exacta por `station_code` no quedara cubierta por el scope por proyecto. Ahora aplica `(station_code exacto OR prefijo) AND scope`.
- Verificación:
  - `npm run build --workspace apps/backend`: OK.
  - `npx tsc --noEmit --project apps/mobile/tsconfig.json`: OK.
  - SQL no destructivo con scope de topógrafo: foto/notas de estación devuelven fila.
  - Render health en `c7bdea4ccb2f9fcc7eba231c6b400c29de2a8ce9`.
  - Smoke topógrafo no destructivo: firma de foto 201, `PATCH /stations/:id/photo` 200 y `/notes` 200.

## Hallazgos y Riesgos Vigentes

### Riesgo 1 - Visitante no es privado

`GUEST_PUBLIC_TOKEN` está dentro de la APK, por tanto debe tratarse como público. Actualmente `visitante` puede leer obras, estaciones, coordenadas, notas públicas, fotos públicas y prismas permitidos.

Estado: DTO público inicial aplicado para ocultar metadatos internos. Confirmado por producto: coordenadas, notas y fotos pueden seguir siendo públicas para `visitante` en Fase 1.

### Riesgo 2 - Fotos públicas

Supabase Storage está configurado como bucket público. Quitar una URL de la base de datos no revoca una URL ya copiada.

Propuesta: pasar a bucket privado con URLs firmadas de lectura cuando la app deje de ser solo MVP interno.

### Riesgo 3 - IDOR/BOLA entre topógrafos

Ahora mitigado parcialmente: el acceso en backend se filtra por `projectIds` del usuario.

Estado actual: `project_memberships` existe y se aplica en scope. La política operativa queda documentada en `PROJECT_MEMBERSHIPS_MATRIX.md`; falta rellenar la matriz nominal antes de usuarios reales.

### Riesgo 4 - Moderados en tooling móvil

Las alertas vienen de Expo/config tooling y `uuid` vía `xcode`. No conviene aplicar el fix sugerido automáticamente porque propone saltos mayores/downgrade incompatible.

Propuesta: seguir ruta oficial de patch de Expo SDK y revisar advisories antes de producción abierta.

### Riesgo 5 - Validación de UUIDs en parámetros

Algunas rutas confían en PostgreSQL para castear UUIDs. Un UUID malformado puede acabar como error 500 genérico en vez de 400 controlado.

Estado: mitigado en código con middleware centralizado de UUID y verificado en producción en rutas públicas revisadas.

### Riesgo 6 - Historial sin scope por proyecto

`GET /change-logs` está restringido a `admin` y `topografo`, pero el modelo no filtra por `project_memberships`.
Si en el futuro se restringen topógrafos a obras concretas, un topógrafo podría ver historial de cambios de otras obras, incluyendo valores antiguos/nuevos de notas, fotos o mensajes registrados en logs.

Estado: corregido y desplegado. El `projectScope` se resuelve por `entity_type` con joins a `stations`, `prisms` y `projects`. Las entradas `guide_entry` se tratan como globales porque el usuario confirmó que el contenido visible para visitante no es problema.
QA: `topografo` recibe `200` en `/change-logs`.

### Riesgo 7 - Scope de prismas por estación

Los endpoints de prismas de una estación reciben `stationId`, pero el SQL filtra por `p.project_id` del prisma. Lo correcto para evitar BOLA es validar también la obra de la estación solicitada.
Con datos actuales parece coherente, pero el control debe estar en el ancla de la ruta.

Estado: corregido y desplegado. El controlador valida `getStationById(stationId, projectScope)` y las queries por estación filtran por `s.project_id`.
QA: `topografo` recibe `200` en `/stations/:id/prisms`.

### Riesgo 7b - Scope de cobertura de prismas por grupo

`GET /prisms/coverage/:groupCode` tenía una condición `OR` sin agrupar. PostgreSQL podía interpretar `station_code = grupo OR (starts_with(...) AND scope)`, dejando la coincidencia exacta fuera del scope por proyecto.

Estado: corregido y desplegado en `c7bdea4`; ahora el scope se aplica a ambas ramas del `OR`.

### Riesgo 8 - Membresías iniciales demasiado amplias

La migración `013_project_memberships.sql` asigna todos los topógrafos existentes a todas las obras. Esto sirve para no romper QA, pero no demuestra aislamiento real entre equipos.

Estado: decisión operativa documentada en `PROJECT_MEMBERSHIPS_MATRIX.md`. El usuario técnico `topofield-topografo@topofield.local` puede seguir con acceso a todas las obras para QA. Ningún usuario real debe copiar ese patrón; antes de alta real hay que rellenar la matriz usuario-obra y aplicar membresías explícitas.

### Riesgo 9 - Bug funcional en foto de proyecto para topógrafo

`updateProjectPhoto` reutiliza una condición con alias `p.id`, pero la query de bloqueo usa `FROM projects` sin alias. Para `admin` no aparece porque no hay scope; para `topografo` puede acabar en 500.

Estado: corregido y validado en Galaxy con `topografo` mediante subida firmada real + `PATCH /projects/:id/photo`; la foto QA se restauró después.

## Propuestas Backend

- Completar el hardening de privacidad de campo: separar datos públicos, datos internos y datos administrativos cuando el producto lo necesite.
- Ajustar la política de `project_memberships` para que no sea de acceso implícito global si el modelo de negocio lo exige.
- Definir el próximo paso de aprobación:
  - opción corta: mantener propuestas internas visibles solo a roles y no públicas.
  - opción robusta: separar endpoints de lectura pública y privada con DTOs dedicados.
- Mantener y ampliar validación centralizada de params/query si aparecen nuevas rutas con UUID.
- Añadir endpoint admin para resolver incidencias/propuestas y convertir una propuesta provisional en estación real.

## Propuestas Frontend

- Mostrar claramente si se está en modo visitante, topógrafo o admin.
- En modo visitante, ocultar tarjetas internas/acciones y mostrar flujo operativo simplificado.
- En Guía, mantener los manuales offline como entrada principal; añadir favoritos o usadas recientemente solo si crece el contenido.
- En estacionamiento, separar visualmente: datos oficiales, mensajes internos, propuestas provisionales y memoria visual.
- Para croquis de prismas, añadir más tolerancia de interacción y límites de zoom ya aplicados; considerar librería de mapa operativo si se decide georreferencia real en fase posterior.
- En Perfil, nunca mostrar el token guardado; ya se usa `SecureStore`, mantenerlo así.

## Estado de Cierre (fase 3 de auditoría local)

- Alcance técnico completado: scope por proyecto, autorización consistente y hardening de mutaciones.
- Pendiente de producto futuro: revisar Storage firmado si el producto deja de tratar fotos/coordenadas como públicas para visitante.
- Escritura real validada en Galaxy con token técnico: mensaje, propuesta provisional, foto de prisma y foto de obra.
- Pendiente operativo: rellenar la matriz real de `project_memberships` antes de usuarios reales.

## Bloqueos Operativos

- No lanzar otra EAS salvo cambio móvil real.
- No hay bloqueo técnico actual para QA validada; la siguiente decisión operativa es la matriz real de usuarios y obras.

## Actualización de Auditoría - 2026-06-07

- No aparecieron hallazgos nuevos en la verificación más reciente.
- Se añadió un smoke test repetible `verify:project-memberships` y quedó integrado en `npm run verify:pre-apk`.
- La sincronización real de la matriz técnica se ejecutó con la guarda `TOPOFIELD_ALLOW_PRODUCTION_WRITE=sync-project-memberships`; no produjo ampliación accidental de permisos.
- Estado de Render observado en la última comprobación local: `GET /health` seguía en `2fd2eb2fab825f3d9df84dfa631d037ac0608e67`.
- Riesgo operativo nuevo, no de seguridad: la cuota mensual de Android builds del plan free de Expo está agotada, así que la validación APK del código más reciente requiere build local o esperar al reset.
