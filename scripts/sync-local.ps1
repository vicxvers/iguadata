$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$branch = (git -C $root branch --show-current).Trim()

if (-not $branch) {
    throw 'No se puede sincronizar desde un HEAD separado.'
}

$changes = git -C $root status --porcelain
if ($changes) {
    throw 'Hay cambios locales sin guardar. Haz commit o stash antes de sincronizar.'
}

git -C $root fetch origin --prune
if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo actualizar origin.'
}

git -C $root pull --ff-only origin $branch
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo avanzar $branch mediante fast-forward."
}

Write-Host "Sincronizacion completada: $branch"
