# NEXT_CHAT_HANDOFF.md

## Contexto Rápido

- Proyecto: `C:\Users\guill\Documents\Aplicacion_Movil\topofield`.
- Repo remoto: `https://github.com/Erickconestilo/La-Libreta-del-Peon.git`.
- Rama actual: `main`.
- Backend Render: `https://la-libreta-del-peon-1.onrender.com/api/v1`.
- Dispositivo ADB: Galaxy S25 `SM_S938B`, id `R5CY21X6FLE` cuando `adb` este disponible.

## Últimos Commits Importantes

- `4b6af89` - lector offline de guías PDF renderizadas.
- `748288f` - icono de app libreta negra con mira amarilla.
- `805fb61` - croquis de prismas por estación y foto de prisma.
- `6a494de` - commit vacío para intentar forzar redeploy Render.
- `e5c87d4` - health expone commit Render y forzó redeploy real del backend.
- `10c91b8` - hardening backend: auth local por tabla `users`, rutas GET con token invitado, rate limit, guardas de scripts y migración `011`.
- `3e721a1` - hardening móvil: token en SecureStore, API production solo HTTPS, CORS restringido, permisos Android reducidos y aviso antes de abrir Google Maps externo.
- `02b0102` - guía más clara: manuales pulsables y fichas rápidas como lectura directa.
- `32b825d` - guía con búsqueda/agrupación, mensajes internos por estación y propuestas de estacionamiento provisional como incidencias.
- `af21658` - hardening backend de mensajes/incidencias: creación devuelve fila exacta y `photoUrl` arbitrario queda bloqueado.
- `416840d` - deploy backend reproducible: `npm ci` + `apps/backend/package-lock.json`.
- `13e7b8b` - documentación de QA, handoff y auditoría de seguridad.
- Commit posterior - validación centralizada de UUIDs en rutas backend para evitar errores SQL por params/query malformados.
- `c33e812` - hardening por proyecto, DTO público visitante, Guías/Mapas/Conversación y croquis con pinza.
- `5c5752c` - corrige scope de topógrafo en listado de mensajes de estación.
- `0a4f523` - corrige `GET /incidents?stationId=...&status=open` cualificando columnas `i.*`.
- `7dfa919` - documenta QA topógrafo y prioridades de APIs no climáticas.

## APK Actual

- EAS build: `71a232a3-2f87-4e85-a71e-75ad0681269a`.
- URL APK: https://expo.dev/artifacts/eas/f2RvG2T6oYbB47KVm1cQ4U.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-71a232a3-preview.apk`.
- Instalado en Galaxy por ADB con resultado `Success`.
- Commit incluido en APK: `59878ef93985c4f47070649224100d0e92d8c425`.
- Incluye pestañas `Obras`, `Mapas`, `Conversación`, `Guías`, `Perfil`, croquis con pinza, token técnico corregido y hardening móvil vigente.
- QA visitante y topógrafo validada en Galaxy; no lanzar otra EAS salvo cambio móvil real.

## APK Anterior

- EAS build anterior: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`.
- URL APK anterior: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- Archivo local anterior: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`.

## Lo Que Ya Está Hecho

- App móvil entra por obras y luego muestra estacionamientos.
- Guías `Guía Leica de estación` y `Nivel Leica LS10` están dentro del APK como páginas JPG optimizadas.
- Icono, favicon, adaptive icon y splash están actualizados.
- Detalle de estación tiene foto principal, memoria visual, notas editables y datos técnicos colapsados.
- Mapa evita crash si no hay Google Maps API key.
- Croquis de prismas usa `react-native-svg`, ángulo horizontal y distancia inclinada.
- Al tocar un prisma se muestra código, estado, distancia, ángulo, observaciones, última lectura, constante y foto.
- Backend local compila con endpoint `PATCH /prisms/:prismId/photo`.
- Backend local compila con validación UUID previa a SQL en rutas de estaciones, proyectos, guía, prismas, incidencias e historial.
- Render público verificado en `0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- Galaxy validado por ADB como visitante: Obras, Mapas, Guías, Perfil y Conversación sin pantalla blanca ni crash.
- Galaxy validado con rol `topografo`: token técnico, mensajes internos, propuesta provisional, foto de prisma y foto de obra.
- Los flujos internos de mensajes/propuestas quedan restringidos a `admin` y `topografo`; `visitante` no los ve.

## Estado Backend Render

Render público verificado el 2026-06-01:

- `GET /health`: 200 con `commit: 0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`
- `GET /projects` sin token: 401
- `GET /guide-entries` sin token: 401
- `GET /prisms/coverage/CN1` sin token: 401
- `GET /projects` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /guide-entries` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /prisms/coverage/CN1` con `GUEST_PUBLIC_TOKEN`: 200
- `PATCH /prisms/:prismId/photo` sin token: 401, no 404
- `POST /uploads/photos/sign` sin token: 401, no 404
- `GET /incidents?stationId=...&status=open` corregido tras el fallo de SQL ambiguo.

Interpretación: el bloqueo de backend antiguo queda resuelto. Las rutas protegidas existen y la escritura real ya fue probada con sesión `topografo` en Galaxy.

Estado actual: Render publica el backend usado para la QA topógrafo y el fix de incidencias `0a4f523`.

## Hardening Backend Hecho Localmente

- Commit de código: `10c91b8`.
- Migración `011_change_logs_project_entity.sql` aplicada en la BD actual para permitir `entity_type = 'project'`.
- `GET /projects`, `GET /guide-entries` y `GET /prisms/coverage/CN1` ahora requieren `Authorization`. Sin token responden 401; con `GUEST_PUBLIC_TOKEN` responden 200.
- El APK actual ya envía `GUEST_PUBLIC_TOKEN`, por lo que las lecturas visitantes deberían seguir funcionando tras redeploy.
- `PATCH /projects/:id/photo` queda cubierto por `verify:guide-admin`.
- Scripts de escritura contra producción quedan bloqueados salvo `TOPOFIELD_ALLOW_PRODUCTION_WRITE=<script>`.
- Verificado localmente: `npm run build --workspace apps/backend`, `npx tsc --noEmit --project apps/mobile/tsconfig.json`, `npm run verify:guide-admin --workspace apps/backend`, `npm audit --workspace apps/backend --json`.

Confirmado tras push/deploy: Render expone `0a4f523` y las rutas GET ya exigen token.

## Decisión Datos QA

- Se dejan como trazabilidad aceptada:
  - Mensaje QA: `e1037d58-f6e6-42c2-a222-c8e8fc389003`.
  - Propuesta provisional QA: `1f8153e3-d956-48c7-9ad6-00c0322c16cf`.
- Motivo: validan escritura real end to end y no son visibles para `visitante`.
- Si se limpian más adelante, usar IDs exactos y registrar la acción; no borrar por texto `QA`.

## Cambios móviles recientes y APK actual

- `apps/mobile/app/guide/[manualId].tsx`: el lector de guías deja de renderizar todas las páginas en una lista; ahora muestra una página cada vez con navegación, zoom y arrastre.
- `apps/mobile/components/prism-sketch.tsx`: el croquis mantiene una ventana fija, permite pan cuando hay zoom y los botones de zoom centran el prisma seleccionado cuando existe.
- `apps/mobile/app/(tabs)/_layout.tsx`: la pestaña `Conversación` pasa a llamarse `Bitácora`.
- `apps/mobile/app/(tabs)/conversations.tsx`: la pantalla ahora muestra una bitácora de notas, incidencias y mensajes con fecha/hora.
- `apps/mobile/hooks/use-station-messages.ts` y `apps/mobile/hooks/use-incidents.ts`: hooks de feed reciente para bitácora.
- Backend local: nuevo `GET /api/v1/stations/messages` para mensajes recientes con scope por proyecto.
- Verificado: `npm run build --workspace apps/backend` y `npx tsc --noEmit --project apps/mobile/tsconfig.json`.
- EAS preview Android `cdf499a0-0fef-4ccd-856e-2952ded918ee` fue cancelado porque quedó obsoleto antes de compilar tras añadir Bitácora.
- EAS preview Android anterior `a8ab7d91-abd4-4d74-a445-641ee09e7b73` quedó obsoleto por el cambio posterior de iconos.
- EAS preview Android actual: `2416dd4a-27a2-47ac-bdf2-5933af2d83d4`, estado `FINISHED`, commit `983f481eb7cc74b565256987d32e937a6987a855`.
- APK actual: https://expo.dev/artifacts/eas/5stxhvFJC7q6yr86WGKjco.apk
- APK local descargada: `C:\Users\guill\Downloads\topofield-2416dd4a-icons-bitacora.apk` (`120299919` bytes).
- Incluye: tab `Bitácora` con icono de brújula (`explore`) y app icon/splash/favicon reemplazados por brújula/topografía generada localmente.
- Nuevo script móvil: `npm run generate:icons --workspace apps/mobile`, genera `icon.png`, adaptive icon Android, monochrome, favicon y splash sin usar imágenes externas.
- Verificado tras el cambio de iconos: `npx tsc --noEmit --project apps/mobile/tsconfig.json` y `git diff --check`.
- APK instalada por ADB en Galaxy `SM_S938B / R5CY21X6FLE` el 2026-06-02.
- Mini-QA Galaxy:
  - App abre sin crash; `logcat` filtrado solo muestra `ReactNativeJS: Running "main"`.
  - `Bitácora` muestra icono de brújula en tab y visitante queda bloqueado con `Acceso de equipo`.
  - `Guías` carga tarjetas offline; lector Leica abre una página cada vez y navegación `1/20 -> 2/20` funciona.
  - Perfil tenía token técnico viejo inválido guardado; se limpió con `Volver a visitante` y quedó `Modo visitante`.
- Sesión `topografo`:
  - Tokens técnicos regenerados con `TOPOFIELD_ALLOW_PRODUCTION_WRITE=create-session-tokens`.
  - Token `topografo` validado contra Render `GET /auth/me`: rol `topografo`.
  - ADB `input text` completo/tramos largos truncaba o alteraba el JWT; se introdujo carácter a carácter.
  - Perfil muestra `Topógrafo`, cuenta `topofield-topografo@topofield.local`.
  - Tras `force-stop` y relanzar app, Perfil sigue en `Topógrafo`; sesión persistida en el Galaxy.
  - `logcat` tras relanzar solo muestra `ReactNativeJS: Running "main"`.
  - Nota: el access token técnico caduca; si se prueban fotos mucho más tarde y aparece `Invalid authentication token`, regenerar/pegar token o implementar refresh de sesión.
- Pendiente real: validar en Galaxy que las páginas de guía se leen mejor y que un prisma alejado, por ejemplo `626`, se puede seleccionar, ampliar y recorrer sin quedar limitado al centro.
- Backend ya desplegado en `c866c73`; `GET /stations/messages` validado: anónimo 401, visitante 403, topógrafo 200.
- Pendiente real adicional: QA topógrafo de Bitácora y croquis del prisma `626`.

## Siguiente Paso Recomendado

1. Probar `Bitácora` como topógrafo: notas/incidencias/mensajes con fecha/hora.
2. Probar croquis: seleccionar prisma alejado, por ejemplo `626`, zoom y arrastre por todo el croquis.
3. Si se prueban fotos más tarde y el token caducó, regenerar sesión técnica antes de culpar al flujo de fotos.
4. Mantener pendiente la matriz real usuario-obra en `PROJECT_MEMBERSHIPS_MATRIX.md` antes de crear usuarios reales.

## Estado Render Tras Último Push

- `GET /health`: `0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- Rutas visitante principales con token: 200.
- Rutas GET protegidas sin token: 401.
- Mensajes de estación: admin 200, topógrafo 200, visitante 403.
- Incidencias filtradas por estación/estado: corregidas tras `0a4f523`.
- DTO visitante: no expone `createdBy` en estaciones/guías ni `sourceFiles` en prismas.

## Nota Técnica Sobre Prismas

No hay coordenadas absolutas de prismas. Hay 171 prismas y 1889 observaciones, con ángulo horizontal y distancia inclinada, pero 0 prismas con coordenadas propias. Por eso el croquis es correcto como vista operativa desde la estación, no como mapa geográfico.
