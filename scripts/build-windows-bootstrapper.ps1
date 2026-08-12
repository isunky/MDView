param(
  [string]$MsiDirectory = "src-tauri\target\release\bundle\msi",
  [string]$OutputDirectory = "src-tauri\target\release\bundle\setup"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$package = Get-Content -LiteralPath "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$msiRoot = (Resolve-Path -LiteralPath $MsiDirectory).Path
$englishMsi = Get-ChildItem -LiteralPath $msiRoot -Filter "*_$($package.version)_*_en-US.msi" -File | Select-Object -First 1
$chineseMsi = Get-ChildItem -LiteralPath $msiRoot -Filter "*_$($package.version)_*_zh-CN.msi" -File | Select-Object -First 1

if (-not $englishMsi -or -not $chineseMsi) {
  throw "Expected both en-US and zh-CN MSI files in $msiRoot."
}

$torch = Get-ChildItem (Join-Path $env:LOCALAPPDATA "tauri") -Recurse -Filter "torch.exe" -File -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1
if (-not $torch) {
  throw "WiX torch.exe was not found in the Tauri tools cache. Build the MSI packages first."
}

$transformPath = Join-Path $msiRoot "MDView_$($package.version)_zh-CN.mst"
Remove-Item -LiteralPath $transformPath -Force -ErrorAction SilentlyContinue
# Equivalent to WiX's language transform defaults, with code-page changes allowed.
& $torch.FullName -nologo -serr a -serr b -serr c -serr d -serr e -serr f -val r $englishMsi.FullName $chineseMsi.FullName -out $transformPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $transformPath)) {
  throw "Failed to generate the zh-CN MSI language transform."
}

$cscCandidates = @(
  (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$csc = $cscCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $csc) {
  throw "The .NET Framework C# compiler was not found."
}

$outputRoot = Join-Path $repoRoot $OutputDirectory
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$outputPath = Join-Path $outputRoot "MDView_$($package.version)_x64_setup.exe"
$sourcePath = Join-Path $repoRoot "src-tauri\windows\bootstrapper\Program.cs"
$iconPath = Join-Path $repoRoot "src-tauri\icons\icon.ico"
$assemblyInfoPath = Join-Path $env:TEMP "MDView.Setup.AssemblyInfo.$([guid]::NewGuid().ToString('N')).cs"
$assemblyVersion = "$($package.version).0"

@"
using System.Reflection;
[assembly: AssemblyTitle("MDView Setup")]
[assembly: AssemblyDescription("Bilingual offline installer for MDView")]
[assembly: AssemblyCompany("Sunky")]
[assembly: AssemblyProduct("MDView")]
[assembly: AssemblyCopyright("Copyright Sunky")]
[assembly: AssemblyVersion("$assemblyVersion")]
[assembly: AssemblyFileVersion("$assemblyVersion")]
"@ | Set-Content -LiteralPath $assemblyInfoPath -Encoding UTF8

$compilerArguments = @(
  "/nologo",
  "/target:winexe",
  "/optimize+",
  "/platform:anycpu",
  "/win32icon:$iconPath",
  "/out:$outputPath",
  "/resource:$($englishMsi.FullName),MDView.en-US.msi",
  "/resource:$transformPath,MDView.zh-CN.mst",
  "/reference:System.dll",
  "/reference:System.Windows.Forms.dll",
  $sourcePath,
  $assemblyInfoPath
)

try {
  & $csc @compilerArguments
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputPath)) {
    throw "Failed to build the bilingual Windows setup launcher."
  }
} finally {
  Remove-Item -LiteralPath $assemblyInfoPath -Force -ErrorAction SilentlyContinue
}

$outputSize = (Get-Item -LiteralPath $outputPath).Length
$maximumExpectedSize = $englishMsi.Length + 1MB
if ($outputSize -gt $maximumExpectedSize) {
  throw "The bilingual setup unexpectedly contains more than one MSI payload."
}

$sizeMb = [math]::Round($outputSize / 1MB, 2)
$transformKb = [math]::Round((Get-Item -LiteralPath $transformPath).Length / 1KB, 1)
Write-Host "Created bilingual offline setup: $outputPath ($sizeMb MB, language transform $transformKb KB)" -ForegroundColor Green
