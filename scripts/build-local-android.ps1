$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileRoot = Join-Path $repoRoot "apps\mobile"
$signingScript = Join-Path $repoRoot "scripts\configure-local-android-signing.ps1"
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
  & $signingScript -AndroidAppBuildGradlePath (Join-Path $shortRoot "apps\mobile\android\app\build.gradle")
  Push-Location (Join-Path $shortRoot "apps\mobile\android")
  try {
    .\gradlew.bat clean app:bundleRelease --no-daemon --no-parallel --max-workers=1 -PreactNativeArchitectures=arm64-v8a
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}

$aabPath = Join-Path $shortRoot "apps\mobile\android\app\build\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $aabPath)) {
  throw "Build completada sin encontrar AAB en $aabPath"
}

Write-Host ""
Write-Host "AAB generada:"
Write-Host $aabPath
