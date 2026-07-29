# Informe E2E Fase 2 — motor offline en Galaxy real

**Fecha:** 2026-07-29
**Rama:** `phase-2-device-e2e`
**Dispositivo:** Samsung Galaxy `SM-S938B`, ADB `R5CY21X6FLE`
**Base real:** Supabase `topofield` (`tmlexrsnxpmykbpeebri`)
**Resultado:** APROBADO

## Alcance y restricciones

- Build Android local con Gradle y ADB.
- Backend actual ejecutado en local contra Supabase real.
- Sin EAS, sin despliegue y sin cambios de esquema.
- Cuenta técnica real de rol `topografo`.
- Dos escenarios solicitados y un tercero endurecido para eliminar el efecto
  del túnel USB al backend.

## Bugs encontrados y corregidos

### 1. UUID no disponible en Hermes

El primer intento anterior fallaba antes de insertar en SQLite:

```text
Property 'crypto' doesn't exist
```

La causa era el uso de `crypto.randomUUID()` global. Se añadió `expo-crypto`,
se creó `lib/random-id.ts` y el hook usa `createRandomId()` para el ID local y
para `clientRequestId`.

### 2. Sync ligado a la pantalla de estación

El motor se inicializaba dentro de `useCreateStationMessage`. Al reabrir en
`Obras`, no había monitor de conectividad hasta volver a entrar en una estación.
Además, cada montaje podía crear otro intervalo.

Se movió el bootstrap al layout raíz:

1. espera a que SQLite aplique migraciones;
2. espera a que termine la hidratación de sesión;
3. arranca un único motor si existe una sesión técnica;
4. lo detiene al desmontar o cambiar de sesión.

El callback de sincronización quedó aislado en
`apps/mobile/lib/offline/sync-handlers.ts`.

### 3. Sesión técnica ante un fallo de red

La sesión guardada se marcaba inválida ante cualquier fallo de `/auth/me`,
incluido no tener red. Ahora:

- un 401/auth real sigue invalidando la sesión;
- un error transitorio conserva el token ya validado en `SecureStore`;
- el backend vuelve a validar ese token cuando la cola se sincroniza.

No se expusieron tokens ni contraseñas en logs, documentación o commit.

## Build e instalación

Se usó JDK 17 y el SDK Android de Scoop. Java 25 produjo una incompatibilidad
con el plugin de toolchains.

```powershell
$env:JAVA_HOME='C:\Users\guill\scoop\apps\temurin17-jdk\current'
$env:ANDROID_HOME='C:\Users\guill\scoop\apps\android-clt\current'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Set-Location C:\tf\apps\mobile\android
.\gradlew.bat app:assembleDebug `
  -PreactNativeArchitectures=arm64-v8a `
  --no-daemon `
  --console=plain
```

Salida:

```text
BUILD SUCCESSFUL in 1m 2s
348 actionable tasks: 32 executed, 316 up-to-date
```

Instalación:

```text
Performing Streamed Install
Success
```

## Escenario 1 — offline y reconexión automática

Mensaje:

```text
E2E-OFFLINE-1-20260729-213138
```

Log de encolado:

```text
[useCreateStationMessage] Enqueued message d0741bbf-c2ce-4716-9a81-9bdee887eaf3 with clientRequestId aa01e971-6215-436e-86d7-368e26fd78c6 for later sync
```

SQLite antes de reconectar:

```json
{
  "id": "d0741bbf-c2ce-4716-9a81-9bdee887eaf3",
  "client_request_id": "aa01e971-6215-436e-86d7-368e26fd78c6",
  "entity_type": "station_message",
  "status": "pending",
  "retry_count": 0
}
```

Log automático al recuperar conectividad:

```text
[SyncEngine] Connectivity restored, flushing outbox...
[SyncEngine] Flushing 1 pending items...
[SyncEngine] Item d0741bbf-c2ce-4716-9a81-9bdee887eaf3 synced successfully
[SyncEngine] Flush complete: 1/1 synced
```

SQLite final:

```json
{
  "status": "synced",
  "retry_count": 1
}
```

## Escenario 2 — cerrar y reabrir antes de reconectar

Mensaje:

```text
E2E-OFFLINE-RESTART-20260729-213138
```

Log de encolado:

```text
[useCreateStationMessage] Enqueued message 59c530b4-b39c-4547-aa5d-e7b78fbd8ed9 with clientRequestId a9698cea-4d64-4382-8182-7a271315e075 for later sync
```

SQLite antes y después de `am force-stop`:

```json
{
  "id": "59c530b4-b39c-4547-aa5d-e7b78fbd8ed9",
  "client_request_id": "a9698cea-4d64-4382-8182-7a271315e075",
  "status": "pending",
  "retry_count": 0
}
```

Log tras reabrir todavía offline:

```text
[SQLite] Current schema version: 1
[SQLite] All migrations applied
[SyncEngine] Initializing...
[SyncEngine] No connectivity, skipping flush
```

Log tras reconectar:

```text
[SyncEngine] Connectivity restored, flushing outbox...
[SyncEngine] Flushing 1 pending items...
[SyncEngine] Item 59c530b4-b39c-4547-aa5d-e7b78fbd8ed9 synced successfully
[SyncEngine] Flush complete: 1/1 synced
```

## Prueba endurecida — reapertura sin túnel backend

El modo avión no corta `adb reverse`, porque ese túnel viaja por USB. Para no
confundir “sin Wi-Fi” con “backend realmente inaccesible”, se añadió una prueba:

1. crear mensaje offline;
2. confirmar `pending`;
3. eliminar `adb reverse tcp:3001`;
4. hacer `force-stop`;
5. reabrir sin entrar en estación;
6. confirmar que el motor arranca desde `Obras`;
7. restaurar red y túnel;
8. esperar sincronización automática.

Mensaje:

```text
E2E-OFFLINE-COLD-20260729-214753
```

UUID:

```text
d98d88c7-3096-49ad-a4c9-4b4d89cdeec9
```

Log con backend inaccesible:

```text
[SQLite] Current schema version: 1
[SQLite] All migrations applied
[SyncEngine] Initializing...
[SyncEngine] No connectivity, skipping flush
```

Log al recuperar conectividad:

```text
[SyncEngine] Connectivity restored, flushing outbox...
[SyncEngine] Flushing 1 pending items...
[SyncEngine] Item 970f7b06-a3b9-4995-b831-d5f0791c87d2 synced successfully
[SyncEngine] Flush complete: 1/1 synced
```

Resultado SQLite:

```json
{
  "client_request_id": "d98d88c7-3096-49ad-a4c9-4b4d89cdeec9",
  "status": "synced",
  "retry_count": 1
}
```

## Verificación Supabase e idempotencia

Consulta final resumida:

```text
E2E-OFFLINE-1-20260729-213138
  client_request_id=aa01e971-6215-436e-86d7-368e26fd78c6
  rows_for_client_request=1

E2E-OFFLINE-RESTART-20260729-213138
  client_request_id=a9698cea-4d64-4382-8182-7a271315e075
  rows_for_client_request=1

E2E-OFFLINE-COLD-20260729-214753
  client_request_id=d98d88c7-3096-49ad-a4c9-4b4d89cdeec9
  rows_for_client_request=1
```

Se repitió manualmente el POST del escenario 2 con el mismo
`clientRequestId`. El backend respondió 201 con:

```text
ReturnedId=a310e1d6-35a5-429a-9db1-c4387ed4135a
```

Ese es el mismo ID ya existente en Supabase y el conteo permaneció en `1`.
Esto ejercita realmente el `ON CONFLICT`; cerrar la app antes del primer envío
solo demuestra persistencia, no crea por sí mismo un conflicto duplicado.

Backend durante la prueba:

```text
POST /api/v1/stations/13a0cba2-2f13-4661-a580-877484ee92e8/messages 201
POST /api/v1/stations/13a0cba2-2f13-4661-a580-877484ee92e8/messages 201
POST /api/v1/stations/13a0cba2-2f13-4661-a580-877484ee92e8/messages 201
```

Los tres corresponden a los dos sync originales y al replay idempotente.

## Regresión final

```text
npm run build --workspace apps/backend
  OK

npm run test --workspace apps/backend
  tests 23
  pass 23
  fail 0

npx tsc --noEmit --project apps/mobile/tsconfig.json
  exit 0

npm run test --workspace apps/mobile -- --runInBand
  Test Suites: 4 passed, 4 total
  Tests:       28 passed, 28 total

npx expo export --platform android
  Android Bundled
  Exported
```

Revisión de logs:

```text
DEVICE_RUNTIME_ERRORS=0
BACKEND_RUNTIME_ERRORS=0
COLD_RESTART_DEVICE_ERRORS=0
```

## Auditoría de dependencias

`npm audit --omit=dev`:

```text
moderate: 11
high: 0
critical: 0
```

Son dependencias transitivas del tooling Expo/config/xcode/uuid. El arreglo
automático propone cambios incompatibles; no se ejecutó `npm audit fix --force`.

`npx expo install --check` mantiene tres ajustes pendientes:

```text
expo-network@6.0.1 -> ~56.0.5
react-native-maps@1.29.0 -> 1.27.2
react-native-screens@4.25.2 -> ~4.26.0
```

No se mezclaron con este fix porque requieren una nueva build y QA específica.
`expo-network@6.0.1` sí funcionó en los escenarios reales ejecutados.

## Build autónoma final en el Galaxy

Después de cerrar el E2E se generó una variante `release` local, sin EAS,
limitada a la arquitectura del dispositivo:

```text
C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
Size=53051310 bytes
SHA256=DF7907448F07C6227ABD7263B6AB1E1A16BDF685D8D34FD6936134B89061B554
```

La primera instalación quedó esperando una decisión visible de Play Protect:

```text
¿Enviar la aplicación para realizar una comprobación de seguridad?
```

Se eligió `No enviar`; no se desactivó la seguridad del sistema. La repetición
de la instalación produjo:

```text
Performing Streamed Install
Success
```

La app se abrió con Metro detenido, sin `adb reverse` y con la API de Render
configurada. Verificación posterior:

```text
mCurrentFocus=com.ciudadanoinusual.topofield/.MainActivity
FATAL_OR_RUNTIME_ERRORS=0
```

La build local usa todavía la firma de depuración del proyecto Android. Sirve
para continuar las pruebas en este Galaxy sin conectar el cable, pero no es el
artefacto firmado definitivo para Play Store ni para distribuir el piloto.

## Conclusión

La Fase 2 técnica queda cerrada y Fase 3 queda desbloqueada para desarrollo.
Esto no significa que producción esté actualizada: no se desplegó el backend,
no se usó EAS y la rama todavía debe revisarse e integrarse. Antes del piloto
hay que publicar el backend idempotente y generar el artefacto distribuible con
una firma estable.
