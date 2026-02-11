export function parseSQLiteResult(raw) {
  if (!raw) {
    return { columns: [], rows: [] };
  }

  // Split lines & remove empty ones
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  // First line = headers
  const columns = lines[0].split("\t");

  const rows = lines.slice(1).map((line) => {
    const values = line.split("\t");
    const row = {};

    columns.forEach((col, idx) => {
      row[col] = values[idx] ?? null;
    });

    return row;
  });

  return { columns, rows };
}
