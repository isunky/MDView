param(
  [switch]$SkipChecks,
  [switch]$SkipPortable
)

$ErrorActionPreference = "Stop"
$scriptStartTime = Get-Date

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

Invoke-BuildStep -Label "Build Windows installers" -Command {
  & npm.cmd run desktop:build
}

if (-not $SkipPortable) {
  Invoke-BuildStep -Label "Build Windows portable package" -Command {
    & npm.cmd run portable:windows
  }
}

$artifactPatterns = @(
  "src-tauri/target/release/bundle/msi/*.msi",
  "src-tauri/target/release/bundle/nsis/*.exe",
  "src-tauri/target/release/bundle/portable/*.zip"
)

$artifacts = @(
  foreach ($pattern in $artifactPatterns) {
    Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTime -ge $scriptStartTime }
  }
)

if ($artifacts.Count -eq 0) {
  throw "Packaging completed, but no new Windows artifacts were found."
}

Write-Host ""
Write-Host "Packaging completed successfully:" -ForegroundColor Green
foreach ($artifact in $artifacts | Sort-Object FullName) {
  $sizeMb = [math]::Round($artifact.Length / 1MB, 2)
  Write-Host "  $($artifact.FullName) ($sizeMb MB)"
}
