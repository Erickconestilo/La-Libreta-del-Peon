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

## APK Actual

- EAS build: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`.
- URL APK: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`.
- Instalado en Galaxy por ADB con resultado `Success`.
- Nota: este APK fue construido antes de `3e721a1`; para probar SecureStore, permisos reducidos, aviso de Google Maps y mejoras locales de croquis/perfil hace falta una nueva build EAS.

## Lo Que Ya Está Hecho

- App móvil entra por obras y luego muestra estacionamientos.
- Guías `Guía Leica de estación` y `Nivel Leica LS10` están dentro del APK como páginas JPG optimizadas.
- Icono, favicon, adaptive icon y splash están actualizados.
- Detalle de estación tiene foto principal, memoria visual, notas editables y datos técnicos colapsados.
- Mapa evita crash si no hay Google Maps API key.
- Croquis de prismas usa `react-native-svg`, ángulo horizontal y distancia inclinada.
- Al tocar un prisma se muestra código, estado, distancia, ángulo, observaciones, última lectura, constante y foto.
- Backend local compila con endpoint `PATCH /prisms/:prismId/photo`.
- Render ya despliega `3e721a1` y sirve las rutas nuevas protegidas.
- Galaxy validado por ADB como visitante: Obras, obra `Sarrià`, detalle de estación, croquis PN1/PN2, Guía offline, Mapa fallback y Perfil visitante.
- Cambios locales pendientes de build: croquis con zona táctil mayor y campo de token con altura fija/submit por teclado.

## Estado Backend Render

Render fue redeployado manualmente con cache limpio desde `main`:

- `GET /health`: 200 con `commit: 3e721a14a713fb2dc609c519305df3cfaeff757e`
- `GET /projects` sin token: 401
- `GET /guide-entries` sin token: 401
- `GET /prisms/coverage/CN1` sin token: 401
- `GET /projects` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /guide-entries` con `GUEST_PUBLIC_TOKEN`: 200
- `GET /prisms/coverage/CN1` con `GUEST_PUBLIC_TOKEN`: 200
- `PATCH /prisms/:prismId/photo` sin token: 401, no 404
- `POST /uploads/photos/sign` sin token: 401, no 404

Interpretación: el bloqueo de backend antiguo queda resuelto. Las rutas protegidas existen; para probar foto de prisma en móvil hace falta sesión `admin` o `topografo`.

## Hardening Backend Hecho Localmente

- Commit de código: `10c91b8`.
- Migración `011_change_logs_project_entity.sql` aplicada en la BD actual para permitir `entity_type = 'project'`.
- `GET /projects`, `GET /guide-entries` y `GET /prisms/coverage/CN1` ahora requieren `Authorization`. Sin token responden 401; con `GUEST_PUBLIC_TOKEN` responden 200.
- El APK actual ya envía `GUEST_PUBLIC_TOKEN`, por lo que las lecturas visitantes deberían seguir funcionando tras redeploy.
- `PATCH /projects/:id/photo` queda cubierto por `verify:guide-admin`.
- Scripts de escritura contra producción quedan bloqueados salvo `TOPOFIELD_ALLOW_PRODUCTION_WRITE=<script>`.
- Verificado localmente: `npm run build --workspace apps/backend`, `npx tsc --noEmit --project apps/mobile/tsconfig.json`, `npm run verify:guide-admin --workspace apps/backend`, `npm audit --workspace apps/backend --json`.

Confirmado tras push/deploy: Render expone `3e721a1` y las rutas GET ya exigen token.

## Siguiente Paso Recomendado

1. Commit/push de las mejoras locales de croquis/perfil.
2. Lanzar nueva EAS preview para incluir `3e721a1` y los cambios locales.
3. Reinstalar APK nuevo en Galaxy y repetir QA de token técnico/foto de prisma.
4. Si la foto de prisma falla ahora, mirar primero rol/token, firma de subida y payload; ya no es un 404 de ruta inexistente.

## Nota Técnica Sobre Prismas

No hay coordenadas absolutas de prismas. Hay 171 prismas y 1889 observaciones, con ángulo horizontal y distancia inclinada, pero 0 prismas con coordenadas propias. Por eso el croquis es correcto como vista operativa desde la estación, no como mapa geográfico.
