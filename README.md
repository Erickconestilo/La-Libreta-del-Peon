# La Libreta del Peón

Aplicación móvil de campo para equipos pequeños de topografía. Stack actual: Expo/React Native, backend Node/Express, PostgreSQL/Supabase, Supabase Storage y tipos compartidos en `shared/types.ts`.

## Estado Actual

- APK Android preview actual: `cc43f0f1-ff3e-43da-b574-ec09dedfa4e4`.
- APK directo: https://expo.dev/artifacts/eas/rdY4AEzq4WTnj9rCXAD4mG.apk
- APK local instalado en Galaxy: `C:\Users\guill\Downloads\topofield-cc43f0f1-guides-icon-prisms.apk`.
- Backend público configurado en móvil: `https://la-libreta-del-peon-1.onrender.com/api/v1`.

## Funcionalidad Implementada

- Flujo `Obras -> Estacionamientos`.
- Detalle de estación con foto, memoria visual, notas y datos técnicos colapsados.
- Guías Leica offline renderizadas como páginas dentro del APK.
- Mapa fallback sin Google API key para evitar crash en Android.
- Croquis operativo de prismas por estación usando ángulo/distancia, no coordenada geográfica absoluta.
- Subida de fotos a Supabase Storage para estaciones, obras, memoria visual y prismas.

## Bloqueo Conocido

Render sigue sirviendo backend antiguo: `GET /projects`, `GET /guide-entries` y `PATCH /prisms/:prismId/photo` responden 404 aunque `health` y `stations` responden 200.

Siguiente paso: revisar el dashboard de Render y forzar redeploy del backend desde `main`.
