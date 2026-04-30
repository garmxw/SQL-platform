import { spawn } from "child_process";

/**
 * Runs a SQL query against a specific database inside the Docker container.
 *
 * Performance notes:
 *  - `-X` disables .psqlrc loading (faster cold start)
 *  - `-v ON_ERROR_STOP=1` fails fast on first SQL error
 *  - `-A -F\t -q` gives clean tab-separated output with no headers/footers noise
 *
 * @param {string} query  - SQL to execute
 * @param {string} db     - Target database (default: "sandbox")
 * @returns {{ promise: Promise<string>, process: ChildProcess }}
 */
export function runPostgres(query, db = "sandbox") {
  return _psql(query, db);
}

/**
 * Runs DDL that manages databases (CREATE DATABASE, DROP DATABASE, etc.).
 * MUST connect to the "postgres" system DB — these statements cannot run
 * inside a connection to the target DB itself, and "sandbox" may have
 * active connections that block template cloning.
 *
 * @param {string} query  - DDL statement (CREATE/DROP DATABASE, pg_terminate_backend, etc.)
 * @returns {{ promise: Promise<string>, process: ChildProcess }}
 */
export function runPostgresDDL(query) {
  return _psql(query, "postgres");
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _psql(query, db) {
  const docker = spawn("docker", [
    "exec",
    "-i",
    "sql-postgres-mvp",
    "psql",
    "-U",
    "postgres",
    "-d",
    db,
    "-X", // skip .psqlrc — faster cold start
    "-v",
    "ON_ERROR_STOP=1", // fail fast on first SQL error
    "-A", // unaligned output
    "-F",
    "\t", // tab separator
    "-q", // quiet (no row count noise)
  ]);

  let stdout = "";
  let stderr = "";

  const promise = new Promise((resolve, reject) => {
    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    docker.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr.trim() || `psql exited with code ${code}`),
        );
      }
      resolve(stdout.trim());
    });

    docker.on("error", (err) => {
      reject(new Error(`Failed to spawn docker: ${err.message}`));
    });
  });

  // Strip trailing semicolons — psql stdin adds its own terminator.
  // Multi-statement SQL (e.g. schemaSQL with CREATE + INSERT) works fine as-is.
  docker.stdin.write(query.trim().replace(/;+$/, "") + "\n");
  docker.stdin.end();

  return { promise, process: docker };
}
