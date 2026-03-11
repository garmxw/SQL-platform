to run container manually :

docker run --rm -e "MYSQL_ROOT_PASSWORD=root" -e
"MYSQL_DATABASE=sandbox" sql-mysql-sandbox

"btw one powershell"

---

running queries on powershell (:ex):

1.step one:

# Only run once, at platform startup

docker run -d --name sql-mysql-mvp `    -e "MYSQL_ROOT_PASSWORD=root"`
-e "MYSQL_DATABASE=sandbox" `
sql-mysql-sandbox

now wait for few seconds for mysql to run (5s-10s)

2.step two:

after waiting u should be able to run queries

docker exec temp-mysql mysql -uroot -proot sandbox -e "SELECT \* FROM employees;"

PS:
by using the run scripts both for windows and linux now u're be able
to automate the task (needs tweak for later now its manual)

note : the powershell files are for testing during dev and eleminating issues
im gonna replace theme with node (express) later
