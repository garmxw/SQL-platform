// SchemaViewer — two separate tables: structure + seed data
// Design matches OutputTable from LessonEditorPage exactly

import { useMemo } from "react";
import {
  Database,
  Key,
  Link,
  Hash,
  TableProperties,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseSchemaSql,
  type ParsedTable,
  type SchemaColumn,
} from "@/lib/schemaParser";

// ─── Constraint pill ──────────────────────────────────────────────────────────

function ConstraintPill({ label }: { label: string }) {
  const style =
    label === "PK"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      : label === "AI"
        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
        : label === "UQ"
          ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30"
          : label.startsWith("FK")
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-px rounded text-[9px] font-bold tracking-wide border",
        style,
      )}
    >
      {label}
    </span>
  );
}

// ─── Structure table (identical design to OutputTable) ────────────────────────

function StructureTable({ table }: { table: ParsedTable }) {
  // Column headers for the structure view
  const headers = ["Column", "Type", "Nullable", "Tags"];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <TableProperties className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Structure</span>
        <span className="text-[10px] text-muted-foreground ml-1">
          {table.columns.length} column{table.columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 hover:bg-muted/50">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-xs font-semibold whitespace-nowrap h-8 px-3 sticky top-0 bg-muted/90 backdrop-blur-sm z-10 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col, i) => (
                <tr
                  key={i}
                  className="hover:bg-muted/30 border-t border-border/40"
                >
                  {/* Column name */}
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {col.isPrimary ? (
                        <Key className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : col.constraints.some((c) => c.startsWith("FK")) ? (
                        <Link className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Hash className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-xs",
                          col.isPrimary &&
                            "font-semibold text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {col.name}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className="text-xs text-sky-600 dark:text-sky-400">
                      {col.type}
                      {col.defaultValue && (
                        <span className="text-muted-foreground/50 ml-1.5">
                          = {col.defaultValue}
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Nullable */}
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span
                      className={cn(
                        "text-xs",
                        col.isNotNull
                          ? "text-muted-foreground/50"
                          : "text-emerald-500",
                      )}
                    >
                      {col.isNotNull ? "NOT NULL" : "NULL"}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {col.constraints.length === 0 ? (
                        <span className="text-muted-foreground/30 text-xs">
                          —
                        </span>
                      ) : (
                        col.constraints.map((c, ci) => (
                          <ConstraintPill key={ci} label={c} />
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Data rows table (identical design to OutputTable) ────────────────────────

function DataTable({
  columns,
  rows,
}: {
  columns: SchemaColumn[];
  rows: Record<string, string>[];
}) {
  const colNames = columns.map((c) => c.name);
  const visibleRows = rows.slice(0, 10);
  const truncated = rows.length > 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Rows3 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Sample data</span>
        <span className="text-[10px] text-muted-foreground ml-1">
          {rows.length} row{rows.length !== 1 ? "s" : ""}
          {truncated && ", showing first 10"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed flex items-center justify-center py-6">
          <p className="text-xs text-muted-foreground italic">No seed data</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 hover:bg-muted/50">
                  {colNames.map((col) => {
                    const colDef = columns.find((c) => c.name === col);
                    return (
                      <th
                        key={col}
                        className="text-xs font-semibold whitespace-nowrap h-8 px-3 sticky top-0 bg-muted/90 backdrop-blur-sm z-10 text-left"
                      >
                        <div className="flex items-center gap-1">
                          {colDef?.isPrimary && (
                            <Key className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          )}
                          {!colDef?.isPrimary &&
                            colDef?.constraints.some((c) =>
                              c.startsWith("FK"),
                            ) && (
                              <Link className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                            )}
                          {col}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="hover:bg-muted/30 border-t border-border/40"
                  >
                    {colNames.map((col) => {
                      const colDef = columns.find((c) => c.name === col);
                      const val = row[col] ?? "";
                      const isNull =
                        val === "" || val === "NULL" || val === "null";

                      return (
                        <td
                          key={col}
                          className={cn(
                            "px-3 py-1.5 whitespace-nowrap",
                            isNull && "text-muted-foreground/40 italic",
                            colDef?.isPrimary &&
                              !isNull &&
                              "text-amber-600 dark:text-amber-400 font-medium",
                            colDef?.constraints.some((c) =>
                              c.startsWith("FK"),
                            ) &&
                              !isNull &&
                              "text-emerald-600 dark:text-emerald-400",
                          )}
                          title={val.length > 24 ? val : undefined}
                        >
                          {isNull ? "NULL" : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: "PK", desc: "Primary Key" },
        { label: "AI", desc: "Auto Increment" },
        { label: "UQ", desc: "Unique" },
        { label: "FK→", desc: "Foreign Key" },
      ].map(({ label, desc }) => (
        <div key={label} className="flex items-center gap-1">
          <ConstraintPill label={label} />
          <span className="text-[10px] text-muted-foreground">{desc}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Per-table block ──────────────────────────────────────────────────────────

function TableBlock({ table }: { table: ParsedTable }) {
  return (
    <div className="space-y-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
      {/* Table name */}
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">{table.name}</span>
      </div>

      {/* Structure table */}
      <StructureTable table={table} />

      {/* Data rows table */}
      <DataTable columns={table.columns} rows={table.rows} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SchemaViewer({ schemaSql }: { schemaSql: string }) {
  const tables = useMemo(() => parseSchemaSql(schemaSql), [schemaSql]);

  if (!schemaSql.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Database className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">No schema available</p>
        <p className="text-xs text-muted-foreground mt-1">
          The admin hasn't defined a schema for this dialect.
        </p>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold">Schema SQL</p>
        </div>
        <pre className="p-4 text-xs leading-6 overflow-x-auto whitespace-pre bg-background">
          {schemaSql}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tables.map((table, i) => (
        <TableBlock key={i} table={table} />
      ))}
      <Legend />
    </div>
  );
}
