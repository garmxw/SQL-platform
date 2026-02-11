export function parsePostgresResult(raw) {
  if (!raw || !raw.trim()) return { columns: [], rows: [] }; // No data

  // Split lines
  const lines = raw
    .trim()
    .split("\n")
    // Remove the "(X rows)" footer line
    .filter((line) => !line.match(/^\(\d+\srows?\)$/i));

  if (lines.length === 0) return { columns: [], rows: [] };

  // Columns are in the first line
  const columns = lines[0].split("\t");

  // Map the rest into objects
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
