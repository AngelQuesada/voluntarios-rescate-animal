param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$true)]
    [string]$OutputFile
)

$lines = Get-Content -Path $InputFile
$uniqueLines = @()

foreach ($line in $lines) {
    if ($uniqueLines -notcontains $line) {
        $uniqueLines += $line
    }
}

$uniqueLines | Out-File -FilePath $OutputFile -Encoding utf8