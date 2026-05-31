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

## Resultado Actual de la Auditoría

- No hay hallazgos críticos o altos validados en el código revisado tras la última tanda.
- Se corrigió una clase de IDOR entre proyectos para roles de operación.
- No se encontró bypass directo para que `visitante` escriba mensajes, incidencias, fotos o guía.
- Riesgo restante principal: decidir si las coordenadas/fotos públicas son aceptables para visitante y definir política de Storage firmado.
- La revisión queda en estado de auditoría aplicada (no certificación), con pasos de hardening pendiente.

## Hallazgos y Riesgos Vigentes

### Riesgo 1 - Visitante no es privado

`GUEST_PUBLIC_TOKEN` está dentro de la APK, por tanto debe tratarse como público. Actualmente `visitante` puede leer obras, estaciones, coordenadas, notas públicas, fotos públicas y prismas permitidos.

Estado: DTO público inicial aplicado para ocultar metadatos internos. Decisión pendiente: confirmar si coordenadas, notas y fotos deben seguir siendo públicas para visitante.

### Riesgo 2 - Fotos públicas

Supabase Storage está configurado como bucket público. Quitar una URL de la base de datos no revoca una URL ya copiada.

Propuesta: pasar a bucket privado con URLs firmadas de lectura cuando la app deje de ser solo MVP interno.

### Riesgo 3 - IDOR/BOLA entre topógrafos

Ahora mitigado parcialmente: el acceso en backend se filtra por `projectIds` del usuario.

Estado actual: `project_memberships` existe y se aplica en scope; pendiente validar la distribución real de membresías (evitar auto-asignación global de topógrafos si no procede).

### Riesgo 4 - Moderados en tooling móvil

Las alertas vienen de Expo/config tooling y `uuid` vía `xcode`. No conviene aplicar el fix sugerido automáticamente porque propone saltos mayores/downgrade incompatible.

Propuesta: seguir ruta oficial de patch de Expo SDK y revisar advisories antes de producción abierta.

### Riesgo 5 - Validación de UUIDs en parámetros

Algunas rutas confían en PostgreSQL para castear UUIDs. Un UUID malformado puede acabar como error 500 genérico en vez de 400 controlado.

Estado: mitigado en código con middleware centralizado de UUID. Pendiente de verificar deploy en producción.

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
- En Guía, mantener búsqueda y agrupación por instrumento; añadir favoritos o “usadas recientemente” si crece el contenido.
- En estacionamiento, separar visualmente: datos oficiales, mensajes internos, propuestas provisionales y memoria visual.
- Para croquis de prismas, añadir más tolerancia de interacción y límites de zoom ya aplicados; considerar librería de mapa operativo si se decide georreferencia real en fase posterior.
- En Perfil, nunca mostrar el token guardado; ya se usa `SecureStore`, mantenerlo así.

## Estado de Cierre (fase 3 de auditoría local)

- Alcance técnico completado: scope por proyecto, autorización consistente y hardening de mutaciones.
- Pendiente de producto: confirmar reglas de privacidad visitante y rollout de Storage firmado antes de exponer a más obra/usuarios.
- Pendiente operativo: redeploy de Render con commit actual, luego validar escritura real en Galaxy con token técnico.

## Bloqueos Operativos

- Render público aún debe mostrar commit posterior al actual para validar todas las rutas con cambios de seguridad.
- APK EAS nueva ya está instalada; queda probar escritura real de mensajes, propuesta provisional, foto de prisma y token técnico tras el redeploy.
