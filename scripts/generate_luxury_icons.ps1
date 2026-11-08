Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
if (-not $root) { $root = "E:\du_an\Quan_ly_chi_tieu\scripts" }
$projectRoot = Split-Path $root -Parent
$publicDir = Join-Path $projectRoot "public"
$htmlPath = Join-Path $projectRoot "scripts\render_icon.html"

# Write render HTML helper
$svgContent = Get-Content (Join-Path $publicDir "favicon.svg") -Raw
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

# Render 512x512 PNG using Edge headless
$out512 = Join-Path $publicDir "icon-512.png"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

Write-Output "Rendering 512x512 with Edge headless..."
Start-Process $edgePath -ArgumentList "--headless", "--screenshot=`"$out512`"", "--window-size=512,512", "--default-background-color=00000000", "`"file:///$($htmlPath.Replace('\', '/'))`"" -Wait

# Copy to 512-maskable
$out512Mask = Join-Path $publicDir "icon-512-maskable.png"
Copy-Item -Path $out512 -Destination $out512Mask -Force

# Resample to 192x192 with HighQualityBicubic
Write-Output "Resampling 192x192 icons with HighQualityBicubic..."
$out192 = Join-Path $publicDir "icon-192.png"
$out192Mask = Join-Path $publicDir "icon-192-maskable.png"

$src = [System.Drawing.Image]::FromFile($out512)
$dest = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 192, 192)

$dest.Save($out192, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Save($out192Mask, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$dest.Dispose()
$src.Dispose()

Write-Output "All luxury icons generated successfully in public/!"

