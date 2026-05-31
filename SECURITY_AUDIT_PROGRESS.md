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

## Verificación Realizada

- `npm run build` en backend: OK.
- `npx tsc --noEmit --project apps/mobile/tsconfig.json`: OK.
- `npm ci --dry-run` en backend: OK.
- `npm audit --workspaces=false` en backend: 0 vulnerabilidades.
- `npm audit --workspace apps/mobile`: 11 vulnerabilidades moderadas en tooling Expo/xcode/uuid, sin high/critical.
- Pruebas locales previas: visitante no puede leer mensajes/incidencias internas; admin temporal pudo crear mensaje y propuesta provisional.
- Revisión de rutas: mensajes (`/stations/:id/messages`), incidencias (`/incidents`) y firma de subida (`/uploads/photos/sign`) requieren `admin` o `topografo`.
- QA Galaxy APK `247704f1`: Guía, Obra, detalle de estación, mensajes/provisionales/croquis visibles sin errores JS/nativos. Escritura real queda bloqueada por Render antiguo.

## Resultado Actual de la Auditoría

- No hay hallazgos críticos o altos validados en el código revisado.
- No se encontró bypass directo para que `visitante` escriba mensajes, incidencias, fotos o guía.
- La superficie de riesgo principal no es un bug puntual, sino una decisión de producto: qué datos se consideran públicos en modo visitante.
- El escaneo exhaustivo formal quedó limitado por presupuesto del objetivo anterior; esta fase deja hallazgos priorizados y verificables, no una certificación completa.

## Hallazgos y Riesgos Vigentes

### Riesgo 1 - Visitante no es privado

`GUEST_PUBLIC_TOKEN` está dentro de la APK, por tanto debe tratarse como público. Actualmente `visitante` puede leer obras, estaciones, coordenadas, notas, fotos públicas y prismas permitidos.

Decisión pendiente: confirmar si ese nivel de lectura pública es aceptable. Si no lo es, hay que crear DTOs públicos reducidos o ACL por proyecto/equipo.

### Riesgo 2 - Fotos públicas

Supabase Storage está configurado como bucket público. Quitar una URL de la base de datos no revoca una URL ya copiada.

Propuesta: pasar a bucket privado con URLs firmadas de lectura cuando la app deje de ser solo MVP interno.

### Riesgo 3 - IDOR/BOLA entre topógrafos

Hoy un `topografo` autorizado puede mutar objetos por ID si conoce el UUID. No existe todavía pertenencia por proyecto/equipo.

Propuesta: añadir tabla de asignaciones `project_members` o permisos por obra antes de uso con varios equipos reales.

### Riesgo 4 - Moderados en tooling móvil

Las alertas vienen de Expo/config tooling y `uuid` vía `xcode`. No conviene aplicar el fix sugerido automáticamente porque propone saltos mayores/downgrade incompatible.

Propuesta: seguir ruta oficial de patch de Expo SDK y revisar advisories antes de producción abierta.

### Riesgo 5 - Validación de UUIDs en parámetros

Algunas rutas confían en PostgreSQL para castear UUIDs. Un UUID malformado puede acabar como error 500 genérico en vez de 400 controlado.

Impacto actual: bajo, porque no expone stack trace y hay rate limit. Propuesta: añadir validación centralizada de params UUID para mejorar robustez y logs.

## Propuestas Backend

- Crear DTO público para visitante: ocultar `createdBy`, `uploadedBy`, `storagePath`, `sourceFiles`, observaciones crudas y notas internas.
- Separar notas públicas de notas internas en estaciones.
- Añadir permisos por obra/equipo antes de entregar tokens a más personas.
- Verificar existencia del objeto en Supabase antes de vincular una foto como evidencia.
- Añadir endpoint admin para resolver incidencias/propuestas y convertir una propuesta provisional en estación real.
- Validar UUIDs de params y queries antes de llegar al modelo SQL.
- Mantener `morgan` fuera de producción o reducirlo a logs estructurados sin ruido cuando la app tenga usuarios reales.

## Propuestas Frontend

- Mostrar claramente si se está en modo visitante, topógrafo o admin.
- En modo visitante, ocultar tarjetas internas en vez de mostrar errores técnicos.
- En Guía, mantener búsqueda y agrupación por instrumento; añadir favoritos o “usadas recientemente” si crece el contenido.
- En estacionamiento, separar visualmente: datos oficiales, mensajes internos, propuestas provisionales y memoria visual.
- Para croquis de prismas, añadir zoom/pan o mapa operativo más adelante; ahora el croquis es correcto como vista angular/distancia, no como mapa geográfico.
- En Perfil, nunca mostrar el token guardado; ya se usa `SecureStore`, mantenerlo así.

## Bloqueos Operativos

- Render público sigue en `3e721a1`; debe redeployarse hasta `13e7b8b` o al menos `416840d`/`af21658`.
- APK EAS nueva ya está instalada; queda probar escritura real de mensajes, propuesta provisional, foto de prisma y token técnico tras el redeploy.
