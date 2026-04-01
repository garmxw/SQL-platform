"use client";
// ─────────────────────────────────────────────────────────────────────────────
// FeaturesSection  ·  Vorn landing page
// Separable: import { FeaturesSection } from "@/components/sections/features-section"
// ─────────────────────────────────────────────────────────────────────────────

import { GradualBlur, GradualBlurGroup } from "@/components/GradualBlur";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Code2,
  Layers,
  Zap,
  Trophy,
  BookOpen,
  BarChart3,
  CheckCircle2,
  Lock,
  Target,
  Timer,
} from "lucide-react";

const FEATURES = [
  {
    icon: Code2,
    title: "In-Browser SQL Editor",
    description:
      "A full-featured editor with syntax highlighting for MySQL, PostgreSQL, and NoSQL. Write real queries against real schemas — no setup needed.",
    tag: "Core",
    preview: "editor",
  },
  {
    icon: Layers,
    title: "Structured Learning Tracks",
    description:
      "From SELECT basics to advanced window functions. Each track is a curated path of lessons, challenges, and problems with locked progression.",
    tag: "Learning",
    preview: "tracks",
  },
  {
    icon: Zap,
    title: "XP & Progress System",
    description:
      "Earn XP for every problem solved. Lose it for shortcuts. Every hint costs 15 XP. Solutions cost 80 XP. Mastery is earned, not given.",
    tag: "Gamification",
    preview: "xp",
  },
  {
    icon: Trophy,
    title: "Smart Feedback Engine",
    description:
      "Your query runs against the expected output in real time. Get immediate pass/fail, row-by-row diffs, and runtime performance indicators.",
    tag: "Feedback",
    preview: "feedback",
  },
  {
    icon: BookOpen,
    title: "Canvas Notes Whiteboard",
    description:
      "Sketch your query plan, draw ERDs, or jot notes — all inside a built-in paint-style canvas that stays open alongside your editor.",
    tag: "Productivity",
    preview: "notes",
  },
  {
    icon: Timer,
    title: "Built-In Timer",
    description:
      "Set a countdown to challenge yourself, or use the stopwatch to track how long each problem takes. Times persist across page navigation.",
    tag: "Focus",
    preview: "timer",
  },
];

// Mini preview components for each feature
function EditorPreview() {
  const lines = [
    { cls: "text-blue-500 dark:text-blue-400 font-semibold", t: "SELECT " },
    { cls: "text-foreground", t: "  e.name, d.name, e.salary" },
    { cls: "text-blue-500 dark:text-blue-400 font-semibold", t: "FROM " },
    { cls: "text-foreground", t: "  employees e" },
    { cls: "text-blue-500 dark:text-blue-400 font-semibold", t: "JOIN " },
    { cls: "text-foreground", t: "  departments d ON e.dept_id = d.id" },
  ];
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden text-xs leading-6">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/40">
        <div className="w-2.5 h-2.5 rounded-full bg-border" />
        <div className="w-2.5 h-2.5 rounded-full bg-border" />
        <div className="w-2.5 h-2.5 rounded-full bg-border" />
        <span className="ml-2 text-[10px] text-muted-foreground">
          solution.sql
        </span>
      </div>
      <div className="p-3 space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className={l.cls}>
            {l.t}
          </div>
        ))}
        <div className="text-muted-foreground italic text-[11px] mt-2">
          -- Ctrl+Enter to run
        </div>
      </div>
    </div>
  );
}

function TracksPreview() {
  const tracks = [
    { label: "SQL Foundations", pct: 100, tag: "Beginner" },
    { label: "Joins & Relations", pct: 40, tag: "Intermediate" },
    { label: "Window Functions", pct: 0, tag: "Advanced" },
  ];
  return (
    <div className="space-y-3">
      {tracks.map((t) => (
        <div
          key={t.label}
          className="rounded-lg border border-border p-3 bg-background"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">{t.label}</span>
            <Badge
              variant={
                t.tag === "Beginner"
                  ? "outline"
                  : t.tag === "Intermediate"
                    ? "secondary"
                    : "default"
              }
              className="text-[10px] py-0"
            >
              {t.tag}
            </Badge>
          </div>
          <Progress value={t.pct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {t.pct}% complete
          </p>
        </div>
      ))}
    </div>
  );
}

function XPPreview() {
  return (
    <div className="rounded-lg border border-border p-4 bg-background space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Your XP</span>
        </div>
        <span className="text-sm  font-semibold">340 / 500</span>
      </div>
      <Progress value={68} className="h-2" />
      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground ">
        <div className="rounded-md border border-border p-2 text-center">
          <div className="text-foreground font-semibold text-sm">+100</div>
          <div>Solved</div>
        </div>
        <div className="rounded-md border border-border p-2 text-center">
          <div className="text-foreground font-semibold text-sm">−15</div>
          <div>Hint</div>
        </div>
        <div className="rounded-md border border-border p-2 text-center">
          <div className="text-foreground font-semibold text-sm">−80</div>
          <div>Solution</div>
        </div>
      </div>
    </div>
  );
}

function FeedbackPreview() {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/30">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">Accepted</span>
        <span className="text-xs text-muted-foreground  ml-auto">
          118ms · 6/6 cases
        </span>
      </div>
      <table className="w-full text-xs ">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left px-3 py-1.5 text-muted-foreground font-normal">
              Department
            </th>
            <th className="text-left px-3 py-1.5 text-muted-foreground font-normal">
              Employee
            </th>
            <th className="text-right px-3 py-1.5 text-muted-foreground font-normal">
              Salary
            </th>
          </tr>
        </thead>
        <tbody>
          {[
            ["IT", "Max", 90000],
            ["IT", "Joe", 85000],
            ["Sales", "Henry", 80000],
          ].map(([d, e, s]) => (
            <tr
              key={String(e)}
              className="border-b border-border/50 last:border-0"
            >
              <td className="px-3 py-1.5">{d}</td>
              <td className="px-3 py-1.5">{e}</td>
              <td className="px-3 py-1.5 text-right">{String(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotesPreview() {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">Canvas Notes</span>
        <div className="ml-auto flex gap-1">
          {["bg-foreground/70", "bg-foreground/40", "bg-foreground/20"].map(
            (c) => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ),
          )}
        </div>
      </div>
      <div className="p-3 h-24 relative overflow-hidden">
        {/* Fake sketch lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30"
          viewBox="0 0 200 90"
        >
          <rect
            x="10"
            y="15"
            width="60"
            height="30"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <text
            x="40"
            y="35"
            textAnchor="middle"
            fontSize="8"
            fill="currentColor"
          >
            Employee
          </text>
          <rect
            x="130"
            y="15"
            width="55"
            height="30"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <text
            x="157"
            y="35"
            textAnchor="middle"
            fontSize="8"
            fill="currentColor"
          >
            Dept
          </text>
          <line
            x1="70"
            y1="30"
            x2="130"
            y2="30"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <text
            x="100"
            y="24"
            textAnchor="middle"
            fontSize="7"
            fill="currentColor"
          >
            dept_id → id
          </text>
        </svg>
      </div>
    </div>
  );
}

function TimerPreview() {
  return (
    <div className="rounded-lg border border-border p-4 bg-background space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Countdown</span>
        <Badge variant="secondary" className="text-[10px] py-0 ml-auto">
          Running
        </Badge>
      </div>
      <div className="text-center">
        <span className=" text-4xl font-bold tabular-nums tracking-widest">
          12:47
        </span>
      </div>
      <Progress value={57} className="h-2" />
      <div className="text-[10px] text-muted-foreground text-center ">
        30:00 countdown · 57% elapsed
      </div>
    </div>
  );
}

const PREVIEW_MAP: Record<string, React.ReactNode> = {
  editor: <EditorPreview />,
  tracks: <TracksPreview />,
  xp: <XPPreview />,
  feedback: <FeedbackPreview />,
  notes: <NotesPreview />,
  timer: <TimerPreview />,
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section header */}
        <GradualBlur className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 text-xs ">
            Features
          </Badge>
          <h2
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Sora','Syne',sans-serif" }}
          >
            Everything you need to
            <br />
            <span className="text-muted-foreground">actually learn SQL.</span>
          </h2>
          <p
            className="text-muted-foreground text-lg leading-relaxed"
            style={{ fontFamily: "'Inter',sans-serif" }}
          >
            Not just syntax tutorials. A complete environment designed around
            real query writing, real feedback, and real progression.
          </p>
        </GradualBlur>

        {/* Feature grid */}
        <GradualBlurGroup
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          itemClassName="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-foreground/30 transition-colors duration-200"
          staggerDelay={0.08}
          blur={12}
          duration={0.55}
          items={FEATURES.map((f) => (
            <>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg border border-border bg-muted/40">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter',sans-serif" }}
                    >
                      {f.title}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 mt-0.5">
                      {f.tag}
                    </Badge>
                  </div>
                </div>
              </div>
              <p
                className="text-sm text-muted-foreground leading-relaxed"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                {f.description}
              </p>
              <div className="mt-auto">{PREVIEW_MAP[f.preview]}</div>
            </>
          ))}
        />
      </div>
    </section>
  );
}
