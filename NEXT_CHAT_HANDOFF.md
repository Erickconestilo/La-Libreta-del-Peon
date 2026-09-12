<!-- doc-status
estado: vivo
verificado: 2026-09-12
rol: handoff
-->

# NEXT_CHAT_HANDOFF.md — TopoField

## Fuente de verdad

Lee primero `ROADMAP.md`, después `MEMORIA.md` y `AGENTS.md`. Este archivo es
solo el punto de reanudación; no sustituye la bitácora ni el roadmap.

## Estado de la rama

- Rama activa: `codex/f5-field-stability`.
- Corrección backend relevante: `b0572a0`, preserva el `projectId` real al
  firmar fotos de lecturas.
- Último commit local antes del hardening de caché: `18dee00` (paridad
  CSV/XLSX y regresión de exportación).
- Hardening local actual: `ef043b1` (caché de rondas separada por sesión y
  regresión de migración SQLite 005).
- Hardening local en `1d82a9f`: migración SQLite 006, outbox filtrado por sesión
  y cancelación por generación durante cambios de cuenta; 13 suites y 62 tests
  móviles pasan.
- GitHub `main` verificado por API tras fusionar la PR #17:
  `20d8520f0db6022cc2163a51cd9a3464c7600010`.
- El `origin/main` local puede estar atrasado; no usarlo como estado remoto
  sin refrescarlo o consultar GitHub.

## Estado desplegado

- Render: `https://la-libreta-del-peon-1.onrender.com`.
- Último despliegue funcional verificado: `6a1b19fa9384e77797b956b6710af9f7a0ec7ff0`.
- Verificado el 12-09-2026: `/api/v1/health` devuelve `200` y estado `ok` con
  commit `6a1b19f`; rondas y `GET /api/v1/me/journey` sin bearer devuelven
  `401 UNAUTHORIZED`, nunca `404`.
- No aplicar migraciones ni cambiar Supabase Auth/RLS sin autorización explícita
  en el momento.

## Estado móvil y Galaxy

- Release histórica instalada: `versionCode=4`, firmada como `CN=TopoField Android Release`.
- La consulta supervisora fue validada anteriormente en el Galaxy.
- El recorrido de operador con lectura y foto offline sigue sin aprobar porque
  una repetición anterior no dejó adjunto y después el dispositivo dejó de estar
  visible para ADB.
- Último preflight conocido: `adb devices -l` mostró solo `List of devices attached`.
- No generar `versionCode=5` salvo que aparezca un bug móvil reproducible.
- No automatizar el modo avión con `adb shell settings`; debe activarse desde
  la interfaz real del dispositivo.

## Trabajo pendiente prioritario

1. Conectar el Galaxy y repetir lectura + foto offline, reinicio, reconexión,
   deduplicación, parte parcial y cierre.
2. Validar CSV/XLSX de la misma ronda real y el bloqueo de exportación para
   `read`; la paridad local ya está cubierta por
   `round-export-parity.test.ts`.
3. Registrar respuestas HTTP, logcat y comprobaciones de Supabase sin secretos.
4. Corregir solo fallos reproducibles, siempre con regresión y commit separado.
5. Validar visualmente desde la UI la semilla genérica al crear una obra, sin
   datos de obra real.
6. Autorizar/aplicar `027_station_mounting_visits.sql` y desplegar sus rutas;
   validar en campo la pantalla local de visitas de montaje, incluida cámara,
   Storage, reinicio y reconexión. La captura offline local ya usa caché
   SQLite por sesión y estación más el outbox (migración local 007). Después
   decidir el croquis fotográfico según evidencia y no según una demo.
7. Preparar piloto con segundo usuario/dispositivo y entrevistas de mercado.

## Cambios locales que no se deben mezclar

- `apps/mobile/package.json` tiene un diff previo de los scripts `android`/`ios`.
- Las capturas `topofield-*.png` son evidencia no versionada.
- El `package-lock.json` incluye únicamente la actualización segura de `morgan`
  y `qs` realizada por la auditoría; build y tests backend ya pasan con él.
- La auditoría actual está archivada en
  `docs/archive/F5_SECURITY_SCOPE_AUDIT_2026-09-12.md`.
- La caché local de rondas y snapshots quedó separada por sesión en la
  migración SQLite 005; la caché anterior se invalida al actualizar para
  evitar contaminación entre cuentas.
- El outbox local quedó separado por sesión en la migración SQLite 006. Las
  filas antiguas se marcan `__unassigned__`, y un flush antiguo se abandona si
  cambia la sesión durante una request. Falta validarlo en un cambio real de
  cuenta en el Galaxy.
- Las consultas protegidas de React Query usan namespaces por sesión y las
  actualizaciones optimistas se limitan a la cuenta activa. El contrato
  `getSessionCacheKey` está cubierto por una regresión en `dedf77b`; la
  validación física de respuestas tardías entre cuentas sigue pendiente.
- La rama prepara `027_station_mounting_visits.sql`, el contrato de visitas
  append-only, evidencias fotográficas y la pantalla móvil de `Visitas de
  montaje`, incluidos los estados de visita `draft`, `completed` y `blocked`.
  La captura offline local usa SQLite 007, caché por sesión/estación y el
  outbox existente. La posición relativa opcional usa una cuadrícula 3x3 y
  las consultas muestran el título como etiqueta sobre la miniatura, sin
  afirmar precisión métrica. No se ha aplicado la migración PostgreSQL ni se
  ha desplegado el endpoint; la validación física y la comprobación de Storage
  quedan pendientes.

## Comandos de verificación

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield
npm run build --workspace apps/backend
npm test --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm test --workspace apps/mobile
npm run docs:check
git diff --check
git status --short
adb devices -l
```
