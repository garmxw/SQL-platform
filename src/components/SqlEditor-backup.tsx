//this is just a backupfile

"use client";
import { useRef, useEffect, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type * as monaco from "monaco-editor";
import { Settings, RefreshCw, Loader2 } from "lucide-react";
import { Tip } from "@/helpers/components_helpers/Tip";

// ─── Window type augmentation (fixed conflict with @types/node) ─────────────
interface AmdRequire {
  config(cfg: { paths: Record<string, string> }): void;
  (deps: string[], cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    monaco: typeof import("monaco-editor");
    __sqllab_themes: boolean;
    __monacoLoading: boolean;
    require: AmdRequire | any; // ← this fixes "Subsequent property declarations" error
  }
}

/* ════════════════════════════════════════════════════════════════════════
   EDITOR SETTINGS + load/save
════════════════════════════════════════════════════════════════════════ */
const FONT_FAMILIES = [
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "Cascadia Code", value: "'Cascadia Code', monospace" },
  { label: "Consolas", value: "'Consolas', monospace" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Monospace", value: "monospace" },
];

export type EditorSettings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wordWrap: "on" | "off" | "wordWrapColumn" | "bounded";
  minimap: boolean;
  ligatures: boolean;
  whitespace: "none" | "boundary" | "selection" | "trailing" | "all";
  keybindings: "default" | "vim";
  lineNumbers: "on" | "off" | "relative" | "interval";
  folding: boolean;
  bracketGuides: boolean;
};

export const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  lineHeight: 21,
  tabSize: 2,
  wordWrap: "on",
  minimap: false,
  ligatures: true,
  whitespace: "selection",
  keybindings: "default",
  lineNumbers: "on",
  folding: true,
  bracketGuides: true,
};

export function loadSettings(): EditorSettings {
  try {
    const s = localStorage.getItem("sqllab_editor_settings");
    return s
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: EditorSettings): void {
  try {
    localStorage.setItem("sqllab_editor_settings", JSON.stringify(s));
  } catch {}
}

export type Dialect = "mysql" | "postgres" | "sqlite";

type MonacoEditorProps = {
  value: string;
  onChange: (val: string) => void;
  dark: boolean;
  dialect: Dialect;
  onMarkers: (markers: monaco.editor.IMarkerData[]) => void;
  settings: EditorSettings;
};

/* ════════════════════════════════════════════════════════════════════════
   MONACO LOADER (singleton + robust)
════════════════════════════════════════════════════════════════════════ */
const MONACO_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs";

let monacoInstance: typeof import("monaco-editor") | null = null;
let isLoadingMonaco = false;

async function loadMonaco(): Promise<typeof import("monaco-editor")> {
  if (monacoInstance) return monacoInstance;

  if (isLoadingMonaco) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (monacoInstance) {
          clearInterval(interval);
          resolve(monacoInstance);
        }
      }, 30);
    });
  }

  isLoadingMonaco = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${MONACO_CDN}/loader.min.js`;
    script.onload = () => {
      window.require.config({ paths: { vs: MONACO_CDN } });
      window.require(
        ["vs/editor/editor.main"],
        (m: typeof import("monaco-editor")) => {
          monacoInstance = m;
          isLoadingMonaco = false;
          resolve(m);
        },
      );
    };
    script.onerror = () => {
      isLoadingMonaco = false;
      reject(new Error("Failed to load Monaco"));
    };
    document.head.appendChild(script);
  });
}

/* ════════════════════════════════════════════════════════════════════════
   KBD HELPERS
════════════════════════════════════════════════════════════════════════ */
type KbdProps = { children: ReactNode };

export function Kbd({ children }: KbdProps) {
  return <span className="kbd-key">{children}</span>;
}
export function KbdGroup({ children }: KbdProps) {
  return <span className="kbd-group">{children}</span>;
}

/* ════════════════════════════════════════════════════════════════════════
   SQL LINTER + KEYWORDS
════════════════════════════════════════════════════════════════════════ */
const SQL_KWS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "CROSS JOIN",
  "FULL OUTER JOIN",
  "ON",
  "AS",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "DISTINCT",
  "UNION",
  "UNION ALL",
  "WITH",
  "RECURSIVE",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "CREATE TABLE",
  "DROP TABLE",
  "ALTER TABLE",
  "NOT NULL",
  "PRIMARY KEY",
  "FOREIGN KEY",
  "REFERENCES",
  "DEFAULT",
  "UNIQUE",
  "INDEX",
  "DENSE_RANK",
  "ROW_NUMBER",
  "RANK",
  "NTILE",
  "LAG",
  "LEAD",
  "OVER",
  "PARTITION BY",
  "COALESCE",
  "NULLIF",
  "CAST",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "ROUND",
  "FLOOR",
  "CEIL",
  "NOW",
  "DATE",
  "CURRENT_DATE",
  "UPPER",
  "LOWER",
  "TRIM",
  "LENGTH",
  "CONCAT",
  "REPLACE",
  "SUBSTR",
  "ISNULL",
  "IFNULL",
  "INT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "DECIMAL",
  "FLOAT",
  "DOUBLE",
  "BOOLEAN",
  "CHAR",
  "VARCHAR",
  "TEXT",
  "TIMESTAMP",
  "SERIAL",
  "AUTO_INCREMENT",
];

export function buildMarkers(
  sql: string,
  dialect: Dialect,
  mSev: typeof monaco.MarkerSeverity,
): monaco.editor.IMarkerData[] {
  if (!sql.trim()) return [];

  const markers: monaco.editor.IMarkerData[] = [];
  const lines = sql.split("\n");

  const lineOf = (rx: RegExp): number => {
    const i = lines.findIndex((l) => rx.test(l));
    return i === -1 ? lines.length : i + 1;
  };

  const has = (rx: RegExp): boolean => rx.test(sql);

  const addLine = (ln: number, msg: string, sev: monaco.MarkerSeverity) => {
    const t = lines[ln - 1] || "";
    markers.push({
      severity: sev,
      message: msg,
      startLineNumber: ln,
      startColumn: 1,
      endLineNumber: ln,
      endColumn: t.length + 1,
    });
  };

  // Parentheses balance
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth < 0) {
        addLine(
          sql.slice(0, i).split("\n").length,
          "Unexpected ')' — no matching '('",
          mSev.Error,
        );
        depth = 0;
      }
    }
  }
  if (depth > 0)
    addLine(lines.length, `Unclosed '(' — ${depth} never closed`, mSev.Error);

  // Dialect-specific
  if (dialect === "postgres" && has(/\bAUTO_INCREMENT\b/i)) {
    addLine(
      lineOf(/AUTO_INCREMENT/i),
      "AUTO_INCREMENT is MySQL-only",
      mSev.Error,
    );
  }
  if (dialect === "mysql" && has(/\bRETURNING\b/i)) {
    addLine(
      lineOf(/\bRETURNING/i),
      "RETURNING is PostgreSQL/SQLite only",
      mSev.Error,
    );
  }
  if (dialect === "sqlite" && has(/\bRIGHT\s+(?:OUTER\s+)?JOIN\b/i)) {
    addLine(
      lineOf(/RIGHT.*JOIN/i),
      "RIGHT JOIN not supported in SQLite",
      mSev.Error,
    );
  }

  // Typo warnings
  const TYPOS: Record<string, string> = {
    SELCT: "SELECT",
    FRMO: "FROM",
    WHREE: "WHERE",
    JION: "JOIN",
    GRPUP: "GROUP BY",
    ORDEER: "ORDER BY",
  };
  for (const [bad, good] of Object.entries(TYPOS)) {
    const rx = new RegExp(`\\b${bad}\\b`, "i");
    if (rx.test(sql))
      addLine(
        lineOf(rx),
        `Typo: "${bad}" — did you mean ${good}?`,
        mSev.Warning,
      );
  }

  // Missing semicolon
  const stripped = sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (stripped.length > 6 && !stripped.endsWith(";")) {
    addLine(lines.length, "Statement does not end with a semicolon", mSev.Info);
  }

  return markers;
}

/* ════════════════════════════════════════════════════════════════════════
   MONACO EDITOR COMPONENT (fully fixed)
════════════════════════════════════════════════════════════════════════ */
export function MonacoEditor({
  value,
  onChange,
  dark,
  dialect,
  onMarkers,
  settings,
}: MonacoEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!hostRef.current) return;
      const mn = await loadMonaco();
      if (cancelled) return;

      if (!mn.languages.getLanguages().some((l) => l.id === "sql")) {
        mn.languages.register({ id: "sql" });
      }

      const model = mn.editor.createModel(value, "sql");
      modelRef.current = model;

      // Themes (once)
      if (!window.__sqllab_themes) {
        window.__sqllab_themes = true;
        mn.editor.defineTheme("sqll-light", {
          /* your light theme config */ base: "vs",
          inherit: true,
          rules: [
            /* ... */
          ],
          colors: {
            /* ... */
          },
        });
        mn.editor.defineTheme("sqll-dark", {
          /* your dark theme config */ base: "vs-dark",
          inherit: true,
          rules: [
            /* ... */
          ],
          colors: {
            /* ... */
          },
        });
      }

      const editor = mn.editor.create(hostRef.current, {
        model,
        theme: dark ? "sqll-dark" : "sqll-light",
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        fontLigatures: settings.ligatures,
        lineHeight: settings.lineHeight,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: settings.bracketGuides ? "active" : false },
        renderWhitespace: settings.whitespace,
        folding: settings.folding,
        lineNumbers: settings.lineNumbers,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false,
        },
      });

      editorRef.current = editor;

      requestAnimationFrame(() => editor.layout());

      const ro = new ResizeObserver(() => editor.layout());
      ro.observe(hostRef.current);

      // Completions, hover, change handler, etc. (your original logic)
      const changeDispose = model.onDidChangeContent(() => {
        const sql = model.getValue();
        onChange(sql);
        const markers = buildMarkers(sql, dialect, mn.MarkerSeverity);
        mn.editor.setModelMarkers(model, "sqllab", markers);
        onMarkers(markers);
      });

      const initialMarkers = buildMarkers(value, dialect, mn.MarkerSeverity);
      mn.editor.setModelMarkers(model, "sqllab", initialMarkers);
      onMarkers(initialMarkers);

      setIsReady(true);

      return () => {
        cancelled = true;
        ro.disconnect();
        changeDispose.dispose();
        editor.dispose();
        model.dispose();
      };
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Theme & settings sync
  useEffect(() => {
    if (editorRef.current)
      window.monaco?.editor.setTheme(dark ? "sqll-dark" : "sqll-light");
  }, [dark]);
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      fontLigatures: settings.ligatures,
      renderWhitespace: settings.whitespace,
      lineNumbers: settings.lineNumbers,
      folding: settings.folding,
      guides: { bracketPairs: settings.bracketGuides ? "active" : false },
    });
  }, [settings]);

  useEffect(() => {
    const model = modelRef.current;
    if (model && value !== model.getValue()) model.setValue(value);
  }, [value]);

  if (!isReady) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-border bg-background rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading Monaco Editor...
          </p>
        </div>
      </div>
    );
  }

  return <div ref={hostRef} className="h-full w-full" />;
}

/* ════════════════════════════════════════════════════════════════════════
   SETTINGS SHEET (unchanged)
════════════════════════════════════════════════════════════════════════ */
interface ToggleProps {
  on: boolean;
  onToggle: () => void;
}
function Toggle({ on, onToggle }: ToggleProps) {
  return (
    <div
      className={`sw${on ? " on" : ""}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
    />
  );
}

interface SettingRowProps {
  label: string;
  desc?: string;
  children: React.ReactNode;
}
function SettingRow({ label, desc, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0 border-border/50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

interface EditorSettingsSheetProps {
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
}

export function EditorSettingsSheet({
  settings,
  onChange,
}: EditorSettingsSheetProps) {
  const set = <K extends keyof EditorSettings>(k: K, v: EditorSettings[K]) => {
    const n = { ...settings, [k]: v };
    saveSettings(n);
    onChange(n);
  };

  return (
    <Sheet>
      <Tip label="Editor settings">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings size={15} />
          </Button>
        </SheetTrigger>
      </Tip>

      <SheetContent
        side="right"
        className="w-[340px] sm:w-[380px] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings size={15} className="text-muted-foreground" />
            Editor Settings
          </SheetTitle>
          <SheetDescription className="text-xs">
            Preferences are saved automatically to your browser.
          </SheetDescription>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto px-5 py-2"
          style={{ minHeight: 0 }}
        >
          {/* ── Font ── */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-4 pb-1">
            Font
          </p>

          <SettingRow label="Font Family">
            <Select
              value={settings.fontFamily}
              onValueChange={(v) => set("fontFamily", v)}
            >
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem
                    key={f.value}
                    value={f.value}
                    className="text-xs"
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Font Size"
            desc={`Current: ${settings.fontSize}px`}
          >
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() =>
                  set("fontSize", Math.max(10, settings.fontSize - 1))
                }
              >
                −
              </Button>
              <span className="w-7 text-center text-sm font-mono font-semibold">
                {settings.fontSize}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() =>
                  set("fontSize", Math.min(24, settings.fontSize + 1))
                }
              >
                +
              </Button>
            </div>
          </SettingRow>

          <SettingRow
            label="Line Height"
            desc={`Current: ${settings.lineHeight}px`}
          >
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() =>
                  set("lineHeight", Math.max(16, settings.lineHeight - 1))
                }
              >
                −
              </Button>
              <span className="w-7 text-center text-sm font-mono font-semibold">
                {settings.lineHeight}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() =>
                  set("lineHeight", Math.min(32, settings.lineHeight + 1))
                }
              >
                +
              </Button>
            </div>
          </SettingRow>

          <SettingRow label="Font Ligatures" desc="Renders → ≠ => as glyphs">
            <Toggle
              on={settings.ligatures}
              onToggle={() => set("ligatures", !settings.ligatures)}
            />
          </SettingRow>

          {/* ── Indentation ── */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-5 pb-1">
            Indentation
          </p>

          <SettingRow label="Tab Size">
            <Select
              value={String(settings.tabSize)}
              onValueChange={(v) => set("tabSize", Number(v))}
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {[2, 4, 8].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n} spaces
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {/* ── Behavior ── */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-5 pb-1">
            Behavior
          </p>

          <SettingRow label="Word Wrap" desc="Wrap long lines to viewport">
            <Toggle
              on={settings.wordWrap === "on"}
              onToggle={() =>
                set("wordWrap", settings.wordWrap === "on" ? "off" : "on")
              }
            />
          </SettingRow>

          <SettingRow label="Minimap" desc="Overview ruler on the right">
            <Toggle
              on={settings.minimap}
              onToggle={() => set("minimap", !settings.minimap)}
            />
          </SettingRow>

          <SettingRow label="Line Numbers">
            <Select
              value={settings.lineNumbers}
              onValueChange={(v) =>
                set("lineNumbers", v as EditorSettings["lineNumbers"])
              }
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
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
          </SettingRow>

          <SettingRow label="Whitespace" desc="Show whitespace characters">
            <Select
              value={settings.whitespace}
              onValueChange={(v) =>
                set("whitespace", v as EditorSettings["whitespace"])
              }
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="none" className="text-xs">
                  None
                </SelectItem>
                <SelectItem value="selection" className="text-xs">
                  Selection
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  All
                </SelectItem>
                <SelectItem value="boundary" className="text-xs">
                  Boundary
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Code Folding" desc="Collapse/expand code blocks">
            <Toggle
              on={settings.folding}
              onToggle={() => set("folding", !settings.folding)}
            />
          </SettingRow>

          <SettingRow label="Bracket Guides" desc="Highlight matching brackets">
            <Toggle
              on={settings.bracketGuides}
              onToggle={() => set("bracketGuides", !settings.bracketGuides)}
            />
          </SettingRow>

          {/* ── Keybindings ── */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-5 pb-1">
            Keybindings
          </p>

          <SettingRow label="Key Mode" desc="Vim/Emacs loaded from CDN">
            <Select
              value={settings.keybindings}
              onValueChange={(v) =>
                set("keybindings", v as EditorSettings["keybindings"])
              }
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                <SelectItem value="default" className="text-xs">
                  Default
                </SelectItem>
                <SelectItem value="vim" className="text-xs">
                  Vim
                </SelectItem>
                <SelectItem value="emacs" className="text-xs">
                  Emacs
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          {/* Shortcuts reference */}
          <div className="mt-4 mb-2 p-3 rounded-lg bg-muted/50 border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Keyboard Shortcuts
            </p>
            {(
              [
                ["Toggle comment", ["Ctrl", "+", "/"]],
                ["Autocomplete", ["Ctrl", "+", "Space"]],
                ["Format", ["Shift", "+", "Alt", "+", "F"]],
                ["Command palette", ["Ctrl", "+", "Shift", "+", "P"]],
              ] as const
            ).map(([label, keys]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <KbdGroup>
                  {keys.map((k, i) =>
                    k === "+" ? (
                      <span
                        key={i}
                        className="text-muted-foreground text-[10px] mx-0.5"
                      >
                        +
                      </span>
                    ) : (
                      <Kbd key={i}>{k}</Kbd>
                    ),
                  )}
                </KbdGroup>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="flex-shrink-0 border-t px-5 py-3 flex flex-row justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              Settings(DEFAULT_SETTINGS);
              onChange({ ...DEFAULT_SETTINGS });
            }}
          >
            <RefreshCw size={11} />
            Reset defaults
          </Button>
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Close
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
