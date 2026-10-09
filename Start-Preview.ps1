param([switch]$Production)
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$luoxuNpm=(Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if(-not $luoxuNpm){$luoxuNpm=Join-Path $env:USERPROFILE 'Context-Extensions\bin\npm.cmd'}
if(-not(Test-Path -LiteralPath $luoxuNpm)){throw '需要安装Node与npm，见README。'}
if(-not(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))){& $luoxuNpm ci;if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}}
if($Production){& $luoxuNpm run build;if($LASTEXITCODE -ne 0){exit $LASTEXITCODE};& $luoxuNpm run preview}
else{& $luoxuNpm run dev}
