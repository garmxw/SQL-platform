param(
    [string]$QUERY = "SELECT * FROM employees;"
)

# Check if container exists
$exists = docker ps -a --format "{{.Names}}" | Select-String "sql-mysql-mvp"
if (-not $exists) {
    docker run -d --name sql-mysql-mvp `
        -e "MYSQL_ROOT_PASSWORD=root" `
        -e "MYSQL_DATABASE=sandbox" `
        --memory="512m" --cpus="1" `
        sql-mysql-sandbox
    Start-Sleep -Seconds 8
}

# Temp SQL file
$tempFile = [System.IO.Path]::Combine($env:TEMP, "query.sql")
Set-Content -Path $tempFile -Value $QUERY

# Execute query in already running container
Get-Content $tempFile | docker exec -i sql-mysql-mvp mysql -uroot -proot sandbox

# Delete temp file
Remove-Item $tempFile


#now run it like this
#.\run.ps1 -QUERY "SELECT * FROM employees;"
#but u should build the container first with (read the raedme file)