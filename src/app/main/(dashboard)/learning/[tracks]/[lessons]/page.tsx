"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
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
  Database,
  Lightbulb,
  Eye,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Zap,
  BookOpen,
  FlaskConical,
  ListOrdered,
  SquareCheckBig,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type RunStatus = "idle" | "running" | "success" | "error";
type DrawTool = "pen" | "line" | "rect" | "circle" | "eraser" | "text";

interface RunResult {
  status: RunStatus;
  runtime?: string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  error?: string;
  rowCount?: number;
  colCount?: number;
  execMs?: number;
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
interface SqlVariantsMap {
  starter: Record<string, string>;
  schema: Record<string, string>;
  solution: Record<string, string[]>;
}
interface Hint {
  id: number;
  hint_order: number;
  content: string;
  xp_penalty: number;
  dialect: string | null;
}
interface DBSolution {
  id: number;
  explanation: string | null;
  sql_text: string;
  dialect: string;
}
interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  hint_xp_penalty: number;
  solution_xp_penalty: number;
  order_matters: boolean;
  time_limit_seconds: number | null;
  acceptance_rate: number | null;
  tags: string[] | null;
  sql_variants: SqlVariantsMap;
  hints: Hint[];
  solutions: DBSolution[];
}
interface Lesson {
  id: number;
  track_id: number;
  title: string;
  content: string;
  description: string | null;
  learning_goals: string[];
  objectives: string[];
  xp_reward: number;
  hint_xp_penalty: number;
  solution_xp_penalty: number;
  tags: string[] | null;
  lesson_order: number;
  demo_sql_variants: Record<string, string>;
}
interface ExamChoice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  choice_order: number;
}
interface ExamQuestion {
  id: number;
  question_order: number;
  question_type: "multiple_choice" | "sql";
  question_text: string;
  points: number;
  linked_problem_id: number | null;
  choices: ExamChoice[] | null;
  sql_variants?: SqlVariantsMap;
}
interface Exam {
  id: number;
  track_id: number;
  title: string;
  description: string | null;
  time_limit_seconds: number;
  pass_threshold: number;
  cert_threshold: number;
  total_points: number;
  track_title: string;
}
interface UserStats {
  xp: number;
  level: number;
}
interface UserProgress {
  completed?: boolean;
  is_solved?: boolean;
  attempts?: number;
  submissions: Array<{
    submitted_sql: string;
    is_correct: boolean;
    execution_time_ms: number;
    created_at: string;
  }>;
  userStats: UserStats;
  pendingSubmission?: { id: number; started_at: string } | null;
}
type ContentData =
  | {
      type: "lesson";
      lesson: Lesson;
      problem: Problem | null;
      track: { id: number; title: string } | null;
      navigation: { prev: any; next: any };
      userProgress: UserProgress;
    }
  | {
      type: "problem";
      problem: Problem;
      similar: Array<{ id: number; title: string; difficulty: string }>;
      userProgress: UserProgress;
    }
  | {
      type: "exam";
      exam: Exam;
      questions: ExamQuestion[];
      userProgress: UserProgress;
    };

const ALL_DIALECTS: { value: Dialect; label: string }[] = [
  { value: "mysql", label: "MySQL" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
];

// ─── LEVEL SYSTEM ─────────────────────────────────────────────────────────────

function getLevel(xp: number) {
  let level = 1,
    threshold = 0;
  while (true) {
    const next = threshold + level * 100;
    if (xp < next)
      return {
        level,
        xpInLevel: xp - threshold,
        xpNeeded: level * 100,
        progress: Math.round(((xp - threshold) / (level * 100)) * 100),
      };
    threshold = next;
    level++;
    if (level > 99)
      return { level: 100, xpInLevel: 0, xpNeeded: 0, progress: 100 };
  }
}

const LEVEL_TIERS = [
  {
    min: 1,
    max: 5,
    gradient: "from-slate-400 to-slate-600",
    label: "Novice",
    ring: "ring-slate-400/40",
  },
  {
    min: 6,
    max: 15,
    gradient: "from-emerald-400 to-teal-600",
    label: "Apprentice",
    ring: "ring-emerald-400/40",
  },
  {
    min: 16,
    max: 30,
    gradient: "from-sky-400 to-blue-600",
    label: "Scholar",
    ring: "ring-sky-400/40",
  },
  {
    min: 31,
    max: 50,
    gradient: "from-violet-400 to-purple-600",
    label: "Expert",
    ring: "ring-violet-400/40",
  },
  {
    min: 51,
    max: 75,
    gradient: "from-amber-400 to-orange-500",
    label: "Master",
    ring: "ring-amber-400/40",
  },
  {
    min: 76,
    max: 100,
    gradient: "from-rose-400 to-pink-600",
    label: "Legend",
    ring: "ring-rose-400/40",
  },
];
function getTier(level: number) {
  return (
    LEVEL_TIERS.find((t) => level >= t.min && level <= t.max) ?? LEVEL_TIERS[0]
  );
}

// ─── XP BAR ───────────────────────────────────────────────────────────────────
function XPBar({
  globalXp,
  globalLevel,
  rewardXp,
  maxRewardXp,
  delta,
  loaded,
}: {
  globalXp: number;
  globalLevel: number;
  rewardXp: number;
  maxRewardXp: number;
  delta: number | null;
  loaded: boolean;
}) {
  const { xpInLevel, xpNeeded, progress } = getLevel(globalXp);
  const tier = getTier(globalLevel);

  if (!loaded) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-20 rounded bg-muted animate-pulse" />
          <div className="h-1.5 w-[88px] rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm ring-2 cursor-default select-none",
                tier.gradient,
                tier.ring,
              )}
            >
              <span className="text-[11px] font-black text-white leading-none tracking-tighter drop-shadow">
                {globalLevel}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-2.5 space-y-1 text-xs">
            <p className="font-semibold">
              {tier.label} · Level {globalLevel}
            </p>
            <p className="text-muted-foreground">
              {xpInLevel}/{xpNeeded} XP to Lv {globalLevel + 1}
            </p>
            <p className="text-muted-foreground">
              Total: {globalXp.toLocaleString()} XP
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] leading-none">
          <span className="font-semibold text-foreground/70">{tier.label}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground tabular-nums">
            {xpInLevel}/{xpNeeded}
          </span>
          {delta !== null && (
            <span
              className={cn(
                "font-bold tabular-nums",
                delta > 0 ? "text-emerald-500" : "text-red-400",
              )}
            >
              {delta > 0 ? `+${delta}` : String(delta)}
            </span>
          )}
        </div>
        <Progress value={progress} className="h-1.5 w-[88px]" />
      </div>
      {maxRewardXp > 0 && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 cursor-default select-none">
                <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 tabular-nums">
                  {rewardXp}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  /{maxRewardXp}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs p-2">
              <p>Reward XP for this problem</p>
              <p className="text-muted-foreground">
                Reduced by hints / solution
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function fireSideCannons() {
  const colors = [
    "#a786ff",
    "#fd8bbc",
    "#eca184",
    "#f8deb1",
    "#22c55e",
    "#38bdf8",
  ];
  const end = Date.now() + 3000;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      decay: 0.92,
      scalar: 1.1,
      origin: { x: 0, y: 0.6 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      decay: 0.92,
      scalar: 1.1,
      origin: { x: 1, y: 0.6 },
      colors,
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ─── OVERLAYS ─────────────────────────────────────────────────────────────────
function WrongOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-2xl animate-[wrongShake_0.45s_ease-in-out]">
        <XCircle className="w-10 h-10 text-red-500" />
        <p className="text-base font-semibold">Wrong Answer</p>
        <p className="text-sm text-muted-foreground">
          Review your logic and try again.
        </p>
      </div>
    </div>
  );
}

function TimeoutOverlay({
  penalty,
  onDone,
}: {
  penalty: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-xl border border-red-500/40 bg-background/95 backdrop-blur-sm shadow-2xl">
        <Clock className="w-10 h-10 text-red-500" />
        <p className="text-base font-semibold">Time's Up!</p>
        <p className="text-sm text-muted-foreground">
          Attempt failed —{" "}
          <span className="text-red-500 font-bold">−{penalty} XP</span> penalty
          applied.
        </p>
        <p className="text-xs text-muted-foreground">
          Don't let the clock beat you next time.
        </p>
      </div>
    </div>
  );
}

// FIX: Extracted as a proper named component (not inline) so React.memo on
// LessonPanel doesn't swallow it when lessonSolved changes.
function LessonCompletedBanner() {
  return (
    <div className="mx-5 mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Lesson Completed
        </p>
        <p className="text-xs text-muted-foreground">
          You have already solved this lesson.
        </p>
      </div>
    </div>
  );
}

// ─── OUTPUT TABLE ─────────────────────────────────────────────────────────────
function OutputTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns?: string[];
}) {
  const cols =
    columns && columns.length > 0 ? columns : Object.keys(rows[0] ?? {});
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-auto max-h-64">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {cols.map((c) => (
                <TableHead
                  key={c}
                  className="text-xs font-semibold whitespace-nowrap h-8 px-3 sticky top-0 bg-muted/90 backdrop-blur-sm z-10"
                >
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                {cols.map((c) => (
                  <TableCell
                    key={c}
                    className="text-xs px-3 py-1.5 whitespace-nowrap "
                  >
                    {String(row[c] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── EXAM COUNTDOWN ───────────────────────────────────────────────────────────
function useExamCountdown(examId: number, limitSeconds: number) {
  const key = `ssql_exam_cd_${examId}`;
  const [secondsLeft, setSecondsLeft] = useState(limitSeconds);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const { remaining, ts } = JSON.parse(raw);
        setSecondsLeft(
          Math.max(0, remaining - Math.floor((Date.now() - ts) / 1000)),
        );
      } else {
        localStorage.setItem(
          key,
          JSON.stringify({ remaining: limitSeconds, ts: Date.now() }),
        );
      }
    } catch {}
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        try {
          localStorage.setItem(
            key,
            JSON.stringify({ remaining: next, ts: Date.now() }),
          );
        } catch {}
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, secondsLeft <= 0]);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = ((limitSeconds - secondsLeft) / limitSeconds) * 100;
  return {
    mm,
    ss,
    pct,
    urgent: secondsLeft > 0 && secondsLeft <= 60,
    finished: mounted && secondsLeft === 0,
    mounted,
  };
}

// ─── REGULAR TIMER ────────────────────────────────────────────────────────────
type TimerMode = "stopwatch" | "countdown";
interface TimerState {
  mode: TimerMode;
  running: boolean;
  elapsed: number;
  limit: number;
  startedAt: number | null;
}
const TIMER_DEFAULTS: TimerState = {
  mode: "stopwatch",
  running: false,
  elapsed: 0,
  limit: 30,
  startedAt: null,
};

function useTimer(storageKey: string) {
  const [state, setState] = useState<TimerState>(TIMER_DEFAULTS);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: TimerState = JSON.parse(raw);
        if (saved.running && saved.startedAt) {
          const extra = Math.floor((Date.now() - saved.startedAt) / 1000);
          const newElapsed =
            saved.mode === "countdown"
              ? Math.min(saved.elapsed + extra, saved.limit * 60)
              : saved.elapsed + extra;
          const still = !(
            saved.mode === "countdown" && newElapsed >= saved.limit * 60
          );
          const r = {
            ...saved,
            elapsed: newElapsed,
            running: still,
            startedAt: still ? Date.now() : null,
          };
          setState(r);
          localStorage.setItem(storageKey, JSON.stringify(r));
        } else setState(saved);
      }
    } catch {}
    setMounted(true);
  }, [storageKey]);
  const save = (s: TimerState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
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
        {(["stopwatch", "countdown"] as TimerMode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={state.mode === m ? "default" : "outline"}
            className="flex-1 text-sm h-9 capitalize"
            onClick={() => setMode(m)}
          >
            {m}
          </Button>
        ))}
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

// ─── CANVAS NOTES ─────────────────────────────────────────────────────────────
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
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;
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
        const rx = Math.abs(b.x - a.x) / 2,
          ry = Math.abs(b.y - a.y) / 2;
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
        ctx.font = `${s.size * 5 + 10}px Inter,sans-serif`;
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
        const rx = Math.abs(pt.x - startPtRef.current!.x) / 2,
          ry = Math.abs(pt.y - startPtRef.current!.y) / 2;
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
    if (tool !== "pen" && tool !== "eraser")
      strokeRef.current.points = [startPtRef.current!, getPos(e)];
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
  const toolDefs: [DrawTool, any, string][] = [
    ["pen", PenLine, "Pen"],
    ["eraser", Eraser, "Eraser"],
    ["line", Minus, "Line"],
    ["rect", Square, "Rect"],
    ["circle", Circle, "Circle"],
    ["text", FileText, "Text"],
  ];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap shrink-0 bg-background">
        <div className="flex gap-0.5">
          {toolDefs.map(([id, Icon, label]) => (
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
              Clear
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

// ─── LAYOUT HELPERS ───────────────────────────────────────────────────────────
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

// ─── CUSTOM TABS ──────────────────────────────────────────────────────────────
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
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const active = value ?? internal;
  const setActive = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
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
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors select-none whitespace-nowrap border-b-2 -mb-px",
        active === value
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

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const lower = difficulty?.toLowerCase();
  return (
    <Badge
      variant={
        lower === "easy"
          ? "outline"
          : lower === "medium"
            ? "secondary"
            : "default"
      }
      className="text-xs font-normal capitalize"
    >
      {difficulty}
    </Badge>
  );
}
function StatusIcon({ status }: { status: string }) {
  if (status === "success" || status === "accepted")
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "wrong") return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === "error")
    return <AlertCircle className="w-4 h-4 text-orange-500" />;
  if (status === "tle") return <Clock className="w-4 h-4 text-yellow-500" />;
  return null;
}
function renderMd(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`(.*?)`/g,
      '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>',
    )
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
}
function SchemaViewer({ schemaSql }: { schemaSql: string }) {
  if (!schemaSql.trim())
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Database className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">No schema available</p>
      </div>
    );
  return (
    <div className="rounded-lg border border-border overflow-hidden">
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
function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background animate-pulse">
      <div className="h-12 border-b border-border bg-background/50" />
      <div className="flex flex-1 overflow-hidden p-2 gap-2">
        <div className="w-[38%] rounded-xl border border-border bg-muted/30" />
        <div className="flex-1 rounded-xl border border-border bg-muted/30" />
      </div>
      <div className="h-6 border-t border-border" />
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-lg font-semibold">Failed to load content</p>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    </div>
  );
}

// ─── EDITOR PANEL ─────────────────────────────────────────────────────────────
interface EditorPanelProps {
  sql: string;
  onSqlChange: (v: string) => void;
  dialect: Dialect;
  onDialectChange: (d: Dialect) => void;
  availableDialects: { value: Dialect; label: string }[];
  editorSettings: EditorSettings;
  onEditorSettingsChange: (s: EditorSettings) => void;
  errorCount: number;
  warnCount: number;
  isDark: boolean;
  defaultSql: string;
  onMarkers: (m: editor.IMarkerData[]) => void;
}
const EditorPanel = React.memo(function EditorPanel({
  sql,
  onSqlChange,
  dialect,
  onDialectChange,
  availableDialects,
  editorSettings,
  onEditorSettingsChange,
  errorCount,
  warnCount,
  isDark,
  defaultSql,
  onMarkers,
}: EditorPanelProps) {
  return (
    <Section className="h-full">
      <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">solution.sql</span>
          <Separator orientation="vertical" className="h-4" />
          {availableDialects.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 px-2"
                >
                  <Database className="w-3 h-3" />
                  {availableDialects.find((d) => d.value === dialect)?.label ??
                    ALL_DIALECTS.find((d) => d.value === dialect)?.label}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                {availableDialects.map((d) => (
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
          )}
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

// ─── EXAM LAYOUT ──────────────────────────────────────────────────────────────
function ExamLayout({
  content,
  isDark,
  editorSettings,
  setEditorSettings,
}: {
  content: Extract<ContentData, { type: "exam" }>;
  isDark: boolean;
  editorSettings: EditorSettings;
  setEditorSettings: (s: EditorSettings) => void;
}) {
  const { exam, questions } = content;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mcAnswers, setMcAnswers] = useState<Map<number, Set<number>>>(
    new Map(),
  );
  const [sqlAnswers, setSqlAnswers] = useState<
    Map<number, Record<string, string>>
  >(new Map());
  const [result, setResult] = useState<RunResult>({ status: "idle" });
  const [outputOpen, setOutputOpen] = useState(false);
  const [markers, setMarkers] = useState<editor.IMarkerData[]>([]);
  const [dialect, setDialect] = useState<Dialect>("mysql");
  const [editorPct, setEditorPct] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [examFailed, setExamFailed] = useState(false);
  const countdown = useExamCountdown(exam.id, exam.time_limit_seconds);
  const currentQ = questions[currentIdx];

  useEffect(() => {
    if (countdown.finished && !submitted && !examFailed) setExamFailed(true);
  }, [countdown.finished, submitted, examFailed]);

  const getStarterSql = useCallback((q: ExamQuestion, d: Dialect) => {
    if (!q.sql_variants) return "-- Write your SQL query here\n";
    return (
      q.sql_variants.starter[d] ??
      q.sql_variants.starter["universal"] ??
      "-- Write your SQL query here\n"
    );
  }, []);

  const currentSql = useMemo(() => {
    if (!currentQ || currentQ.question_type !== "sql") return "";
    return (
      sqlAnswers.get(currentQ.id)?.[dialect] ?? getStarterSql(currentQ, dialect)
    );
  }, [currentQ, dialect, sqlAnswers, getStarterSql]);

  const answeredSet = useMemo(() => {
    const s = new Set<number>();
    mcAnswers.forEach((v, k) => {
      if (v.size > 0) s.add(k);
    });
    sqlAnswers.forEach((v, k) => {
      if (Object.values(v).some(Boolean)) s.add(k);
    });
    return s;
  }, [mcAnswers, sqlAnswers]);

  const correctCountMap = useMemo(() => {
    const m: Record<number, number> = {};
    questions.forEach((q) => {
      if (q.question_type === "multiple_choice" && q.choices)
        m[q.id] = q.choices.filter((c) => c.is_correct).length;
    });
    return m;
  }, [questions]);

  const availableDialects = useMemo(() => {
    const first = questions.find((q) => q.question_type === "sql");
    if (!first?.sql_variants) return ALL_DIALECTS;
    const keys = Object.keys(first.sql_variants.starter).filter(
      (k) => k !== "universal",
    );
    return keys.length
      ? ALL_DIALECTS.filter((d) => keys.includes(d.value))
      : ALL_DIALECTS;
  }, [questions]);

  const errorCount = markers.filter((m) => m.severity === 8).length;
  const warnCount = markers.filter((m) => m.severity === 4).length;

  const toggleChoice = useCallback(
    (qId: number, cId: number, isMulti: boolean) => {
      if (submitted || examFailed) return;
      setMcAnswers((prev) => {
        const next = new Map(prev);
        const existing = new Set(next.get(qId) ?? []);
        if (isMulti) {
          if (existing.has(cId)) existing.delete(cId);
          else existing.add(cId);
        } else {
          existing.clear();
          existing.add(cId);
        }
        next.set(qId, existing);
        return next;
      });
    },
    [submitted, examFailed],
  );

  const handleSqlChange = useCallback(
    (val: string) => {
      if (!currentQ || currentQ.question_type !== "sql") return;
      setSqlAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQ.id, { ...next.get(currentQ.id), [dialect]: val });
        return next;
      });
    },
    [currentQ, dialect],
  );

  const handleRun = useCallback(async () => {
    setResult({ status: "running" });
    setOutputOpen(true);
    try {
      const resp = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: dialect, sql: currentSql }),
      });
      const data = await resp.json();
      if (!data.success || data.error) {
        setResult({ status: "error", error: data.error || "Execution failed" });
        return;
      }
      const rows = data.parsedResult?.rows ?? [];
      const cols = data.parsedResult?.columns ?? [];
      setResult({
        status: "success",
        runtime: data.execution_time_ms
          ? `${data.execution_time_ms}ms`
          : undefined,
        rows,
        columns: cols,
        rowCount: rows.length,
        colCount: cols.length,
        execMs: data.execution_time_ms,
      });
    } catch {
      setResult({
        status: "error",
        error: "Failed to reach the execution server.",
      });
    }
  }, [dialect, currentSql]);

  const handleSubmitExam = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    const answersPayload: Record<number, any> = {};
    for (const q of questions) {
      if (q.question_type === "multiple_choice")
        answersPayload[q.id] = {
          type: "multiple_choice",
          selectedChoiceIds: [...(mcAnswers.get(q.id) ?? [])],
        };
      else if (q.question_type === "sql")
        answersPayload[q.id] = {
          type: "sql",
          sqlAnswer:
            sqlAnswers.get(q.id)?.[dialect] ||
            Object.values(sqlAnswers.get(q.id) ?? {}).find(Boolean) ||
            "",
        };
    }
    try {
      const resp = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          dialect,
          timedOut: countdown.finished,
          answers: answersPayload,
        }),
      });
      const data = await resp.json();
      if (data.status !== "success")
        throw new Error(data.error || "Submission failed");
      setSubmitResult(data.data);
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVertDrag = useCallback((delta: number) => {
    const h = containerRef.current?.getBoundingClientRect().height ?? 1;
    setEditorPct((p) => Math.min(90, Math.max(25, p + (delta / h) * 100)));
  }, []);

  if (examFailed && !submitted) {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background gap-3">
          <FlaskConical className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{exam.title}</span>
          <span className="text-xs text-muted-foreground">
            {exam.track_title}
          </span>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold">Exam Failed</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Time ran out before you submitted. Your answers have been
                discarded. Prepare thoroughly before attempting again.
              </p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 space-y-1">
              <p className="text-base font-bold text-red-600 dark:text-red-400">
                −50 XP Penalty
              </p>
              <p className="text-xs text-muted-foreground">
                Failure costs XP. Let that motivate you.
              </p>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => window.history.back()}
            >
              Back to Track
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && submitResult) {
    const {
      score,
      totalPoints,
      scorePercent,
      passed,
      certEligible,
      xpGained = 0,
      newBadges = [],
      questionResults = {},
    } = submitResult;
    return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background gap-3">
          <FlaskConical className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{exam.title}</span>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
            <div
              className={cn(
                "rounded-2xl border p-8 text-center space-y-4",
                passed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5",
              )}
            >
              <div className="flex justify-center">
                {passed ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-3xl font-black tabular-nums">
                  {(scorePercent ?? 0).toFixed(1)}%
                </p>
                <p className="text-muted-foreground mt-1">
                  {score ?? 0} / {totalPoints ?? exam.total_points} points
                </p>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                  passed
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-600 dark:text-red-400",
                )}
              >
                {passed ? "Passed ✓" : "Did not pass"}
              </div>
              {certEligible && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-sm font-semibold ml-2">
                  🏆 Certificate Earned
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500">
                  +{xpGained}
                </p>
                <p className="text-xs text-muted-foreground mt-1">XP Gained</p>
              </div>
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold">
                  {
                    questions.filter((q) => questionResults[q.id]?.isCorrect)
                      .length
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Correct</p>
              </div>
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {
                    questions.filter((q) => !questionResults[q.id]?.isCorrect)
                      .length
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Incorrect</p>
              </div>
            </div>
            {newBadges.length > 0 && (
              <div className="rounded-xl border border-border p-5 space-y-3">
                <p className="text-sm font-semibold">🎖 New Badges Earned</p>
                <div className="flex flex-wrap gap-2">
                  {newBadges.map((b: any) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                    >
                      <span className="font-medium">{b.name}</span>
                      {b.xp_reward > 0 && (
                        <span className="text-xs text-yellow-500">
                          +{b.xp_reward} XP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold">Question Breakdown</p>
              </div>
              <div className="divide-y divide-border">
                {questions.map((q, i) => {
                  const qr = questionResults[q.id];
                  return (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          qr?.isCorrect
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-red-500/20 text-red-500",
                        )}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm flex-1 truncate">
                        {q.question_text.slice(0, 60)}
                        {q.question_text.length > 60 ? "…" : ""}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {qr?.pointsEarned ?? 0}/{q.points} pts
                        </span>
                        {qr?.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => window.history.back()}
            >
              Back to Track
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unanswered = questions.length - answeredSet.size;
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-background shadow-2xl p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-base font-semibold">Submit Exam?</p>
              <p className="text-sm text-muted-foreground">
                {unanswered > 0
                  ? `${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. You cannot change answers after submission.`
                  : "All questions answered. Ready to submit?"}
              </p>
            </div>
            {unanswered > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                ⚠ {unanswered} unanswered
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitExam}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-background z-20 gap-3">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold truncate max-w-[180px]">
              {exam.title}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {exam.track_title}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border text-xs shrink-0">
          <SquareCheckBig className="w-3.5 h-3.5 text-muted-foreground" />
          <span>
            {answeredSet.size}/{questions.length}
          </span>
          <Progress
            value={(answeredSet.size / questions.length) * 100}
            className="h-1.5 w-14"
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          {countdown.mounted && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold tabular-nums",
                countdown.urgent
                  ? "border-red-500/50 bg-red-500/10 text-red-500 animate-pulse"
                  : "border-border bg-muted/30",
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {countdown.mm}:{countdown.ss}
              <Progress
                value={countdown.pct}
                className="h-1 w-16 hidden sm:block"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {availableDialects.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  <Database className="w-3 h-3" />
                  {availableDialects.find((d) => d.value === dialect)?.label}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableDialects.map((d) => (
                  <DropdownMenuItem
                    key={d.value}
                    onClick={() => setDialect(d.value)}
                    className="text-sm"
                  >
                    {d.label}
                    {dialect === d.value && (
                      <CheckCircle2 className="w-3 h-3 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {currentQ?.question_type === "sql" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleRun}
              disabled={result.status === "running"}
            >
              {result.status === "running" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Run
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Exam
          </Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden p-2 gap-2">
        <div className="w-48 shrink-0 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Questions
          </p>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 pr-1">
              {questions.map((q, i) => {
                const answered = answeredSet.has(q.id);
                const isActive = i === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all border",
                      isActive
                        ? "bg-foreground text-background border-foreground"
                        : answered
                          ? "bg-muted/40 border-border text-foreground"
                          : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border",
                        isActive
                          ? "border-background/30 bg-background/20"
                          : answered
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border/50",
                      )}
                    >
                      {answered && !isActive ? "✓" : i + 1}
                    </span>
                    <span className="flex-1 truncate leading-tight">
                      {q.question_text.slice(0, 28)}
                      {q.question_text.length > 28 ? "…" : ""}
                    </span>
                    <span className="shrink-0 text-[9px] opacity-50">
                      {q.points}p
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        <div
          ref={containerRef}
          className="flex-1 flex flex-col overflow-hidden gap-2 min-w-0"
        >
          <Section className="shrink-0">
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Q{currentIdx + 1}/{questions.length}
                </span>
                <Separator orientation="vertical" className="h-3" />
                <Badge variant="outline" className="text-[10px]">
                  {currentQ?.question_type === "sql"
                    ? "SQL"
                    : "Multiple Choice"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentQ?.points} pts
                </span>
                {currentQ?.question_type === "multiple_choice" &&
                  (correctCountMap[currentQ.id] ?? 1) > 1 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Select all that apply
                    </Badge>
                  )}
              </div>
              <p
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMd(currentQ?.question_text ?? ""),
                }}
              />
            </div>
          </Section>
          {currentQ?.question_type === "multiple_choice" &&
            currentQ.choices && (
              <Section className="shrink-0">
                <div className="p-4 space-y-2">
                  {currentQ.choices
                    .slice()
                    .sort((a, b) => a.choice_order - b.choice_order)
                    .map((c) => {
                      const isMulti = (correctCountMap[currentQ.id] ?? 1) > 1;
                      const selected =
                        mcAnswers.get(currentQ.id)?.has(c.id) ?? false;
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            toggleChoice(currentQ.id, c.id, isMulti)
                          }
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all",
                            selected
                              ? "bg-foreground/[0.08] border-foreground/30"
                              : "border-border hover:bg-muted/50 hover:border-foreground/20",
                          )}
                        >
                          <span
                            className={cn(
                              "shrink-0 flex items-center justify-center border-2 transition-all",
                              isMulti
                                ? "w-4 h-4 rounded"
                                : "w-4 h-4 rounded-full",
                              selected
                                ? "border-foreground bg-foreground"
                                : "border-muted-foreground/50",
                            )}
                          >
                            {selected && (
                              <span
                                className={cn(
                                  "bg-background",
                                  isMulti
                                    ? "w-2 h-2 rounded-sm"
                                    : "w-2 h-2 rounded-full",
                                )}
                              />
                            )}
                          </span>
                          <span className="flex-1">{c.choice_text}</span>
                        </button>
                      );
                    })}
                  {(correctCountMap[currentQ.id] ?? 1) > 1 && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Multiple correct answers — select all that apply.
                    </p>
                  )}
                </div>
              </Section>
            )}
          {currentQ?.question_type === "sql" && (
            <>
              {currentQ.sql_variants?.schema &&
                (currentQ.sql_variants.schema[dialect] ||
                  currentQ.sql_variants.schema["universal"]) && (
                  <Section className="shrink-0 max-h-[120px]">
                    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
                      <Database className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">Schema</span>
                    </div>
                    <div className="overflow-auto flex-1">
                      <pre className="px-4 py-3 text-xs leading-5 text-muted-foreground whitespace-pre">
                        {currentQ.sql_variants.schema[dialect] ||
                          currentQ.sql_variants.schema["universal"]}
                      </pre>
                    </div>
                  </Section>
                )}
              <div
                className="min-h-0"
                style={{ flex: outputOpen ? `${editorPct} 0 0` : "1 0 0" }}
              >
                <EditorPanel
                  sql={currentSql}
                  onSqlChange={handleSqlChange}
                  dialect={dialect}
                  onDialectChange={setDialect}
                  availableDialects={availableDialects}
                  editorSettings={editorSettings}
                  onEditorSettingsChange={setEditorSettings}
                  errorCount={errorCount}
                  warnCount={warnCount}
                  isDark={isDark}
                  defaultSql={getStarterSql(currentQ, dialect)}
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
                    className="min-h-0 overflow-hidden"
                    style={{ flex: `${100 - editorPct} 0 0` }}
                  >
                    <Section className="h-full">
                      <div className="h-9 border-b border-border flex items-center justify-between px-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={result.status} />
                          <span className="text-xs font-medium">
                            {result.status === "running"
                              ? "Running…"
                              : result.status === "success"
                                ? "Result"
                                : result.status === "error"
                                  ? "Error"
                                  : "Output"}
                          </span>
                          {result.status === "success" && (
                            <>
                              {result.rowCount != null && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {result.rowCount} rows
                                </span>
                              )}
                              {result.colCount != null && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {result.colCount} cols
                                </span>
                              )}
                              {result.execMs != null && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {result.execMs}ms
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setOutputOpen(false)}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <div className="p-3">
                          {result.status === "error" && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                              <p className="text-sm text-red-500 whitespace-pre-wrap">
                                {result.error}
                              </p>
                            </div>
                          )}
                          {result.status === "success" &&
                            result.rows &&
                            result.rows.length > 0 && (
                              <OutputTable
                                rows={result.rows}
                                columns={result.columns}
                              />
                            )}
                          {result.status === "success" &&
                            result.rows?.length === 0 && (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                0 rows returned
                              </p>
                            )}
                          {result.status === "idle" && (
                            <div className="flex flex-col items-center py-6 text-center">
                              <Play className="w-7 h-7 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Press Run to test your query.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Section>
                  </div>
                </>
              )}
              {!outputOpen && result.status !== "idle" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs self-start gap-1"
                  onClick={() => setOutputOpen(true)}
                >
                  <ChevronUp className="w-3 h-3" />
                  Show Output
                </Button>
              )}
            </>
          )}
          <div className="flex items-center justify-between shrink-0 mt-auto pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentIdx + 1}/{questions.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() =>
                setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
              }
              disabled={currentIdx === questions.length - 1}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LESSON PANEL ─────────────────────────────────────────────────────────────
// FIX: All mutable state (lessonSolved, hintsShown, solutionShown, submissions)
// passed as explicit props so React.memo re-renders correctly when they change.
interface LessonPanelProps {
  lessonSolved: boolean;
  lessonPanelTab: string;
  setLessonPanelTab: (v: string) => void;
  titleLabel: string;
  problem: Problem | null;
  lesson: Lesson | null;
  content: ContentData;
  track: { id: number; title: string } | null;
  similar: Array<{ id: number; title: string; difficulty: string }>;
  schemaSql: string;
  visibleHints: Hint[];
  hintsShown: Set<number>;
  revealHint: (h: Hint) => void;
  solutionSqls: string[];
  solutionExplanation: string | null;
  solutionShown: boolean;
  revealSolution: () => void;
  handleSqlChange: (v: string) => void;
  dialect: Dialect;
  currentProblem: Problem | null;
  submissions: UserProgress["submissions"];
}

const LessonPanel = React.memo(
  function LessonPanel({
    lessonSolved,
    lessonPanelTab,
    setLessonPanelTab,
    titleLabel,
    problem,
    lesson,
    content,
    track,
    similar,
    schemaSql,
    visibleHints,
    hintsShown,
    revealHint,
    solutionSqls,
    solutionExplanation,
    solutionShown,
    revealSolution,
    handleSqlChange,
    dialect,
    currentProblem,
    submissions,
  }: LessonPanelProps) {
    return (
      <Section className="h-full">
        {lessonSolved && <LessonCompletedBanner />}
        <Tabs
          value={lessonPanelTab}
          onValueChange={setLessonPanelTab}
          className="flex flex-col h-full"
        >
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            {visibleHints.length > 0 && (
              <TabsTrigger value="hints">Hints</TabsTrigger>
            )}
            {(solutionSqls.length > 0 || solutionExplanation) && (
              <TabsTrigger value="solution">Solution</TabsTrigger>
            )}
            <TabsTrigger value="submissions">History</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h1 className="text-base font-semibold">{titleLabel}</h1>
                    {problem && (
                      <DifficultyBadge difficulty={problem.difficulty} />
                    )}
                    {content.type === "problem" &&
                      problem?.acceptance_rate != null && (
                        <span className="text-xs text-muted-foreground">
                          {Number(problem.acceptance_rate).toFixed(1)}% accepted
                        </span>
                      )}
                    {lessonSolved && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  {track && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {track.title}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {(problem?.tags ?? lesson?.tags ?? [])?.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="text-sm leading-relaxed space-y-2">
                  {(lesson?.description ?? problem?.description ?? "")
                    .split("\n\n")
                    .map((para, i) => (
                      <p
                        key={i}
                        dangerouslySetInnerHTML={{ __html: renderMd(para) }}
                      />
                    ))}
                </div>
                {lesson?.content && (
                  <>
                    <Separator />
                    <div className="text-sm leading-relaxed space-y-2">
                      {lesson.content.split("\n\n").map((para, i) => (
                        <p
                          key={i}
                          dangerouslySetInnerHTML={{ __html: renderMd(para) }}
                        />
                      ))}
                    </div>
                  </>
                )}
                {(lesson?.learning_goals?.length ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Learning Goals
                      </p>
                      <ul className="space-y-1">
                        {lesson!.learning_goals.map((g, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {similar.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1 pb-4">
                      <p className="text-sm font-semibold mb-3">
                        Similar Problems
                      </p>
                      {similar.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() =>
                            window.location.assign(
                              `/learning/tracks/lessons?type=problem&id=${p.id}`,
                            )
                          }
                        >
                          <span className="text-sm">
                            {p.id}. {p.title}
                          </span>
                          <DifficultyBadge difficulty={p.difficulty} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="schema" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5">
                <p className="text-sm font-semibold mb-4">Table Schema</p>
                <SchemaViewer schemaSql={schemaSql} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="hints" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Hints</p>
                  <span className="text-xs text-muted-foreground">
                    XP penalty per hint
                  </span>
                </div>
                {visibleHints.map((hint, i) => (
                  <div
                    key={hint.id}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                      onClick={() => revealHint(hint)}
                    >
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        Hint {i + 1}
                        {hint.dialect && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            {hint.dialect}
                          </Badge>
                        )}
                      </span>
                      {hintsShown.has(hint.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                          Reveal −{hint.xp_penalty} XP
                        </span>
                      )}
                    </button>
                    {hintsShown.has(hint.id) && (
                      <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/20">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {hint.content}
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
                    −{currentProblem?.solution_xp_penalty ?? 0} XP to unlock
                  </span>
                </div>
                {!solutionShown ? (
                  <div className="rounded-lg border border-border p-8 flex flex-col items-center gap-4 text-center">
                    <Eye className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium mb-1">View Solution</p>
                      <p className="text-sm text-muted-foreground">
                        Costs{" "}
                        <strong>
                          {currentProblem?.solution_xp_penalty ?? 0} XP
                        </strong>
                        . Try it yourself first!
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
                  <div className="space-y-4">
                    {solutionExplanation && (
                      <div className="rounded-lg border border-border p-4 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Explanation
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {solutionExplanation}
                        </p>
                      </div>
                    )}
                    {solutionSqls.map((sql, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border overflow-hidden"
                      >
                        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                          <p className="text-xs font-semibold">
                            solution
                            {solutionSqls.length > 1 ? ` ${i + 1}` : ""}.sql
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSqlChange(sql)}
                          >
                            Use in editor
                          </Button>
                        </div>
                        <pre className="p-4 text-xs leading-6 overflow-x-auto whitespace-pre bg-background">
                          {sql}
                        </pre>
                      </div>
                    ))}
                    {solutionSqls.length === 0 && !solutionExplanation && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No solution for the selected dialect.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="submissions" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-3">
                <p className="text-sm font-semibold">Submission History</p>
                {submissions.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <ListOrdered className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No submissions yet.
                    </p>
                  </div>
                )}
                {submissions.map((s, i) => {
                  const diff =
                    (Date.now() - new Date(s.created_at).getTime()) / 1000;
                  const ago =
                    diff < 60
                      ? `${Math.round(diff)}s ago`
                      : diff < 3600
                        ? `${Math.round(diff / 60)}m ago`
                        : diff < 86400
                          ? `${Math.round(diff / 3600)}h ago`
                          : `${Math.round(diff / 86400)}d ago`;
                  const formattedDate = new Date(s.created_at).toLocaleString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3",
                          s.is_correct ? "bg-emerald-500/5" : "bg-red-500/5",
                        )}
                      >
                        <StatusIcon
                          status={s.is_correct ? "accepted" : "wrong"}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {s.is_correct ? "Accepted" : "Wrong Answer"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formattedDate} · {ago}
                          </p>
                        </div>
                        {s.execution_time_ms != null && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {s.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                      {s.submitted_sql && (
                        <div className="border-t border-border bg-muted/10 px-4 py-2">
                          <pre className="text-[10px] text-muted-foreground truncate leading-relaxed">
                            {s.submitted_sql.trim().slice(0, 120)}
                            {s.submitted_sql.trim().length > 120 ? "…" : ""}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Section>
    );
  },
  // FIX: custom equality so React.memo re-renders when solved/hints/submissions change
  (prev, next) => {
    return (
      prev.lessonSolved === next.lessonSolved &&
      prev.lessonPanelTab === next.lessonPanelTab &&
      prev.solutionShown === next.solutionShown &&
      prev.hintsShown === next.hintsShown &&
      prev.submissions === next.submissions &&
      prev.dialect === next.dialect &&
      prev.schemaSql === next.schemaSql &&
      prev.solutionSqls === next.solutionSqls &&
      prev.solutionExplanation === next.solutionExplanation &&
      prev.visibleHints === next.visibleHints &&
      prev.similar === next.similar &&
      prev.titleLabel === next.titleLabel &&
      prev.currentProblem === next.currentProblem
    );
  },
);

// ─── OUTPUT PANEL ─────────────────────────────────────────────────────────────
interface OutputPanelProps {
  result: RunResult;
  onClose: () => void;
}
const OutputPanel = React.memo(function OutputPanel({
  result,
  onClose,
}: OutputPanelProps) {
  return (
    <Section className="h-full">
      <div className="flex items-center border-b border-border shrink-0 min-h-[42px]">
        <div className="flex items-center px-3 py-2.5 text-xs font-medium border-b-2 border-foreground text-foreground gap-1.5 -mb-px">
          {result.status === "idle" && "Output"}
          {result.status === "running" && (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running…
            </>
          )}
          {result.status === "success" && (
            <>
              <StatusIcon status="success" />
              Query Result
            </>
          )}
          {result.status === "error" && (
            <>
              <StatusIcon status="error" />
              Error
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2">
          {result.status === "success" && (
            <>
              {result.rowCount != null && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                  {result.rowCount} rows
                </span>
              )}
              {result.colCount != null && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                  {result.colCount} cols
                </span>
              )}
              {result.execMs != null && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                  {result.execMs}ms
                </span>
              )}
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 pr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-red-500 whitespace-pre-wrap">
                {result.error}
              </p>
            </div>
          )}
          {result.status === "success" &&
            result.rows &&
            result.rows.length > 0 && (
              <OutputTable rows={result.rows} columns={result.columns} />
            )}
          {result.status === "success" &&
            (!result.rows || result.rows.length === 0) && (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Query executed — 0 rows returned.
                </p>
              </div>
            )}
          {result.status === "idle" && (
            <div className="flex flex-col items-center py-8 text-center">
              <Play className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Press <strong>Run</strong> to execute your query.
              </p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
});

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LessonEditorPage() {
  const searchParams = useSearchParams();
  const contentType = searchParams.get("type") as
    | "lesson"
    | "problem"
    | "exam"
    | undefined;
  const contentId = Number(searchParams.get("id"));
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [leftPct, setLeftPct] = useState(38);
  const [editorPct, setEditorPct] = useState(62);
  const [notesPct, setNotesPct] = useState(32);
  const [leftOpen, setLeftOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<
    "lesson" | "editor" | "output" | "notes"
  >("lesson");
  const [dialect, setDialect] = useState<Dialect>("mysql");
  const [sqlByDialect, setSqlByDialect] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult>({ status: "idle" });
  const [showWrong, setShowWrong] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [markers, setMarkers] = useState<editor.IMarkerData[]>([]);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    ...DEFAULT_SETTINGS,
  });
  useEffect(() => {
    setEditorSettings({ ...DEFAULT_SETTINGS, ...loadSettings() });
  }, []);

  // ── Server-authoritative XP / level ──────────────────────────────────────
  // NEVER derive these from local logic — always set from server response.
  // Initialized to null so we know when real data has arrived.
  const [globalXp, setGlobalXp] = useState(0);
  const [globalLevel, setGlobalLevel] = useState(1);
  const [xpLoaded, setXpLoaded] = useState(false);

  // Reward XP for this problem (shown in XPBar, decremented by hints/solution)
  const [maxRewardXp, setMaxRewardXp] = useState(0);
  const [rewardXp, setRewardXp] = useState(0);

  // Animated delta badge
  const [xpDelta, setXpDelta] = useState<number | null>(null);
  const [timeoutPenalty, setTimeoutPenalty] = useState(50);
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: Apply XP/level only from server — the ground truth.
  const applyServerXp = useCallback(
    (newXp: number, newLevel: number, delta: number) => {
      setGlobalXp(newXp);
      setGlobalLevel(newLevel);
      setXpDelta(delta);
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
      deltaTimer.current = setTimeout(() => setXpDelta(null), 2500);
    },
    [],
  );

  // FIX: Optimistic penalty for hint/solution reveal — subtract from rewardXp
  // only, not globalXp (globalXp is server-authoritative).
  const applyXpDelta = useCallback((delta: number) => {
    setRewardXp((prev) => Math.max(0, prev + delta));
    setXpDelta(delta);
    if (deltaTimer.current) clearTimeout(deltaTimer.current);
    deltaTimer.current = setTimeout(() => setXpDelta(null), 2500);
  }, []);

  const [lessonPanelTab, setLessonPanelTab] = useState("description");

  // FIX: Initialised to null so we don't flash the wrong solved state before
  // the fetch resolves. null = "not yet known".
  const [lessonSolved, setLessonSolved] = useState<boolean | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [solutionViewed, setSolutionViewed] = useState(false);
  const [hintsShown, setHintsShown] = useState<Set<number>>(new Set());
  const [solutionShown, setSolutionShown] = useState(false);
  const [submissions, setSubmissions] = useState<UserProgress["submissions"]>(
    [],
  );

  const timer = useTimer(
    contentType && contentId
      ? `ssql_timer_${contentType}_${contentId}`
      : "ssql_timer_default",
  );

  const problemTimeLimit = useMemo(() => {
    if (!content) return null;
    if (content.type === "problem") return content.problem.time_limit_seconds;
    if (content.type === "lesson")
      return content.problem?.time_limit_seconds ?? null;
    return null;
  }, [content]);

  // ── FETCH ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contentType || !contentId) return;
    setLoading(true);
    setFetchError(null);
    // FIX: Reset all state that depends on the fetched content so stale data
    // from a previous lesson/problem doesn't bleed through.
    setLessonSolved(null);
    setXpLoaded(false);
    setSubmissions([]);
    setHintsShown(new Set());
    setSolutionShown(false);
    setSolutionViewed(false);
    setResult({ status: "idle" });

    fetch(`/api/editor?type=${contentType}&id=${contentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json.status !== "success") throw new Error(json.message);
        const data: ContentData = json.data;
        setContent(data);

        // ── FIX: Defensively read xp/level — guard against missing userStats ──
        const stats = data.userProgress?.userStats;
        const xp = typeof stats?.xp === "number" ? stats.xp : 0;
        const level = typeof stats?.level === "number" ? stats.level : 1;
        setGlobalXp(xp);
        setGlobalLevel(level);
        setXpLoaded(true);

        // ── Reward XP cap ──────────────────────────────────────────────────
        let maxXp = 0;
        if (data.type === "lesson" && data.problem)
          maxXp = data.problem.xp_reward ?? 0;
        if (data.type === "problem") maxXp = data.problem.xp_reward ?? 0;
        setMaxRewardXp(maxXp);
        setRewardXp(maxXp);

        // ── FIX: Read solved state from server — never guess ───────────────
        if (data.type === "lesson") {
          // Lesson with no problem: completed = user_lesson_progress.completed
          // Lesson with problem: is_solved = user_problem_state.is_solved
          if (data.problem) {
            setLessonSolved(data.userProgress.is_solved ?? false);
          } else {
            setLessonSolved(data.userProgress.completed ?? false);
          }
        } else if (data.type === "problem") {
          setLessonSolved(data.userProgress.is_solved ?? false);
        }

        // ── Submissions list ───────────────────────────────────────────────
        setSubmissions(data.userProgress.submissions ?? []);

        // ── SQL starters ───────────────────────────────────────────────────
        const sqls: Record<string, string> = {};
        for (const d of ALL_DIALECTS) {
          let sql = "";
          if (data.type === "lesson") {
            const prob = data.problem;
            if (prob) {
              sql =
                prob.sql_variants.starter[d.value] ??
                prob.sql_variants.starter["universal"] ??
                "";
            }
            if (!sql) {
              sql =
                data.lesson.demo_sql_variants[d.value] ??
                data.lesson.demo_sql_variants["universal"] ??
                "";
            }
          } else if (data.type === "problem") {
            sql =
              data.problem.sql_variants.starter[d.value] ??
              data.problem.sql_variants.starter["universal"] ??
              "";
          }
          sqls[d.value] = sql || "-- Write your SQL query here\n";
        }
        setSqlByDialect(sqls);

        // ── Timer setup ────────────────────────────────────────────────────
        const limit =
          data.type === "problem"
            ? data.problem.time_limit_seconds
            : data.type === "lesson"
              ? (data.problem?.time_limit_seconds ?? null)
              : null;
        if (limit && !timer.active) {
          timer.setMode("countdown");
          timer.setLimit(Math.ceil(limit / 60));
        }
      })
      .catch((err) => setFetchError(err.message ?? "Failed to load content"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId]);

  // ── Refs to avoid stale closures in callbacks ───────────────────────────
  const timedOutRef = useRef(timedOut);
  useEffect(() => {
    timedOutRef.current = timedOut;
  }, [timedOut]);

  const solutionViewedRef = useRef(solutionViewed);
  useEffect(() => {
    solutionViewedRef.current = solutionViewed;
  }, [solutionViewed]);

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const currentSql = sqlByDialect[dialect] ?? "";

  const availableDialects = useMemo(() => {
    if (!content) return ALL_DIALECTS;
    let keys: string[] = [];
    if (content.type === "lesson") {
      const prob = content.problem;
      keys = prob
        ? Object.keys(prob.sql_variants.starter)
        : Object.keys(content.lesson.demo_sql_variants);
    } else if (content.type === "problem") {
      keys = Object.keys(content.problem.sql_variants.starter);
    }
    const filtered = ALL_DIALECTS.filter((d) => keys.includes(d.value));
    return filtered.length > 0 ? filtered : ALL_DIALECTS;
  }, [content]);

  const currentProblem = useMemo<Problem | null>(() => {
    if (!content) return null;
    if (content.type === "problem") return content.problem;
    if (content.type === "lesson") return content.problem;
    return null;
  }, [content]);

  const visibleHints = useMemo(() => {
    if (!currentProblem) return [];
    return currentProblem.hints.filter(
      (h) => h.dialect === null || h.dialect === dialect,
    );
  }, [currentProblem, dialect]);

  const solutionSqls = useMemo(() => {
    if (!currentProblem?.sql_variants.solution) return [];
    return (
      currentProblem.sql_variants.solution[dialect] ??
      currentProblem.sql_variants.solution["universal"] ??
      []
    );
  }, [currentProblem, dialect]);

  const solutionExplanation = useMemo(() => {
    if (!currentProblem?.solutions.length) return null;
    return (
      currentProblem.solutions.find((s) => s.dialect === dialect)
        ?.explanation ??
      currentProblem.solutions.find((s) => s.dialect === "universal")
        ?.explanation ??
      null
    );
  }, [currentProblem, dialect]);

  const schemaSql = useMemo(() => {
    if (!currentProblem?.sql_variants.schema) return "";
    return (
      currentProblem.sql_variants.schema[dialect] ??
      currentProblem.sql_variants.schema["universal"] ??
      ""
    );
  }, [currentProblem, dialect]);

  const defaultSql = useMemo(() => {
    if (!content) return "-- Write your SQL query here\n";
    if (content.type === "problem")
      return (
        content.problem.sql_variants.starter[dialect] ??
        content.problem.sql_variants.starter["universal"] ??
        "-- Write your SQL query here\n"
      );
    if (content.type === "lesson") {
      const prob = content.problem;
      if (prob)
        return (
          prob.sql_variants.starter[dialect] ??
          prob.sql_variants.starter["universal"] ??
          "-- Write your SQL query here\n"
        );
      return (
        content.lesson.demo_sql_variants[dialect] ??
        content.lesson.demo_sql_variants["universal"] ??
        "-- Write your SQL query here\n"
      );
    }
    return "-- Write your SQL query here\n";
  }, [content, dialect]);

  const hasProblem = !!currentProblem;

  // FIX: Only show Submit when:
  //  - there IS a problem attached
  //  - solved state is definitively known (not null = loading)
  //  - the problem is NOT yet solved
  const showSubmitButton =
    hasProblem && lessonSolved !== null && lessonSolved === false;

  // FIX: Only show "Solved" badge when definitively solved
  const showSolvedBadge =
    hasProblem && lessonSolved !== null && lessonSolved === true;

  // ── HANDLERS ────────────────────────────────────────────────────────────────
  const handleSqlChange = useCallback(
    (val: string) => {
      setSqlByDialect((prev) => ({ ...prev, [dialect]: val }));
    },
    [dialect],
  );

  const handleDialectChange = useCallback((d: Dialect) => {
    setDialect(d);
  }, []);

  const handleRun = useCallback(async () => {
    setResult({ status: "running" });
    setOutputOpen(true);
    try {
      const resp = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine: dialect, sql: currentSql }),
      });
      const data = await resp.json();
      if (!data.success || data.error) {
        setResult({ status: "error", error: data.error || "Execution failed" });
        return;
      }
      const rows = data.parsedResult?.rows ?? [];
      const cols = data.parsedResult?.columns ?? [];
      setResult({
        status: "success",
        runtime: data.execution_time_ms
          ? `${data.execution_time_ms}ms`
          : undefined,
        rows,
        columns: cols,
        rowCount: rows.length,
        colCount: cols.length,
        execMs: data.execution_time_ms,
      });
    } catch {
      setResult({
        status: "error",
        error: "Failed to reach the execution server.",
      });
    }
  }, [dialect, currentSql]);

  const handleSubmit = useCallback(
    async (timedOutOverride = false) => {
      const isTimedOut = timedOutOverride || timedOutRef.current;
      setResult({ status: "running" });
      setOutputOpen(true);
      try {
        const resp = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: contentType,
            id: contentId,
            engine: dialect,
            sql: currentSql,
            timed_out: isTimedOut,
            solution_viewed: solutionViewedRef.current,
          }),
        });
        const data = await resp.json();
        if (data.status !== "success") throw new Error(data.message);
        const d = data.data;

        const rows = d.rows ?? [];
        const cols = d.columns ?? [];
        setResult({
          status: d.is_correct ? "success" : "error",
          runtime: d.execution_time_ms ? `${d.execution_time_ms}ms` : undefined,
          rows,
          columns: cols,
          rowCount: rows.length,
          colCount: cols.length,
          execMs: d.execution_time_ms,
          error: d.error ?? undefined,
        });

        // FIX: Always sync XP/level from server — never compute locally
        applyServerXp(d.new_xp, d.new_level, d.xp_delta);

        if (isTimedOut) {
          setTimeoutPenalty(Math.abs(d.xp_delta ?? 50));
          return;
        }

        if (d.is_correct) {
          fireSideCannons();
          // FIX: Only mark solved if server confirms it (is_correct && not
          // already_solved before this submit). But even if already_solved
          // the state should stay true.
          setLessonSolved(true);
          setSubmissions((prev) => [
            {
              submitted_sql: currentSql,
              is_correct: true,
              execution_time_ms: d.execution_time_ms ?? 0,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        } else {
          setShowWrong(true);
          setSubmissions((prev) => [
            {
              submitted_sql: currentSql,
              is_correct: false,
              execution_time_ms: d.execution_time_ms ?? 0,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } catch {
        setResult({
          status: "error",
          error: "Failed to reach the submission server.",
        });
      }
    },
    [contentType, contentId, dialect, currentSql, applyServerXp],
  );

  // Auto-submit on timer expiry
  useEffect(() => {
    if (!timer.mounted || timer.state.mode !== "countdown" || !timer.active)
      return;
    const display = Math.max(0, timer.state.limit * 60 - timer.state.elapsed);
    if (display === 0 && !timedOutRef.current && problemTimeLimit) {
      setTimedOut(true);
      setShowTimeout(true);
      handleSubmit(true);
    }
  }, [
    timer.state.elapsed,
    timer.mounted,
    timer.active,
    timer.state.mode,
    timer.state.limit,
    problemTimeLimit,
    handleSubmit,
  ]);

  const revealHint = useCallback(
    (hint: Hint) => {
      if (hintsShown.has(hint.id)) return;
      setHintsShown((prev) => new Set([...prev, hint.id]));
      applyXpDelta(-hint.xp_penalty);
    },
    [hintsShown, applyXpDelta],
  );

  const revealSolution = useCallback(() => {
    if (solutionShown) return;
    setSolutionShown(true);
    setSolutionViewed(true);
    applyXpDelta(-(currentProblem?.solution_xp_penalty ?? 0));
  }, [solutionShown, currentProblem, applyXpDelta]);

  const handleHorizDrag = useCallback((d: number) => {
    const w = containerRef.current?.getBoundingClientRect().width ?? 1;
    setLeftPct((p) => Math.min(58, Math.max(20, p + (d / w) * 100)));
  }, []);
  const handleVertDrag = useCallback((d: number) => {
    const h = containerRef.current?.getBoundingClientRect().height ?? 1;
    setEditorPct((p) => Math.min(90, Math.max(20, p + (d / h) * 100)));
  }, []);
  const handleNotesDrag = useCallback((d: number) => {
    const w = containerRef.current?.getBoundingClientRect().width ?? 1;
    setNotesPct((p) => Math.min(55, Math.max(18, p - (d / w) * 100)));
  }, []);
  const handleOutputClose = useCallback(() => setOutputOpen(false), []);

  const errorCount = markers.filter((m) => m.severity === 8).length;
  const warnCount = markers.filter((m) => m.severity === 4).length;

  // ── EARLY RETURNS ──────────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;
  if (fetchError) return <ErrorState message={fetchError} />;
  if (!content) return <ErrorState message="No content found." />;
  if (content.type === "exam")
    return (
      <ExamLayout
        content={content}
        isDark={isDark}
        editorSettings={editorSettings}
        setEditorSettings={setEditorSettings}
      />
    );

  const lesson = content.type === "lesson" ? content.lesson : null;
  const problem =
    content.type === "lesson"
      ? content.problem
      : content.type === "problem"
        ? content.problem
        : null;
  const similar = content.type === "problem" ? content.similar : [];
  const nav = content.type === "lesson" ? content.navigation : null;
  const track = content.type === "lesson" ? content.track : null;
  const titleLabel = lesson
    ? `${lesson.id}. ${lesson.title}`
    : `${problem?.id}. ${problem?.title}`;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {showWrong && <WrongOverlay onDone={() => setShowWrong(false)} />}
      {showTimeout && (
        <TimeoutOverlay
          penalty={timeoutPenalty}
          onDone={() => setShowTimeout(false)}
        />
      )}

      {/* ── NAVBAR ── */}
      <header className="h-12 border-b border-border flex items-center px-3 shrink-0 bg-background z-20 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
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
                {leftOpen ? "Hide panel" : "Show panel"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {nav && (
            <>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!nav.prev}
                      onClick={() =>
                        nav.prev &&
                        window.location.assign(
                          `/learning/tracks/lessons?type=lesson&id=${nav.prev.id}`,
                        )
                      }
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {nav.prev ? nav.prev.title : "No previous"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!nav.next}
                      onClick={() =>
                        nav.next &&
                        window.location.assign(
                          `/learning/tracks/lessons?type=lesson&id=${nav.next.id}`,
                        )
                      }
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {nav.next ? nav.next.title : "No next"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <span className="text-sm text-muted-foreground hidden lg:flex items-center gap-1.5 truncate max-w-[220px]">
            {lesson && <BookOpen className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{titleLabel}</span>
            {lessonSolved === true && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            )}
          </span>
          {problem && <DifficultyBadge difficulty={problem.difficulty} />}
        </div>

        {/* Center: timer */}
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
                  {timer.state.running ? "Pause" : "Start"} timer
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

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <XPBar
              globalXp={globalXp}
              globalLevel={globalLevel}
              rewardXp={rewardXp}
              maxRewardXp={maxRewardXp}
              delta={xpDelta}
              loaded={xpLoaded}
            />
          </div>
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
            {result.status === "running" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Run</span>
          </Button>
          {/* FIX: Only render Submit when problem exists AND definitively not solved */}
          {showSubmitButton && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 px-3"
              onClick={() => handleSubmit(false)}
              disabled={result.status === "running"}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          )}
          {/* FIX: Solved badge — only when definitively solved */}
          {showSolvedBadge && (
            <div className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Solved</span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile tabs */}
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

      {/* Desktop layout */}
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
              <LessonPanel
                lessonSolved={lessonSolved === true}
                lessonPanelTab={lessonPanelTab}
                setLessonPanelTab={setLessonPanelTab}
                titleLabel={titleLabel}
                problem={problem}
                lesson={lesson}
                content={content}
                track={track}
                similar={similar}
                schemaSql={schemaSql}
                visibleHints={visibleHints}
                hintsShown={hintsShown}
                revealHint={revealHint}
                solutionSqls={solutionSqls}
                solutionExplanation={solutionExplanation}
                solutionShown={solutionShown}
                revealSolution={revealSolution}
                handleSqlChange={handleSqlChange}
                dialect={dialect}
                currentProblem={currentProblem}
                submissions={submissions}
              />
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
                sql={currentSql}
                onSqlChange={handleSqlChange}
                dialect={dialect}
                onDialectChange={handleDialectChange}
                availableDialects={availableDialects}
                editorSettings={editorSettings}
                onEditorSettingsChange={setEditorSettings}
                errorCount={errorCount}
                warnCount={warnCount}
                isDark={isDark}
                defaultSql={defaultSql}
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
                  <OutputPanel result={result} onClose={handleOutputClose} />
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

      {/* Mobile content */}
      <div className="md:hidden flex-1 overflow-hidden p-2">
        {mobileTab === "lesson" && (
          <div className="h-full">
            <LessonPanel
              lessonSolved={lessonSolved === true}
              lessonPanelTab={lessonPanelTab}
              setLessonPanelTab={setLessonPanelTab}
              titleLabel={titleLabel}
              problem={problem}
              lesson={lesson}
              content={content}
              track={track}
              similar={similar}
              schemaSql={schemaSql}
              visibleHints={visibleHints}
              hintsShown={hintsShown}
              revealHint={revealHint}
              solutionSqls={solutionSqls}
              solutionExplanation={solutionExplanation}
              solutionShown={solutionShown}
              revealSolution={revealSolution}
              handleSqlChange={handleSqlChange}
              dialect={dialect}
              currentProblem={currentProblem}
              submissions={submissions}
            />
          </div>
        )}
        {mobileTab === "editor" && (
          <div className="h-full">
            <EditorPanel
              sql={currentSql}
              onSqlChange={handleSqlChange}
              dialect={dialect}
              onDialectChange={handleDialectChange}
              availableDialects={availableDialects}
              editorSettings={editorSettings}
              onEditorSettingsChange={setEditorSettings}
              errorCount={errorCount}
              warnCount={warnCount}
              isDark={isDark}
              defaultSql={defaultSql}
              onMarkers={setMarkers}
            />
          </div>
        )}
        {mobileTab === "output" && (
          <div className="h-full">
            <OutputPanel result={result} onClose={handleOutputClose} />
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

      {/* Status bar */}
      <div className="h-6 border-t border-border flex items-center justify-between px-3 shrink-0 bg-background text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            {lesson && <BookOpen className="w-3 h-3" />}
            <span className="capitalize">{content.type}</span>
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            {ALL_DIALECTS.find((d) => d.value === dialect)?.label ?? dialect}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>
            {result.status === "idle"
              ? "Ready"
              : result.status === "running"
                ? "Running…"
                : result.status === "success"
                  ? "✓ Executed"
                  : "✗ Error"}
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
          <Separator orientation="vertical" className="h-3" />
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-yellow-500" />
            {rewardXp}/{maxRewardXp} XP
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span>Lv. {xpLoaded ? globalLevel : "—"}</span>
        </div>
      </div>

      <style>{`
        @keyframes wrongShake {
          0%,100% { transform: translateX(0) scale(1) }
          15% { transform: translateX(-10px) scale(1.02) }
          30% { transform: translateX(10px) scale(1.02) }
          45% { transform: translateX(-7px) }
          60% { transform: translateX(7px) }
          75% { transform: translateX(-4px) }
          90% { transform: translateX(4px) }
        }
      `}</style>
    </div>
  );
}
