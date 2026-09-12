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
- GitHub `main` verificado por API tras fusionar la PR #14:
  `eb88db922a03b1e01a47f90dba8346542df3f212`.
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
6. Diseñar después de F5 visitas de montaje, croquis fotográfico e instrumentos
   cuyos procedimientos estén confirmados.
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
