"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ShowcaseSection  ·  Vorn landing page
// ZoomParallax-inspired scroll zoom with UI component screenshots
// Separable: import { ShowcaseSection } from "@/components/sections/showcase-section"
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from "react";
import { useScroll, useTransform, motion } from "motion/react";
import { GradualBlur } from "@/components/GradualBlur";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Code2,
  BookOpen,
  Layers,
  Zap,
  Trophy,
  Timer,
  BarChart3,
  Circle,
} from "lucide-react";

// Mini UI component snapshots — used as the "images" in the parallax grid
function DashboardCard() {
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl p-4 flex flex-col gap-3 text-xs overflow-hidden">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        <span
          className="font-semibold"
          style={{ fontFamily: "'Inter',sans-serif" }}
        >
          Progress
        </span>
      </div>
      <div className="space-y-2">
        {[
          ["Easy", 88],
          ["Medium", 55],
          ["Hard", 22],
        ].map(([l, v]) => (
          <div key={String(l)}>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{l}</span>
              <span>{v}%</span>
            </div>
            <Progress value={Number(v)} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorCard() {
  return (
    <div className="w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden text-[11px] leading-5 p-3">
      <div className="flex gap-1.5 mb-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
      </div>
      <div className="text-blue-400 font-semibold">WITH ranked AS (</div>
      <div className="text-slate-300 pl-2">SELECT *,</div>
      <div className="text-blue-400 font-semibold pl-2">
        DENSE_RANK() OVER (
      </div>
      <div className="text-slate-400 pl-4">PARTITION BY dept_id</div>
      <div className="text-slate-400 pl-4">ORDER BY salary DESC</div>
      <div className="text-blue-400 font-semibold pl-2">) AS rank</div>
      <div className="text-slate-300 pl-2">FROM employees</div>
      <div className="text-slate-300">)</div>
      <div className="text-blue-400 font-semibold mt-1">
        SELECT * FROM ranked
      </div>
      <div className="text-slate-400">WHERE rank &lt;= 3;</div>
      <div className="text-blue-400/60 text-[10px] mt-2">
        &gt; 118ms · 6 rows ✓
      </div>
    </div>
  );
}

function TrackCard() {
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4" />
        <span
          className="text-xs font-semibold"
          style={{ fontFamily: "'Inter',sans-serif" }}
        >
          Window Functions
        </span>
        <Badge className="text-[9px] py-0 ml-auto">Advanced</Badge>
      </div>
      {["OVER Clause", "PARTITION BY", "RANK vs DENSE_RANK", "LAG & LEAD"].map(
        (l, i) => (
          <div
            key={l}
            className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0"
          >
            {i < 2 ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-foreground" />
            ) : (
              <Circle className="w-3.5 h-3.5 shrink-0 text-muted-foreground/30" />
            )}
            <span
              className="text-[11px]"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              {l}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function StatsCard() {
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl p-4 grid grid-cols-2 gap-3">
      {[
        { label: "Problems Solved", value: "87", icon: CheckCircle2 },
        { label: "Streak", value: "50d", icon: Zap },
        { label: "XP", value: "2340", icon: Trophy },
        { label: "Rank", value: "#1.2k", icon: BarChart3 },
      ].map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-lg border border-border p-2.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
          <div
            className="text-sm font-semibold tabular-nums"
            style={{ fontFamily: "'Inter',sans-serif" }}
          >
            {value}
          </div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function HeatmapCard() {
  const cells = Array.from({ length: 35 }, (_, i) => {
    const r = Math.random();
    return r > 0.9 ? 4 : r > 0.75 ? 3 : r > 0.55 ? 2 : r > 0.4 ? 1 : 0;
  });
  const intensities = [
    "bg-muted",
    "bg-foreground/20",
    "bg-foreground/40",
    "bg-foreground/65",
    "bg-foreground",
  ];
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl p-4 overflow-hidden">
      <p
        className="text-[10px] font-semibold mb-2"
        style={{ fontFamily: "'Inter',sans-serif" }}
      >
        Submission Activity
      </p>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((v, i) => (
          <div
            key={i}
            className={`aspect-square rounded-sm ${intensities[v]}`}
          />
        ))}
      </div>
    </div>
  );
}

function TimerCard() {
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2">
      <Timer className="w-5 h-5 text-muted-foreground" />
      <span className=" text-3xl font-bold tabular-nums tracking-widest">
        14:32
      </span>
      <Progress value={51} className="h-1.5 w-3/4" />
      <span
        className="text-[10px] text-muted-foreground  "
        style={{ fontFamily: "'Inter',sans-serif" }}
      >
        30:00 countdown
      </span>
    </div>
  );
}

function HintCard() {
  return (
    <div className="w-full h-full bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="px-3 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold"
        style={{ fontFamily: "'Inter',sans-serif" }}
      >
        Hints
      </div>
      {["Use DENSE_RANK()", "PARTITION BY dept", "Filter rank ≤ 3"].map(
        (h, i) => (
          <div
            key={h}
            className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0"
          >
            <div className="w-4 h-4 rounded-full border border-border bg-muted/30 flex items-center justify-center text-[9px] text-muted-foreground">
              {i + 1}
            </div>
            <span
              className="text-[11px] text-muted-foreground"
              style={{ fontFamily: "'Inter',sans-serif" }}
            >
              {h}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

const UI_ITEMS = [
  { component: <EditorCard />, scale: 4 },
  { component: <TrackCard />, scale: 5 },
  { component: <DashboardCard />, scale: 6 },
  { component: <StatsCard />, scale: 5 },
  { component: <HeatmapCard />, scale: 6 },
  { component: <TimerCard />, scale: 8 },
  { component: <HintCard />, scale: 9 },
];

const POSITIONS = [
  "h-[35vh] w-[35vw]",
  "h-[28vh] w-[28vw] -mt-[20vh] ml-[8vw]",
  "h-[40vh] w-[18vw] -mt-[12vh] -ml-[20vw]",
  "h-[22vh] w-[22vw] ml-[22vw]",
  "h-[22vh] w-[18vw] mt-[20vh] ml-[8vw]",
  "h-[22vh] w-[26vw] mt-[20vh] -ml-[18vw]",
  "h-[14vh] w-[14vw] mt-[16vh] ml-[22vw]",
];

export function ShowcaseSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scaleValues = [4, 5, 6, 5, 6, 8, 9];

  return (
    <section
      id="demo"
      ref={containerRef}
      className="relative h-[300vh] bg-background"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Header text */}
        <div className="absolute top-12 inset-x-0 z-20 flex flex-col items-center text-center pointer-events-none">
          <GradualBlur>
            <Badge variant="outline" className="mb-3 text-xs ">
              Platform Preview
            </Badge>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Sora','Syne',sans-serif" }}
            >
              Scroll to explore Vorn
            </h2>
          </GradualBlur>
        </div>

        {UI_ITEMS.map(({ component, scale }, index) => {
          const s = useTransform(scrollYProgress, [0, 1], [1, scale]);
          return (
            <motion.div
              key={index}
              style={{ scale: s }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className={POSITIONS[index]}>{component}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
