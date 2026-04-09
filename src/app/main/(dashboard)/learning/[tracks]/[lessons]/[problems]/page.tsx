"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import confetti from "canvas-confetti";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { editor } from "monaco-editor";

//  Imports from your MonacoEditor component

import {
  MonacoEditor,
  EditorSettingsSheet,
  loadSettings,
  DEFAULT_SETTINGS,
  type EditorSettings,
  type Dialect,
} from "@/components/SqlEditor";

import {
  Play,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GripVertical,
  GripHorizontal,
  Timer,
  Pause,
  PenLine,
  Eraser,
  Minus,
  Square,
  Circle,
  Trash2,
  Undo2,
  FileText,
  Code2,
  Database,
  Lightbulb,
  Star,
  Eye,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

//  TYPES

type RunStatus = "idle" | "running" | "accepted" | "wrong" | "error" | "tle";
type DrawTool = "pen" | "line" | "rect" | "circle" | "eraser" | "text";

interface RunResult {
  status: RunStatus;
  runtime?: string;
  rows?: Record<string, unknown>[];
  error?: string;
  passedCases?: number;
  totalCases?: number;
}
interface CanvasPoint {
  x: number;
  y: number;
}
interface CanvasStroke {
  tool: DrawTool;
  color: string;
  size: number;
  points: CanvasPoint[];
  text?: string;
}

//  MOCK DATA

const PROBLEM = {
  id: 185,
  title: "Department Top Three Salaries",
  difficulty: "Hard" as const,
  acceptance: "48.3%",
  tags: ["Window Functions", "Ranking", "Partition"],
  description: `A company wants to find employees who are in the **top three unique salary tiers** within each department.\n\nWrite a SQL query that returns the department name, employee name, and salary for all such employees.\n\nReturn the result in **any order**.`,
  solution: `-- Solution using DENSE_RANK window function\nWITH ranked AS (\n  SELECT\n    d.name        AS Department,\n    e.name        AS Employee,\n    e.salary      AS Salary,\n    DENSE_RANK() OVER (\n      PARTITION BY e.departmentId\n      ORDER BY e.salary DESC\n    ) AS rk\n  FROM Employee e\n  JOIN Department d ON e.departmentId = d.id\n)\nSELECT Department, Employee, Salary\nFROM ranked\nWHERE rk <= 3;`,
  schema: [
    {
      table: "Employee",
      columns: [
        { name: "id", type: "int", note: "PK" },
        { name: "name", type: "varchar(255)", note: "" },
        { name: "salary", type: "int", note: "" },
        { name: "departmentId", type: "int", note: "FK" },
      ],
    },
    {
      table: "Department",
      columns: [
        { name: "id", type: "int", note: "PK" },
        { name: "name", type: "varchar(255)", note: "" },
      ],
    },
  ],
  exampleOutput: [
    { Department: "IT", Employee: "Max", Salary: 90000 },
    { Department: "IT", Employee: "Joe", Salary: 85000 },
    { Department: "IT", Employee: "Randy", Salary: 85000 },
    { Department: "IT", Employee: "Janet", Salary: 69000 },
    { Department: "Sales", Employee: "Henry", Salary: 80000 },
    { Department: "Sales", Employee: "Sam", Salary: 60000 },
  ],
  hints: [
    "Use DENSE_RANK() to rank salaries within each department.",
    "PARTITION BY departmentId, ORDER BY salary DESC inside OVER().",
    "Wrap the ranked query in a CTE or subquery, then filter WHERE rank <= 3.",
  ],
  similar: [
    {
      id: 184,
      title: "Department Highest Salary",
      difficulty: "Medium" as const,
    },
    { id: 178, title: "Rank Scores", difficulty: "Medium" as const },
    { id: 177, title: "Nth Highest Salary", difficulty: "Medium" as const },
  ],
};

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: "mysql", label: "MySQL" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
];

const DEFAULT_SQL = `-- Write your SQL query here\nSELECT\n  d.name   AS Department,\n  e.name   AS Employee,\n  e.salary AS Salary\nFROM Employee e\nJOIN Department d ON e.departmentId = d.id\n`;

//  XP

const XP_KEY = "ssql_xp_185";
const MAX_XP = 500;
const BASE_XP = 300;

function XPBar({ xp, delta }: { xp: number; delta: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <Star className="w-3.5 h-3.5 shrink-0 text-[#e8af03] fill-[#FFC107]" />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            XP {xp}/{MAX_XP}
          </span>
          {delta !== null && (
            <span
              className={cn(
                "font-bold",
                delta > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {delta > 0 ? `+${delta}` : String(delta)}
            </span>
          )}
        </div>
        <Progress
          value={Math.round((xp / MAX_XP) * 100)}
          className="h-1.5 w-20"
        />
      </div>
    </div>
  );
}

//  CONFETTI

function fireSideCannons() {
  const end = Date.now() + 3000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
  function frame() {
    if (Date.now() > end) return;
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors,
    });
    requestAnimationFrame(frame);
  }
  frame();
}

//  WRONG OVERLAY

function WrongOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-2xl animate-[wrongShake_0.45s_ease-in-out]">
        <XCircle color="red" className="w-10 h-10 text-muted-foreground" />
        <p className="text-base font-semibold">Wrong Answer</p>
        <p className="text-sm text-muted-foreground">
          Review your logic and try again.
        </p>
      </div>
    </div>
  );
}

//  TIMER

type TimerMode = "stopwatch" | "countdown";
interface TimerState {
  mode: TimerMode;
  running: boolean;
  elapsed: number;
  limit: number;
  startedAt: number | null;
}

const TIMER_KEY = "ssql_timer_185";
const TIMER_DEFAULTS: TimerState = {
  mode: "stopwatch",
  running: false,
  elapsed: 0,
  limit: 30,
  startedAt: null,
};

function useTimer() {
  const [state, setState] = useState<TimerState>(TIMER_DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const saved: TimerState = JSON.parse(raw);
        if (saved.running && saved.startedAt) {
          const extra = Math.floor((Date.now() - saved.startedAt) / 1000);
          const newElapsed =
            saved.mode === "countdown"
              ? Math.min(saved.elapsed + extra, saved.limit * 60)
              : saved.elapsed + extra;
          const stillRunning = !(
            saved.mode === "countdown" && newElapsed >= saved.limit * 60
          );
          const r: TimerState = {
            ...saved,
            elapsed: newElapsed,
            running: stillRunning,
            startedAt: stillRunning ? Date.now() : null,
          };
          setState(r);
          localStorage.setItem(TIMER_KEY, JSON.stringify(r));
        } else {
          setState(saved);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  const save = (s: TimerState) => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(s));
    } catch {}
  };

  useEffect(() => {
    if (!mounted || !state.running) return;
    const id = setInterval(() => {
      setState((s) => {
        const next = { ...s, elapsed: s.elapsed + 1 };
        if (s.mode === "countdown" && next.elapsed >= s.limit * 60) {
          const d = {
            ...next,
            elapsed: s.limit * 60,
            running: false,
            startedAt: null,
          };
          save(d);
          return d;
        }
        save(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, state.running]);

  const start = () =>
    setState((s) => {
      const n = { ...s, running: true, startedAt: Date.now() };
      save(n);
      return n;
    });
  const pause = () =>
    setState((s) => {
      const n = { ...s, running: false, startedAt: null };
      save(n);
      return n;
    });
  const reset = () =>
    setState((s) => {
      const n = { ...s, running: false, elapsed: 0, startedAt: null };
      save(n);
      return n;
    });
  const setMode = (m: TimerMode) =>
    setState((s) => {
      const n = { ...s, mode: m, running: false, elapsed: 0, startedAt: null };
      save(n);
      return n;
    });
  const setLimit = (l: number) =>
    setState((s) => {
      const n = { ...s, limit: l, elapsed: 0, running: false };
      save(n);
      return n;
    });

  const display =
    state.mode === "countdown"
      ? Math.max(0, state.limit * 60 - state.elapsed)
      : state.elapsed;
  const mm = String(Math.floor(display / 60)).padStart(2, "0");
  const ss = String(display % 60).padStart(2, "0");
  const pct =
    state.mode === "countdown" ? (state.elapsed / (state.limit * 60)) * 100 : 0;
  const urgent =
    state.mode === "countdown" && display <= 60 && display > 0 && state.running;
  const active = state.running || state.elapsed > 0;

  return {
    state,
    mounted,
    mm,
    ss,
    pct,
    urgent,
    active,
    start,
    pause,
    reset,
    setMode,
    setLimit,
  };
}

function TimerWidget({ timer }: { timer: ReturnType<typeof useTimer> }) {
  const { state, mm, ss, pct, urgent, start, pause, reset, setMode, setLimit } =
    timer;
  const [inputMin, setInputMin] = useState(String(state.limit));
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={state.mode === "stopwatch" ? "default" : "outline"}
          className="flex-1 text-sm h-9"
          onClick={() => setMode("stopwatch")}
        >
          Stopwatch
        </Button>
        <Button
          size="sm"
          variant={state.mode === "countdown" ? "default" : "outline"}
          className="flex-1 text-sm h-9"
          onClick={() => setMode("countdown")}
        >
          Countdown
        </Button>
      </div>
      <div
        className={cn(
          "flex flex-col items-center gap-2 py-5 rounded-lg border border-border",
          urgent && "border-foreground/60",
        )}
      >
        <span
          className={cn(
            "text-5xl font-semibold tabular-nums tracking-widest",
            urgent && "animate-pulse",
          )}
        >
          {mm}:{ss}
        </span>
        {state.mode === "countdown" && (
          <Progress value={pct} className="h-1.5 w-3/4" />
        )}
      </div>
      {state.mode === "countdown" && !state.running && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground shrink-0">
            Minutes
          </Label>
          <Input
            className="h-9 text-sm"
            value={inputMin}
            type="number"
            min={1}
            max={180}
            onChange={(e) => {
              setInputMin(e.target.value);
              const n = parseInt(e.target.value);
              if (!isNaN(n) && n > 0) setLimit(n);
            }}
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-9 flex-1 gap-2 text-sm"
          onClick={state.running ? pause : start}
        >
          {state.running ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {state.running ? "Pause" : "Start"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

//  CANVAS NOTES

const PALETTE = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#6b7280",
  "#0891b2",
];

function CanvasNotes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokeRef = useRef<CanvasStroke | null>(null);
  const startPtRef = useRef<CanvasPoint | null>(null);
  const allStrokes = useRef<CanvasStroke[]>([]);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [textPos, setTextPos] = useState<CanvasPoint | null>(null);
  const [textInput, setTextInput] = useState("");
  const [, tick] = useState(0);

  const getCtx = () => {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes.current.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        s.points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
        );
        ctx.stroke();
      } else if (s.tool === "pen") {
        ctx.beginPath();
        s.points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
        );
        ctx.stroke();
      } else if (s.tool === "line" && s.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        ctx.lineTo(
          s.points[s.points.length - 1].x,
          s.points[s.points.length - 1].y,
        );
        ctx.stroke();
      } else if (s.tool === "rect" && s.points.length >= 2) {
        const [a, b] = [s.points[0], s.points[s.points.length - 1]];
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (s.tool === "circle" && s.points.length >= 2) {
        const [a, b] = [s.points[0], s.points[s.points.length - 1]];
        const rx = Math.abs(b.x - a.x) / 2;
        const ry = Math.abs(b.y - a.y) / 2;
        ctx.beginPath();
        ctx.ellipse(
          a.x + (b.x - a.x) / 2,
          a.y + (b.y - a.y) / 2,
          rx || 1,
          ry || 1,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (s.tool === "text" && s.text && s.points[0]) {
        ctx.font = `${s.size * 5 + 10}px Inter, sans-serif`;
        ctx.fillText(s.text, s.points[0].x, s.points[0].y);
      }
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      redraw();
    });
    ro.observe(parent);
    const { width, height } = parent.getBoundingClientRect();
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    return () => ro.disconnect();
  }, [redraw]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "text") {
      setTextPos(getPos(e));
      return;
    }
    const pt = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    startPtRef.current = pt;
    strokeRef.current = { tool, color, size, points: [pt] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !strokeRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pt = getPos(e);
    if (tool === "pen" || tool === "eraser") {
      strokeRef.current.points.push(pt);
      const pts = strokeRef.current.points;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      strokeRef.current.points = [startPtRef.current!, pt];
      redraw();
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPtRef.current!.x, startPtRef.current!.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else if (tool === "rect") {
        ctx.strokeRect(
          startPtRef.current!.x,
          startPtRef.current!.y,
          pt.x - startPtRef.current!.x,
          pt.y - startPtRef.current!.y,
        );
      } else if (tool === "circle") {
        const rx = Math.abs(pt.x - startPtRef.current!.x) / 2;
        const ry = Math.abs(pt.y - startPtRef.current!.y) / 2;
        ctx.beginPath();
        ctx.ellipse(
          startPtRef.current!.x + (pt.x - startPtRef.current!.x) / 2,
          startPtRef.current!.y + (pt.y - startPtRef.current!.y) / 2,
          rx || 1,
          ry || 1,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !strokeRef.current) return;
    drawingRef.current = false;
    if (tool !== "pen" && tool !== "eraser") {
      strokeRef.current.points = [startPtRef.current!, getPos(e)];
    }
    allStrokes.current = [...allStrokes.current, strokeRef.current];
    strokeRef.current = null;
    tick((n) => n + 1);
    redraw();
  };

  const commitText = () => {
    if (!textInput.trim() || !textPos) return;
    allStrokes.current = [
      ...allStrokes.current,
      { tool: "text", color, size, points: [textPos], text: textInput },
    ];
    tick((n) => n + 1);
    redraw();
    setTextInput("");
    setTextPos(null);
  };

  const undo = () => {
    allStrokes.current = allStrokes.current.slice(0, -1);
    tick((n) => n + 1);
    redraw();
  };
  const clear = () => {
    allStrokes.current = [];
    tick((n) => n + 1);
    redraw();
  };

  const tools: { id: DrawTool; icon: typeof PenLine; label: string }[] = [
    { id: "pen", icon: PenLine, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Ellipse" },
    { id: "text", icon: FileText, label: "Text" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap shrink-0 bg-background">
        <div className="flex gap-0.5">
          {tools.map(({ id, icon: Icon, label }) => (
            <TooltipProvider key={id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={tool === id ? "default" : "ghost"}
                    className="h-7 w-7"
                    onClick={() => setTool(id)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-4 h-4 rounded-sm border-2 transition-all",
                color === c
                  ? "border-foreground scale-110"
                  : "border-border/50",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2 w-28">
          <span className="text-xs text-muted-foreground shrink-0">Size</span>
          <Slider
            value={[size]}
            onValueChange={([v]) => setSize(v)}
            min={1}
            max={20}
            step={1}
            className="flex-1"
          />
        </div>
        <Separator orientation="vertical" className="h-5" />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={undo}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Undo
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={clear}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Clear all
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative flex-1 overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{
            cursor:
              tool === "eraser"
                ? "cell"
                : tool === "text"
                  ? "text"
                  : "crosshair",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        {textPos && (
          <div
            className="absolute z-10 flex gap-2"
            style={{ left: textPos.x, top: Math.max(0, textPos.y - 40) }}
          >
            <Input
              autoFocus
              className="h-8 text-xs w-36"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextPos(null);
              }}
              placeholder="Type & Enter"
            />
            <Button size="sm" className="h-8 text-xs" onClick={commitText}>
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

//  SIMULATE RUN

function simulateRun(sql: string): Promise<RunResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!sql.trim()) {
        resolve({ status: "error", error: "Empty query." });
        return;
      }
      const lc = sql.toLowerCase();
      if (lc.includes("dense_rank") && lc.includes("partition by")) {
        resolve({
          status: "accepted",
          runtime: "118ms",
          passedCases: 6,
          totalCases: 6,
          rows: PROBLEM.exampleOutput,
        });
      } else {
        resolve({
          status: "wrong",
          runtime: "201ms",
          passedCases: 2,
          totalCases: 6,
          rows: PROBLEM.exampleOutput.slice(0, 2),
        });
      }
    }, 1100);
  });
}

//  HELPERS

function DifficultyBadge({
  difficulty,
}: {
  difficulty: "Easy" | "Medium" | "Hard";
}) {
  const v =
    difficulty === "Easy"
      ? "outline"
      : difficulty === "Medium"
        ? "secondary"
        : "default";
  return (
    <Badge variant={v} className="text-xs font-normal">
      {difficulty}
    </Badge>
  );
}

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === "accepted")
    return <CheckCircle2 color="green" className="w-4 h-4" />;
  if (status === "wrong")
    return <XCircle color="red" className="w-4 h-4 text-muted-foreground" />;
  if (status === "error")
    return (
      <AlertCircle color="orange" className="w-4 h-4 text-muted-foreground" />
    );
  if (status === "tle")
    return <Clock color="yellow" className="w-4 h-4 text-muted-foreground" />;
  return null;
}

function DraggableDivider({
  onDrag,
  direction = "horizontal",
}: {
  onDrag: (d: number) => void;
  direction?: "horizontal" | "vertical";
}) {
  const active = useRef(false);
  const last = useRef(0);
  return (
    <div
      className={cn(
        "group flex items-center justify-center shrink-0 transition-colors select-none hover:bg-foreground/10",
        direction === "horizontal"
          ? "w-2 cursor-col-resize h-full"
          : "h-2 cursor-row-resize w-full",
      )}
      onPointerDown={(e) => {
        active.current = true;
        last.current = direction === "horizontal" ? e.clientX : e.clientY;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!active.current) return;
        const cur = direction === "horizontal" ? e.clientX : e.clientY;
        onDrag(cur - last.current);
        last.current = cur;
      }}
      onPointerUp={() => {
        active.current = false;
      }}
    >
      {direction === "horizontal" ? (
        <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/50" />
      ) : (
        <GripHorizontal className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/50" />
      )}
    </div>
  );
}

//  CUSTOM TABS

interface TabsCtxType {
  active: string;
  setActive: (v: string) => void;
}
const TabsCtx = React.createContext<TabsCtxType>({
  active: "",
  setActive: () => {},
});

function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsCtx.Provider value={{ active, setActive }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </TabsCtx.Provider>
  );
}
function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end border-b border-border shrink-0 px-3 gap-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { active, setActive } = React.useContext(TabsCtx);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors select-none whitespace-nowrap border-b-2 -mb-px",
        isActive
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
        className,
      )}
    >
      {children}
    </button>
  );
}
function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { active } = React.useContext(TabsCtx);
  if (active !== value) return null;
  return (
    <div className={cn("flex-1 overflow-hidden", className)}>{children}</div>
  );
}

function Section({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground overflow-hidden flex flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

//  STABLE EDITOR PANEL  ─
//  STABLE EDITOR PANEL ─
interface EditorPanelProps {
  sql: string;
  onSqlChange: (value: string) => void;
  dialect: Dialect;
  onDialectChange: (d: Dialect) => void;
  editorSettings: EditorSettings;
  onEditorSettingsChange: (s: EditorSettings) => void;
  errorCount: number;
  warnCount: number;
  isDark: boolean;
  defaultSql: string;
  dialects: typeof DIALECTS;
  onMarkers: (m: editor.IMarkerData[]) => void; // ← fixed
}

const EditorPanel = React.memo(function EditorPanel({
  sql,
  onSqlChange,
  dialect,
  onDialectChange,
  editorSettings,
  onEditorSettingsChange,
  errorCount,
  warnCount,
  isDark,
  defaultSql,
  dialects,
  onMarkers,
}: EditorPanelProps) {
  return (
    <Section className="h-full">
      <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">solution.sql</span>
          <Separator orientation="vertical" className="h-4" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 px-2"
              >
                <Database className="w-3 h-3" />
                {dialects.find((d) => d.value === dialect)?.label}
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {dialects.map((d) => (
                <DropdownMenuItem
                  key={d.value}
                  className="text-sm"
                  onClick={() => onDialectChange(d.value)}
                >
                  {d.label}
                  {dialect === d.value && (
                    <CheckCircle2 className="w-3 h-3 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {errorCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <AlertCircle className="w-3 h-3" />
              {warnCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <EditorSettingsSheet
            settings={editorSettings}
            onChange={onEditorSettingsChange}
          />
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onSqlChange(defaultSql)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Reset code
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={sql}
          onChange={onSqlChange}
          dark={isDark}
          dialect={dialect}
          onMarkers={onMarkers}
          settings={editorSettings}
        />
      </div>
    </Section>
  );
});

//  MAIN PAGE

export default function LessonEditorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Layout
  const [leftPct, setLeftPct] = useState(38);
  const [editorPct, setEditorPct] = useState(62);
  const [notesPct, setNotesPct] = useState(32);

  // Panel visibility
  const [leftOpen, setLeftOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<
    "lesson" | "editor" | "output" | "notes"
  >("lesson");

  // Editor state
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [dialect, setDialect] = useState<Dialect>("mysql");
  const [result, setResult] = useState<RunResult>({ status: "idle" });
  const [showWrong, setShowWrong] = useState(false);
  const [markers, setMarkers] = useState<editor.IMarkerData[]>([]);

  // Settings — lazy init avoids hydration mismatch; useEffect re-reads from localStorage
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => ({
    ...DEFAULT_SETTINGS,
  }));
  useEffect(() => {
    setEditorSettings(loadSettings());
  }, []);

  // XP
  const [xp, setXp] = useState(BASE_XP);
  const [xpDelta, setXpDelta] = useState<number | null>(null);
  const [xpReady, setXpReady] = useState(false);
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(XP_KEY) ?? "");
      if (!isNaN(v)) setXp(v);
    } catch {}
    setXpReady(true);
  }, []);
  const changeXP = useCallback((delta: number) => {
    setXp((prev) => {
      const next = Math.min(MAX_XP, Math.max(0, prev + delta));
      try {
        localStorage.setItem(XP_KEY, String(next));
      } catch {}
      return next;
    });
    setXpDelta(delta);
    if (deltaTimer.current) clearTimeout(deltaTimer.current);
    deltaTimer.current = setTimeout(() => setXpDelta(null), 2500);
  }, []);

  // Hints / solution
  const [hintsShown, setHintsShown] = useState<number[]>([]);
  const [solutionShown, setSolutionShown] = useState(false);
  const revealHint = (i: number) => {
    if (hintsShown.includes(i)) return;
    setHintsShown((h) => [...h, i]);
    changeXP(-15);
  };
  const revealSolution = () => {
    if (solutionShown) return;
    setSolutionShown(true);
    changeXP(-80);
  };

  // Timer
  const timer = useTimer();

  // Run / Submit
  const handleRun = useCallback(async () => {
    setResult({ status: "running" });
    setOutputOpen(true);
    const r = await simulateRun(sql);
    setResult(r);
  }, [sql]);

  const handleSubmit = useCallback(async () => {
    setResult({ status: "running" });
    setOutputOpen(true);
    const r = await simulateRun(sql);
    setResult(r);
    if (r.status === "accepted") {
      fireSideCannons();
      changeXP(+100);
    } else if (r.status === "wrong") setShowWrong(true);
  }, [sql, changeXP]);

  // Drag handlers
  const handleHorizDrag = useCallback((delta: number) => {
    const w = containerRef.current?.getBoundingClientRect().width ?? 1;
    setLeftPct((p) => Math.min(58, Math.max(20, p + (delta / w) * 100)));
  }, []);
  const handleVertDrag = useCallback((delta: number) => {
    const h = containerRef.current?.getBoundingClientRect().height ?? 1;
    setEditorPct((p) => Math.min(90, Math.max(20, p + (delta / h) * 100)));
  }, []);
  const handleNotesDrag = useCallback((delta: number) => {
    const w = containerRef.current?.getBoundingClientRect().width ?? 1;
    setNotesPct((p) => Math.min(55, Math.max(18, p - (delta / w) * 100)));
  }, []);

  // Lint summary — Monaco severity: Error=8, Warning=4, Info=2
  const errorCount = markers.filter((m) => m.severity === 8).length;
  const warnCount = markers.filter((m) => m.severity === 4).length;

  //  LESSON PANEL

  function LessonPanel() {
    return (
      <Section className="h-full">
        <Tabs defaultValue="description" className="flex flex-col h-full">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="hints">Hints</TabsTrigger>
            <TabsTrigger value="solution">Solution</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h1 className="text-base font-semibold">
                      {PROBLEM.id}. {PROBLEM.title}
                    </h1>
                    <DifficultyBadge difficulty={PROBLEM.difficulty} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Acceptance: {PROBLEM.acceptance}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PROBLEM.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] ">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="text-sm leading-relaxed space-y-2">
                  {PROBLEM.description.split("\n\n").map((para, i) => (
                    <p
                      key={i}
                      dangerouslySetInnerHTML={{
                        __html: para
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(
                            /`(.*?)`/g,
                            '<code class="bg-muted px-1 py-0.5 rounded text-xs ">$1</code>',
                          ),
                      }}
                    />
                  ))}
                </div>
                <Separator />
                <div className="space-y-1 pb-4">
                  <p className="text-sm font-semibold mb-3">Similar Problems</p>
                  {PROBLEM.similar.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <span className="text-sm">
                        {p.id}. {p.title}
                      </span>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="schema" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-4">
                <p className="text-sm font-semibold">Table Schema</p>
                {PROBLEM.schema.map((tbl) => (
                  <div
                    key={tbl.table}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                      <p className="text-xs  font-semibold">{tbl.table}</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="text-xs h-8 pl-4">
                            Column
                          </TableHead>
                          <TableHead className="text-xs h-8">Type</TableHead>
                          <TableHead className="text-xs h-8">Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tbl.columns.map((col) => (
                          <TableRow key={col.name} className="border-border">
                            <TableCell className="text-xs  pl-4 py-2">
                              {col.name}
                            </TableCell>
                            <TableCell className="text-xs  text-muted-foreground py-2">
                              {col.type}
                            </TableCell>
                            <TableCell className="py-2">
                              {col.note && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px]  py-0"
                                >
                                  {col.note}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="hints" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Hints</p>
                  <span className="text-xs text-muted-foreground">
                    −15 XP each
                  </span>
                </div>
                {PROBLEM.hints.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                      onClick={() => revealHint(i)}
                    >
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        Hint {i + 1}
                      </span>
                      {hintsShown.includes(i) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                          Reveal −15 XP
                        </span>
                      )}
                    </button>
                    {hintsShown.includes(i) && (
                      <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/20">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {h}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="solution" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Solution</p>
                  <span className="text-xs text-muted-foreground">
                    −80 XP to unlock
                  </span>
                </div>
                {!solutionShown ? (
                  <div className="rounded-lg border border-border p-8 flex flex-col items-center gap-4 text-center">
                    <Eye className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium mb-1">View Solution</p>
                      <p className="text-sm text-muted-foreground">
                        This will cost <strong>80 XP</strong>. Try solving it
                        yourself first!
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm gap-2"
                      onClick={revealSolution}
                    >
                      <Eye className="w-4 h-4" />
                      Unlock Solution
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                      <p className="text-xs  font-semibold">solution.sql</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSql(PROBLEM.solution)}
                      >
                        Use in editor
                      </Button>
                    </div>
                    <pre className="p-4 text-xs  leading-6 overflow-x-auto whitespace-pre">
                      {PROBLEM.solution}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="submissions" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-3">
                <p className="text-sm font-semibold">Recent Submissions</p>
                {[
                  {
                    status: "accepted" as RunStatus,
                    time: "2h ago",
                    runtime: "118ms",
                    d: "MySQL",
                  },
                  {
                    status: "wrong" as RunStatus,
                    time: "3h ago",
                    runtime: "201ms",
                    d: "MySQL",
                  },
                  {
                    status: "error" as RunStatus,
                    time: "1d ago",
                    runtime: "—",
                    d: "PostgreSQL",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={s.status} />
                      <div>
                        <p className={`text-sm font-medium`}>
                          {s.status === "accepted"
                            ? "Accepted"
                            : s.status === "wrong"
                              ? "Wrong Answer"
                              : "Runtime Error"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.time} · {s.d}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs  text-muted-foreground">
                      {s.runtime}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Section>
    );
  }

  //  OUTPUT PANEL ─

  function OutputPanel() {
    return (
      <Section className="h-full">
        <Tabs defaultValue="expected" className="flex flex-col h-full">
          <div className="flex items-center border-b border-border shrink-0">
            <TabsList className="border-none bg-transparent px-1">
              <TabsTrigger value="expected">Expected Output</TabsTrigger>
              {result.status !== "idle" && (
                <TabsTrigger value="result" className="gap-1.5">
                  <StatusIcon status={result.status} />
                  {result.status === "running"
                    ? "Running…"
                    : result.status === "accepted"
                      ? "Accepted"
                      : result.status === "wrong"
                        ? "Wrong Answer"
                        : result.status === "error"
                          ? "Error"
                          : "TLE"}
                </TabsTrigger>
              )}
            </TabsList>
            <div className="ml-auto flex items-center gap-1 pr-2">
              {result.runtime && (
                <span className="text-xs text-muted-foreground">
                  {result.runtime}
                </span>
              )}
              {result.passedCases !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {result.passedCases}/{result.totalCases}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOutputOpen(false)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <TabsContent value="expected" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border bg-muted/30">
                        {Object.keys(PROBLEM.exampleOutput[0]).map((k) => (
                          <TableHead key={k} className="text-xs h-8  px-4">
                            {k}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PROBLEM.exampleOutput.map((row, i) => (
                        <TableRow key={i} className="border-border">
                          {Object.values(row).map((v, j) => (
                            <TableCell key={j} className="text-sm  px-4 py-2">
                              {String(v)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {result.status !== "idle" && (
            <TabsContent value="result" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {result.status === "running" && (
                    <div className="space-y-2">
                      {[70, 50, 85, 60].map((w, i) => (
                        <div
                          key={i}
                          className="h-3 rounded-md bg-muted animate-pulse"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  )}
                  {result.status === "error" && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-sm  text-muted-foreground">
                        {result.error}
                      </p>
                    </div>
                  )}
                  {(result.status === "accepted" ||
                    result.status === "wrong") &&
                    result.rows &&
                    result.rows.length > 0 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-border bg-muted/30">
                              {Object.keys(result.rows[0]).map((k) => (
                                <TableHead
                                  key={k}
                                  className="text-xs h-8  px-4"
                                >
                                  {k}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.rows.map((row, i) => (
                              <TableRow key={i} className="border-border">
                                {Object.values(row).map((v, j) => (
                                  <TableCell
                                    key={j}
                                    className="text-sm px-4 py-2"
                                  >
                                    {String(v)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </Section>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {showWrong && <WrongOverlay onDone={() => setShowWrong(false)} />}

      {/*  Top Nav  */}
      <header className="h-12 border-b border-border flex items-center px-3 shrink-0 bg-background z-20 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 pr-3 border-r border-border">
            <Code2 className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight">Vorn</span>
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setLeftOpen((o) => !o)}
                >
                  {leftOpen ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {leftOpen ? "Hide lesson panel" : "Show lesson panel"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Previous
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Next
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm text-muted-foreground hidden lg:block truncate max-w-[180px]">
            {PROBLEM.id}. {PROBLEM.title}
          </span>
          <DifficultyBadge difficulty={PROBLEM.difficulty} />
        </div>

        {/* CENTER: timer */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {timer.mounted && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={timer.state.running ? timer.pause : timer.start}
                  >
                    {timer.state.running ? (
                      <Pause className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Play className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {timer.state.running ? "Pause timer" : "Start timer"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span
            className={cn(
              "text-sm tabular-nums select-none leading-none",
              timer.mounted
                ? timer.active
                  ? "text-foreground"
                  : "text-muted-foreground"
                : "text-transparent",
              timer.urgent && "animate-pulse text-foreground",
            )}
          >
            {timer.mounted ? `${timer.mm}:${timer.ss}` : "00:00"}
          </span>
          {timer.state.mode === "countdown" &&
            timer.mounted &&
            timer.active && (
              <Progress value={timer.pct} className="h-1 w-12 shrink-0" />
            )}
          {timer.mounted && timer.active && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={timer.reset}
                  >
                    <RotateCcw className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Reset timer
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="center">
              <TimerWidget timer={timer} />
            </PopoverContent>
          </Popover>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">
          {xpReady && (
            <div className="hidden sm:block">
              <XPBar xp={xp} delta={xpDelta} />
            </div>
          )}
          <Button
            variant={notesOpen ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5 hidden sm:flex"
            onClick={() => setNotesOpen((n) => !n)}
          >
            <PenLine className="w-3.5 h-3.5" />
            Notes
          </Button>
          {!outputOpen && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 hidden sm:flex"
              onClick={() => setOutputOpen(true)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Output
            </Button>
          )}
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 px-3"
            onClick={handleRun}
            disabled={result.status === "running"}
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run</span>
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 px-3"
            onClick={handleSubmit}
            disabled={result.status === "running"}
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
      </header>

      {/*  Mobile tab bar  */}
      <div className="md:hidden flex border-b border-border shrink-0 bg-background">
        {(["lesson", "editor", "output", "notes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors",
              mobileTab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/*  Desktop layout  */}
      <div
        ref={containerRef}
        className="hidden md:flex flex-1 overflow-hidden p-2 gap-0"
      >
        {leftOpen && (
          <>
            <div
              className="shrink-0 overflow-hidden"
              style={{ width: `${leftPct}%` }}
            >
              <LessonPanel />
            </div>
            <DraggableDivider onDrag={handleHorizDrag} direction="horizontal" />
          </>
        )}

        <div className="flex flex-1 overflow-hidden min-w-0 gap-0">
          <div className="flex flex-col flex-1 overflow-hidden min-w-0 gap-2">
            <div
              className="overflow-hidden min-h-0"
              style={{ flex: outputOpen ? `${editorPct} 0 0` : "1 0 0" }}
            >
              <EditorPanel
                sql={sql}
                onSqlChange={setSql}
                dialect={dialect}
                onDialectChange={setDialect}
                editorSettings={editorSettings}
                onEditorSettingsChange={setEditorSettings}
                errorCount={errorCount}
                warnCount={warnCount}
                isDark={isDark}
                defaultSql={DEFAULT_SQL}
                dialects={DIALECTS}
                onMarkers={setMarkers}
              />
            </div>
            {outputOpen && (
              <>
                <DraggableDivider
                  onDrag={handleVertDrag}
                  direction="vertical"
                />
                <div
                  className="overflow-hidden min-h-0"
                  style={{ flex: `${100 - editorPct} 0 0` }}
                >
                  <OutputPanel />
                </div>
              </>
            )}
          </div>

          {notesOpen && (
            <>
              <DraggableDivider
                onDrag={handleNotesDrag}
                direction="horizontal"
              />
              <div
                className="shrink-0 overflow-hidden min-w-0"
                style={{ width: `${notesPct}%` }}
              >
                <Section className="h-full">
                  <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <PenLine className="w-4 h-4" />
                      Notes
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setNotesOpen(false)}
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0">
                    <CanvasNotes />
                  </div>
                </Section>
              </div>
            </>
          )}
        </div>
      </div>

      {/*  Mobile content  */}
      <div className="md:hidden flex-1 overflow-hidden p-2">
        {mobileTab === "lesson" && (
          <div className="h-full">
            <LessonPanel />
          </div>
        )}
        {mobileTab === "editor" && (
          <div className="h-full">
            <EditorPanel
              sql={sql}
              onSqlChange={setSql}
              dialect={dialect}
              onDialectChange={setDialect}
              editorSettings={editorSettings}
              onEditorSettingsChange={setEditorSettings}
              errorCount={errorCount}
              warnCount={warnCount}
              isDark={isDark}
              defaultSql={DEFAULT_SQL}
              dialects={DIALECTS}
              onMarkers={setMarkers}
            />
          </div>
        )}
        {mobileTab === "output" && (
          <div className="h-full">
            <OutputPanel />
          </div>
        )}
        {mobileTab === "notes" && (
          <div className="h-full">
            <Section className="h-full">
              <div className="h-10 border-b border-border flex items-center px-3">
                <span className="text-sm font-medium">Notes</span>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <CanvasNotes />
              </div>
            </Section>
          </div>
        )}
      </div>

      {/*  Status bar  */}
      <div className="h-6 border-t border-border flex items-center justify-between px-3 shrink-0 bg-background text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{DIALECTS.find((d) => d.value === dialect)?.label}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            {result.status === "idle"
              ? "Ready"
              : result.status === "running"
                ? "Running…"
                : result.status === "accepted"
                  ? "✓ Accepted"
                  : result.status === "wrong"
                    ? "✗ Wrong Answer"
                    : result.status}
          </span>
          {errorCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-red-500">
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            </>
          )}
          {warnCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-amber-500">
                {warnCount} warning{warnCount > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>SQL · UTF-8</span>
          {xpReady && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span>
                XP {xp}/{MAX_XP}
              </span>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wrongShake {
          0%,100%{transform:translateX(0) scale(1)}
          15%{transform:translateX(-10px) scale(1.02)}
          30%{transform:translateX(10px) scale(1.02)}
          45%{transform:translateX(-7px)}
          60%{transform:translateX(7px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
}
