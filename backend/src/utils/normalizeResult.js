/**
  Normalize parsed SQL results for fair comparison.
 @param {Object} parsedResult
 @param {boolean} [ignoreOrder=false] If true, rows will be sorted
 */
export function normalizeResult(parsedResult, ignoreOrder = false) {
  const { columns, rows } = parsedResult;

  if (!rows || rows.length === 0) {
    return { columns, rows: [] };
  }

  // Normalize each value
  const normalizedRows = rows.map((row) => {
    const obj = {};
    columns.forEach((col) => {
      let val = row[col];

      if (val === null || val === undefined) {
        val = null;
      } else if (typeof val === "string") {
        val = val.trim();
      } else {
        val = String(val);
      }

      obj[col] = val;
    });
    return obj;
  });

  // If order doesn't matter, sort rows lexicographically
  const sortedRows = ignoreOrder
    ? normalizedRows.sort((a, b) => {
        for (let col of columns) {
          const va = a[col] === null ? "" : a[col];
          const vb = b[col] === null ? "" : b[col];
          if (va < vb) return -1;
          if (va > vb) return 1;
        }
        return 0;
      })
    : normalizedRows;

  return { columns, rows: sortedRows };
}
