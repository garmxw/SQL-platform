param(
    [string]$QUERY = "SELECT * FROM employees;"
)

$containerName = "sql-postgres-mvp"

# Start container if not running
$exists = docker ps -a --format "{{.Names}}" | Select-String $containerName
if (-not $exists) {
    docker run -d --name $containerName `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=sandbox `
        --memory="512m" --cpus="1" `
        sql-postgres-sandbox
    Start-Sleep -Seconds 6
}

# Temp SQL file
$tempFile = [System.IO.Path]::Combine($env:TEMP, "query.sql")
Set-Content -Path $tempFile -Value $QUERY

# Execute query
Get-Content $tempFile | docker exec -i $containerName psql `
    -U postgres `
    -d sandbox `
    -A -F "`t"

Remove-Item $tempFile
