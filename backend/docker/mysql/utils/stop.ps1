# stop.ps1 — Stop the MySQL sandbox container safely

$containerName = "sql-mysql-mvp"

# Check if container exists
$exists = docker ps -a --format "{{.Names}}" | Select-String "^$containerName$"

if (-not $exists) {
    Write-Host "Container '$containerName' does not exist."
    exit
}

# Check if container is running
$running = docker ps --format "{{.Names}}" | Select-String "^$containerName$"

if ($running) {
    Write-Host "Stopping container '$containerName'..."
    docker stop $containerName | Out-Null
    Write-Host "Container stopped."
} else {
    Write-Host "Container '$containerName' is already stopped."
}
