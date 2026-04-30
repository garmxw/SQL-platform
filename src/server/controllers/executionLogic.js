import { runCoreExecution } from "#shared/services/sqlDataQueries.js";

export const executeSQL = async (req, res) => {
  const { sql, engine, problemId } = req.body;

  if (!sql || !engine) {
    return res.status(400).json({ error: "SQL query and engine are required" });
  }

  try {
    const parsedResult = await runCoreExecution(sql, engine, "", problemId);
    res.json({ success: true, parsedResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
