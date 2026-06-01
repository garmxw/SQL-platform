export function parseMySQLResult(raw, fallbackColumns = []) {
  // 1. Split by any newline (Windows/Linux) and remove empty lines
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return { columns: [], rows: [] };

  // 2. Parse headers.
  // If the first line looks like data (e.g., 'Alice'),
  // you may need to pass column names manually.
  let columns = lines[0].split("\t").map((col) => col.trim());
  let dataLines = lines.slice(1);

  // Fallback: If your 'raw' string is missing headers (common in some CLI modes)
  if (fallbackColumns.length > 0 && !raw.includes(fallbackColumns[0])) {
    columns = fallbackColumns;
    dataLines = lines; // Treat the first line as data instead of headers
  }

  const rows = dataLines.map((line) => {
    const values = line.split("\t");
    const obj = {};
    columns.forEach((col, idx) => {
      // Use null if a value is missing for a specific column
      obj[col] = values[idx] !== undefined ? values[idx].trim() : null;
    });
    return obj;
  });

  return { columns, rows };
}
