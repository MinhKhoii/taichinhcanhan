Add-Type -AssemblyName System.Drawing

function Create-MoneyFlowIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.ColorTranslator]::FromHtml("#1E293B")
    $c2 = [System.Drawing.ColorTranslator]::FromHtml("#0F172A")
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
    $g.FillRectangle($brush, $rect)

    # Inner rounded squircle / card with vibrant blue-indigo gradient
    $pad = [float]($size * 0.12)
    $cardSize = [float]($size - ($pad * 2.0))
    $cardRect = New-Object System.Drawing.RectangleF($pad, $pad, $cardSize, $cardSize)
    $cCard1 = [System.Drawing.ColorTranslator]::FromHtml("#2563EB") # Blue 600
    $cCard2 = [System.Drawing.ColorTranslator]::FromHtml("#6366F1") # Indigo 500
    $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($cardRect, $cCard1, $cCard2, 135.0)

    # Draw rounded rectangle
    $radius = [float]($size * 0.20)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0
    $arcRect = New-Object System.Drawing.RectangleF($pad, $pad, $diameter, $diameter)
    $path.AddArc($arcRect, 180.0, 90.0)
    $arcRect.X = $pad + $cardSize - $diameter
    $path.AddArc($arcRect, 270.0, 90.0)
    $arcRect.Y = $pad + $cardSize - $diameter
    $path.AddArc($arcRect, 0.0, 90.0)
    $arcRect.X = $pad
    $path.AddArc($arcRect, 90.0, 90.0)
    $path.CloseFigure()
    $g.FillPath($cardBrush, $path)

    # Inner subtle border
    $penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), [float]([math]::Max(2, $size * 0.015)))
    $g.DrawPath($penBorder, $path)

    # White Trending Up line chart & arrow inside card
    $penStroke = [float]([math]::Max(4, $size * 0.065))
    $penWhite = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penStroke)
    $penWhite.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penWhite.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penWhite.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $x1 = [float]($pad + ($cardSize * 0.24))
    $y1 = [float]($pad + ($cardSize * 0.68))

    $x2 = [float]($pad + ($cardSize * 0.44))
    $y2 = [float]($pad + ($cardSize * 0.50))

    $x3 = [float]($pad + ($cardSize * 0.58))
    $y3 = [float]($pad + ($cardSize * 0.62))

    $x4 = [float]($pad + ($cardSize * 0.76))
    $y4 = [float]($pad + ($cardSize * 0.32))

    $p1 = New-Object System.Drawing.PointF($x1, $y1)
    $p2 = New-Object System.Drawing.PointF($x2, $y2)
    $p3 = New-Object System.Drawing.PointF($x3, $y3)
    $p4 = New-Object System.Drawing.PointF($x4, $y4)

    $points = [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4)
    $g.DrawLines($penWhite, $points)

    # Arrow head at p4
    $arrLen = [float]($cardSize * 0.17)
    $arr1 = New-Object System.Drawing.PointF([float]($x4 - $arrLen), $y4)
    $arr2 = New-Object System.Drawing.PointF($x4, [float]($y4 + $arrLen))
    $g.DrawLine($penWhite, $p4, $arr1)
    $g.DrawLine($penWhite, $p4, $arr2)

    # Emerald success dot at upper right of arrow
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#10B981")) # Emerald 500
    $dotSize = [float]([math]::Max(6, $size * 0.08))
    $dotX = [float]($pad + ($cardSize * 0.80) - ($dotSize / 2.0))
    $dotY = [float]($pad + ($cardSize * 0.20) - ($dotSize / 2.0))
    $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully created: $outputPath ($size x $size)"
}

Create-MoneyFlowIcon 192 "public\icon-192.png"
Create-MoneyFlowIcon 512 "public\icon-512.png"
Create-MoneyFlowIcon 192 "public\icon-192-maskable.png"
Create-MoneyFlowIcon 512 "public\icon-512-maskable.png"
