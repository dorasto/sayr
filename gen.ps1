#!/usr/bin/env pwsh
param(
  [Parameter(Position = 0)]
  [string]$Vault = "",

  [Parameter(Position = 1)]
  [string]$Item = "",

  [Parameter(Position = 2)]
  [string]$OutputFile = ".env"
)

Write-Host "🛠️ Generating .env for op://$Vault/$Item → $OutputFile" -ForegroundColor Cyan

# Ensure 1Password CLI exists
if (-not (Get-Command op -ErrorAction SilentlyContinue)) {
  Write-Error "❌ 1Password CLI ('op') not found."
  exit 1
}

# Fetch item JSON
try {
  $json = op item get $Item --vault $Vault --format json 2>$null | ConvertFrom-Json
} catch {
  Write-Error "❌ Cannot fetch '$Item' from vault '$Vault'"
  exit 1
}

if (-not $json.fields) {
  Write-Warning "No fields to export."
  exit 0
}

# Collect valid lines in memory first (to avoid BOM issues)
$lines = @()
foreach ($field in $json.fields) {
  $label = $field.label
  if ([string]::IsNullOrWhiteSpace($label)) { continue }
  $safe = ($label -replace '[^A-Za-z0-9_]', '_')
  $lines += "$safe=`"op://$Vault/$Item/$label`""
}

# Write .env cleanly (UTF-8 without BOM)
$utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($OutputFile, $lines, $utf8NoBomEncoding)

Write-Host "✅ Done! $($lines.Count) lines written → $OutputFile" -ForegroundColor Green
Write-Host "Use it via: op run --env-file $OutputFile -- <your command>" -ForegroundColor Yellow