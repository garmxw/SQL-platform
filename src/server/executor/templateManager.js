import {
  runPostgres,
  runPostgresDDL,
} from "#server/executor/postgresExecutor.js";
import {
  runMySQLAdmin,
  cloneMySQLDatabase,
  dropMySQLDatabase,
  mysqlDatabaseExists,
} from "#server/executor/mysqlExecutor.js";
import {
  createSQLiteTemplate,
  dropAllSQLiteTemplates,
  resolveSQLiteTemplate,
  sqliteTemplateExists,
} from "#server/executor/sqliteExecutor.js";

// TEMPLATE NAMING
//
// Postgres:  tpl_{problemId}_postgres  /  tpl_{problemId}_universal  (pg DBs)
// MySQL:     tpl_{problemId}_mysql     /  tpl_{problemId}_universal  (mysql DBs)
// SQLite:    tpl_{problemId}_sqlite    /  tpl_{problemId}_universal  (files in container)

/**
 * Syncs templates for ALL engines from a problem's schema SQL map.
 * Call on problem CREATE or UPDATE.
 *
 * @param {string|number} problemId
 * @param {Record<string, string>} sqlVariantsSchema
 *   e.g. { universal: "CREATE TABLE ...", postgres: "...", mysql: "...", sqlite: "..." }
 */
export async function syncProblemTemplates(problemId, sqlVariantsSchema = {}) {
  // Run all three engines in parallel — they're independent
  await Promise.allSettled([
    _syncPostgresTemplates(problemId, sqlVariantsSchema),
    _syncMySQLTemplates(problemId, sqlVariantsSchema),
    _syncSQLiteTemplates(problemId, sqlVariantsSchema),
  ]);
}

/**
 * Drops ALL templates for a problem across all engines and dialects.
 * Call on problem DELETE.
 *
 * @param {string|number} problemId
 */
export async function dropAllProblemTemplates(problemId) {
  await Promise.allSettled([
    _dropPostgresTemplates(problemId),
    _dropMySQLTemplates(problemId),
    dropAllSQLiteTemplates(problemId),
  ]);
}

/**
 * Resolves the best available template for a given problem + engine.
 * Returns engine-specific info needed to clone a sandbox.
 *
 * @param {string|number} problemId
 * @param {"postgres"|"mysql"|"sqlite"} engine
 * @returns {Promise<string|null>}
 *   - postgres: template DB name  (e.g. "tpl_42_postgres")
 *   - mysql:    template DB name  (e.g. "tpl_42_mysql")
 *   - sqlite:   template file path inside container
 */
export async function resolveTemplate(problemId, engine) {
  switch (engine) {
    case "postgres":
      return _resolvePostgresTemplate(problemId);
    case "mysql":
      return _resolveMySQLTemplate(problemId);
    case "sqlite":
      return resolveSQLiteTemplate(problemId);
    default:
      return null;
  }
}

// POSTGRES

async function _syncPostgresTemplates(problemId, schemaMap) {
  for (const dialect of ["universal", "postgres"]) {
    const sql = schemaMap[dialect];
    if (sql?.trim()) {
      await _createPostgresTemplate(problemId, dialect, sql);
    } else {
      await _dropPostgresTemplate(problemId, dialect);
    }
  }
}

async function _dropPostgresTemplates(problemId) {
  for (const dialect of ["universal", "postgres", "mysql", "sqlite"]) {
    await _dropPostgresTemplate(problemId, dialect);
  }
}

async function _resolvePostgresTemplate(problemId) {
  for (const dialect of ["postgres", "universal"]) {
    const name = _pgTplName(problemId, dialect);
    if (await _pgTplExists(name)) return name;
  }
  return null;
}

function _pgTplName(problemId, dialect) {
  return `tpl_${problemId}_${dialect}`;
}

async function _pgTplExists(tplName) {
  try {
    const result = await runPostgresDDL(
      `SELECT 1 FROM pg_database WHERE datname = '${tplName}'`,
    ).promise;
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async function _createPostgresTemplate(problemId, dialect, schemaSQL) {
  const tplName = _pgTplName(problemId, dialect);
  await _pgTerminate(tplName);
  await runPostgresDDL(`DROP DATABASE IF EXISTS ${tplName}`).promise;
  await runPostgresDDL(`CREATE DATABASE ${tplName} TEMPLATE template1`).promise;
  await runPostgres(schemaSQL, tplName).promise;
  console.log(`[templateManager] Postgres template ready: ${tplName}`);
}

async function _dropPostgresTemplate(problemId, dialect) {
  const tplName = _pgTplName(problemId, dialect);
  await _pgTerminate(tplName);
  try {
    await runPostgresDDL(`DROP DATABASE IF EXISTS ${tplName}`).promise;
  } catch {
    /* already gone */
  }
}

async function _pgTerminate(dbName) {
  try {
    await runPostgresDDL(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
    `).promise;
  } catch {
    /* DB may not exist */
  }
}

// MYSQL

async function _syncMySQLTemplates(problemId, schemaMap) {
  for (const dialect of ["universal", "mysql"]) {
    const sql = schemaMap[dialect];
    if (sql?.trim()) {
      await _createMySQLTemplate(problemId, dialect, sql);
    } else {
      await _dropMySQLTemplate(problemId, dialect);
    }
  }
}

async function _dropMySQLTemplates(problemId) {
  for (const dialect of ["universal", "mysql", "postgres", "sqlite"]) {
    await _dropMySQLTemplate(problemId, dialect);
  }
}

async function _resolveMySQLTemplate(problemId) {
  for (const dialect of ["mysql", "universal"]) {
    const name = _mysqlTplName(problemId, dialect);
    if (await mysqlDatabaseExists(name)) return name;
  }
  return null;
}

function _mysqlTplName(problemId, dialect) {
  return `tpl_${problemId}_${dialect}`;
}

async function _createMySQLTemplate(problemId, dialect, schemaSQL) {
  const tplName = _mysqlTplName(problemId, dialect);

  // Drop + recreate
  await dropMySQLDatabase(tplName);
  await runMySQLAdmin(`CREATE DATABASE \`${tplName}\``).promise;

  // Apply schema inside the template DB
  // MySQL needs USE inside the query since runMySQLAdmin connects at server level
  await runMySQLAdmin(`USE \`${tplName}\`; ${schemaSQL}`).promise;

  console.log(`[templateManager] MySQL template ready: ${tplName}`);
}

async function _dropMySQLTemplate(problemId, dialect) {
  try {
    await dropMySQLDatabase(_mysqlTplName(problemId, dialect));
  } catch {
    /* already gone */
  }
}

// SQLITE

async function _syncSQLiteTemplates(problemId, schemaMap) {
  for (const dialect of ["universal", "sqlite"]) {
    const sql = schemaMap[dialect];
    if (sql?.trim()) {
      await createSQLiteTemplate(problemId, dialect, sql);
    }
    // SQLite: if no SQL for this dialect, leave existing template (no drop needed —
    // stale files are cleaned up on problem delete via dropAllSQLiteTemplates)
  }
}
