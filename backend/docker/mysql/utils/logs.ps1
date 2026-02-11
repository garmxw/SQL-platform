# logs.ps1 — Show MySQL sandbox logs

$containerName = "sql-mysql-mvp"

# Check if container exists
$exists = docker ps -a --format "{{.Names}}" | Select-String "^$containerName$"

if (-not $exists) {
    Write-Host "Container '$containerName' does not exist."
    exit
}

Write-Host "Showing logs for '$containerName' (Ctrl+C to exit)..."
docker logs -f $containerName
