import { spawn } from "child_process";

const SQLITE_CONTAINER = "sql-sqlite-mvp";

// SQLite DB paths inside the container
const SANDBOX_DIR = "/sandbox";
const TEMPLATE_DIR = "/templates"; // created on first use

// PUBLIC API

/**
 * Run a user SQL query against a specific SQLite database file.
 * Returns { promise, process } to match withTimeout contract.
 *
 * @param {string} query   - SQL to execute
 * @param {string} dbPath  - Path to .db file inside container (default: fresh sandbox)
 */
export function runSQLite(query, dbPath = `${SANDBOX_DIR}/sandbox.db`) {
  return _sqlite(query, dbPath);
}

/**
 * Create a template SQLite DB by running schemaSQL against a new file.
 * Stored at /templates/tpl_{problemId}_{dialect}.db inside the container.
 *
 * @param {string|number} problemId
 * @param {string}        dialect    - "universal" | "sqlite"
 * @param {string}        schemaSQL
 * @returns {Promise<void>}
 */
export async function createSQLiteTemplate(problemId, dialect, schemaSQL) {
  const tplPath = _tplPath(problemId, dialect);

  // Ensure /templates dir exists inside container
  await _exec(SQLITE_CONTAINER, ["mkdir", "-p", TEMPLATE_DIR]);

  // Delete stale template if it exists
  await _exec(SQLITE_CONTAINER, ["rm", "-f", tplPath]);

  // Create fresh DB and apply schema
  await _sqlite(schemaSQL, tplPath).promise;

  console.log(`[sqliteExecutor] Template created: ${tplPath}`);
}

/**
 * Clone a template DB into a fresh sandbox DB.
 * This is an O(1) file copy — equivalent to postgres CREATE DATABASE ... TEMPLATE.
 *
 * @param {string} tplPath      - Source template path inside container
 * @param {string} sandboxPath  - Destination sandbox path inside container
 * @returns {Promise<void>}
 */
export async function cloneSQLiteDatabase(tplPath, sandboxPath) {
  await _exec(SQLITE_CONTAINER, ["cp", tplPath, sandboxPath]);
}

/**
 * Drop a sandbox or template SQLite DB file.
 *
 * @param {string} dbPath  - Path inside container
 * @returns {Promise<void>}
 */
export async function dropSQLiteDatabase(dbPath) {
  await _exec(SQLITE_CONTAINER, ["rm", "-f", dbPath]);
}

/**
 * Check if a SQLite template file exists inside the container.
 *
 * @param {string|number} problemId
 * @param {string}        dialect
 * @returns {Promise<boolean>}
 */
export async function sqliteTemplateExists(problemId, dialect) {
  try {
    await _exec(SQLITE_CONTAINER, ["test", "-f", _tplPath(problemId, dialect)]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop all SQLite templates for a problem (all dialects).
 * Call on problem DELETE.
 *
 * @param {string|number} problemId
 * @returns {Promise<void>}
 */
export async function dropAllSQLiteTemplates(problemId) {
  for (const dialect of ["universal", "sqlite", "mysql", "postgres"]) {
    const path = _tplPath(problemId, dialect);
    await _exec(SQLITE_CONTAINER, ["rm", "-f", path]).catch(() => {});
  }
}

/**
 * Resolve the best available template path for a problem.
 * Returns null if none exists.
 *
 * @param {string|number} problemId
 * @returns {Promise<string|null>}
 */
export async function resolveSQLiteTemplate(problemId) {
  // Prefer sqlite-specific, fall back to universal
  for (const dialect of ["sqlite", "universal"]) {
    if (await sqliteTemplateExists(problemId, dialect)) {
      return _tplPath(problemId, dialect);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL
// ─────────────────────────────────────────────────────────────────────────────

function _tplPath(problemId, dialect) {
  return `${TEMPLATE_DIR}/tpl_${problemId}_${dialect}.db`;
}

/**
 * Run SQL against a SQLite DB file inside the container.
 * Returns { promise, process } to match withTimeout contract.
 */
function _sqlite(query, dbPath) {
  const docker = spawn("docker", [
    "exec",
    "-i",
    SQLITE_CONTAINER,
    "sqlite3",
    dbPath,
    "-batch", // non-interactive
    "-header", // print column names as first row
    "-separator",
    "\t", // tab-separated values
  ]);

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
      if (code !== 0) {
        return reject(
          new Error(stderr.trim() || `sqlite3 exited with code ${code}`),
        );
      }
      resolve(stdout.trim());
    });

    docker.on("error", (err) => {
      reject(new Error(`Failed to spawn docker: ${err.message}`));
    });
  });

  docker.stdin.write(query.trim() + "\n");
  docker.stdin.end();

  return { promise, process: docker };
}

/**
 * Run a shell command inside a container and return stdout.
 * Used for file operations (cp, rm, mkdir, test).
 *
 * @param {string}   container
 * @param {string[]} cmd
 * @returns {Promise<string>}
 */
function _exec(container, cmd) {
  const docker = spawn("docker", ["exec", container, ...cmd]);
  let stdout = "",
    stderr = "";

  return new Promise((resolve, reject) => {
    docker.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    docker.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    docker.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `exit ${code}`));
      resolve(stdout.trim());
    });
    docker.on("error", (err) => reject(new Error(err.message)));
  });
}
