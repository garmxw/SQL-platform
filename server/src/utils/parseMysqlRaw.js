export function parseMySQLResult(raw) {
  const lines = raw.trim().split("\n");
  if (lines.length === 0) return { columns: [], rows: [] }; // No data

  const columns = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => {
    const values = line.split("\t");
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = values[idx];
    });
    return obj;
  });
  return { columns, rows };
}
