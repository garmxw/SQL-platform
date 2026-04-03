"use client";

import {
  useRef,
  useEffect,
  useState,
  useId,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useMotionValue,
} from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Lock,
  Bookmark,
  Code2,
  Layers,
  Zap,
  Trophy,
  Star,
  PlayCircle,
  FileText,
  Puzzle,
  Clock,
  Target,
  ArrowRight,
  Flame,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

//  MAGIC UI — INLINED

//  ScrollProgress
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
  });
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[100] h-[3px] origin-left bg-foreground"
      style={{ scaleX }}
    />
  );
}

//  DotPattern
function DotPattern({
  width = 16,
  height = 16,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
}: {
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={cx} cy={cy} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}

// ── BlurFade ──────────────────────────────────────────────────────────────────
function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  yOffset = 8,
  inView: enableInView = false,
  blur = "6px",
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  blur?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, {
    once: true,
    margin: "-40px" as `${number}px`,
  });
  const isVisible = !enableInView || inViewResult;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: `blur(${blur})` }}
      animate={isVisible ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

//  NumberTicker
function NumberTicker({
  value,
  delay = 0,
  className,
}: {
  value: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) setTimeout(() => motionVal.set(value), delay * 1000);
  }, [isInView, delay, motionVal, value]);

  useEffect(
    () =>
      spring.on("change", (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      }),
    [spring],
  );

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      0
    </span>
  );
}

//  BorderBeam
function BorderBeam({
  size = 300,
  duration = 14,
  delay = 0,
  colorFrom = "hsl(var(--foreground))",
  colorTo = "transparent",
  borderWidth = 1.5,
  className,
}: {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  className?: string;
}) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--delay": `-${delay}s`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--border-width": `${borderWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:var(--border-width)_solid_transparent]",
        // light
        "[background:linear-gradient(white,white)_padding-box,linear-gradient(calc(var(--beam-angle,0)*1deg),var(--color-from),var(--color-to),var(--color-from))_border-box]",
        // dark
        "dark:[background:linear-gradient(hsl(var(--background)),hsl(var(--background)))_padding-box,linear-gradient(calc(var(--beam-angle,0)*1deg),var(--color-from),var(--color-to),var(--color-from))_border-box]",
        "[animation:border-beam-spin_calc(var(--duration)*1s)_var(--delay)_linear_infinite]",
        className,
      )}
    />
  );
}

//  InteractiveHoverButton
// Faithful to Magic UI spec: text slides left, arrow slides in from right on hover
function InteractiveHoverButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // base
        "group relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md border border-input bg-background px-5 text-sm font-medium text-foreground shadow-xs transition-colors duration-200 font-[Inter,sans-serif]",
        // hover: invert colours
        "hover:border-foreground hover:bg-foreground hover:text-background",
        className,
      )}
    >
      {/* label shifts left */}
      <span className="relative z-10 flex items-center gap-2 transition-transform duration-200 group-hover:-translate-x-2">
        {children}
      </span>
      {/* arrow enters from off-screen right */}
      <ArrowRight className="absolute right-4 z-10 w-4 h-4 translate-x-6 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  );
}

//  AnimatedCircularProgressBar
function AnimatedCircularProgressBar({
  value,
  gaugePrimaryColor = "hsl(var(--foreground))",
  gaugeSecondaryColor = "hsl(var(--muted))",
}: {
  value: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
}) {
  const circumference = 2 * Math.PI * 45;
  const pct = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative size-full">
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          fill="none"
          style={{
            stroke: gaugeSecondaryColor,
            strokeDasharray: `${circumference}`,
            strokeDashoffset: 0,
          }}
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          style={{
            stroke: gaugePrimaryColor,
            strokeDasharray: `${circumference}`,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 1s ease",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

//  CompletedBanner — shown on 100% tracks
function CompletedBanner() {
  return (
    <div className="relative flex items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-foreground px-4 py-2.5">
      <Sparkles className="w-4 h-4 text-background shrink-0" />
      <span className="text-sm font-semibold text-background tracking-wide">
        Track Completed
      </span>
      <Trophy className="w-4 h-4 text-background shrink-0" />
      {/* subtle shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 [background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] [animation:shimmer-sweep_2.5s_linear_infinite] [background-size:200%_100%]" />
    </div>
  );
}

//  DATA TYPES & MOCK DATA

type ItemStatus = "completed" | "in-progress" | "locked";

interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completed: boolean;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  type: "lesson" | "challenge";
  status: ItemStatus;
  completed: boolean;
  duration?: string;
  problem?: Problem;
  whatYouLearn: string[];
  objectives: string[];
}

interface Track {
  id: number;
  title: string;
  description: string;
  icon: typeof Bookmark;
  tag: "Beginner" | "Intermediate" | "Advanced";
  totalLessons: number;
  lessons: Lesson[];
}

const TRACKS: Track[] = [
  {
    id: 1,
    title: "SQL Foundations",
    description:
      "Master the core syntax — SELECT, WHERE, ORDER BY, and filtering. The essential building blocks every SQL developer must know.",
    icon: Bookmark,
    tag: "Beginner",
    totalLessons: 6,
    lessons: [
      {
        id: 1,
        title: "Introduction to SELECT",
        description:
          "Learn how to retrieve data from a single table using the SELECT statement — the most fundamental SQL command.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "5 min",
        whatYouLearn: [
          "The anatomy of a SELECT statement",
          "How to pick specific columns",
          "Using * to retrieve all columns",
          "Column aliases with AS",
        ],
        objectives: [
          "Write a basic SELECT query",
          "Select specific columns from a table",
          "Use column aliases",
        ],
        problem: {
          id: 101,
          title: "Select All Columns",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 2,
        title: "Filtering with WHERE",
        description:
          "Use conditional clauses to precisely narrow down which rows your query returns.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "8 min",
        whatYouLearn: [
          "Comparison operators (=, !=, <, >)",
          "Logical operators AND / OR / NOT",
          "Combining multiple conditions",
          "String and numeric comparisons",
        ],
        objectives: [
          "Filter rows with WHERE",
          "Combine conditions with AND/OR",
          "Use NOT to exclude values",
        ],
        problem: {
          id: 102,
          title: "Find Active Users",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 3,
        title: "Sorting with ORDER BY",
        description:
          "Control the order in which your results appear using ASC and DESC sorting.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "6 min",
        whatYouLearn: [
          "ASC vs DESC ordering",
          "Sorting by multiple columns",
          "Nulls in ordered results",
        ],
        objectives: [
          "Sort query results",
          "Use multi-column sort",
          "Understand NULL ordering",
        ],
        problem: {
          id: 103,
          title: "Top Earners",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 4,
        title: "Limiting Results",
        description:
          "Efficiently paginate and restrict result sets using LIMIT and OFFSET.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "5 min",
        whatYouLearn: [
          "LIMIT clause syntax",
          "OFFSET for pagination",
          "Combining LIMIT with ORDER BY",
        ],
        objectives: ["Restrict rows with LIMIT", "Implement basic pagination"],
        problem: {
          id: 104,
          title: "Second Highest Salary",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 5,
        title: "NULL Handling",
        description:
          "Understand the three-valued logic of NULLs and learn to handle missing values safely.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "7 min",
        whatYouLearn: [
          "IS NULL / IS NOT NULL",
          "COALESCE to provide defaults",
          "NULLIF for conditional nulls",
          "Why NULL ≠ NULL",
        ],
        objectives: [
          "Detect NULL values",
          "Replace NULLs using COALESCE",
          "Avoid common NULL pitfalls",
        ],
        problem: {
          id: 105,
          title: "Null Safe Queries",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 6,
        title: "Pattern Matching",
        description:
          "Search string data flexibly using LIKE and wildcard characters.",
        type: "challenge",
        status: "completed",
        completed: true,
        whatYouLearn: [
          "LIKE with % and _ wildcards",
          "Case sensitivity nuances",
          "NOT LIKE exclusions",
        ],
        objectives: ["Match strings with LIKE", "Apply wildcards correctly"],
        problem: {
          id: 106,
          title: "Find Email Domains",
          difficulty: "Easy",
          completed: true,
        },
      },
    ],
  },
  {
    id: 2,
    title: "Joins & Relationships",
    description:
      "Combine data across multiple tables using INNER, LEFT, RIGHT, and FULL OUTER joins. Understand relational design.",
    icon: Layers,
    tag: "Intermediate",
    totalLessons: 6,
    lessons: [
      {
        id: 7,
        title: "INNER JOIN",
        description:
          "Fetch only the rows that have matching values in both tables.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "10 min",
        whatYouLearn: [
          "JOIN syntax",
          "ON clause conditions",
          "Matching foreign keys",
          "Aliasing tables",
        ],
        objectives: ["Write an INNER JOIN", "Understand matching rows only"],
        problem: {
          id: 201,
          title: "Employees & Departments",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 8,
        title: "LEFT & RIGHT JOIN",
        description:
          "Include unmatched rows from either the left or right table.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "9 min",
        whatYouLearn: [
          "LEFT JOIN keeps all left rows",
          "RIGHT JOIN keeps all right rows",
          "NULL for unmatched sides",
        ],
        objectives: [
          "Use LEFT JOIN for optional relationships",
          "Detect missing data",
        ],
        problem: {
          id: 202,
          title: "Customers Who Never Ordered",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 9,
        title: "FULL OUTER JOIN",
        description:
          "Combine all rows from both tables, filling NULLs where there is no match.",
        type: "lesson",
        status: "in-progress",
        completed: false,
        duration: "8 min",
        whatYouLearn: [
          "FULL OUTER JOIN semantics",
          "When to use it",
          "Simulating it in MySQL with UNION",
        ],
        objectives: [
          "Combine all rows from two tables",
          "Handle both-side NULLs",
        ],
      },
      {
        id: 10,
        title: "Self JOIN",
        description:
          "Join a table to itself to model hierarchical or comparative relationships.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "11 min",
        whatYouLearn: [
          "Self-join aliasing pattern",
          "Employee-manager hierarchies",
          "Comparing rows within same table",
        ],
        objectives: ["Write a self join", "Model hierarchy queries"],
        problem: {
          id: 203,
          title: "Employee Manager Chain",
          difficulty: "Medium",
          completed: false,
        },
      },
      {
        id: 11,
        title: "Multi-Table Joins",
        description:
          "Chain three or more tables in a single query without losing data integrity.",
        type: "challenge",
        status: "locked",
        completed: false,
        whatYouLearn: [
          "Join chain syntax",
          "Controlling join order",
          "Debugging missing rows",
        ],
        objectives: ["Write a 3-table join", "Trace row multiplication"],
        problem: {
          id: 204,
          title: "Orders with Products & Customers",
          difficulty: "Medium",
          completed: false,
        },
      },
      {
        id: 12,
        title: "Join Optimization",
        description:
          "Write efficient joins and avoid Cartesian products and unnecessary scans.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "12 min",
        whatYouLearn: [
          "Cartesian product pitfalls",
          "Index usage in joins",
          "EXPLAIN basics",
        ],
        objectives: ["Avoid common join mistakes", "Understand query plans"],
      },
    ],
  },
  {
    id: 3,
    title: "Aggregations & Grouping",
    description:
      "Use COUNT, SUM, AVG, MIN, MAX with GROUP BY and HAVING to summarize and analyze data at scale.",
    icon: Code2,
    tag: "Intermediate",
    totalLessons: 5,
    lessons: [
      {
        id: 13,
        title: "Aggregate Functions",
        description:
          "Calculate summary statistics across entire tables or subsets of rows.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "8 min",
        whatYouLearn: [
          "COUNT, SUM, AVG, MIN, MAX",
          "COUNT(*) vs COUNT(col)",
          "Ignoring NULLs in aggregates",
        ],
        objectives: [
          "Use all five aggregate functions",
          "Understand NULL behavior",
        ],
        problem: {
          id: 301,
          title: "Department Stats",
          difficulty: "Easy",
          completed: true,
        },
      },
      {
        id: 14,
        title: "GROUP BY",
        description:
          "Group rows sharing a value and compute aggregates per group.",
        type: "lesson",
        status: "completed",
        completed: true,
        duration: "10 min",
        whatYouLearn: [
          "GROUP BY single and multiple columns",
          "Non-aggregated columns rule",
          "Combining with ORDER BY",
        ],
        objectives: ["Group and aggregate data", "Sort grouped results"],
        problem: {
          id: 302,
          title: "Sales by Region",
          difficulty: "Medium",
          completed: false,
        },
      },
      {
        id: 15,
        title: "HAVING Clause",
        description:
          "Filter grouped results after aggregation — the post-group WHERE.",
        type: "lesson",
        status: "in-progress",
        completed: false,
        duration: "7 min",
        whatYouLearn: [
          "HAVING vs WHERE",
          "Using aggregates in HAVING",
          "Execution order",
        ],
        objectives: [
          "Filter groups with HAVING",
          "Understand query execution order",
        ],
      },
      {
        id: 16,
        title: "ROLLUP & CUBE",
        description: "Generate sub-totals and cross-tabulations automatically.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "14 min",
        whatYouLearn: [
          "GROUP BY ROLLUP",
          "GROUP BY CUBE",
          "Reading summary rows",
        ],
        objectives: [
          "Generate hierarchical totals",
          "Distinguish summary rows",
        ],
        problem: {
          id: 303,
          title: "Regional Totals Report",
          difficulty: "Hard",
          completed: false,
        },
      },
      {
        id: 17,
        title: "Aggregation Challenge",
        description:
          "Solve a multi-step business analytics query combining all aggregation concepts.",
        type: "challenge",
        status: "locked",
        completed: false,
        whatYouLearn: [
          "Chaining GROUP BY with HAVING",
          "Nested aggregation strategies",
          "Interpreting business requirements",
        ],
        objectives: [
          "Translate a business question into SQL",
          "Combine GROUP BY, HAVING, and ORDER BY",
        ],
        problem: {
          id: 304,
          title: "Monthly Revenue Trend",
          difficulty: "Hard",
          completed: false,
        },
      },
    ],
  },
  {
    id: 4,
    title: "Window Functions",
    description:
      "Perform calculations across related rows without collapsing them. Master RANK, DENSE_RANK, LAG, LEAD, and PARTITION BY.",
    icon: Zap,
    tag: "Advanced",
    totalLessons: 6,
    lessons: [
      {
        id: 18,
        title: "OVER Clause Basics",
        description:
          "Understand how window functions differ from regular aggregates and when to choose them.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "10 min",
        whatYouLearn: [
          "Window vs aggregate functions",
          "OVER() clause syntax",
          "Default window frame",
        ],
        objectives: [
          "Explain what a window function does",
          "Write a basic OVER() query",
        ],
      },
      {
        id: 19,
        title: "PARTITION BY",
        description:
          "Reset window calculations per group without collapsing rows.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "9 min",
        whatYouLearn: [
          "PARTITION BY divides rows into groups",
          "Combining with ORDER BY inside OVER",
          "Running totals per partition",
        ],
        objectives: [
          "Partition a window function",
          "Compute per-group running sums",
        ],
        problem: {
          id: 401,
          title: "Rank Salaries by Department",
          difficulty: "Medium",
          completed: false,
        },
      },
      {
        id: 20,
        title: "RANK vs DENSE_RANK",
        description:
          "Understand ranking gaps with RANK and gapless ranking with DENSE_RANK.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "8 min",
        whatYouLearn: [
          "RANK skips numbers on ties",
          "DENSE_RANK never skips",
          "Choosing the right ranking function",
        ],
        objectives: [
          "Use RANK and DENSE_RANK correctly",
          "Handle ties in rankings",
        ],
        problem: {
          id: 402,
          title: "Top 3 Earners per Dept",
          difficulty: "Hard",
          completed: false,
        },
      },
      {
        id: 21,
        title: "ROW_NUMBER",
        description:
          "Assign unique sequential integers to rows, even when they share identical values.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "7 min",
        whatYouLearn: [
          "ROW_NUMBER assigns unique integers",
          "Determinism and tie-breaking",
          "Deduplication patterns",
        ],
        objectives: [
          "Use ROW_NUMBER for deduplication",
          "Control tie-breaking with ORDER BY",
        ],
      },
      {
        id: 22,
        title: "LAG & LEAD",
        description:
          "Access previous and next row values within the same window without a self-join.",
        type: "lesson",
        status: "locked",
        completed: false,
        duration: "12 min",
        whatYouLearn: [
          "LAG to access the previous row",
          "LEAD to access the next row",
          "Offset and default values",
        ],
        objectives: [
          "Calculate period-over-period change",
          "Replace self-joins with LAG/LEAD",
        ],
        problem: {
          id: 403,
          title: "Month-over-Month Growth",
          difficulty: "Hard",
          completed: false,
        },
      },
      {
        id: 23,
        title: "Window Functions Challenge",
        description:
          "Combine multiple window functions in a single query for an advanced analytics report.",
        type: "challenge",
        status: "locked",
        completed: false,
        whatYouLearn: [
          "Nesting CTEs with window functions",
          "Combining RANK, LAG, and SUM OVER",
          "Business reporting patterns",
        ],
        objectives: [
          "Write a multi-window-function query",
          "Solve a real analytics problem",
        ],
        problem: {
          id: 404,
          title: "Running Total & Percentile",
          difficulty: "Hard",
          completed: false,
        },
      },
    ],
  },
];

//
//  HELPERS
//

function computeCompletion(track: Track) {
  let total = 0;
  let done = 0;
  for (const l of track.lessons) {
    total++;
    if (l.completed) done++;
    if (l.problem) {
      total++;
      if (l.problem.completed) done++;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty: "Easy" | "Medium" | "Hard";
}) {
  const variant =
    difficulty === "Easy"
      ? "outline"
      : difficulty === "Medium"
        ? "secondary"
        : "default";
  return (
    <Badge variant={variant} className="text-xs font-normal px-1.5 py-0">
      {difficulty}
    </Badge>
  );
}

function TagBadge({ tag }: { tag: Track["tag"] }) {
  const variant =
    tag === "Beginner"
      ? "outline"
      : tag === "Intermediate"
        ? "secondary"
        : "default";
  return (
    <Badge variant={variant} className="text-sm font-normal">
      {tag}
    </Badge>
  );
}

//  LESSON DIALOG

function LessonDialog({
  lesson,
  open,
  onClose,
}: {
  lesson: Lesson | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!lesson) return null;
  const isLocked = lesson.status === "locked";
  const progressValue = lesson.completed
    ? 100
    : lesson.status === "in-progress"
      ? 45
      : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] font-[Inter,sans-serif]">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {lesson.type === "challenge" ? (
              <Badge variant="outline" className="text-xs  gap-1 px-2">
                <Puzzle className="w-3 h-3" />
                Challenge
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs  gap-1 px-2">
                <Bookmark className="w-3 h-3" />
                Lesson
              </Badge>
            )}
            {lesson.duration && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {lesson.duration}
              </span>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                Locked
              </span>
            )}
          </div>
          <DialogTitle className="text-lg leading-snug">
            {lesson.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed mt-1">
            {lesson.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium">
                {lesson.completed
                  ? "Completed"
                  : lesson.status === "in-progress"
                    ? "In Progress"
                    : "Not started"}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          <Separator />

          {/* What you'll learn */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              What you'll learn
            </p>
            <ul className="space-y-2">
              {lesson.whatYouLearn.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <CheckCircle2
                    color="green"
                    className="w-4 h-4 mt-0.5 shrink-0 text-foreground/60"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Objectives */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Objectives
            </p>
            <ul className="space-y-2">
              {lesson.objectives.map((obj) => (
                <li
                  key={obj}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 mt-2 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Attached problem */}
          {lesson.problem && (
            <>
              <Separator />
              <div className="space-y-2.5">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Practice Problem
                </p>
                <div
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border px-4 py-3",
                    lesson.problem.completed ? "bg-muted/40" : "bg-background",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {lesson.problem.completed ? (
                      <CheckCircle2
                        color="green"
                        className="w-4 h-4 text-foreground shrink-0"
                      />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className="text-sm  ">{lesson.problem.title}</span>
                  </div>
                  <DifficultyBadge difficulty={lesson.problem.difficulty} />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm h-9"
            onClick={onClose}
          >
            Close
          </Button>
          {!isLocked && (
            <InteractiveHoverButton onClick={onClose}>
              <PlayCircle className="w-4 h-4" />
              {lesson.completed
                ? "Review lesson"
                : lesson.status === "in-progress"
                  ? "Continue lesson"
                  : "Start lesson"}
            </InteractiveHoverButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

//  LESSON ROW

function StatusIcon({
  status,
  completed,
}: {
  status: ItemStatus;
  completed: boolean;
}) {
  if (completed)
    return (
      <CheckCircle2
        color="green"
        className="w-[18px] h-[18px] shrink-0 text-foreground"
      />
    );
  if (status === "in-progress")
    return (
      <div className="relative w-[18px] h-[18px] shrink-0">
        <div className="w-full h-full rounded-full border-2 border-foreground" />
        <div className="absolute inset-[3px] rounded-full bg-foreground/30 animate-pulse" />
      </div>
    );
  return (
    <Circle className="w-[18px] h-[18px] shrink-0 text-muted-foreground/30" />
  );
}

function LessonRow({
  lesson,
  index,
  onOpen,
}: {
  lesson: Lesson;
  index: number;
  onOpen: (l: Lesson) => void;
}) {
  const isLocked = lesson.status === "locked";

  return (
    <BlurFade delay={0.04 * index} inView>
      <button
        onClick={() => onOpen(lesson)}
        className={cn(
          "group w-full flex items-start gap-4 rounded-lg px-4 py-3.5 text-left transition-colors",
          isLocked
            ? "opacity-45 cursor-not-allowed"
            : "hover:bg-muted/50 cursor-pointer",
        )}
      >
        <div className="mt-0.5">
          <StatusIcon status={lesson.status} completed={lesson.completed} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium",
                isLocked && "text-muted-foreground",
              )}
            >
              {lesson.title}
            </span>
            {lesson.type === "challenge" && (
              <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
                <Puzzle className="w-3 h-3" />
                Challenge
              </Badge>
            )}
            {isLocked && (
              <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-1">
            {lesson.description}
          </p>

          {lesson.problem && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-2 rounded border border-border/60 px-2.5 py-1.5",
                lesson.problem.completed ? "bg-muted/40" : "bg-background",
              )}
            >
              {lesson.problem.completed ? (
                <CheckCircle2
                  color="green"
                  className="w-3.5 h-3.5 text-foreground shrink-0"
                />
              ) : (
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs ">{lesson.problem.title}</span>
              <DifficultyBadge difficulty={lesson.problem.difficulty} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {lesson.duration && (
            <span className="text-xs text-muted-foreground ">
              {lesson.duration}
            </span>
          )}
          <ChevronRight
            className={cn(
              "w-4 h-4 text-muted-foreground transition-all duration-200",
              isLocked
                ? "opacity-0"
                : "opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5",
            )}
          />
        </div>
      </button>
    </BlurFade>
  );
}

//  TRACK CARD

function TrackCard({
  track,
  index,
  onLessonOpen,
}: {
  track: Track;
  index: number;
  onLessonOpen: (l: Lesson) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const completion = computeCompletion(track);
  const completedLessons = track.lessons.filter((l) => l.completed).length;
  const isStarted = completion > 0;
  const isCompleted = completion === 100;
  const Icon = track.icon;

  return (
    <BlurFade delay={0.08 + index * 0.09} inView>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
          {/* BorderBeam on EVERY card (monotone) */}
          <BorderBeam
            size={350}
            duration={8 + index * 2}
            delay={index * 1.2}
            colorFrom="hsl(var(--foreground))"
            colorTo="transparent"
            borderWidth={1}
          />

          <CollapsibleTrigger asChild>
            <button className="w-full text-left focus-visible:outline-none focus-visible:ring-0">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-5">
                  {/* Circular progress */}
                  <div className="w-16 h-16 shrink-0">
                    <AnimatedCircularProgressBar
                      value={completion}
                      gaugePrimaryColor="hsl(var(--foreground))"
                      gaugeSecondaryColor="hsl(var(--muted))"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      {/* Title — explicit foreground so it works in both modes */}
                      <CardTitle className="text-lg text-foreground">
                        {track.title}
                      </CardTitle>
                      <TagBadge tag={track.tag} />
                    </div>
                    <CardDescription className="text-sm leading-relaxed line-clamp-2 mb-3">
                      {track.description}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5" />
                        <NumberTicker
                          value={completedLessons}
                          delay={0.3 + index * 0.1}
                        />
                        <span>/{track.totalLessons} lessons</span>
                      </span>
                      <Separator orientation="vertical" className="h-3.5" />
                      <span className="flex items-center gap-1 ">
                        <NumberTicker
                          value={completion}
                          delay={0.3 + index * 0.1}
                        />
                        <span>% complete</span>
                      </span>
                    </div>
                    <Progress value={completion} className="h-1.5 mt-2.5" />
                  </div>

                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-muted-foreground shrink-0 mt-1 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </div>
              </CardHeader>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 px-0 pb-5">
              <Separator className="mb-2 mx-5" />

              {/* Completed banner — shown prominently when track is 100% */}
              {isCompleted && (
                <div className="px-5 pb-4">
                  <CompletedBanner />
                </div>
              )}

              <div className="space-y-0 px-2">
                {track.lessons.map((lesson, i) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={i}
                    onOpen={onLessonOpen}
                  />
                ))}
              </div>

              {/* CTA — only when not completed */}
              {!isCompleted && (
                <div className="px-5 pt-4">
                  <InteractiveHoverButton>
                    <PlayCircle className="w-4 h-4" />
                    {isStarted ? "Continue Track" : "Start Track"}
                  </InteractiveHoverButton>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </BlurFade>
  );
}

//  SUMMARY STRIP

function SummaryStrip() {
  const totalLessons = TRACKS.reduce((s, t) => s + t.totalLessons, 0);
  const doneLessons = TRACKS.reduce(
    (s, t) => s + t.lessons.filter((l) => l.completed).length,
    0,
  );
  const totalProblems = TRACKS.reduce(
    (s, t) => s + t.lessons.filter((l) => l.problem).length,
    0,
  );
  const doneProblems = TRACKS.reduce(
    (s, t) => s + t.lessons.filter((l) => l.problem?.completed).length,
    0,
  );
  const tracksStarted = TRACKS.filter((t) => computeCompletion(t) > 0).length;
  const overallPct = Math.round(
    TRACKS.reduce((s, t) => s + computeCompletion(t), 0) / TRACKS.length,
  );

  const stats = [
    {
      label: "Overall Progress",
      value: overallPct,
      suffix: "%",
      icon: Star,
      color: "text-[#FFC107] fill-[#FFC107]",
    },
    {
      label: "Lessons Done",
      value: doneLessons,
      suffix: `/${totalLessons}`,
      icon: Bookmark,
      color: "text-[#10B981] fill-[#10B981]",
    },
    {
      label: "Problems Solved",
      value: doneProblems,
      suffix: `/${totalProblems}`,
      icon: Puzzle,
      color: "text-[#0EA5E9] fill-[#0EA5E9]",
    },
    {
      label: "Tracks Active",
      value: tracksStarted,
      suffix: `/${TRACKS.length}`,
      icon: Flame,
      color: "text-[#FF5722] fill-[#FF5722]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map(({ label, value, suffix, icon: Icon, color }, i) => (
        <BlurFade key={label} delay={0.06 * i} inView>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-0.5">
                    <NumberTicker value={value} delay={0.15 + i * 0.08} />
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      {suffix}
                    </span>
                  </p>
                </div>
                <Icon className={`w-4 h-4 ${color} mt-1`} />
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      ))}
    </div>
  );
}

//  PAGE

export default function TracksPage() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setDialogOpen(true);
  }

  return (
    <>
      <ScrollProgress />

      <div className="relative min-h-screen bg-background text-foreground font-[Inter,sans-serif] overflow-x-hidden">
        {/* ── Dot pattern — page background only, NOT repeated in footer ── */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <DotPattern
            width={22}
            height={22}
            cx={1}
            cy={1}
            cr={1}
            className="fill-foreground/[0.055] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,white_30%,transparent_100%)]"
          />
        </div>

        <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          {/* ── Page Header ── */}
          <BlurFade delay={0} inView>
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-3">
                <Layers className="w-6 h-6" />
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Learning Tracks
                </h1>
              </div>
              <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                Structured paths from SQL basics to advanced window functions.
                Each track contains lessons and practice problems — complete
                them in order to unlock the next.
              </p>
            </div>
          </BlurFade>

          {/* ── Stats ── */}
          <SummaryStrip />

          {/* ── Track Cards ── */}
          <div className="space-y-5">
            {TRACKS.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                onLessonOpen={openLesson}
              />
            ))}
          </div>

          {/* ── Footer — no extra dot pattern, just the wordmark ── */}
          <div className="mt-28 mb-4 flex flex-col items-center gap-4 select-none">
            {/* Gradient wordmark — works in light AND dark */}
            <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-9xl leading-none font-semibold text-transparent dark:from-white dark:to-slate-900/10">
              Vorn
            </span>
            <p className="pl-2 text-sm text-muted-foreground uppercase tracking-wide">
              built for SQL mastery
            </p>
          </div>
        </main>

        {/* ── Lesson Dialog ── */}
        <LessonDialog
          lesson={selectedLesson}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      </div>

      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes border-beam-spin {
          from { --beam-angle: 0; }
          to   { --beam-angle: 360; }
        }
        @keyframes shimmer-sweep {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
      `}</style>
    </>
  );
}
