param(
  [string]$Version = "",
  [string]$ReleaseDir = "src-tauri/target/release",
  [string]$OutputDir = "src-tauri/target/release/bundle/portable"
)

$ErrorActionPreference = "Stop"

function Resolve-OrCreateDirectory {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($Version)) {
  $packageJson = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
  $Version = $packageJson.version
}

if ($Version -notmatch "^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$") {
  throw "Version must use major.minor.patch format. Received: $Version"
}

$releasePath = (Resolve-Path -LiteralPath $ReleaseDir).Path
$outputPath = Resolve-OrCreateDirectory -Path $OutputDir
$exePath = Join-Path $releasePath "MDView.exe"

if (-not (Test-Path -LiteralPath $exePath)) {
  throw "MDView.exe was not found at $exePath. Run npm run desktop:build -- --bundles msi first."
}

$portableName = "MDView_$Version`_windows_x64_portable"
$stagingPath = Join-Path $outputPath $portableName
$zipPath = Join-Path $outputPath "${portableName}.zip"

$resolvedOutput = (Resolve-Path -LiteralPath $outputPath).Path
if (Test-Path -LiteralPath $stagingPath) {
  $resolvedStaging = (Resolve-Path -LiteralPath $stagingPath).Path
  if (-not $resolvedStaging.StartsWith($resolvedOutput, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove staging path outside output directory: $resolvedStaging"
  }
  Remove-Item -LiteralPath $stagingPath -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stagingPath | Out-Null

Copy-Item -LiteralPath $exePath -Destination (Join-Path $stagingPath "MDView.exe")
Set-Content -LiteralPath (Join-Path $stagingPath "MDView.portable") -Value "MDView portable distribution" -Encoding ASCII

$filePatterns = @("*.dll", "*.pak", "*.bin", "*.dat")
foreach ($pattern in $filePatterns) {
  Get-ChildItem -LiteralPath $releasePath -Filter $pattern -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stagingPath
  }
}

$optionalDirectories = @("resources", "locales")
foreach ($directoryName in $optionalDirectories) {
  $sourceDirectory = Join-Path $releasePath $directoryName
  if (Test-Path -LiteralPath $sourceDirectory) {
    Copy-Item -LiteralPath $sourceDirectory -Destination $stagingPath -Recurse
  }
}

if (Test-Path -LiteralPath "LICENSE") {
  Copy-Item -LiteralPath "LICENSE" -Destination $stagingPath
}

@"
MDView Windows Portable
Version: $Version

Run MDView.exe directly after extracting this ZIP archive.

Notes:
- This portable package does not install MDView.
- It does not register .md or .markdown file associations.
- Updates open GitHub Releases so this package remains portable.
- WebView2 Runtime is still required on Windows.
"@ | Set-Content -LiteralPath (Join-Path $stagingPath "README-portable.txt") -Encoding UTF8

$archiveItems = Get-ChildItem -LiteralPath $stagingPath -Force
if ($archiveItems.Count -eq 0) {
  throw "Portable staging directory is empty: $stagingPath"
}

Compress-Archive -LiteralPath $archiveItems.FullName -DestinationPath $zipPath -CompressionLevel Optimal

if (-not (Test-Path -LiteralPath $zipPath)) {
  throw "Portable ZIP was not created: $zipPath"
}

Write-Output "Created portable package: $zipPath"
