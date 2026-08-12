param()

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$iconPath = Join-Path $repoRoot "src-tauri\icons\icon.png"
$outputDir = Join-Path $repoRoot "src-tauri\windows\assets"

if (-not (Test-Path -LiteralPath $iconPath)) {
  throw "Application icon was not found: $iconPath"
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

function New-RgbBitmap {
  param(
    [int]$Width,
    [int]$Height
  )

  return [System.Drawing.Bitmap]::new(
    $Width,
    $Height,
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
  )
}

function New-BrandBrush {
  param([System.Drawing.Rectangle]$Bounds)

  return [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $Bounds,
    [System.Drawing.ColorTranslator]::FromHtml("#2A9D82"),
    [System.Drawing.ColorTranslator]::FromHtml("#187A6D"),
    35.0
  )
}

function Set-Quality {
  param([System.Drawing.Graphics]$Graphics)

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
}

$icon = [System.Drawing.Image]::FromFile($iconPath)

try {
  $banner = New-RgbBitmap -Width 493 -Height 58
  $graphics = [System.Drawing.Graphics]::FromImage($banner)
  try {
    Set-Quality -Graphics $graphics
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F8FBFA"))

    $brandBounds = [System.Drawing.Rectangle]::new(414, 0, 79, 58)
    $brandBrush = New-BrandBrush -Bounds $brandBounds
    try {
      $graphics.FillRectangle($brandBrush, $brandBounds)
    } finally {
      $brandBrush.Dispose()
    }

    $lineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#DCE8E5"))
    try {
      $graphics.FillRectangle($lineBrush, 0, 56, 493, 2)
    } finally {
      $lineBrush.Dispose()
    }

    $graphics.DrawImage($icon, [System.Drawing.Rectangle]::new(431, 7, 44, 44))
  } finally {
    $graphics.Dispose()
  }
  try {
    $banner.Save(
      (Join-Path $outputDir "wix-banner.bmp"),
      [System.Drawing.Imaging.ImageFormat]::Bmp
    )
  } finally {
    $banner.Dispose()
  }

  $dialog = New-RgbBitmap -Width 493 -Height 312
  $graphics = [System.Drawing.Graphics]::FromImage($dialog)
  try {
    Set-Quality -Graphics $graphics
    $graphics.Clear([System.Drawing.Color]::White)

    $panelBounds = [System.Drawing.Rectangle]::new(0, 0, 164, 312)
    $panelBrush = New-BrandBrush -Bounds $panelBounds
    try {
      $graphics.FillRectangle($panelBrush, $panelBounds)
    } finally {
      $panelBrush.Dispose()
    }

    $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
    try {
      $graphics.FillEllipse($accentBrush, -52, 208, 210, 172)
    } finally {
      $accentBrush.Dispose()
    }

    $graphics.DrawImage($icon, [System.Drawing.Rectangle]::new(26, 35, 112, 112))

    $nameFont = [System.Drawing.Font]::new("Segoe UI", 23, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $taglineFont = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $softBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
    try {
      $graphics.DrawString("MDView", $nameFont, $whiteBrush, 27, 172)
      $graphics.DrawString("Markdown, made clear.", $taglineFont, $softBrush, 28, 205)
      $graphics.DrawString("Read  |  Edit  |  Export", $taglineFont, $softBrush, 28, 224)
    } finally {
      $nameFont.Dispose()
      $taglineFont.Dispose()
      $whiteBrush.Dispose()
      $softBrush.Dispose()
    }
  } finally {
    $graphics.Dispose()
  }
  try {
    $dialog.Save(
      (Join-Path $outputDir "wix-dialog.bmp"),
      [System.Drawing.Imaging.ImageFormat]::Bmp
    )
  } finally {
    $dialog.Dispose()
  }
} finally {
  $icon.Dispose()
}

Write-Host "Generated WiX assets in $outputDir" -ForegroundColor Green
