# Генерирует PNG-иконки приложения (Windows, PowerShell 5.1+). Запуск: powershell -File tools/make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'

function New-Icon([int]$size, [string]$file, [double]$pad, [bool]$rounded) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear([System.Drawing.Color]::Transparent)
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(26,20,70)), ([System.Drawing.Color]::FromArgb(74,26,99)), 90
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($rounded) {
    $r = [int]($size * 0.22); $d = $r * 2
    $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90); $path.AddArc(0, $size - $d, $d, $d, 90, 90); $path.CloseFigure()
  } else { $path.AddRectangle($rect) }
  $g.FillPath($bg, $path)
  # луна
  $moon = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230,255,211,107))
  $s = $size / 512.0
  $g.FillEllipse($moon, [float](356*$s), [float](84*$s), [float](68*$s), [float](68*$s))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(42,23,87))), [float](374*$s), [float](76*$s), [float](60*$s), [float](60*$s))
  # силуэт города
  $city = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(18,13,51))
  foreach ($b in @(@(40,380,60),@(96,350,44),@(138,400,54),@(320,370,50),@(366,340,40),@(404,390,70))) {
    $g.FillRectangle($city, [float]($b[0]*$s), [float]($b[1]*$s), [float]($b[2]*$s), [float]((512-$b[1])*$s))
  }
  # буква 한
  $fontSize = [float]($size * 0.46 * (1 - $pad))
  $font = New-Object System.Drawing.Font 'Malgun Gothic', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $tb = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255,79,154)), ([System.Drawing.Color]::FromArgb(79,216,255)), 45
  $fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $g.DrawString([string][char]0xD55C, $font, $tb, (New-Object System.Drawing.RectangleF 0, ([float](-$size*0.02)), $size, $size), $fmt)
  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 'icon-192.png' 0 $true
New-Icon 512 'icon-512.png' 0 $true
New-Icon 512 'icon-maskable-512.png' 0.25 $false
New-Icon 180 'apple-touch-icon.png' 0 $false
Write-Output 'Icons generated'
