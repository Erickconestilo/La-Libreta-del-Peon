param(
  [Parameter(Mandatory = $true)]
  [string]$AndroidAppBuildGradlePath
)

$ErrorActionPreference = 'Stop'

$propertiesPath = Join-Path $HOME '.topofield\android\topofield-release.properties'

if (-not (Test-Path $propertiesPath)) {
  throw "No existe la configuracion local de firma en $propertiesPath"
}

$properties = @{}
foreach ($line in Get-Content -LiteralPath $propertiesPath) {
  if ($line -match '^\s*([^#=]+?)\s*=\s*(.*)$') {
    $properties[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$requiredKeys = @('keyAlias', 'keyPassword', 'storeFile', 'storePassword')
foreach ($key in $requiredKeys) {
  if ([string]::IsNullOrWhiteSpace($properties[$key])) {
    throw "Falta '$key' en $propertiesPath"
  }
}

if (-not (Test-Path $properties.storeFile)) {
  throw "No existe el keystore configurado en $($properties.storeFile)"
}

$content = Get-Content -LiteralPath $AndroidAppBuildGradlePath -Raw
$markerStart = '// TOPOFIELD_LOCAL_RELEASE_SIGNING_START'
$markerEnd = '// TOPOFIELD_LOCAL_RELEASE_SIGNING_END'

if ($content.Contains($markerStart) -or $content.Contains($markerEnd)) {
  throw 'El build.gradle generado ya contiene una configuracion de firma TopoField.'
}

$propertiesBlock = @"
$markerStart
def topofieldReleaseProperties = new Properties()
def topofieldReleasePropertiesFile = file(System.getProperty('user.home') + '/.topofield/android/topofield-release.properties')
if (!topofieldReleasePropertiesFile.exists()) {
    throw new GradleException('Missing local TopoField release signing properties')
}
topofieldReleasePropertiesFile.withInputStream { topofieldReleaseProperties.load(it) }
def topofieldReleaseStoreFile = file(topofieldReleaseProperties.getProperty('storeFile'))
if (!topofieldReleaseStoreFile.exists()) {
    throw new GradleException('Missing local TopoField release keystore')
}
$markerEnd
"@

$content = $content.Replace("def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()", "def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()`n`n$propertiesBlock")

$releaseSigningConfig = @"
    signingConfigs {
        release {
            storeFile topofieldReleaseStoreFile
            storePassword topofieldReleaseProperties.getProperty('storePassword')
            keyAlias topofieldReleaseProperties.getProperty('keyAlias')
            keyPassword topofieldReleaseProperties.getProperty('keyPassword')
        }
"@

$content = $content.Replace('    signingConfigs {', $releaseSigningConfig)
$buildTypesStart = $content.IndexOf('    buildTypes {')

if ($buildTypesStart -lt 0) {
  throw 'No se encontro el bloque buildTypes esperado en build.gradle generado por Expo.'
}

$beforeBuildTypes = $content.Substring(0, $buildTypesStart)
$buildTypes = $content.Substring($buildTypesStart)
$releasePattern = '(?s)(        release \{.*?)(            signingConfig signingConfigs\.debug)'

if ($buildTypes -notmatch $releasePattern) {
  throw 'No se encontro el bloque release esperado en build.gradle generado por Expo.'
}

$buildTypes = [regex]::Replace($buildTypes, $releasePattern, '$1            signingConfig signingConfigs.release', 1)
$content = $beforeBuildTypes + $buildTypes
[System.IO.File]::WriteAllText($AndroidAppBuildGradlePath, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "Firma release local configurada en $AndroidAppBuildGradlePath"
