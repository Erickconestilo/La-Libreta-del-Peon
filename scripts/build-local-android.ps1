$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$shortRoot = "C:\tf"
$sdkRoot = "C:\Users\guill\scoop\apps\android-clt\current"
$javaHome = "C:\Users\guill\scoop\apps\temurin17-jdk\current"

if (-not (Test-Path $sdkRoot)) {
  throw "Android SDK CLI no encontrado en $sdkRoot. Instala 'android-clt' con scoop."
}

if (-not (Test-Path $javaHome)) {
  throw "JDK 17 no encontrado en $javaHome. Instala 'temurin17-jdk' con scoop."
}

if (-not (Test-Path $shortRoot)) {
  cmd /c "mklink /J $shortRoot $repoRoot" | Out-Null
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_HOME = $sdkRoot
$env:NODE_ENV = "production"
$env:GRADLE_OPTS = "-Dorg.gradle.parallel=false -Dorg.gradle.workers.max=1"
$env:PATH = "$javaHome\bin;$sdkRoot\platform-tools;$env:PATH"

Write-Host "Prebuild Android desde ruta corta..."
Push-Location (Join-Path $shortRoot "apps\mobile")
try {
  npx expo prebuild --platform android --clean --no-install
  Push-Location (Join-Path $shortRoot "apps\mobile\android")
  try {
    .\gradlew.bat clean app:assembleRelease --no-daemon --no-parallel --max-workers=1 -PreactNativeArchitectures=arm64-v8a
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}

$apkPath = Join-Path $shortRoot "apps\mobile\android\app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $apkPath)) {
  throw "Build completada sin encontrar APK en $apkPath"
}

Write-Host ""
Write-Host "APK generada:"
Write-Host $apkPath
