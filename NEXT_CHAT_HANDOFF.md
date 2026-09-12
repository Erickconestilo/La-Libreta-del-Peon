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
- Último commit local de documentación: `157a997`.
- GitHub `main` verificado por API: `78d980bc50c0d4c2cbcc9a363f8a65bf7a81321f`.
- El `origin/main` local puede estar atrasado; no usarlo como estado remoto
  sin refrescarlo o consultar GitHub.

## Estado desplegado

- Render: `https://la-libreta-del-peon-1.onrender.com`.
- Último despliegue funcional verificado: `6a1b19fa9384e77797b956b6710af9f7a0ec7ff0`.
- `/api/v1/health`: `200` y estado `ok`.
- Rondas y `GET /api/v1/me/journey` sin bearer: `401 UNAUTHORIZED`, nunca `404`.
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
2. Validar CSV/XLSX de la misma ronda y el bloqueo de exportación para `read`.
3. Registrar respuestas HTTP, logcat y comprobaciones de Supabase sin secretos.
4. Corregir solo fallos reproducibles, siempre con regresión y commit separado.
5. Crear el fixture de catálogo genérico, sin datos de obra real.
6. Diseñar después de F5 visitas de montaje, croquis fotográfico e instrumentos
   cuyos procedimientos estén confirmados.
7. Preparar piloto con segundo usuario/dispositivo y entrevistas de mercado.

## Cambios locales que no se deben mezclar

- `apps/mobile/package.json` tiene un diff previo de los scripts `android`/`ios`.
- Las capturas `topofield-*.png` son evidencia no versionada.
- El `package-lock.json` incluye únicamente la actualización segura de `morgan`
  y `qs` realizada por la auditoría; debe probarse antes de committear.

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
