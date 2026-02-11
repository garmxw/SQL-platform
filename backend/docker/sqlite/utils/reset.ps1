$containerName = "sql-sqlite-mvp"

docker rm -f $containerName | Out-Null
docker run -d --name $containerName sql-sqlite-sandbox
