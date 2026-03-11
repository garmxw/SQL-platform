$containerName = "sql-sqlite-mvp"

$exists = docker ps -a --format "{{.Names}}" | Select-String $containerName
if (-not $exists) {
    docker run -d --name $containerName --memory="512m" --cpus="1" sql-sqlite-sandbox
    Start-Sleep -Seconds 1
}

param(
    [string]$QUERY = "SELECT * FROM employees;"
)

$tempFile = [System.IO.Path]::Combine($env:TEMP, "query.sql")
Set-Content $tempFile $QUERY

Get-Content $tempFile | docker exec -i $containerName sqlite3 sandbox.db -header -separator $'\t'

Remove-Item $tempFile
