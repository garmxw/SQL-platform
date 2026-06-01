export interface SchemaColumn {
  name: string;
  type: string;
  constraints: string[];
  isPrimary: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue: string | null;
}

export interface ParsedTable {
  name: string;
  columns: SchemaColumn[];
  rows: Record<string, string>[];
}

export function parseSchemaSql(sql: string): ParsedTable[] {
  if (!sql?.trim()) return [];
  try {
    const tables = extractTables(sql);
    const insertMap = extractInserts(sql);
    return tables.map((t) => ({
      ...t,
      rows: synthesizeAutoIds(t.columns, insertMap[t.name.toLowerCase()] ?? []),
    }));
  } catch {
    return [];
  }
}

// ─── Auto-ID synthesis ────────────────────────────────────────────────────────
//
// Problem: SERIAL / AUTO_INCREMENT / INTEGER PRIMARY KEY columns are omitted
// from INSERT INTO column lists because the DB generates them. The parser
// correctly leaves them as "" (empty), which displays as NULL.
//
// Fix: for each row, if a column is auto-increment/serial AND its value is
// empty, fill it with a sequential integer starting at 1.

function synthesizeAutoIds(
  columns: SchemaColumn[],
  rows: Record<string, string>[],
): Record<string, string>[] {
  // Find columns that are auto-generated PKs
  const autoIdCols = columns
    .filter((c) => {
      const isAI =
        c.constraints.includes("AI") ||
        c.type === "SERIAL" ||
        c.type === "BIGSERIAL" ||
        c.type === "SMALLSERIAL";
      return isAI && c.isPrimary;
    })
    .map((c) => c.name);

  if (autoIdCols.length === 0) return rows;

  return rows.map((row, i) => {
    const patched = { ...row };
    for (const col of autoIdCols) {
      const val = patched[col];
      if (val === undefined || val === "" || val === "NULL" || val === "null") {
        patched[col] = String(i + 1);
      }
    }
    return patched;
  });
}

// ─── CREATE TABLE parser ──────────────────────────────────────────────────────

function extractTables(sql: string): Omit<ParsedTable, "rows">[] {
  const tables: Omit<ParsedTable, "rows">[] = [];
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([^;]*)\)/gis;

  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const columns = parseColumns(match[2]);
    if (columns.length > 0) tables.push({ name: match[1], columns });
  }
  return tables;
}

function parseColumns(body: string): SchemaColumn[] {
  const parts = splitTopLevelCommas(body);
  const columns: SchemaColumn[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const upper = trimmed.toUpperCase();

    // Table-level constraints — handle composite PK then skip
    if (
      upper.startsWith("PRIMARY KEY") ||
      upper.startsWith("UNIQUE") ||
      upper.startsWith("FOREIGN KEY") ||
      upper.startsWith("CONSTRAINT") ||
      upper.startsWith("CHECK") ||
      upper.startsWith("INDEX") ||
      upper.startsWith("KEY ")
    ) {
      if (upper.startsWith("PRIMARY KEY")) {
        const pkMatch = trimmed.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = pkMatch[1]
            .split(",")
            .map((c) => c.trim().replace(/[`"]/g, ""));
          columns.forEach((col) => {
            if (pkCols.includes(col.name)) col.isPrimary = true;
          });
        }
      }
      continue;
    }

    const colMatch = trimmed.match(/^[`"]?(\w+)[`"]?\s+(.+)$/i);
    if (!colMatch) continue;

    const name = colMatch[1];
    const rest = colMatch[2];
    const typeMatch = rest.match(
      /^(\w+(?:\s*\([^)]+\))?(?:\s+UNSIGNED)?(?:\s+ZEROFILL)?)/i,
    );
    const rawType = typeMatch ? typeMatch[1].trim() : rest.split(/\s/)[0];
    const upperRest = rest.toUpperCase();

    const isPrimary =
      upperRest.includes("PRIMARY KEY") || upperRest.includes("SERIAL");
    const isNotNull = isPrimary || upperRest.includes("NOT NULL");
    const isUnique = upperRest.includes("UNIQUE");
    const hasAI =
      upperRest.includes("AUTO_INCREMENT") ||
      upperRest.includes("AUTOINCREMENT") ||
      rawType.toUpperCase().includes("SERIAL");

    let defaultValue: string | null = null;
    const defMatch = rest.match(/DEFAULT\s+([^\s,]+(?:\([^)]*\))?)/i);
    if (defMatch) defaultValue = defMatch[1];

    const constraints: string[] = [];
    if (isPrimary) constraints.push("PK");
    if (hasAI) constraints.push("AI");
    if (isUnique && !isPrimary) constraints.push("UQ");
    const fkMatch = rest.match(/REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/i);
    if (fkMatch) constraints.push(`FK→${fkMatch[1]}`);

    columns.push({
      name,
      type: rawType.toUpperCase(),
      constraints,
      isPrimary,
      isNotNull,
      isUnique,
      defaultValue,
    });
  }

  return columns;
}

// ─── INSERT INTO parser ───────────────────────────────────────────────────────

function extractInserts(sql: string): Record<string, Record<string, string>[]> {
  const result: Record<string, Record<string, string>[]> = {};
  const insertRegex =
    /INSERT\s+INTO\s+[`"]?(\w+)[`"]?\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]*?)(?=;|INSERT\s+INTO|CREATE\s+TABLE|$)/gi;

  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const colsPart = match[2] ?? null;
    const valuesPart = match[3];

    const cols = colsPart
      ? colsPart.split(",").map((c) => c.trim().replace(/[`"]/g, ""))
      : null;

    const tuples = extractValueTuples(valuesPart);

    const rows: Record<string, string>[] = tuples.map((tuple) => {
      const vals = splitTopLevelCommas(tuple);
      const row: Record<string, string> = {};
      vals.forEach((val, i) => {
        const key = cols ? (cols[i] ?? `col${i + 1}`) : `col${i + 1}`;
        row[key] = stripQuotes(val.trim());
      });
      return row;
    });

    if (!result[tableName]) result[tableName] = [];
    result[tableName].push(...rows);
  }

  return result;
}

function extractValueTuples(valuesPart: string): string[] {
  const tuples: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let current = "";
  let capturing = false;

  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];

    if (inString) {
      if (ch === stringChar && valuesPart[i - 1] !== "\\") inString = false;
      if (capturing) current += ch;
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      if (capturing) current += ch;
      continue;
    }

    if (ch === "(") {
      depth++;
      if (depth === 1) {
        capturing = true;
        current = "";
        continue;
      }
    }
    if (ch === ")") {
      depth--;
      if (depth === 0 && capturing) {
        tuples.push(current.trim());
        capturing = false;
        current = "";
        continue;
      }
    }

    if (capturing) current += ch;
  }

  return tuples;
}

function stripQuotes(val: string): string {
  if (
    (val.startsWith("'") && val.endsWith("'")) ||
    (val.startsWith('"') && val.endsWith('"'))
  ) {
    return val.slice(1, -1);
  }
  return val;
}

function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let current = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (ch === stringChar && str[i - 1] !== "\\") inString = false;
      current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")") {
      depth--;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
