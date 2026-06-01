import { spawn } from "child_process";

const MYSQL_CONTAINER = "sql-mysql-mvp";
const MYSQL_USER = "root";
const MYSQL_PASS = "root";

// PUBLIC API

/**
 * Run a user SQL query against a specific MySQL database.
 * Returns { promise, process } to match withTimeout contract.
 *
 * @param {string} query   - SQL to execute
 * @param {string} db      - Target database (default: "sandbox")
 */
export function runMySQL(query, db = "sandbox") {
  return _mysql(query, db);
}

/**
 * Run administrative SQL (CREATE DATABASE, DROP DATABASE, etc.)
 * against the MySQL server without targeting a specific user DB.
 * Returns { promise, process }.
 *
 * @param {string} query
 */
export function runMySQLAdmin(query) {
  return _mysql(query, null); // no db arg → connects at server level
}

/**
 * Create a sandbox DB cloned from a template using mysqldump | mysql.
 * This is the MySQL equivalent of CREATE DATABASE ... TEMPLATE in postgres.
 *
 * @param {string} templateDb  - Source DB name
 * @param {string} sandboxDb   - New DB name to create
 * @returns {Promise<void>}
 */
export async function cloneMySQLDatabase(templateDb, sandboxDb) {
  // 1. Create the target DB
  await runMySQLAdmin(`CREATE DATABASE \`${sandboxDb}\``).promise;

  // 2. Dump template → pipe stdout directly into mysql import
  //    Two separate spawns connected via Node.js pipe — avoids sh -c backtick
  //    interpretation issues where DB names get executed as shell commands.
  const dumper = spawn("docker", [
    "exec",
    "-i",
    MYSQL_CONTAINER,
    "mysqldump",
    `-u${MYSQL_USER}`,
    `-p${MYSQL_PASS}`,
    "--no-tablespaces",
    "--single-transaction", // consistent snapshot without table locks
    templateDb, // plain arg — no backticks needed
  ]);

  const importer = spawn("docker", [
    "exec",
    "-i",
    MYSQL_CONTAINER,
    "mysql",
    `-u${MYSQL_USER}`,
    `-p${MYSQL_PASS}`,
    sandboxDb, // plain arg — no backticks needed
  ]);

  // Pipe dumper stdout → importer stdin directly in Node
  dumper.stdout.pipe(importer.stdin);

  let dumpStderr = "";
  let importStderr = "";

  dumper.stderr.on("data", (d) => {
    dumpStderr += d.toString();
  });
  importer.stderr.on("data", (d) => {
    importStderr += d.toString();
  });

  const _clean = (s) =>
    s
      .replace(/^mysqldump: \[Warning\].*\n?/gm, "")
      .replace(/^mysql: \[Warning\].*\n?/gm, "")
      .trim();

  return new Promise((resolve, reject) => {
    let dumpCode = null;
    let importCode = null;

    const tryResolve = () => {
      if (dumpCode === null || importCode === null) return; // wait for both
      if (dumpCode !== 0) {
        return reject(
          new Error(
            _clean(dumpStderr) || `mysqldump exited with code ${dumpCode}`,
          ),
        );
      }
      if (importCode !== 0) {
        return reject(
          new Error(
            _clean(importStderr) ||
              `mysql import exited with code ${importCode}`,
          ),
        );
      }
      resolve();
    };

    dumper.on("close", (code) => {
      dumpCode = code;
      tryResolve();
    });
    importer.on("close", (code) => {
      importCode = code;
      tryResolve();
    });

    dumper.on("error", (err) =>
      reject(new Error(`mysqldump spawn error: ${err.message}`)),
    );
    importer.on("error", (err) =>
      reject(new Error(`mysql import spawn error: ${err.message}`)),
    );
  });
}

/**
 * Drop a MySQL database safely (no error if it doesn't exist).
 *
 * @param {string} db
 * @returns {Promise<void>}
 */
export async function dropMySQLDatabase(db) {
  await runMySQLAdmin(`DROP DATABASE IF EXISTS \`${db}\``).promise;
}

/**
 * Check if a MySQL database exists.
 *
 * @param {string} db
 * @returns {Promise<boolean>}
 */
export async function mysqlDatabaseExists(db) {
  try {
    const result = await runMySQLAdmin(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${db}'`,
    ).promise;
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

// INTERNAL

function _mysql(query, db) {
  const args = [
    "exec",
    "-i",
    MYSQL_CONTAINER,
    "mysql",
    `-u${MYSQL_USER}`,
    `-p${MYSQL_PASS}`,
    "-B", // batch mode — clean tab-separated output
  ];

  // Only add db arg when targeting a specific database
  if (db) args.push(db);

  const docker = spawn("docker", args);

  let stdout = "";
  let stderr = "";

  const promise = new Promise((resolve, reject) => {
    docker.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    docker.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    docker.on("close", (code) => {
      // mysql always emits "Warning: Using a password..." — filter it out
      const cleanStderr = stderr
        .replace(/^mysql: \[Warning\].*\n?/gm, "")
        .replace(/^mysqldump: \[Warning\].*\n?/gm, "")
        .trim();

      if (code !== 0) {
        return reject(
          new Error(cleanStderr || `mysql exited with code ${code}`),
        );
      }
      resolve(stdout.trim());
    });

    docker.on("error", (err) => {
      reject(new Error(`Failed to spawn docker: ${err.message}`));
    });
  });

  // Send query — MySQL CLI handles multi-statement SQL fine via stdin
  docker.stdin.write(query.trim() + "\n");
  docker.stdin.end();

  return { promise, process: docker };
}
