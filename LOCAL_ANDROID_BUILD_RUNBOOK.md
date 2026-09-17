<!-- doc-status
estado: vivo
  verificado: 2026-09-18
-->

# LOCAL_ANDROID_BUILD_RUNBOOK.md

## Objetivo

Documentar, paso a paso, como se preparo y ejecuto una build Android local de TopoField en Windows sin usar cuota de EAS cloud.

Este documento describe lo que se hizo realmente en esta maquina, con comandos PowerShell y el motivo tecnico de cada paso.

## Entorno real usado

- Shell: `PowerShell`
- Repo: `C:\Users\guill\Documents\Aplicacion_Movil\topofield`
- Ruta corta auxiliar: `C:\tf`
- Android device probado por ADB: `R5CY21X6FLE`
- Tooling final usado:
  - `android-clt` instalado con `scoop`
  - `temurin17-jdk` instalado con `scoop`
  - `adb` ya disponible previamente

## 1. Reconstruccion de contexto y verificacion inicial

Se reviso el estado del repo y los documentos operativos:

```powershell
Get-ChildItem -Force
git status --short
git log --oneline -12
Get-Content NEXT_CHAT_HANDOFF.md
Get-Content PLAN.md
Get-Content QA_ANDROID_GALAXY.md
Get-Content PROJECT_MEMBERSHIPS_MATRIX.md
```

Motivo:

- confirmar que el repo real era `topofield`
- confirmar ultimo estado funcional
- no depender de memoria de chats anteriores

## 2. Verificacion de salud de backend y mobile

Se valido que backend y TypeScript del movil seguian bien:

```powershell
npm run build --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm run verify:pre-apk
```

Motivo:

- no tiene sentido intentar una APK si el codigo ya esta roto antes

## 3. Confirmacion del backend desplegado

Se comprobo Render:

```powershell
Invoke-RestMethod -Uri 'https://la-libreta-del-peon-1.onrender.com/api/v1/health'
```

Motivo:

- verificar que el backend publico seguia vivo
- registrar el commit expuesto por Render

## 4. Sincronizacion real de project_memberships

Primero se intento sin permiso explicito y fallo a proposito por la proteccion del script:

```powershell
npm run sync:project-memberships --workspace apps/backend
```

Despues se ejecuto con guarda explicita:

```powershell
$env:TOPOFIELD_ALLOW_PRODUCTION_WRITE='sync-project-memberships'
npm run sync:project-memberships --workspace apps/backend
```

Motivo:

- alinear la base real con `data/project-memberships.json`
- respetar la proteccion contra escritura accidental en produccion

## 5. Intento de build por EAS cloud

Se intento la build normal de Expo:

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield\apps\mobile
npx eas-cli build --platform android --profile preview --non-interactive
```

Resultado:

- fallo por cuota mensual gratuita agotada

Motivo:

- confirmar si seguia existiendo una ruta cloud sin trabajo extra local

## 6. Decision: pasar a build local Windows

Se inspeccionaron herramientas presentes:

```powershell
java -version
adb version
where.exe sdkmanager
where.exe gradle
```

Hallazgo:

- `java` estaba
- `adb` estaba
- no habia SDK Android listo en el `PATH`
- no habia Gradle global necesario

## 7. Instalacion de Android command-line tools

Se busco e instalo con `scoop`:

```powershell
scoop search android
scoop install android-clt
```

Motivo:

- evitar instalar Android Studio completa si no era necesaria
- disponer de `sdkmanager`, `cmake`, `platform-tools`, `ndk`, etc.

## 8. Instalacion de JDK 17

Se anadio bucket `java` y se instalo Temurin 17:

```powershell
scoop bucket add java
scoop install temurin17-jdk
```

Motivo:

- Gradle/Android dio problemas con Java 25
- JDK 17 es la opcion estable y habitual para este stack

## 9. Generacion del proyecto nativo Android desde Expo

Primera generacion:

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield\apps\mobile
npx expo prebuild --platform android --no-install
```

Motivo:

- crear `apps/mobile/android`
- pasar de flujo managed Expo a proyecto nativo compilable con Gradle

## 10. Identificacion de versiones Android requeridas

Se inspecciono el stack generado y dependencias:

```powershell
Get-Content apps\mobile\android\app\build.gradle
Get-Content node_modules\react-native\gradle\libs.versions.toml
Get-Content node_modules\expo-modules-core\android\ExpoModulesCorePlugin.gradle
```

Se extrajo:

- `compileSdk = 36`
- `targetSdk = 36`
- `minSdk = 24`
- `buildTools = 36.0.0`
- `ndkVersion = 27.1.12297006`

Motivo:

- instalar solo los paquetes Android correctos

## 11. Preparacion de variables de entorno para Android

Se fijaron manualmente:

```powershell
$env:JAVA_HOME='C:\Users\guill\scoop\apps\temurin17-jdk\current'
$env:ANDROID_SDK_ROOT='C:\Users\guill\scoop\apps\android-clt\current'
$env:ANDROID_HOME='C:\Users\guill\scoop\apps\android-clt\current'
$env:SKIP_JDK_VERSION_CHECK='1'
```

Motivo:

- `sdkmanager.bat` fallaba por deteccion rara de Java en Windows
- la JVM real era valida, pero el chequeo del script no

## 12. Aceptacion de licencias e instalacion de paquetes Android

Se aceptaron licencias:

```powershell
1..20 | ForEach-Object { 'y' } | & C:\Users\guill\scoop\apps\android-clt\current\cmdline-tools\latest\bin\sdkmanager.bat --licenses
```

Y se instalaron paquetes:

```powershell
& C:\Users\guill\scoop\apps\android-clt\current\cmdline-tools\latest\bin\sdkmanager.bat 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
```

Motivo:

- dejar el SDK Android completo para compilar React Native + Expo

## 13. Primeros intentos de Gradle y fallos encontrados

Intento:

```powershell
cd C:\Users\guill\Documents\Aplicacion_Movil\topofield\apps\mobile\android
.\gradlew.bat app:assembleRelease
```

Problemas reales encontrados:

1. incompatibilidad de toolchain con Java 25
2. fallo de `react-native-reanimated` y CMake/Ninja
3. rutas demasiado largas en Windows (`MAX_PATH`)

Motivo de seguir depurando:

- el codigo no estaba roto; el bloqueo era del entorno Windows

## 14. Intento con unidad virtual corta

Se creo una unidad temporal:

```powershell
subst T: C:\Users\guill\Documents\Aplicacion_Movil\topofield
```

Resultado:

- acorto rutas, pero mezclo referencias `T:\` y `C:\`
- eso rompio codegen/autolinking en Gradle

## 15. Solucion correcta para las rutas largas

Se creo una union corta en la misma unidad `C:`:

```powershell
cmd /c "mklink /J C:\tf C:\Users\guill\Documents\Aplicacion_Movil\topofield"
```

Motivo:

- seguir en unidad `C:`
- acortar la profundidad de rutas
- evitar errores de mezcla de roots

## 16. Regeneracion limpia desde la ruta corta

Se regenero Android desde `C:\tf`:

```powershell
cd C:\tf\apps\mobile
npx expo prebuild --platform android --clean --no-install
```

Motivo:

- asegurarse de que todas las rutas internas del proyecto nativo apuntasen a la ruta corta

## 17. Build release local final que si funciono

Se usaron variables y opciones conservadoras:

```powershell
$env:JAVA_HOME='C:\Users\guill\scoop\apps\temurin17-jdk\current'
$env:ANDROID_SDK_ROOT='C:\Users\guill\scoop\apps\android-clt\current'
$env:ANDROID_HOME='C:\Users\guill\scoop\apps\android-clt\current'
$env:NODE_ENV='production'
$env:GRADLE_OPTS='-Dorg.gradle.parallel=false -Dorg.gradle.workers.max=1'
cd C:\tf\apps\mobile\android
.\gradlew.bat clean app:assembleRelease --no-daemon --no-parallel --max-workers=1 -PreactNativeArchitectures=arm64-v8a
```

Resultado:

- `BUILD SUCCESSFUL`
- El script versionado `scripts/build-local-android.ps1` usa `JDK 17`, la ruta corta
  `C:\tf` y limita la release al ABI `arm64-v8a`, que es el ABI del Galaxy
  objetivo. No se debe interpretar esta salida como una build universal para
  todos los dispositivos Android.

APK generada:

```text
C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

### Build debug arm64 usada en el E2E offline del 29-07-2026

Una regeneración limpia volvió a seleccionar Java 25 y perdió la ruta del SDK.
El build correcto fijó ambas rutas en la misma consola y limitó la compilación
al ABI del Galaxy:

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

Resultado literal:

```text
BUILD SUCCESSFUL in 1m 2s
348 actionable tasks: 32 executed, 316 up-to-date
```

Sin `-PreactNativeArchitectures=arm64-v8a`, el build limpio compila también
ABIs de emulador y 32 bits y puede tardar mucho más. Java 25 produjo el error
`JvmVendorSpec ... IBM_SEMERU`; JDK 17 es obligatorio en esta máquina.

## 18. Comprobacion del dispositivo y prueba de instalacion

Se confirmo el Galaxy por ADB:

```powershell
adb devices
```

Intento de instalar encima:

```powershell
adb install -r "C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
```

Resultado historico:

- Una build antigua produjo `INSTALL_FAILED_UPDATE_INCOMPATIBLE` al intentar
  actualizar una instalación firmada por EAS. Ese resultado no describe la
  release local v5 actual: la v5 está firmada con la clave local
  `CN=TopoField Android Release`.

Regla actual:

- Antes de instalar, comparar la huella de la APK con la instalación existente.
- Si coincide, usar `adb install -r` para conservar sesión y datos locales.
- Si no coincide, no desinstalar automáticamente: la desinstalación borra la
  sesión y la caché offline y requiere una decisión explícita.

## 19. Intento de usar EAS local con la firma remota

Se intento:

```powershell
cd C:\tf\apps\mobile
npx eas-cli build -p android --profile preview --local --output C:\tf\topofield-preview-local.apk --non-interactive
```

Resultado:

- fallo porque `eas build --local` exige macOS o Linux para Android local

Interpretacion:

- en este Windows no hay ruta EAS local oficial para Android
- la build valida fue la de Gradle directo

## 20. Automatizacion dejada en el repo

Se creo el script:

- [scripts/build-local-android.ps1](./scripts/build-local-android.ps1)

Y se expuso con comando raiz:

```powershell
npm run mobile:build-local-android
```

Este comando hace:

1. asegura `JAVA_HOME` y Android SDK
2. crea la union `C:\tf` si falta
3. ejecuta `expo prebuild --clean`
4. compila release con Gradle en la ruta corta
5. deja la APK lista

## Antes de compilar un release local: `.env` obligatorio (hallazgo 07-08-2026)

**`apps/mobile/eas.json` no aplica a este script.** Ese archivo define `EXPO_PUBLIC_API_BASE_URL` y `EXPO_PUBLIC_GUEST_PUBLIC_TOKEN` por perfil (`preview`/`production`), pero esos valores **solo los inyecta `eas build` en la nube**. `scripts/build-local-android.ps1` nunca lee `eas.json` ni exporta esas variables antes de `expo prebuild`/`gradlew`.

Sin ellas, `apps/mobile/lib/api.ts` construye `API_BASE_URL` vacío en producción y lanza a propósito "La URL de API no está configurada para esta versión de la app." al primer intento de red — es el código funcionando como debe, no un bug. Sin esto la app abre pero no puede cargar Obras, ni ninguna pantalla que dependa del backend.

**Antes de `npm run mobile:build-local-android` para un release real**, crea (una sola vez, no se versiona) `apps/mobile/.env`:

```
EXPO_PUBLIC_API_BASE_URL=https://la-libreta-del-peon-1.onrender.com/api/v1
EXPO_PUBLIC_GUEST_PUBLIC_TOKEN=<mismo valor que GUEST_PUBLIC_TOKEN en el backend de Render>
```

Cubierto por `.gitignore` (`.env`), igual que el keystore de firma — nunca se commitea. Plantilla de referencia en `apps/mobile/.env.example` (apunta a `localhost`, válido solo para desarrollo local con backend en tu máquina, no para un release real).

## 21. Estado final real (verificado 13-09-2026)

- Build Android local gratuita: resuelta
- APK local v7: generada y firmada correctamente para `arm64-v8a`
- AAB local v7: generada y validada con Bundletool
- Firma verificada: `CN=TopoField Android Release`
- Package: `com.ciudadanoinusual.topofield`
- `versionCode`: `7`
- Galaxy: detectable como `R5CY21X6FLE device`; `adb install -r` devolvió
  `Success` y la validación física v7 de lectura/foto offline, reinicio,
  reconexión y unicidad quedó documentada en
  `docs/field/F5_HALLAZGOS_2026-09-13.md`
- La configuración de firma está fuera del repo en
  `%USERPROFILE%\.topofield\android\topofield-release.properties`; el keystore
  y las contraseñas no se versionan

## 21a. Preparación local v8 (13-09-2026)

La release local `versionCode=8` incorpora el resultado operativo por punto y
los motivos rápidos de visitas de montaje. `npm run mobile:build-local-android`
terminó con `BUILD SUCCESSFUL in 8m 49s` después de que el script reintentara
`bundleRelease` sin `clean` por el fallo de Ninja
`manifest 'build.ninja' still dirty after 100 tries`.

- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`
- Firma: `CN=TopoField Android Release`
- SHA-256: `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`
- Instalación: pendiente; `adb devices -l` devolvió `List of devices attached`
  sin dispositivos y `adb.exe: no devices/emulators found`.

## 21b. Preparación local v9 (13-09-2026)

La release local `versionCode=9` incorpora la separación visual entre trabajo
declarado por el operario y lectura metrológica pendiente. `npm run
mobile:build-local-android` terminó con `BUILD SUCCESSFUL in 8m 25s` después de
que el script reintentara `bundleRelease` sin `clean` por el fallo de Ninja
`manifest 'build.ninja' still dirty after 100 tries`.

- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`
- APK arm64: `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`
- Paquete: `com.ciudadanoinusual.topofield`
- `versionCode`: `9`; `versionName`: `1.0.0`
- Firma: `CN=TopoField Android Release`
- SHA-256: `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`
- Verificación: `apksigner verify --verbose` devolvió `Verifies`, esquema V2
  `true`, y `apkanalyzer` confirmó el paquete y la versión.
- Instalación: `adb install -r` devolvió `Success`.
- Dispositivo: `R5CY21X6FLE device`, modelo `SM_S938B`.
- `dumpsys package`: `versionCode=10`, `versionName=1.0.0`,
  `firstInstallTime=2026-08-07 10:49:51`,
  `lastUpdateTime=2026-09-13 11:52:50`.
- Smoke test: `adb shell monkey` lanzó la app y `uiautomator dump` mostró
  `LA LIBRETA DEL PEÓN`, `Seleccionar obra`, `Cargando obras...` y las
  pestañas principales. No se hizo login ni se registraron datos.

## 21c. Preparación local v10 (13-09-2026)

La release local `versionCode=10` incorpora el resumen de trabajo asignado en
el `Parte diario`, además de los estados y motivos de ejecución ya incluidos
en v9. `npm run mobile:build-local-android` terminó con `BUILD SUCCESSFUL in
6m 59s` después del reintento incremental por el fallo de Ninja
`manifest 'build.ninja' still dirty after 100 tries`.

- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`
- APK arm64: `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`
- Paquete: `com.ciudadanoinusual.topofield`
- `versionCode`: `10`; `versionName`: `1.0.0`
- Firma: `CN=TopoField Android Release`
- SHA-256: `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`
- Verificación: `apksigner verify --verbose` devolvió `Verifies`, esquema V2
  `true`, y `apkanalyzer` confirmó el paquete y la versión.
- Instalación: `adb install -r` devolvió `Success`.
- Dispositivo: `R5CY21X6FLE device`, modelo `SM_S938B`.
- `dumpsys package`: `versionCode=10`, `versionName=1.0.0`,
  `firstInstallTime=2026-08-07 10:49:51`,
  `lastUpdateTime=2026-09-13 11:52:50`.
- Smoke test: `adb shell monkey` lanzó la app y `uiautomator dump` mostró
  `LA LIBRETA DEL PEÓN`, `Seleccionar obra`, `Cargando obras...` y las
  pestañas principales. No se hizo login ni se registraron datos.

## 21d. Preparación local e instalación v11 (13-09-2026)

La release local `versionCode=11` incorpora las acciones `Continuar ronda` y
`Parte de zona` al bloque `Mi trabajo asignado` del `Parte diario`. El build
principal terminó con `BUILD SUCCESSFUL in 8m 20s`; la APK arm64 se ensambló
con `BUILD SUCCESSFUL in 1m`. La limpieza completa volvió a quedar fuera del
camino por el problema conocido de Ninja; el reintento incremental no borra el
árbol generado.

- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab` (`40,152,373` bytes)
- APK arm64: `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk` (`53,446,114` bytes)
- Paquete: `com.ciudadanoinusual.topofield`
- `versionCode`: `11`; `versionName`: `1.0.0`
- Firma: `CN=TopoField Android Release`
- SHA-256: `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`
- `apksigner verify --verbose`: `Verifies`, V2 `true`, un firmante.
- Instalación: `adb install -r` devolvió literalmente `Success`.
- Dispositivo: `R5CY21X6FLE device`, modelo `SM_S938B`.
- `dumpsys package`: `versionCode=11`, `versionName=1.0.0`,
  `firstInstallTime=2026-08-07 10:49:51`,
  `lastUpdateTime=2026-09-13 12:12:48`.
- Smoke test: `adb shell monkey` dejó `topResumedActivity` en
  `com.ciudadanoinusual.topofield/.MainActivity`; `uiautomator dump` mostró
  `LA LIBRETA DEL PEÓN`, `Seleccionar obra`, `Cargando obras...`, `Reintentar`
  y las pestañas principales. El logcat filtrado no mostró `FATAL EXCEPTION` ni
  `ReactNativeJS`. No se hizo login ni se registraron datos remotos.

## 21e. Preparación local e instalación v12 (13-09-2026)

La release local `versionCode=12` incorpora `Semana operativa` al `Parte
diario`: las rondas reales se agrupan de lunes a viernes, se ordenan por fecha
y `executionOrder`, y las asignaciones de otras fechas quedan en `Otras
fechas`. Cada fila abre su ronda sin crear recurrencias nuevas.

- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab` (`40,154,257` bytes)
- APK arm64: `C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk` (`53,450,274` bytes)
- Paquete: `com.ciudadanoinusual.topofield`
- `versionCode`: `12`; `versionName`: `1.0.0`
- Firma: `CN=TopoField Android Release`
- SHA-256: `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`
- `apksigner verify --verbose`: `Verifies`, V2 `true`, un firmante.
- Instalación: `adb install -r` devolvió literalmente `Success`.
- Dispositivo: `R5CY21X6FLE device`, modelo `SM_S938B`.
- `dumpsys package`: `versionCode=12`, `versionName=1.0.0`,
  `firstInstallTime=2026-08-07 10:49:51`,
  `lastUpdateTime=2026-09-13 12:32:01`.
- Smoke test: `adb shell monkey` dejó `topResumedActivity` en
  `com.ciudadanoinusual.topofield/.MainActivity`; `uiautomator dump` recuperó
  la ronda cacheada `E2E-Galaxy-20260731-Atc` y mostró `Trabajo declarado`,
  `Preparar sin conexión`, `Parte de zona` y el cierre bloqueado por `1 puntos
  pendientes`. El logcat de aplicación no mostró `FATAL EXCEPTION`. No se
  hicieron nuevas lecturas, fotos ni cambios remotos.

## 21f. Preparación local v13 para backend 029+030 (16-09-2026)

La release `versionCode=13` corresponde al cliente que contiene work-execution
y la planificación semanal editable después de desplegar el backend
`349967a538a3a5e8f4c51245d02511b7ec6cce69` con readiness 029+030.

- Commit de versionado: `c15e793 chore(mobile): prepare Android release v13`.
- TypeScript móvil: código `0`.
- Jest móvil: `25` suites, `137/137` tests.
- `npm run mobile:build-local-android`: el `clean` reprodujo el problema conocido
  `ninja: error: manifest 'build.ninja' still dirty after 100 tries`; el fallback
  versionado ejecutó `bundleRelease` sin `clean` y terminó con
  `BUILD SUCCESSFUL in 11m 5s`.
- AAB: `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`
  (`40.170.854` bytes); `bundletool 1.18.3 validate` terminó con código `0`.
- Un `app:assembleRelease` posterior no demostró un bug de código: falló por
  `Filename longer than 260 characters` en codegen/CMake de Windows.
- Para no modificar fuentes por ese límite del entorno, Bundletool generó desde
  la AAB una APK universal firmada (`53.598.615` bytes).
- `apksigner`: `Verifies`; esquema V2 `true`; certificado
  `CN=TopoField Android Release`; SHA-256
  `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`.
- `aapt2`: `com.ciudadanoinusual.topofield`, `versionCode=13`,
  `versionName=1.0.0`.
- Instalación: pendiente. `adb devices -l` devolvió `List of devices attached`
  sin dispositivos. No se desinstaló ni modificó el Galaxy.

## 21g. Release final v15 reconciliada (17-09-2026)

La candidata vigente **no** es v14 ni el primer APK generado con etiqueta v15.
Después de los fixes de sesión `c05b7d0`, `14aa286` y `174d5e4`, la build final
se generó una sola vez y quedó reconciliada contra los artefactos reales:

- AAB canónica:
  `C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab`.
- Tamaño AAB: `40.173.432` bytes.
- SHA-256 AAB:
  `09F6FE2E439BB93C553BFE95D32BA42307D39051116955B270D37E47524BFBD5`.
- `bundletool-all-1.18.3 validate`: código `0`.
- Manifest de Bundletool y `aapt2`: paquete
  `com.ciudadanoinusual.topofield`, `versionCode=15`, `versionName=1.0.0`,
  `minSdkVersion=24`, `targetSdkVersion=36`, `compileSdkVersion=36`.
- Certificado del AAB: SHA-256
  `95:13:A8:DB:52:4E:87:BA:92:AB:FE:F2:24:CF:A2:BD:EA:36:05:C4:F5:19:FF:B1:6B:F0:72:68:1F:F2:53:30`.
- Bundletool produjo el conjunto final
  `stage4-evidence-20260917\v15\topofield-v15-174d5e4.apks`
  (`53.598.930` bytes).
- APK universal **canónica** para una reinstalación física, si llegara a ser
  necesaria:
  `stage4-evidence-20260917\v15\topofield-v15-universal.apk`.
- Tamaño APK: `53.598.615` bytes.
- SHA-256 APK:
  `AC7920C18EF0394E2DC40E8A42BF84A1E0E4328656B4F2914A3457A1732ADF25`.
- `apksigner verify --verbose --print-certs`: `Verifies`, V2 `true`, V3
  `true`, un firmante, `CN=TopoField Android Release`, certificado SHA-256
  `9513a8db524e87ba92abfef224cfa2bdea3605c4f519ffb16bf072681ff25330`.

Existe además
`stage4-evidence-20260917\v15-universal\universal.apk`, con el mismo tamaño pero
SHA-256 `F716599A79BC7A6CE91357F88A270B6EF1A98DF9A06EF030C919BB49A643BDE5`.
Ese archivo es **pre-final** y no debe instalarse ni citarse como la candidata
v15 vigente.

La APK final canónica se instaló con `adb install -r` y `dumpsys package`
registró `lastUpdateTime=2026-09-17 21:47:54`. Después superó la regresión
física de sesión offline/reinicio/reconexión descrita en `ROADMAP.md` y
`PILOT_READINESS_CHECKLIST.md`. Por tanto, mientras el dispositivo permanezca
desconectado no se lanza otra build ni se reinstala nada.

## 21h. Release incremental v16 para recuperar evidencia F7 (18-09-2026)

v16 no se creó por lectura preventiva de código. La prueba física F7 reprodujo
primero en v15 un fallo determinista: una evidencia de montaje capturada offline
sobre una visita ya sincronizada se persistía con `visitClientRequestId=null`,
pero el validador de replay rechazaba cualquier valor que no fuera `undefined`
o `string`, dejando el mismo ítem en error terminal
`Invalid mounting evidence outbox payload`.

La corrección quedó limitada a aceptar explícitamente `null` en ese campo,
manteniendo la rama de recreación de visita únicamente cuando existe un
`string`, y a una regresión que comprueba que la evidencia usa el `visitId`
remoto sin recrear la visita. Se incrementó `versionCode` a `16`.

- Test específico `sync-handlers`: `11/11` PASS.
- TypeScript móvil: PASS.
- Suite móvil completa: `25` suites / `144` tests PASS.
- `npm run verify:pre-apk:local`: PASS para backend build, TypeScript y export
  Android. Esto es evidencia local, no CI.
- `npm run mobile:build-local-android`: el `clean` reprodujo el problema ya
  conocido `manifest 'build.ninja' still dirty after 100 tries`; el fallback
  sin `clean` terminó `BUILD SUCCESSFUL in 5m 19s`.
- AAB: `40.173.432` bytes, SHA-256
  `4E3CA6D1A20A92BA3F26BC6C9FE39ABF444F920FDE9FECBF33A709AED6A6B48E`.
- Bundletool 1.18.3: `validate` código `0`; paquete
  `com.ciudadanoinusual.topofield`, `versionCode=16`, `versionName=1.0.0`,
  minSdk 24, targetSdk 36, compileSdk 36.
- Conjunto `.apks`:
  `stage4-evidence-20260917\v16\topofield-v16-f7-recovery.apks`,
  `53.598.930` bytes, SHA-256
  `72137046ACA5DF5853B0E60DAAF98156A21A7626D9AB375671D425D004876095`.
- APK universal:
  `stage4-evidence-20260917\v16\topofield-v16-universal.apk`,
  `53.598.615` bytes, SHA-256
  `171D37667C37A1752362588822906FF0DB2A4D229C339B98E6FD96DDCF601276`.
- `apksigner`: `Verifies`, V2 `true`, V3 `true`, un firmante y el mismo
  certificado SHA-256
  `9513a8db524e87ba92abfef224cfa2bdea3605c4f519ffb16bf072681ff25330`.
- `adb install -r` devolvió `Success`; `firstInstallTime` permaneció en
  `2026-08-07 10:49:51` y `lastUpdateTime` pasó a
  `2026-09-18 00:40:18`, por lo que no hubo desinstalación.

Después de instalar v16, Perfil seguía mostrando **el mismo** error v15 con
`Intentos: 1`; no se recapturó la foto. Un único `Reintentar` sobre ese ítem
persistido terminó `1/1 synced` y dejó `No hay operaciones bloqueadas`. La
consulta server-side y Storage confirmaron una sola evidencia con el mismo UUID
y un único JPEG en la ruta esperada. Esta recuperación demuestra que la
actualización preservó sesión, SQLite/outbox y el archivo local pendiente.

## 22. Proximos pasos posibles

### Opcion A - revalidar la instalación actual

La última evidencia válida ya tiene v16 instalada. Antes de cualquier prueba
física futura, comprobar el estado real sin reabrir trabajo demostrado:

```powershell
adb devices -l
adb shell dumpsys package com.ciudadanoinusual.topofield
```

Si sigue en `versionCode=16`, continuar directamente con las pruebas que todavía
sean necesarias. Si por alguna razón el dispositivo hubiera vuelto a una
versión anterior y fuera necesario recuperar el fix F7, reinstalar la universal
v16 verificada preservando datos:

```powershell
adb install -r "C:\Users\guill\Documents\Aplicacion_Movil\topofield\stage4-evidence-20260917\v16\topofield-v16-universal.apk"
```

Si aparece `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, detenerse. Solo después de que
Erick confirme explícitamente la pérdida de sesión y caché offline se puede
ejecutar `adb uninstall com.ciudadanoinusual.topofield` y repetir la instalación.
No se debe presentar la desinstalación como paso normal de una actualización
firmada con la misma identidad.

### Opcion B - mantener actualizacion sin desinstalar

Conseguir la misma keystore de EAS y usarla para firmar la build local.

Eso requiere:

- recuperar/exportar la keystore remota de Expo
- configurar firma release local con esa misma clave

Coste:

- mas trabajo de credenciales
- pero permite actualizar encima sin borrar la app

## 23. Firma release local (31-07-2026)

La firma de produccion se configura localmente, fuera del repositorio. El
script versionado `scripts/configure-local-android-signing.ps1` se ejecuta
despues de cada `expo prebuild` desde `scripts/build-local-android.ps1` y
reemplaza la firma release de depuracion por la clave local indicada en:

```text
%USERPROFILE%\.topofield\android\topofield-release.properties
```

Ese archivo y el `.jks` nunca se versionan. `*.jks` esta cubierto por
`.gitignore`. La build release local pasa a generar un Android App Bundle:

```powershell
npm run mobile:build-local-android
```

El resultado esperado queda en:

```text
C:\tf\apps\mobile\android\app\build\outputs\bundle\release\app-release.aab
```

Un AAB no se instala con `adb install` directamente: para una prueba local se
convierte a un conjunto `.apks` mediante Bundletool y se instala ese conjunto.
No subir el AAB a Play Store hasta conservar dos copias externas del keystore y
las credenciales de firma en un gestor de contrasenas.
