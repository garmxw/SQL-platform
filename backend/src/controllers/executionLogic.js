import { parseMySQLResult } from "../utils/parseMysqlRaw.js";
import { parsePostgresResult } from "../utils/parsePostgresRaw.js";
import { parseSQLiteResult } from "../utils/parsesqlite.js";
import { validateQuery } from "../security/validateQuery.js";
import { withTimeout } from "../executor/timeOut.js";

export const executeSQL = async (req, res) => {
  const { sql, engine } = req.body;
  if (!sql || !engine) {
    console.log("not true");
    return res.status(400).json({ error: "SQL query and engine are required" });
  }
  const validation = validateQuery(sql);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  try {
    let result, parsedResult;

    switch (engine) {
      //mysql with timeout
      case "mysql": {
        const { runMySQL } = await import("../executor/mysqlExecutor.js");
        const runMySQLWithTimeout = withTimeout(runMySQL, 10000);
        try {
          result = await runMySQLWithTimeout(sql);
          parsedResult = parseMySQLResult(result);
        } catch (err) {
          return res.status(400).json({ success: false, error: err.message });
        }
        break;
      }
      //postgres with timeout
      case "postgres": {
        const { runPostgres } = await import("../executor/postgresExecutor.js");
        const runPostgresWithTimeout = withTimeout(runPostgres, 10000);
        try {
          result = await runPostgresWithTimeout(sql);
          parsedResult = parsePostgresResult(result);
        } catch (err) {
          return res.status(400).json({ success: false, error: err.message });
        }
        break;
      }
      //sqlite with timeout
      case "sqlite": {
        const { runSQLite } = await import("../executor/sqliteExecutor.js");
        const runSQLiteWithTimeout = withTimeout(runSQLite, 10000);

        try {
          result = await runSQLiteWithTimeout(sql);
          parsedResult = parseSQLiteResult(result);
        } catch (err) {
          return res.status(400).json({ success: false, error: err.message });
        }
        break;
      }
      default:
        return res.status(400).json({ error: "Unsupported database engine" });
    }

    res.json({ success: true, parsedResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
