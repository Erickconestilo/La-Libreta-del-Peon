# La Libreta del Peón

Aplicación móvil de campo para equipos pequeños de topografía. Stack actual: Expo/React Native, backend Node/Express, PostgreSQL/Supabase, Supabase Storage y tipos compartidos en `shared/types.ts`.

## Documentación maestra

- [PLAN.md](./PLAN.md)
- [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md)
- [UX_RESEARCH_PLAN.md](./UX_RESEARCH_PLAN.md)
- [LAUNCH_PLAN.md](./LAUNCH_PLAN.md)
- [PHASE_2_DEVICE_E2E_REPORT_2026-07-29.md](./PHASE_2_DEVICE_E2E_REPORT_2026-07-29.md)

## Estado Actual

- La Fase 2 técnica offline está cerrada en la rama `phase-2-device-e2e`; falta integrarla y publicar el backend actual antes del piloto.
- La verificación local actual pasa en backend y móvil:
  - `npm run build --workspace apps/backend`
  - `npm run test --workspace apps/backend`
  - `npx tsc --noEmit --project apps/mobile/tsconfig.json`
  - `npm run test --workspace apps/mobile -- --runInBand`
  - `npx expo export --platform android`
- El backend ya tiene tests unitarios mínimos para `access-control`, `photo-storage-path`, evaluación de lecturas de auscultación, CSV de catálogo y validación de payloads; la cobertura sigue siendo parcial y no sustituye QA funcional real.
- Backend público configurado en móvil: `https://la-libreta-del-peon-1.onrender.com/api/v1`.
- Android sigue siendo la plataforma principal de validación operativa.

## Funcionalidad Implementada

- Flujo `Obras -> Estacionamientos`.
- Detalle de estación con foto, memoria visual, notas y datos técnicos colapsados.
- Guías Leica offline renderizadas como páginas dentro del APK.
- Mapa fallback sin Google API key para evitar crash en Android.
- Croquis operativo de prismas por estación usando ángulo/distancia, no coordenada geográfica absoluta.
- Subida de fotos a Supabase Storage para estaciones, obras, memoria visual y prismas.
- Recuperación móvil ante sesión técnica inválida en lecturas públicas.
- Motor offline con outbox SQLite, sincronización al recuperar red, reinicio persistente e idempotencia por `client_request_id`.
- Parte diario móvil implementado en código actual.
- Verificación raíz `npm run verify:pre-apk` añadida y validada.
- Backend MVP inicial de auscultación:
  - migración no aplicada `014_monitoring_rounds.sql`;
  - puntos esperados por ronda;
  - lecturas instrumentadas con `client_request_id`;
  - delta/threshold calculados, no persistidos;
  - catálogo de códigos por proyecto;
  - importación CSV de catálogo restringida a admin.

## Bloqueo Conocido

- La distribución sigue sin estar cerrada de forma seria para compañeros: APK local y APK EAS no comparten firma, así que la actualización directa por `adb install -r` falla si la build no reutiliza la misma keystore.
- La publicación y prueba con compañeros sigue pendiente de llevarse a Google Play Internal Testing o a una cadena estable equivalente.
- El tooling móvil mantiene vulnerabilidades moderadas upstream del ecosistema Expo; hoy no hay hallazgos high/critical validados en la lógica propia, pero sigue siendo deuda antes de abrir más la distribución.
- `expo install --check` detecta tres desajustes de compatibilidad pendientes (`expo-network`, `react-native-maps`, `react-native-screens`); se deben tratar en un cambio aislado con nueva QA de dispositivo.

## Estado Operativo

- `npm run verify:pre-apk` pasa completo: build backend, TypeScript móvil, verificación real de `project_memberships` y export Android.
- `topofield-topografo@topofield.local` queda limitado a `campus-nord` y `maragall`.
- La sincronización real de membresías se ejecutó sin efectos laterales: `1` fila actualizada, `0` altas, `0` bajas.
- Build Android local sin coste validada en Windows:
  - instalar `android-clt` y `temurin17-jdk` con `scoop`,
  - usar la ruta corta `C:\tf`,
  - ejecutar `npm run mobile:build-local-android`.
- APK local generada correctamente en `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`.

## Siguiente paso

Resolver estos bloques en orden:

- Revisar e integrar la rama `phase-2-device-e2e`.
- Desplegar el backend que contiene la idempotencia antes de probar offline fuera del entorno local.
- Iniciar Fase 3: MVP de faenas semanales sobre el motor offline ya validado.
- Definir usuarios reales y ampliar `data/project-memberships.json` antes de alta operativa real.
- Cerrar la ruta de distribución Android para compañeros con firma estable y preferiblemente Google Play Internal Testing.
- Seguir ampliando tests automáticos sobre auth, permisos y flujos críticos de fotos/scope.

Nota importante:

- La APK local compilada con Gradle queda firmada con una clave distinta a la APK instalada desde EAS, así que `adb install -r` falla con `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.
- Para instalar encima sin desinstalar hace falta firmar localmente con la misma keystore de EAS o compilar desde un entorno que la reutilice.
