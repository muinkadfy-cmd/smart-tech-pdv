Add-Type -AssemblyName System.Drawing

$src = "C:\Users\juninho\Downloads\Logo moderno para loja de moda.png"
$asset = "C:\PDV-SMART-TECH\src\assets\brand-logo.png"
$markAsset = "C:\PDV-SMART-TECH\src\assets\brand-mark.png"
$publicDir = "C:\PDV-SMART-TECH\public"
$iconsDir = "C:\PDV-SMART-TECH\src-tauri\icons"

Copy-Item -LiteralPath $src -Destination $asset -Force
Copy-Item -LiteralPath $src -Destination (Join-Path $publicDir "brand-logo.png") -Force

$img = [System.Drawing.Image]::FromFile($src)

function Save-ResizedPng([int]$size, [string]$targetPath) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Save-TransparentBrandMark([string]$targetPath) {
  $mark = New-Object System.Drawing.Bitmap 420, 420
  $graphics = [System.Drawing.Graphics]::FromImage($mark)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  for ($x = 0; $x -lt $img.Width; $x++) {
    for ($y = 0; $y -lt $img.Height; $y++) {
      $pixel = $img.GetPixel($x, $y)
      if ($pixel.R -ge 245 -and $pixel.G -ge 245 -and $pixel.B -ge 245) {
        $img.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }

  $sourceRect = New-Object System.Drawing.Rectangle 120, 20, 520, 430
  $graphics.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, 420, 420), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $mark.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $mark.Dispose()
}

function Write-IcoFromPng([string]$pngPath, [string]$icoPath) {
  $pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
  $size = [System.Drawing.Image]::FromFile($pngPath).Width
  $image = [System.Drawing.Image]::FromFile($pngPath)
  $size = $image.Width
  $image.Dispose()

  $fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
  $writer = New-Object System.IO.BinaryWriter($fs)

  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)

  $entrySize = if ($size -ge 256) { 0 } else { [byte]$size }
  $writer.Write([byte]$entrySize)
  $writer.Write([byte]$entrySize)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)

  $writer.Flush()
  $writer.Dispose()
  $fs.Dispose()
}

Save-ResizedPng 180 (Join-Path $publicDir "apple-touch-icon.png")
Save-ResizedPng 192 (Join-Path $publicDir "icon-192.png")
Save-ResizedPng 512 (Join-Path $publicDir "icon-512.png")
Save-ResizedPng 192 (Join-Path $publicDir "icon-192-maskable.png")
Save-ResizedPng 512 (Join-Path $publicDir "icon-512-maskable.png")
Save-ResizedPng 32 (Join-Path $publicDir "favicon.png")

Save-ResizedPng 32 (Join-Path $iconsDir "icon-32.png")
Save-ResizedPng 128 (Join-Path $iconsDir "icon-128.png")
Save-ResizedPng 512 (Join-Path $iconsDir "icon-512.png")
Save-TransparentBrandMark $markAsset
Save-TransparentBrandMark (Join-Path $publicDir "brand-mark.png")

$faviconPng = Join-Path $publicDir "favicon.png"
$desktopIconPng = Join-Path $iconsDir "icon-512.png"
Write-IcoFromPng -pngPath $faviconPng -icoPath (Join-Path $publicDir "favicon.ico")
Write-IcoFromPng -pngPath $desktopIconPng -icoPath (Join-Path $iconsDir "icon.ico")

$img.Dispose()

Get-ChildItem $publicDir, $iconsDir, $asset -File | Select-Object FullName, Length
