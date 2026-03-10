# reset.ps1 - Reset the MySQL sandbox database

# Name of your persistent container
$containerName = "sql-mysql-mvp"

# Check if the container exists
$exists = docker ps -a --format "{{.Names}}" | Select-String $containerName

if (-not $exists) {
    Write-Host "Container '$containerName' does not exist. Starting a new one..."
    docker run -d --name $containerName `
        -e "MYSQL_ROOT_PASSWORD=root" `
        -e "MYSQL_DATABASE=sandbox" `
        sql-mysql-sandbox
    Start-Sleep -Seconds 8
}

# Stop the container if running
$running = docker ps --format "{{.Names}}" | Select-String $containerName
if ($running) {
    Write-Host "Stopping container..."
    docker stop $containerName | Out-Null
}

# Start container again (if stopped)
Write-Host "Starting container..."
docker start $containerName | Out-Null
Start-Sleep -Seconds 5

# Drop and recreate the sandbox database
Write-Host "Resetting database..."
docker exec -i $containerName mysql -uroot -proot -e "DROP DATABASE IF EXISTS sandbox; CREATE DATABASE sandbox;"

# Reload initial SQL scripts if any
$initFolder = Join-Path $PSScriptRoot "init"
if (Test-Path $initFolder) {
    $sqlFiles = Get-ChildItem $initFolder -Filter "*.sql"
    foreach ($file in $sqlFiles) {
        Write-Host "Loading $($file.Name)..."
        Get-Content $file.FullName | docker exec -i $containerName mysql -uroot -proot sandbox
    }
}

Write-Host "Database reset complete."
