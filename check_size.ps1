Get-ChildItem -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem -LiteralPath $_.FullName -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{
        Name   = $_.Name
        SizeMB = [math]::Round($size / 1MB, 2)
    }
} | Sort-Object -Property SizeMB -Descending | Format-Table -AutoSize
