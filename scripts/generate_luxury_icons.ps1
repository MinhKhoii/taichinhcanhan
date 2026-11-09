Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
if (-not $root) { $root = "E:\du_an\Quan_ly_chi_tieu\scripts" }
$projectRoot = Split-Path $root -Parent
$publicDir = Join-Path $projectRoot "public"
$htmlPath = Join-Path $projectRoot "scripts\render_icon.html"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

function Render-SvgToPng($svgFile, $out512File, $out192File) {
  $svgContent = Get-Content $svgFile -Raw
  $html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 512px; height: 512px; overflow: hidden; background: transparent; }
    svg { display: block; width: 512px; height: 512px; }
  </style>
</head>
<body>
$svgContent
</body>
</html>
"@
  Set-Content -Path $htmlPath -Value $html -Encoding UTF8

  # Render 512x512
  Start-Process $edgePath -ArgumentList "--headless", "--screenshot=`"$out512File`"", "--window-size=512,512", "--default-background-color=00000000", "`"file:///$($htmlPath.Replace('\', '/'))`"" -Wait

  # Resample to 192x192
  $src = [System.Drawing.Image]::FromFile($out512File)
  $dest = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dest)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, 192, 192)

  $dest.Save($out192File, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $dest.Dispose()
  $src.Dispose()
}

# 1. Render Transparent Icons (purpose: "any" - used for Android Splash Screen & web tab)
Write-Output "1. Rendering Transparent Icons (icon-512.png, icon-192.png) - NO SQUARE BOX..."
$svgTransparent = Join-Path $publicDir "favicon.svg"
$out512 = Join-Path $publicDir "icon-512.png"
$out192 = Join-Path $publicDir "icon-192.png"
Render-SvgToPng $svgTransparent $out512 $out192

# 2. Render Maskable Icons (purpose: "maskable" - used for phone Launcher adaptive icon)
Write-Output "2. Rendering Maskable Icons (icon-512-maskable.png, icon-192-maskable.png)..."
$svgMaskable = Join-Path $publicDir "favicon-maskable.svg"
$out512Mask = Join-Path $publicDir "icon-512-maskable.png"
$out192Mask = Join-Path $publicDir "icon-192-maskable.png"
Render-SvgToPng $svgMaskable $out512Mask $out192Mask

# Also copy 192-maskable to apple-touch-icon.png
$appleTouch = Join-Path $publicDir "apple-touch-icon.png"
Copy-Item -Path $out192Mask -Destination $appleTouch -Force

Write-Output "All icons generated successfully with transparent splash icon and high-res launcher icons!"

