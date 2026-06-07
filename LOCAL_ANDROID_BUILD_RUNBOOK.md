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

APK generada:

```text
C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

## 18. Comprobacion del dispositivo y prueba de instalacion

Se confirmo el Galaxy por ADB:

```powershell
adb devices
```

Intento de instalar encima:

```powershell
adb install -r "C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
```

Resultado:

- error `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

Interpretacion:

- la APK local esta firmada con otra clave
- la APK instalada desde EAS usa la keystore remota de Expo
- por eso Android no permite actualizar una encima de la otra

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

- [scripts/build-local-android.ps1](C:/Users/guill/Documents/Aplicacion_Movil/topofield/scripts/build-local-android.ps1)

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

## 21. Estado final real

- Build Android local gratuita: resuelta
- APK local: generada correctamente
- Instalacion sobre la app EAS existente: bloqueada por firma distinta
- Keystore local encontrada:
  - solo `apps/mobile/android/app/debug.keystore`
- Keystore remota de EAS:
  - no quedo disponible localmente durante esta sesion

## 22. Proximos pasos posibles

### Opcion A - instalar la APK local ya mismo

Desinstalar la app actual del Galaxy y luego instalar la nueva:

```powershell
adb uninstall com.ciudadanoinusual.topofield
adb install "C:\tf\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
```

Coste:

- se pierde la instalacion actual y su sesion local

### Opcion B - mantener actualizacion sin desinstalar

Conseguir la misma keystore de EAS y usarla para firmar la build local.

Eso requiere:

- recuperar/exportar la keystore remota de Expo
- configurar firma release local con esa misma clave

Coste:

- mas trabajo de credenciales
- pero permite actualizar encima sin borrar la app
