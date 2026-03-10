$containerName = "sql-postgres-mvp"

docker rm -f $containerName | Out-Null

docker run -d --name $containerName `
    -e POSTGRES_PASSWORD=postgres `
    -e POSTGRES_DB=sandbox `
    sql-postgres-sandbox
