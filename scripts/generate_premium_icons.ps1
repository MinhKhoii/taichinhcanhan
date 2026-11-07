Add-Type -AssemblyName System.Drawing

function Generate-ModernMoneyFlowIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Full-bleed background gradient (Edge-to-edge for perfect Android squircle/masking)
    $rect = New-Object System.Drawing.RectangleF(0.0, 0.0, [float]$size, [float]$size)
    $cTopLeft = [System.Drawing.ColorTranslator]::FromHtml("#1D4ED8")   # Deep Royal Blue
    $cBottomRight = [System.Drawing.ColorTranslator]::FromHtml("#6366F1") # Vibrant Indigo
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTopLeft, $cBottomRight, 135.0)
    $g.FillRectangle($bgBrush, $rect)

    # 2. Subtle top-center radial highlight / glow for premium 3D depth
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowRect = New-Object System.Drawing.RectangleF([float]($size * 0.05), [float](-$size * 0.2), [float]($size * 0.9), [float]($size * 0.9))
    $glowPath.AddEllipse($glowRect)
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(70, 96, 165, 250) # Light blue 400
    $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 37, 99, 235))
    $g.FillPath($glowBrush, $glowPath)
    $glowBrush.Dispose()
    $glowPath.Dispose()

    # 3. Draw Chart Wave / Glow underneath the trend line
    $wavePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p1x = [float]($size * 0.22); $p1y = [float]($size * 0.68)
    $p2x = [float]($size * 0.42); $p2y = [float]($size * 0.50)
    $p3x = [float]($size * 0.56); $p3y = [float]($size * 0.60)
    $p4x = [float]($size * 0.76); $p4y = [float]($size * 0.32)
    $pBtmRight = [float]($size * 0.76); $pBtmY = [float]($size * 0.78)
    $pBtmLeft = [float]($size * 0.22)

    $wavePath.AddLine($p1x, $p1y, $p2x, $p2y)
    $wavePath.AddLine($p2x, $p2y, $p3x, $p3y)
    $wavePath.AddLine($p3x, $p3y, $p4x, $p4y)
    $wavePath.AddLine($p4x, $p4y, $pBtmRight, $pBtmY)
    $wavePath.AddLine($pBtmRight, $pBtmY, $pBtmLeft, $pBtmY)
    $wavePath.CloseFigure()

    $waveRect = New-Object System.Drawing.RectangleF([float]($size * 0.2), [float]($size * 0.3), [float]($size * 0.6), [float]($size * 0.5))
    $waveBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $waveRect,
        [System.Drawing.Color]::FromArgb(45, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
        90.0
    )
    $g.FillPath($waveBrush, $wavePath)
    $waveBrush.Dispose()
    $wavePath.Dispose()

    # 4. Soft Drop Shadow for Trend Line
    $shadowStroke = [float]($size * 0.09)
    $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 15, 23, 42), $shadowStroke)
    $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $sOff = [float]($size * 0.02)
    $sp1 = New-Object System.Drawing.PointF([float]($p1x + $sOff), [float]($p1y + $sOff))
    $sp2 = New-Object System.Drawing.PointF([float]($p2x + $sOff), [float]($p2y + $sOff))
    $sp3 = New-Object System.Drawing.PointF([float]($p3x + $sOff), [float]($p3y + $sOff))
    $sp4 = New-Object System.Drawing.PointF([float]($p4x + $sOff), [float]($p4y + $sOff))
    $g.DrawLines($shadowPen, [System.Drawing.PointF[]]@($sp1, $sp2, $sp3, $sp4))

    $arrLen = [float]($size * 0.16)
    $sArr1 = New-Object System.Drawing.PointF([float]($p4x - $arrLen + $sOff), [float]($p4y + $sOff))
    $sArr2 = New-Object System.Drawing.PointF([float]($p4x + $sOff), [float]($p4y + $arrLen + $sOff))
    $g.DrawLine($shadowPen, $sp4, $sArr1)
    $g.DrawLine($shadowPen, $sp4, $sArr2)
    $shadowPen.Dispose()

    # 5. Crisp Pure White Main Trend Line
    $penStroke = [float]($size * 0.082)
    $penWhite = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penStroke)
    $penWhite.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penWhite.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penWhite.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $p1 = New-Object System.Drawing.PointF($p1x, $p1y)
    $p2 = New-Object System.Drawing.PointF($p2x, $p2y)
    $p3 = New-Object System.Drawing.PointF($p3x, $p3y)
    $p4 = New-Object System.Drawing.PointF($p4x, $p4y)
    $g.DrawLines($penWhite, [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4))

    # Arrow Head
    $arr1 = New-Object System.Drawing.PointF([float]($p4x - $arrLen), $p4y)
    $arr2 = New-Object System.Drawing.PointF($p4x, [float]($p4y + $arrLen))
    $g.DrawLine($penWhite, $p4, $arr1)
    $g.DrawLine($penWhite, $p4, $arr2)
    $penWhite.Dispose()

    # 6. Vibrant Emerald / Mint Success Sparkle Dot (Money / Growth Symbol)
    $dotSize = [float]($size * 0.09)
    $dotX = [float]($p4x + ($size * 0.045) - ($dotSize / 2.0))
    $dotY = [float]($p4y - ($size * 0.045) - ($dotSize / 2.0))

    # Dot outer glow
    $dotGlowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 16, 185, 129))
    $g.FillEllipse($dotGlowBrush, [float]($dotX - 2), [float]($dotY - 2), [float]($dotSize + 4), [float]($dotSize + 4))
    $dotGlowBrush.Dispose()

    # Dot body
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#10B981"))
    $g.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)
    $dotBrush.Dispose()

    # Dot core highlight
    $dotCoreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#A7F3D0"))
    $coreSize = [float]($dotSize * 0.45)
    $coreX = [float]($dotX + ($dotSize * 0.25))
    $coreY = [float]($dotY + ($dotSize * 0.20))
    $g.FillEllipse($dotCoreBrush, $coreX, $coreY, $coreSize, $coreSize)
    $dotCoreBrush.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Rendered premium icon: $outputPath ($size x $size)"
}

Generate-ModernMoneyFlowIcon 192 "public\icon-192.png"
Generate-ModernMoneyFlowIcon 512 "public\icon-512.png"
Generate-ModernMoneyFlowIcon 192 "public\icon-192-maskable.png"
Generate-ModernMoneyFlowIcon 512 "public\icon-512-maskable.png"
