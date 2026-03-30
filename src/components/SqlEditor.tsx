"use client";

/**
 * SqlEditor.tsx — stable Monaco-based SQL editor (FIXED)
 *
 * Fixes applied:
 *   1. Hydration mismatch on loading overlay (the exact error you saw).
 *      → The `dark` prop can differ between server render and client initial render
 *        when the parent uses `typeof window` / media query / localStorage for theme.
 *      → Now the loading background is always dark on first render (matches server + hydrate),
 *        then updates safely after mount. No more mismatch, no suppressHydrationWarning hack.
 *   2. Made editor more resilient to rapid mount/unmount (StrictMode / HMR).
 *   3. Minor performance / stability tweaks (memoized callbacks, clearer dead-flag handling).
 *   4. Loading state now survives if monaco fails to load (shows error instead of infinite spinner).
 *   5. Better error handling on monaco bootstrap.
 *
 * The rest of the editor (linting, completions, settings, value sync, etc.) was already solid.
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type Dialect = "mysql" | "postgres" | "sqlite";

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  lineNumbers: "on" | "off" | "relative";
  wordWrap: "on" | "off";
  minimap: boolean;
  formatOnType: boolean;
  formatOnPaste: boolean;
  cursorStyle: "line" | "block" | "underline";
  fontLigatures: boolean;
  bracketPairColorization: boolean;
  renderWhitespace: "none" | "boundary" | "all";
  smoothScrolling: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  lineNumbers: "on",
  wordWrap: "off",
  minimap: false,
  formatOnType: false,
  formatOnPaste: true,
  cursorStyle: "line",
  fontLigatures: true,
  bracketPairColorization: true,
  renderWhitespace: "none",
  smoothScrolling: true,
};

const SETTINGS_KEY = "ssql_editor_settings";

export function loadSettings(): EditorSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function persistSettings(s: EditorSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Monaco singleton bootstrap (unchanged — already very stable)
// ─────────────────────────────────────────────────────────────────────────────

type MonacoModule = typeof import("monaco-editor");

let _monacoPromise: Promise<MonacoModule> | null = null;

function getMonaco(): Promise<MonacoModule> {
  if (_monacoPromise) return _monacoPromise;

  _monacoPromise = new Promise<MonacoModule>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Monaco cannot be loaded during SSR"));
      return;
    }

    if ((window as any).__ssql_monaco) {
      resolve((window as any).__ssql_monaco as MonacoModule);
      return;
    }

    const doRequire = () => {
      const req = (window as any).require as any;
      req.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs",
        },
      });
      req(["vs/editor/editor.main"], (monaco: MonacoModule) => {
        (window as any).__ssql_monaco = monaco;
        setupMonaco(monaco);
        resolve(monaco);
      });
    };

    if ((window as any).require) {
      doRequire();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs/loader.js";
    script.onload = doRequire;
    script.onerror = () => reject(new Error("Failed to load Monaco loader"));
    document.head.appendChild(script);
  });

  return _monacoPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// One-time Monaco setup (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

let _setupDone = false;

function setupMonaco(monaco: MonacoModule) {
  if (_setupDone) return;
  _setupDone = true;

  // Dark theme
  monaco.editor.defineTheme("ssql-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword.sql", foreground: "c792ea", fontStyle: "bold" },
      { token: "keyword", foreground: "c792ea", fontStyle: "bold" },
      { token: "string.sql", foreground: "c3e88d" },
      { token: "string", foreground: "c3e88d" },
      { token: "number", foreground: "f78c6c" },
      { token: "comment", foreground: "546e7a", fontStyle: "italic" },
      { token: "operator", foreground: "89ddff" },
      { token: "delimiter", foreground: "89ddff" },
    ],
    colors: {
      "editor.background": "#0f1117",
      "editor.foreground": "#eeffff",
      "editor.lineHighlightBackground": "#1a1d2e",
      "editor.selectionBackground": "#2a3a5e",
      "editorLineNumber.foreground": "#3b4261",
      "editorLineNumber.activeForeground": "#6b7280",
      "editorCursor.foreground": "#c792ea",
      "editorWidget.background": "#13151f",
      "editorSuggestWidget.background": "#13151f",
      "editorSuggestWidget.border": "#1e2030",
      "editorSuggestWidget.selectedBackground": "#1e2a3a",
    },
  });

  // Light theme
  monaco.editor.defineTheme("ssql-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword.sql", foreground: "7c3aed", fontStyle: "bold" },
      { token: "keyword", foreground: "7c3aed", fontStyle: "bold" },
      { token: "string.sql", foreground: "16a34a" },
      { token: "string", foreground: "16a34a" },
      { token: "number", foreground: "ea580c" },
      { token: "comment", foreground: "9ca3af", fontStyle: "italic" },
      { token: "operator", foreground: "0284c7" },
      { token: "delimiter", foreground: "0284c7" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#111827",
      "editor.lineHighlightBackground": "#f9fafb",
      "editor.selectionBackground": "#dbeafe",
      "editorLineNumber.foreground": "#d1d5db",
      "editorLineNumber.activeForeground": "#9ca3af",
      "editorCursor.foreground": "#7c3aed",
      "editorWidget.background": "#f9fafb",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#e5e7eb",
      "editorSuggestWidget.selectedBackground": "#eff6ff",
    },
  });

  // SQL completions (unchanged)
  const SQL_KEYWORDS = [
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "INNER JOIN",
    "FULL OUTER JOIN",
    "ON",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "UNION",
    "UNION ALL",
    "INTERSECT",
    "EXCEPT",
    "WITH",
    "AS",
    "DISTINCT",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "CREATE TABLE",
    "ALTER TABLE",
    "DROP TABLE",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    "IN",
    "NOT IN",
    "EXISTS",
    "NOT EXISTS",
    "BETWEEN",
    "LIKE",
    "IS NULL",
    "IS NOT NULL",
    "AND",
    "OR",
    "NOT",
    "ASC",
    "DESC",
    "PARTITION BY",
    "OVER",
  ];
  const SQL_FUNCTIONS = [
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "COALESCE",
    "NULLIF",
    "CAST",
    "DENSE_RANK",
    "RANK",
    "ROW_NUMBER",
    "NTILE",
    "LEAD",
    "LAG",
    "FIRST_VALUE",
    "LAST_VALUE",
    "UPPER",
    "LOWER",
    "TRIM",
    "SUBSTRING",
    "LENGTH",
    "REPLACE",
    "CONCAT",
    "ROUND",
    "ABS",
    "FLOOR",
    "CEIL",
    "NOW",
    "CURRENT_TIMESTAMP",
    "EXTRACT",
    "IFNULL",
    "STRING_AGG",
    "GROUP_CONCAT",
  ];

  monaco.languages.registerCompletionItemProvider("sql", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          ...SQL_KEYWORDS.map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          })),
          ...SQL_FUNCTIONS.map((fn) => ({
            label: fn,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: fn + "($1)",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        ],
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL linter (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/* ... LintRule, COMMON, DIALECT, lint function unchanged ... */
interface LintRule {
  re: RegExp;
  msg: string;
  sev: 8 | 4 | 2;
}

const COMMON: LintRule[] = [
  {
    re: /SELECT\s+\*/i,
    msg: "Avoid SELECT * — list columns explicitly.",
    sev: 4,
  },
  {
    re: /DROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    msg: "Destructive DROP statement detected.",
    sev: 8,
  },
  {
    re: /DELETE\s+FROM\s+\w+\s*;/i,
    msg: "DELETE without WHERE will remove all rows.",
    sev: 8,
  },
  {
    re: /NOT\s+IN\s*\(\s*SELECT\b/i,
    msg: "NOT IN with subquery can misbehave with NULLs — consider NOT EXISTS.",
    sev: 4,
  },
  {
    re: /ORDER\s+BY\s+\d+\b/i,
    msg: "ORDER BY positional index is fragile — use column names.",
    sev: 4,
  },
  {
    re: /UNION(?!\s+ALL)/i,
    msg: "UNION deduplicates rows — use UNION ALL if duplicates are OK.",
    sev: 2,
  },
  {
    re: /CROSS\s+JOIN\b/i,
    msg: "CROSS JOIN produces a cartesian product.",
    sev: 2,
  },
  {
    re: /SELECT\s+DISTINCT\b/i,
    msg: "DISTINCT may hide data model issues — verify it is necessary.",
    sev: 2,
  },
];
const DIALECT: Record<Dialect, LintRule[]> = {
  mysql: [
    {
      re: /LIMIT\s+\d+\s*,\s*\d+/i,
      msg: "MySQL LIMIT offset syntax — consider LIMIT m OFFSET n for portability.",
      sev: 2,
    },
    {
      re: /\bIFNULL\b/i,
      msg: "IFNULL is MySQL-specific — use COALESCE for portability.",
      sev: 2,
    },
    {
      re: /\bGROUP_CONCAT\b/i,
      msg: "GROUP_CONCAT is MySQL-specific — use STRING_AGG in PostgreSQL.",
      sev: 2,
    },
  ],
  postgres: [
    {
      re: /\bSERIAL\b/i,
      msg: "SERIAL is legacy — prefer GENERATED ALWAYS AS IDENTITY.",
      sev: 2,
    },
    { re: /\bILIKE\b/i, msg: "ILIKE is PostgreSQL-specific.", sev: 2 },
    {
      re: /::\w+/,
      msg: "Cast syntax (::type) is PostgreSQL-specific — use CAST().",
      sev: 2,
    },
  ],
  sqlite: [
    {
      re: /FULL\s+OUTER\s+JOIN\b/i,
      msg: "FULL OUTER JOIN is not supported in SQLite.",
      sev: 8,
    },
    {
      re: /RIGHT\s+JOIN\b/i,
      msg: "RIGHT JOIN is not supported in SQLite.",
      sev: 8,
    },
    {
      re: /\bTRUNCATE\b/i,
      msg: "TRUNCATE is not supported in SQLite — use DELETE FROM.",
      sev: 8,
    },
  ],
};

type IMarkerData = import("monaco-editor").editor.IMarkerData;

function lint(
  model: import("monaco-editor").editor.ITextModel,
  dialect: Dialect,
): IMarkerData[] {
  /* ... same as original ... */
  const lines = model.getValue().split("\n");
  const rules = [...COMMON, ...(DIALECT[dialect] ?? [])];
  const out: IMarkerData[] = [];

  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*--/.test(line)) continue;
      const m = rule.re.exec(line);
      if (m) {
        out.push({
          severity: rule.sev,
          message: rule.msg,
          startLineNumber: i + 1,
          startColumn: m.index + 1,
          endLineNumber: i + 1,
          endColumn: m.index + m[0].length + 1,
          source: "ssql",
        });
      }
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// MonacoEditor — FIXED
// ─────────────────────────────────────────────────────────────────────────────

export interface MonacoEditorProps {
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
  dialect: Dialect;
  onMarkers?: (m: IMarkerData[]) => void;
  settings: EditorSettings;
}

export const MonacoEditor = React.memo(function MonacoEditor({
  value,
  onChange,
  dark = true,
  dialect,
  onMarkers,
  settings,
}: MonacoEditorProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const edRef = useRef<
    import("monaco-editor").editor.IStandaloneCodeEditor | null
  >(null);
  const moRef = useRef<MonacoModule | null>(null);
  const lintRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh callbacks
  const cbChange = useRef(onChange);
  const cbMarkers = useRef(onMarkers);
  const dRef = useRef(dialect);
  const sRef = useRef(settings);

  useEffect(() => {
    cbChange.current = onChange;
  }, [onChange]);
  useEffect(() => {
    cbMarkers.current = onMarkers;
  }, [onMarkers]);
  useEffect(() => {
    dRef.current = dialect;
  }, [dialect]);
  useEffect(() => {
    sRef.current = settings;
  }, [settings]);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── FIX: Stable loading background (prevents hydration mismatch) ─────────────
  const [loadingBackground, setLoadingBackground] = useState("#0f1117");
  useEffect(() => {
    setLoadingBackground(dark ? "#0f1117" : "#ffffff");
  }, [dark]);

  // Debounced lint
  const scheduleLint = useCallback(() => {
    if (lintRef.current) clearTimeout(lintRef.current);
    lintRef.current = setTimeout(() => {
      const ed = edRef.current;
      const mo = moRef.current;
      if (!ed || !mo) return;
      const model = ed.getModel();
      if (!model) return;
      const markers = lint(model, dRef.current);
      mo.editor.setModelMarkers(model, "ssql", markers);
      cbMarkers.current?.(markers);
    }, 500);
  }, []);

  // ── Create editor once (improved error handling + dead flag) ───────────────
  useEffect(() => {
    let dead = false;
    let mounted = true;

    getMonaco()
      .then((monaco) => {
        if (dead || !mounted || !domRef.current || edRef.current) return;

        moRef.current = monaco;

        const s = sRef.current;
        const ed = monaco.editor.create(domRef.current, {
          value,
          language: "sql",
          theme: dark ? "ssql-dark" : "ssql-light",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          fontFamily:
            "'JetBrains Mono','Fira Code','Cascadia Code',Consolas,monospace",
          fontSize: s.fontSize,
          tabSize: s.tabSize,
          lineNumbers: s.lineNumbers,
          wordWrap: s.wordWrap,
          minimap: { enabled: s.minimap },
          formatOnType: s.formatOnType,
          formatOnPaste: s.formatOnPaste,
          cursorStyle: s.cursorStyle,
          fontLigatures: s.fontLigatures,
          bracketPairColorization: { enabled: s.bracketPairColorization },
          renderWhitespace: s.renderWhitespace,
          smoothScrolling: s.smoothScrolling,
          folding: true,
          glyphMargin: true,
          lineDecorationsWidth: 4,
          lineNumbersMinChars: 3,
          suggest: { showKeywords: true, showFunctions: true },
        });

        edRef.current = ed;

        ed.onDidChangeModelContent(() => {
          cbChange.current(ed.getValue());
          scheduleLint();
        });

        scheduleLint();
        setReady(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Monaco load failed:", err);
        setLoadError(err.message || "Failed to load editor");
      });

    return () => {
      mounted = false;
      dead = true;
      if (lintRef.current) clearTimeout(lintRef.current);
      edRef.current?.dispose();
      edRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: create once

  // ── Sync external value changes ────────────────────────────────────────────
  useEffect(() => {
    const ed = edRef.current;
    if (!ed || !ready) return;
    if (ed.getValue() === value) return;

    const model = ed.getModel()!;
    ed.executeEdits("host", [
      {
        range: model.getFullModelRange(),
        text: value,
        forceMoveMarkers: true,
      },
    ]);
    ed.setPosition({ lineNumber: 1, column: 1 });
  }, [value, ready]);

  // ── Theme sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    moRef.current?.editor.setTheme(dark ? "ssql-dark" : "ssql-light");
  }, [dark]);

  // ── Dialect / lint trigger ─────────────────────────────────────────────────
  useEffect(() => {
    scheduleLint();
  }, [dialect, scheduleLint]);

  // ── Settings sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    edRef.current?.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      lineNumbers: settings.lineNumbers,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      formatOnType: settings.formatOnType,
      formatOnPaste: settings.formatOnPaste,
      cursorStyle: settings.cursorStyle,
      fontLigatures: settings.fontLigatures,
      bracketPairColorization: { enabled: settings.bracketPairColorization },
      renderWhitespace: settings.renderWhitespace,
      smoothScrolling: settings.smoothScrolling,
    });
  }, [settings]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!ready && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ background: loadingBackground }}
        >
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            {loadError ? (
              <>
                <div className="text-red-400 text-sm">
                  Editor failed to load
                </div>
                <div className="text-xs font-mono text-center max-w-[200px]">
                  {loadError}
                </div>
              </>
            ) : (
              <>
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span className="text-xs font-mono">Loading editor…</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor container — always mounted */}
      <div ref={domRef} className="w-full h-full" />
    </div>
  );
});
// ─────────────────────────────────────────────────────────────────────────────
// EditorSettingsSheet — Shadcn-style (clean & modern)
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium leading-none">{label}</Label>
        {hint && (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {hint}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mt-6 mb-2">
      {children}
    </p>
  );
}

export interface EditorSettingsSheetProps {
  settings: EditorSettings;
  onChange: (s: EditorSettings) => void;
}

export function EditorSettingsSheet({
  settings,
  onChange,
}: EditorSettingsSheetProps) {
  function upd<K extends keyof EditorSettings>(key: K, val: EditorSettings[K]) {
    const next = { ...settings, [key]: val };
    onChange(next);
    persistSettings(next);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings2 className="w-3.5 h-3.5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[340px] sm:w-[380px] flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4" />
            Editor Settings
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Customize font, layout, behavior and appearance of the SQL editor.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Typography */}
          <SectionHeading>Typography</SectionHeading>

          <Row label="Font Size" hint={`${settings.fontSize}px`}>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => upd("fontSize", v)}
              min={10}
              max={24}
              step={1}
              className="w-28"
            />
          </Row>

          <Row label="Cursor Style">
            <Select
              value={settings.cursorStyle}
              onValueChange={(v) =>
                upd("cursorStyle", v as EditorSettings["cursorStyle"])
              }
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line" className="text-xs">
                  Line
                </SelectItem>
                <SelectItem value="block" className="text-xs">
                  Block
                </SelectItem>
                <SelectItem value="underline" className="text-xs">
                  Underline
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row label="Font Ligatures" hint="Requires a ligature-capable font">
            <Switch
              checked={settings.fontLigatures}
              onCheckedChange={(v) => upd("fontLigatures", v)}
            />
          </Row>

          {/* Indentation */}
          <SectionHeading>Indentation</SectionHeading>

          <Row label="Tab Size" hint={`${settings.tabSize} spaces`}>
            <Slider
              value={[settings.tabSize]}
              onValueChange={([v]) => upd("tabSize", v)}
              min={2}
              max={8}
              step={2}
              className="w-28"
            />
          </Row>

          {/* Display */}
          <SectionHeading>Display</SectionHeading>

          <Row label="Line Numbers">
            <Select
              value={settings.lineNumbers}
              onValueChange={(v) =>
                upd("lineNumbers", v as EditorSettings["lineNumbers"])
              }
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on" className="text-xs">
                  On
                </SelectItem>
                <SelectItem value="off" className="text-xs">
                  Off
                </SelectItem>
                <SelectItem value="relative" className="text-xs">
                  Relative
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row label="Minimap" hint="Overview ruler on the right edge">
            <Switch
              checked={settings.minimap}
              onCheckedChange={(v) => upd("minimap", v)}
            />
          </Row>

          <Row label="Word Wrap">
            <Switch
              checked={settings.wordWrap === "on"}
              onCheckedChange={(v) => upd("wordWrap", v ? "on" : "off")}
            />
          </Row>

          <Row label="Render Whitespace">
            <Select
              value={settings.renderWhitespace}
              onValueChange={(v) =>
                upd("renderWhitespace", v as EditorSettings["renderWhitespace"])
              }
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  None
                </SelectItem>
                <SelectItem value="boundary" className="text-xs">
                  Boundary
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  All
                </SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="Bracket Colorization"
            hint="Colour matching bracket pairs"
          >
            <Switch
              checked={settings.bracketPairColorization}
              onCheckedChange={(v) => upd("bracketPairColorization", v)}
            />
          </Row>

          <Row label="Smooth Scrolling">
            <Switch
              checked={settings.smoothScrolling}
              onCheckedChange={(v) => upd("smoothScrolling", v)}
            />
          </Row>

          {/* Auto-Formatting */}
          <SectionHeading>Auto-Formatting</SectionHeading>

          <Row label="Format On Type">
            <Switch
              checked={settings.formatOnType}
              onCheckedChange={(v) => upd("formatOnType", v)}
            />
          </Row>

          <Row label="Format On Paste">
            <Switch
              checked={settings.formatOnPaste}
              onCheckedChange={(v) => upd("formatOnPaste", v)}
            />
          </Row>
        </div>

        {/* Footer / Reset */}
        <div className="px-6 py-6 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={() => {
              const d = { ...DEFAULT_SETTINGS };
              onChange(d);
              persistSettings(d);
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
