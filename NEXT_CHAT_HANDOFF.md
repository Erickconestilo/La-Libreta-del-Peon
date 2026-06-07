# NEXT_CHAT_HANDOFF.md

## Contexto Rápido

- Proyecto: `C:\Users\guill\Documents\Aplicacion_Movil\topofield`.
- Repo remoto: `https://github.com/Erickconestilo/La-Libreta-del-Peon.git`.
- Rama actual: `main`.
- Backend Render: `https://la-libreta-del-peon-1.onrender.com/api/v1`.
- Dispositivo ADB: Galaxy S25 `SM_S938B`, id `R5CY21X6FLE` cuando `adb` este disponible.
- Estado actual: backend con script de matriz real de membresías (`npm run sync:project-memberships`) listo para operar en local.

## Para Continuar en Codex Cloud

- Leer primero este archivo, `QA_ANDROID_GALAXY.md`, `PLAN.md`, `SECURITY_AUDIT_PROGRESS.md`, `PROJECT_MEMBERSHIPS_MATRIX.md` y `AGENTS.md`.
- Nota de fecha actual (2026-06-07): el trabajo en curso prioriza `project_memberships` real por matriz usuario-obra; sin EAS todavía.
- Último commit funcional móvil: `e39a01d`, fix para que login/refresh por cuenta no manden un bearer viejo o visitante.
- Último commit funcional incluido en la APK instalada: `e39a01d`.
- Codex Cloud podrá trabajar sobre el repo y backend, pero no debe asumir acceso al Galaxy local, ADB, APK descargada ni `topofield-session-tokens.local`.
- Si se necesita QA móvil real, volver a este entorno local con el Galaxy conectado.
- No exponer ni pegar tokens en GitHub, docs ni respuestas. El archivo `topofield-session-tokens.local` queda local e ignorado por git.
- Próximo bloque recomendado: validar en campo la APK `01e691fc`: `Nueva obra` como admin, cambio admin/topógrafo si se entra con cuenta topógrafo, `Bitácora`, guías, fotos y croquis del prisma `626`.
- Nueva intención del usuario: empezar a meter datos reales trabajando con ambos roles `topografo` y `admin`.
- APK instalada actual: `01e691fc`; contiene multi-sesión técnica, creación de obra admin, Bitácora tipo chat, fixes de Guías/croquis y el fix de login por cuenta sin bearer viejo.
- Galaxy queda con sesión `admin` activa por correo/clave con refresh token. El usuario puede usar el móvil para crear datos como admin.
- No se guardan contraseñas en docs ni GitHub. Si se necesita recordatorio, usar canal privado del usuario; no commitear secretos.
- El usuario reportó el 2026-06-05 que la app se quedaba a menudo en `Cargando obras...` y que no pudo agregar fotos.
- Fix móvil aplicado y empujado:
  - `ce03884` añade timeout a `apiFetch` y a subidas de foto, y evita ocultar errores reales de `/projects` con fallback a `/stations`.
  - `c15a462` muestra recuperación si `Obras` tarda más de 7 s y desactiva retry silencioso global de React Query.
- Fix backend aplicado y empujado:
  - `c7bdea4` corrige `PATCH /stations/:id/photo` y `/notes` para `topografo` declarando alias `stations s`; también agrupa el `OR` en `/prisms/coverage/:groupCode` para respetar scope por obra.
- Render desplegado y verificado en `c7bdea4ccb2f9fcc7eba231c6b400c29de2a8ce9`.
- Smoke backend tras deploy: health 200, lecturas visitante 200, escritura sin token 401, y prueba topógrafo no destructiva OK (`/uploads/photos/sign` 201, `PATCH /stations/:id/photo` 200, `PATCH /stations/:id/notes` 200).
- Estado repo/backend verificado el 2026-06-07:
  - `origin/main` y local en `2fd2eb2fab825f3d9df84dfa631d037ac0608e67`.
  - Render `GET /health` publica ese mismo commit.
  - `npm run verify:pre-apk` pasa completo: build backend, TypeScript móvil, `verify:project-memberships` y `expo export --platform android`.
- Commits posteriores relevantes al handoff anterior:
  - `14b8549` aplica scope real por `project_memberships` y añade `sync:project-memberships`.
  - `076e866` recupera lecturas públicas si hay sesión técnica inválida.
  - `b628573` añade pantalla móvil `daily-report`.
  - `2fd2eb2` añade `verify:project-memberships` como smoke test backend real.
- Estado actual de matriz técnica:
  - `topofield-topografo@topofield.local` queda limitado a `campus-nord` y `maragall` según `data/project-memberships.json`.
- Cambio local preparado y aún sin commit en esta sesión:
  - `package.json` añade script raíz `verify:pre-apk`.
  - Nuevo archivo `scripts/verify-pre-apk.mjs`.
- Build móvil nueva finalizada: EAS `6b0e7b85-fc46-4e3d-aa0e-0f74a2b29657`, commit `c15a462`.
- APK URL: https://expo.dev/artifacts/eas/edKpZXGBoibv1wP3LR1mUP.apk
- APK local: `C:\Users\guill\Downloads\topofield-6b0e7b85-loading-photo-fix.apk`.
- Instalada en Galaxy por ADB el 2026-06-06 con resultado `Success`.
- Mini-QA Galaxy tras instalar: app arranca, Obras carga, visibles `Campus Nord` y `Maragall`, sesión admin persistida, `logcat` limpio.
- El usuario reportó después el error móvil `Creating blobs from ArrayBuffer and ArrayBufferView are not supported` al intentar agregar fotos.
- Fix móvil aplicado y empujado:
  - `ac09f3a` elimina la ruta `Blob` en subida de fotos.
  - `pickAndCompressPhoto` devuelve un archivo local comprimido y las subidas usan `expo-file-system` `File.upload` con `PUT` al signed URL de Supabase Storage.
  - Afecta fotos de obra, foto principal de estación, galería de estación y foto de prisma.
  - Verificación local: `npx tsc --noEmit --project apps/mobile/tsconfig.json` OK; búsqueda confirma que no quedan `preparedPhoto.blob`, `blob()` ni `fetch(compressed.uri)` en rutas de foto.
- Build móvil actual finalizada: EAS `2d6ad87a-41d4-4774-838f-30f1e67d3c2f`, commit `ac09f3abe0c93db75ffb606322b6cdbcbe2cdd3f`.
- APK URL: https://expo.dev/artifacts/eas/6BhqtjX6KFRS9mfhFTDcfx.apk
- APK local: `C:\Users\guill\Downloads\topofield-2d6ad87a-photo-file-upload-fix.apk`.
- Instalada en Galaxy por ADB el 2026-06-06 con resultado `Success`.
- Mini-QA Galaxy tras instalar: app arranca, `Obras` carga, visibles `Campus Nord`, `Maragall`, `Nueva obra` y `Añadir imagen`; sesión admin persistida; `logcat` limpio.
- QA foto real de obra completada con usuario presente:
  - Obra usada: `Maragall`.
  - Se añadió imagen inicial.
  - Se cambió por otra imagen desde galería.
  - Se cambió de nuevo con foto tomada desde cámara.
  - Se quitó la imagen al final.
  - Resultado: sin error `Creating blobs from ArrayBuffer and ArrayBufferView are not supported`; `logcat` filtrado sin `ReactNativeJS` ni `AndroidRuntime`; backend confirma `Maragall hasImage=False` tras limpiar la prueba.
- Hallazgo posterior en pantalla de obra/estacionamientos: si queda una sesión técnica inválida, la app puede mostrar `Invalid authentication token` también en lecturas públicas como estaciones de una obra. Fix local preparado en `apps/mobile/lib/api.ts`: las lecturas públicas GET reintentan con `GUEST_PUBLIC_TOKEN` cuando el bearer técnico devuelve `401 INVALID_TOKEN`. Las escrituras siguen requiriendo revalidar sesión.

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
- `c866c73` - añade feed `Bitácora`, lector de guías corregido y croquis de prismas con pan/zoom.
- `983f481` - refresca iconos móviles: app icon de brújula y tab `Bitácora` con brújula.
- `333b2d0` - documenta instalación y mini-QA Galaxy de la APK refrescada.
- `0dc9c78` - documenta sesión persistida de topógrafo en Galaxy.
- `26f9dd2` - endurece sesión móvil con multi-sesión, aviso de expiración y revalidación.
- `275ae7d` - rediseña `Bitácora` como timeline tipo chat con etiquetas.
- `ce7ff12` - añade login por cuenta técnica y refresh token para sesiones móviles.
- `1ef2f3d` - corrige ajuste inicial de Guías y zoom/pan del croquis de prismas seleccionados.
- `035d247` - añade flujo admin de creación de obra: `POST /projects` y pantalla móvil `Nueva obra`.
- `e39a01d` - corrige login móvil por cuenta para que `/auth/login` y `/auth/refresh` no envíen un bearer viejo/inválido.
- `ce03884` - añade timeouts móviles para carga de campo y subidas de fotos.
- `c15a462` - muestra recuperación cuando `Obras` tarda demasiado y desactiva retry silencioso.
- `c7bdea4` - corrige scope backend de foto/notas de estación y cobertura de prismas.
- `ac09f3a` - sube fotos móviles desde archivo local con `File.upload`, sin `Blob`.

## APK Pendiente de Instalar

- EAS build: `6b0e7b85-fc46-4e3d-aa0e-0f74a2b29657`.
- Logs: https://expo.dev/accounts/ciudadanoinusual/projects/topofield/builds/6b0e7b85-fc46-4e3d-aa0e-0f74a2b29657
- APK: https://expo.dev/artifacts/eas/edKpZXGBoibv1wP3LR1mUP.apk
- APK local: `C:\Users\guill\Downloads\topofield-6b0e7b85-loading-photo-fix.apk`.
- Commit móvil incluido: `c15a462295ca9f8352245f54a1c676afd83e80c1`.
- Estado: `FINISHED`.
- Incluye:
  - timeout de API de 18 s con error visible,
  - timeout de subidas de fotos de 60 s,
  - botón `Reintentar` cuando Obras falla,
  - aviso si Obras tarda más de 7 s,
  - desactivación del retry automático silencioso de React Query.
- No incluye el commit backend `c7bdea4` dentro del APK, porque ese cambio vive en Render y ya está desplegado.
- Estado Galaxy: instalada por ADB y validada en arranque/Obras/logcat.
- Pendiente: probar foto real.

## APK Actual

- EAS build actual: `01e691fc-5e23-4c71-86ae-b1d06e37ec6c`.
- Logs: https://expo.dev/accounts/ciudadanoinusual/projects/topofield/builds/01e691fc-5e23-4c71-86ae-b1d06e37ec6c
- URL APK: https://expo.dev/artifacts/eas/eBxdN7oXYd7j51pEcraew.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-01e691fc-credential-login.apk`.
- Estado al 2026-06-04: `FINISHED` e instalada por ADB en Galaxy `SM_S938B / R5CY21X6FLE`.
- Commit de la build nueva: `e39a01db5901c07e6bf6380c095c2e877c97af25`.
- Motivo de la build: corregir login por correo/clave cuando la app conserva un bearer viejo o inválido.
- QA realizada: app arranca, `Obras` carga, login `admin` por cuenta funciona y Perfil muestra `Administrador · Admin TopoField` como `Activa`. Tras `force-stop` y relanzar, Perfil sigue mostrando `Administrador`. `logcat` filtrado solo muestra `ReactNativeJS: Running "main"`.

## APK Anterior Instalada En Galaxy

- EAS build anterior: `dbcb7a7b-47a5-4abb-a643-c76d63bb5960`.
- Logs: https://expo.dev/accounts/ciudadanoinusual/projects/topofield/builds/dbcb7a7b-47a5-4abb-a643-c76d63bb5960
- URL APK: https://expo.dev/artifacts/eas/t9c1vSLmGMPKCiiBgbJ6Um.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-dbcb7a7b-admin-project.apk`.
- Estado al 2026-06-03: `FINISHED` e instalada por ADB en Galaxy `SM_S938B / R5CY21X6FLE`.
- Commit de la build nueva: `035d247a56164330fec279069fe5ce5fe4d37595`.
- Esta build nueva debe incluir: login admin/topógrafo con refresh, multi-sesión técnica, creación de obra solo admin, Bitácora tipo chat, Guías encajadas en página completa y zoom/pan mejorado del croquis.
- Hallazgo posterior: el flujo de login por cuenta en esta APK puede fallar porque `apiFetch` adjunta bearer viejo/inválido también en `/auth/login`; corregido en `e39a01d` y pendiente de instalación en la build `01e691fc`.
- EAS `13ee9092-da34-4145-9971-1049244e571f` fue cancelada porque quedó obsoleta al añadir `Nueva obra`.

## Estado Backend Actual

- Render expone `035d247a56164330fec279069fe5ce5fe4d37595`.
- `POST /api/v1/projects` con admin y payload inválido responde `400 INVALID_PROJECT_PAYLOAD`, confirmando que la ruta nueva existe sin crear datos.
- `POST /api/v1/projects` con topógrafo responde `403 FORBIDDEN`, confirmando que crear obra queda solo para `admin`.

## APK Anterior Instalada En Galaxy

- EAS build: `2416dd4a-27a2-47ac-bdf2-5933af2d83d4`.
- URL APK: https://expo.dev/artifacts/eas/5stxhvFJC7q6yr86WGKjco.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-2416dd4a-icons-bitacora.apk`.
- Instalado en Galaxy por ADB con resultado `Success`.
- Commit incluido en APK: `983f481eb7cc74b565256987d32e937a6987a855`.
- Incluye pestañas `Obras`, `Mapas`, `Bitácora`, `Guías`, `Perfil`, lector de guías a página única, croquis con pan/zoom, app icon de brújula y sesión técnica persistible.
- QA visitante validada en Galaxy; sesión topógrafo queda activa y persistida tras reiniciar app.
- No lanzar otra EAS salvo cambio móvil real.

## APK Anterior

- EAS build anterior con Bitácora sin icono nuevo: `a8ab7d91-abd4-4d74-a445-641ee09e7b73`.
- URL APK anterior: https://expo.dev/artifacts/eas/mQ2DDR7pdsqeyhSDfkhZYg.apk
- Archivo local anterior: `C:\Users\guill\Downloads\topofield-a8ab7d91-bitacora-guides-prisms.apk`.
- EAS build histórico: `71a232a3-2f87-4e85-a71e-75ad0681269a`.
- Archivo local histórico: `C:\Users\guill\Downloads\topofield-71a232a3-preview.apk`.
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
- Sesión `admin`:
  - El script `create-session-tokens` también genera token técnico `admin`, validable igual contra `/auth/me`.
  - No se dejó `admin` activo en el Galaxy porque reemplazaría la sesión `topografo` que el usuario quiere usar para fotos/campo.
  - Próxima decisión: si el usuario necesita operar desde móvil como admin, implementar un mecanismo claro de cambio de perfil técnico o renovar el flujo de login para que admin/topógrafo no dependan de pegar JWTs largos.
- Pendiente real: validar en Galaxy que las páginas de guía se leen mejor y que un prisma alejado, por ejemplo `626`, se puede seleccionar, ampliar y recorrer sin quedar limitado al centro.
- Backend ya desplegado en `c866c73`; `GET /stations/messages` validado: anónimo 401, visitante 403, topógrafo 200.
- Pendiente real adicional: QA topógrafo de Bitácora y croquis del prisma `626`; definir flujo estable de sesión admin/topógrafo antes de empezar carga real de datos.

## Siguiente Paso Recomendado

1. En local con el Galaxy: probar `Bitácora` como topógrafo y confirmar notas/incidencias/mensajes con fecha/hora.
2. En local con el Galaxy: probar croquis, seleccionar prisma alejado `626`, usar zoom y arrastrar por todo el croquis.
3. Si hoy se toman fotos y aparece `Invalid authentication token`, regenerar sesión técnica antes de culpar al flujo de fotos.
4. En Codex Cloud: preparar el flujo estable para trabajar con `admin` y `topografo` sin romper la sesión de campo; opción conservadora: selector de perfil técnico o login/refresh.
5. En Codex Cloud: preparar el siguiente bloque MVP sin depender de ADB, por ejemplo matriz real de `project_memberships`, pulido de Bitácora o auditoría de roles/scope.
6. Mantener pendiente la matriz real usuario-obra en `PROJECT_MEMBERSHIPS_MATRIX.md` antes de crear usuarios reales.

## Estado Render Tras Último Push

- `GET /health`: `0a4f523169d1a64c1a28b2e92ddea8f95fce2d33`.
- Rutas visitante principales con token: 200.
- Rutas GET protegidas sin token: 401.
- Mensajes de estación: admin 200, topógrafo 200, visitante 403.
- Incidencias filtradas por estación/estado: corregidas tras `0a4f523`.
- DTO visitante: no expone `createdBy` en estaciones/guías ni `sourceFiles` en prismas.

## Nota Técnica Sobre Prismas

No hay coordenadas absolutas de prismas. Hay 171 prismas y 1889 observaciones, con ángulo horizontal y distancia inclinada, pero 0 prismas con coordenadas propias. Por eso el croquis es correcto como vista operativa desde la estación, no como mapa geográfico.

## Actualización QA Fotos y Campo — 2026-06-06

- APK instalada en Galaxy `SM_S938B / R5CY21X6FLE`: `C:\Users\guill\Downloads\topofield-c18d559-document-picker.apk`.
- EAS preview Android: `bf496a96-dfe8-4b4a-bd43-ba72379d0d53`.
- APK URL: `https://expo.dev/artifacts/eas/pC1Juo2vpJwiZB1nBzdFPz.apk`.
- Commits de corrección de fotos:
  - `236e864 fix(mobile): preserve picked image extension`
  - `34698cc fix(mobile): use document picker for Android gallery`
  - `c18d559 fix(mobile): validate gallery image formats`
- Causa corregida del bug de fotos: Android/Expo fallaba al preparar/subir fotos de galería con rutas `content://`, extensiones perdidas y Blob/ArrayBuffer. La app ahora usa `expo-document-picker`, copia a caché, conserva extensión real y valida JPG/PNG/WebP antes de comprimir.
- QA real en Galaxy con sesión `admin` activa:
  - Arranque en frío: `Obras` cargó Campus Nord y Maragall sin quedarse en `Cargando` ni pedir `Revalidar token`.
  - Foto de obra: cambio de imagen con JPG válido desde galería pasó; se restauró Campus Nord usando historial de `project.image_url`.
  - Foto principal de estación `Campus Nord Estacionamiento CN2`: añadir desde galería pasó; luego se quitó y volvió a `Sin foto`.
  - Memoria visual CN2: añadir foto pasó; luego se borró y volvió a `Sin memoria visual`.
  - Prisma `626`: seleccionar, añadir foto desde galería y quitar foto pasó; volvió a `Sin foto de prisma`.
  - Bitácora, Mapas, Guías, Perfil y Obras cargan sin pantalla blanca.
  - Perfil confirma sesión `Administrador` con `topofield-admin@topofield.local`.
  - Guía Leica abre una página por vez; 100% legible y zoom a 125% funciona.
  - Croquis: seleccionar `626` y pulsar `+` enfoca el prisma y sube a 225%.
- `logcat` tras pruebas: sin `FATAL EXCEPTION`, sin errores JS, sin `ArrayBuffer/Blob` de subida; solo ruido normal de `uiautomator/monkey` y `ReactNativeJS: Running "main"`.
- Verificación técnica local:
  - `npm run build --workspace apps/backend`
  - `npx tsc --noEmit --project apps/mobile/tsconfig.json`
- Pendiente real:
  - No se probó crear obra para no dejar basura permanente; falta endpoint/flujo de limpieza o crear una obra real deliberadamente.
  - La foto PNG diminuta de 256 B usada como fixture falló al prepararse; con JPG válido de tamaño normal pasó. Recomendación: en campo usar Cámara/JPG o fotos normales de galería.
  - Unificar UX de fotos en estación/prisma con el modal de obra sería mejora, no bloqueo.
