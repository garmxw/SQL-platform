import { runCoreExecution } from "../services/sqlService.js";

export const executeSQL = async (req, res) => {
  const { sql, engine } = req.body;

  if (!sql || !engine) {
    return res.status(400).json({ error: "SQL query and engine are required" });
  }

  try {
    const parsedResult = await runCoreExecution(sql, engine);
    res.json({ success: true, parsedResult });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
