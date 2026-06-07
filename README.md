# La Libreta del Peón

Aplicación móvil de campo para equipos pequeños de topografía. Stack actual: Expo/React Native, backend Node/Express, PostgreSQL/Supabase, Supabase Storage y tipos compartidos en `shared/types.ts`.

## Estado Actual

- Repo actual: `main` en `c91682a` tras documentar sincronización de membresías y bloqueo de cuota EAS.
- Último backend verificado en Render antes del último push: `2fd2eb2fab825f3d9df84dfa631d037ac0608e67`.
- Última APK Android validada en Galaxy: `topofield-c18d559-document-picker.apk`.
- Build EAS nueva intentada el `2026-06-07`: bloqueada por cuota mensual agotada del plan free de Expo hasta `2026-07-01`.
- Backend público configurado en móvil: `https://la-libreta-del-peon-1.onrender.com/api/v1`.

## Funcionalidad Implementada

- Flujo `Obras -> Estacionamientos`.
- Detalle de estación con foto, memoria visual, notas y datos técnicos colapsados.
- Guías Leica offline renderizadas como páginas dentro del APK.
- Mapa fallback sin Google API key para evitar crash en Android.
- Croquis operativo de prismas por estación usando ángulo/distancia, no coordenada geográfica absoluta.
- Subida de fotos a Supabase Storage para estaciones, obras, memoria visual y prismas.
- Recuperación móvil ante sesión técnica inválida en lecturas públicas.
- Parte diario móvil implementado en código actual.
- Verificación raíz `npm run verify:pre-apk` añadida y validada.

## Bloqueo Conocido

- La cuenta Expo agotó la cuota mensual de Android builds en el plan free.
- Render aún no reflejaba el último push documental en `GET /health` en la última comprobación local.

## Estado Operativo

- `npm run verify:pre-apk` pasa completo: build backend, TypeScript móvil, verificación real de `project_memberships` y export Android.
- `topofield-topografo@topofield.local` queda limitado a `campus-nord` y `maragall`.
- La sincronización real de membresías se ejecutó sin efectos laterales: `1` fila actualizada, `0` altas, `0` bajas.

## Siguiente paso

Resolver una de estas dos rutas:

- Esperar al reset de cuota de Expo o usar build local propia para sacar una APK nueva con el código actual.
- Definir usuarios reales y ampliar `data/project-memberships.json` antes de alta operativa real.
