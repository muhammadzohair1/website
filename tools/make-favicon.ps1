Add-Type -AssemblyName System.Drawing
function New-Fav([int]$s, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(92,133,71))
  $r = [int]($s * 0.22)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddArc(0, 0, 2*$r, 2*$r, 180, 90)
  $gp.AddArc($s-2*$r, 0, 2*$r, 2*$r, 270, 90)
  $gp.AddArc($s-2*$r, $s-2*$r, 2*$r, 2*$r, 0, 90)
  $gp.AddArc(0, $s-2*$r, 2*$r, 2*$r, 90, 90)
  $gp.CloseFigure()
  $g.FillPath($brush, $gp)
  $font = New-Object System.Drawing.Font ('Segoe UI', [single]($s*0.52), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF ([single]0), ([single](-$s*0.04)), ([single]$s), ([single]$s)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.DrawString('S', $font, $white, $rect, $fmt)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
New-Fav 32 'c:\Users\CMBEP-A\Downloads\website\favicon-32.png'
New-Fav 180 'c:\Users\CMBEP-A\Downloads\website\apple-touch-icon.png'
Write-Output 'OK'
