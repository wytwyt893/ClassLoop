[CmdletBinding()]
param(
    [ValidateSet("Full", "Visual")]
    [string]$Mode = "Full"
)

$ErrorActionPreference = "Stop"
$RootLauncher = Join-Path (Split-Path -Parent $PSScriptRoot) "start_classloop.ps1"
if (-not (Test-Path -LiteralPath $RootLauncher)) {
    throw "Repository launcher was not found: $RootLauncher"
}

& $RootLauncher -Mode $Mode
