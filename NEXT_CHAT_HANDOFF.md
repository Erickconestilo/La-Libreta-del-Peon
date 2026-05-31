# NEXT_CHAT_HANDOFF.md

## Contexto Rápido

- Proyecto: `C:\Users\guill\Documents\Aplicacion_Movil\topofield`.
- Repo remoto: `https://github.com/Erickconestilo/La-Libreta-del-Peon.git`.
- Rama actual: `main`.
- Backend Render: `https://la-libreta-del-peon-1.onrender.com/api/v1`.
- Dispositivo ADB: Galaxy S25 `SM_S938B`, id `R5CY21X6FLE`.

## Últimos Commits Importantes

- `4b6af89` - lector offline de guías PDF renderizadas.
- `748288f` - icono de app libreta negra con mira amarilla.
- `805fb61` - croquis de prismas por estación y foto de prisma.
- `6a494de` - commit vacío para intentar forzar redeploy Render.

## APK Actual

- EAS build: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`.
- URL APK: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- Archivo local: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`.
- Instalado en Galaxy por ADB con resultado `Success`.

## Lo Que Ya Está Hecho

- App móvil entra por obras y luego muestra estacionamientos.
- Guías `Guía Leica de estación` y `Nivel Leica LS10` están dentro del APK como páginas JPG optimizadas.
- Icono, favicon, adaptive icon y splash están actualizados.
- Detalle de estación tiene foto principal, memoria visual, notas editables y datos técnicos colapsados.
- Mapa evita crash si no hay Google Maps API key.
- Croquis de prismas usa `react-native-svg`, ángulo horizontal y distancia inclinada.
- Al tocar un prisma se muestra código, estado, distancia, ángulo, observaciones, última lectura, constante y foto.
- Backend local compila con endpoint `PATCH /prisms/:prismId/photo`.

## Bloqueo Actual

Render sigue sirviendo backend antiguo:

- `GET /health`: 200
- `GET /stations`: 200
- `GET /projects`: 404
- `GET /guide-entries`: 404
- `PATCH /prisms/:prismId/photo`: 404

Interpretación: el servicio Render no está desplegando el último `main`, o auto-deploy está desactivado/mal apuntado.

## Siguiente Paso Recomendado

1. Abrir dashboard de Render.
2. Confirmar servicio backend asociado al repo `Erickconestilo/La-Libreta-del-Peon`.
3. Confirmar branch `main` y root dir `apps/backend`.
4. Lanzar manual deploy o activar auto-deploy.
5. Verificar:
   - `GET /api/v1/projects` ya no devuelve 404.
   - `GET /api/v1/guide-entries` ya no devuelve 404.
   - `PATCH /api/v1/prisms/:id/photo` ya no devuelve `Route not found`.
6. Reprobar en Galaxy: guías, detalle de estación, croquis de prismas y foto de prisma.

## Nota Técnica Sobre Prismas

No hay coordenadas absolutas de prismas. Hay 171 prismas y 1889 observaciones, con ángulo horizontal y distancia inclinada, pero 0 prismas con coordenadas propias. Por eso el croquis es correcto como vista operativa desde la estación, no como mapa geográfico.
