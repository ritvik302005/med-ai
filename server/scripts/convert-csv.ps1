param(
  [string]$CsvPath,
  [string]$OutPath = "C:\Users\RITVIK\Desktop\medai-project\server\data\medicines_from_csv.json"
)

if (-not (Test-Path $CsvPath)) {
  Write-Error "CSV not found: $CsvPath"
  exit 1
}

$rows = Import-Csv -Path $CsvPath
$priceHeader = $rows[0].PSObject.Properties.Name | Where-Object { $_ -like 'price*' } | Select-Object -First 1

$mapped = $rows | ForEach-Object {
  $id = [int]$_.id
  $brand = ("" + $_.name).Trim()

  $priceRaw = ("" + $_.PSObject.Properties[$priceHeader].Value).Trim()
  $price = 0.0
  [double]::TryParse(($priceRaw -replace ',', ''), [ref]$price) | Out-Null

  $comp1 = ("" + $_.short_composition1).Trim()
  $comp2 = ("" + $_.short_composition2).Trim()
  $parts = @()
  if ($comp1) { $parts += $comp1 }
  if ($comp2) { $parts += $comp2 }

  $composition = ($parts -join ' + ')
  $generic = if ($composition) { $composition } else { $brand }

  $type = ("" + $_.type).Trim()
  $category = if ($type) { (Get-Culture).TextInfo.ToTitleCase($type.ToLower()) } else { 'Allopathy' }

  [PSCustomObject]@{
    id = $id
    branded = $brand
    generic = $generic
    brandedPrice = [math]::Round($price, 2)
    genericPrice = [math]::Round(($price * 0.35), 2)
    composition = $composition
    manufacturer = ("" + $_.manufacturer_name).Trim()
    packSize = ("" + $_.pack_size_label).Trim()
    usage = "Consult your doctor or pharmacist for usage information."
    category = $category
    similar = @()
    description = if ($composition) { "$brand. Contains: $composition" } else { $brand }
  }
}

$mapped | ConvertTo-Json -Depth 4 | Set-Content -Path $OutPath -Encoding UTF8
Write-Output "Wrote $($mapped.Count) medicines to $OutPath"
