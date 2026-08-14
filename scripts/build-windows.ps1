param(
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"
$scriptStartTime = Get-Date

# Tauri reads CI as a boolean and rejects common values such as CI=1.
if ($env:CI -and $env:CI -notin @("true", "false")) {
  $env:CI = "true"
}

function Invoke-BuildStep {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }

  $stopwatch.Stop()
  Write-Host "Completed in $($stopwatch.Elapsed.ToString('mm\:ss'))." -ForegroundColor DarkGray
}

function Assert-CommandAvailable {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command was not found: $Name"
  }
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Assert-CommandAvailable -Name "node"
Assert-CommandAvailable -Name "npm.cmd"
Assert-CommandAvailable -Name "cargo"

if (-not (Test-Path -LiteralPath "node_modules")) {
  Invoke-BuildStep -Label "Install dependencies" -Command {
    & npm.cmd ci
  }
}

$packageJson = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
$tauriConfig = Get-Content -LiteralPath "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json

if ($packageJson.version -ne $tauriConfig.version) {
  throw "Version mismatch: package.json=$($packageJson.version), tauri.conf.json=$($tauriConfig.version)."
}

Write-Host "MDView Windows packaging" -ForegroundColor Green
Write-Host "Version: $($packageJson.version)"

if (-not $SkipChecks) {
  Invoke-BuildStep -Label "Run tests" -Command {
    & npm.cmd test -- --run
  }

  Invoke-BuildStep -Label "Run lint" -Command {
    & npm.cmd run lint
  }
}

function Get-Sha256Hash {
  param([string]$Path)

  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    return [System.BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace("-", "").ToLowerInvariant()
  } finally {
    $stream.Dispose()
    $algorithm.Dispose()
  }
}

$bundleRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "src-tauri/target/release/bundle"))
$bundlePrefix = $bundleRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
foreach ($directoryName in @("msi", "portable", "setup")) {
  $outputPath = [System.IO.Path]::GetFullPath((Join-Path $bundleRoot $directoryName))
  if (-not $outputPath.StartsWith($bundlePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean a bundle directory outside the expected output root: $outputPath"
  }
  Remove-Item -LiteralPath $outputPath -Recurse -Force -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath (Join-Path $bundleRoot "SHA256SUMS.txt") -Force -ErrorAction SilentlyContinue

Invoke-BuildStep -Label "Build Windows MSI" -Command {
  & npm.cmd run desktop:build -- --bundles msi
}

Invoke-BuildStep -Label "Build Windows portable ZIP" -Command {
  & npm.cmd run portable:windows
}

$msiArtifacts = @(
  Get-ChildItem -Path "src-tauri/target/release/bundle/msi/*_en-US.msi" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $scriptStartTime }
)
$portableArtifacts = @(
  Get-ChildItem -Path "src-tauri/target/release/bundle/portable/*.zip" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $scriptStartTime }
)
$artifacts = @($msiArtifacts) + @($portableArtifacts)

if ($msiArtifacts.Count -ne 1 -or $portableArtifacts.Count -ne 1) {
  throw "Packaging completed, but exactly one en-US MSI and one portable ZIP were not found."
}

$checksumPath = Join-Path $repoRoot "src-tauri/target/release/bundle/SHA256SUMS.txt"
$artifacts | ForEach-Object {
  "$(Get-Sha256Hash -Path $_.FullName)  $($_.Name)"
} | Set-Content -LiteralPath $checksumPath -Encoding ascii

Write-Host ""
Write-Host "Packaging completed successfully:" -ForegroundColor Green
$outputArtifacts = @($artifacts) + @(Get-Item -LiteralPath $checksumPath)
foreach ($artifact in $outputArtifacts | Sort-Object FullName) {
  $sizeMb = [math]::Round($artifact.Length / 1MB, 2)
  Write-Host "  $($artifact.FullName) ($sizeMb MB)"
}
