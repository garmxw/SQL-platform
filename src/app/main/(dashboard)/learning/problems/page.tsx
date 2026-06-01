"use client";

import { useRef, useEffect, useState, useId, type CSSProperties } from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useMotionValue,
} from "motion/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  Puzzle,
  Search,
  SlidersHorizontal,
  Clock,
  Zap,
  Trophy,
  Star,
  Flame,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

//  MAGIC UI — identical implementations to TracksPage

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

function DotPattern({
  width = 16,
  height = 16,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
}: any) {
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

function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  yOffset = 8,
  inView: enableInView = false,
  blur = "6px",
}: any) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: "-40px" });
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

function NumberTicker({ value, delay = 0, className }: any) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (isInView) setTimeout(() => motionVal.set(value), delay * 1000);
  }, [isInView, delay, motionVal, value]);
  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
  }, [spring]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      0
    </span>
  );
}

function BorderBeam({
  size = 300,
  duration = 14,
  delay = 0,
  colorFrom = "hsl(var(--foreground))",
  colorTo = "transparent",
  borderWidth = 1.5,
  className,
}: any) {
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
        "[background:linear-gradient(white,white)_padding-box,linear-gradient(calc(var(--beam-angle,0)*1deg),var(--color-from),var(--color-to),var(--color-from))_border-box]",
        "dark:[background:linear-gradient(hsl(var(--background)),hsl(var(--background)))_padding-box,linear-gradient(calc(var(--beam-angle,0)*1deg),var(--color-from),var(--color-to),var(--color-from))_border-box]",
        "[animation:border-beam-spin_calc(var(--duration)*1s)_var(--delay)_linear_infinite]",
        className,
      )}
    />
  );
}

//  TYPES

interface Tag {
  id: number;
  name: string;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  xpReward: number;
  timeLimitSeconds: number | null;
  acceptanceRate: number | null;
  solved: boolean;
  attempts: number;
  solvedAt: string | null;
  tags: Tag[];
}

type DifficultyFilter = "Easy" | "Medium" | "Hard";
type StatusFilter = "solved" | "unsolved";

//  HELPERS

function DifficultyBadge({
  difficulty,
}: {
  difficulty: Problem["difficulty"];
}) {
  return (
    <Badge
      variant={
        difficulty === "Easy"
          ? "outline"
          : difficulty === "Medium"
            ? "secondary"
            : "default"
      }
      className="text-xs font-normal px-1.5 py-0 shrink-0"
    >
      {difficulty}
    </Badge>
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

//  SUMMARY STRIP

function SummaryStrip({ problems }: { problems: Problem[] }) {
  const total = problems.length;
  const solved = problems.filter((p) => p.solved).length;
  const easy = problems.filter((p) => p.difficulty === "Easy").length;
  const medium = problems.filter((p) => p.difficulty === "Medium").length;
  const hard = problems.filter((p) => p.difficulty === "Hard").length;

  const stats = [
    {
      label: "Solved",
      value: solved,
      suffix: `/${total}`,
      icon: Trophy,
      color: "text-[#FFC107] fill-[#FFC107]",
    },
    {
      label: "Easy",
      value: easy,
      suffix: "",
      icon: Star,
      color: "text-[#10B981] fill-[#10B981]",
    },
    {
      label: "Medium",
      value: medium,
      suffix: "",
      icon: Flame,
      color: "text-[#F59E0B] fill-[#F59E0B]",
    },
    {
      label: "Hard",
      value: hard,
      suffix: "",
      icon: Zap,
      color: "text-[#EF4444] fill-[#EF4444]",
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

//  FILTER BAR

function FilterBar({
  allTags,
  search,
  setSearch,
  difficultyFilter,
  toggleDifficulty,
  statusFilter,
  toggleStatus,
  tagFilter,
  toggleTag,
  activeCount,
  clearAll,
}: {
  allTags: Tag[];
  search: string;
  setSearch: (v: string) => void;
  difficultyFilter: DifficultyFilter[];
  toggleDifficulty: (d: DifficultyFilter) => void;
  statusFilter: StatusFilter[];
  toggleStatus: (s: StatusFilter) => void;
  tagFilter: number[];
  toggleTag: (id: number) => void;
  activeCount: number;
  clearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search problems…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Difficulty */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-sm font-normal",
              difficultyFilter.length > 0 && "border-foreground",
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Difficulty
            {difficultyFilter.length > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px]">
                {difficultyFilter.length}
              </Badge>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Difficulty
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(["Easy", "Medium", "Hard"] as DifficultyFilter[]).map((d) => (
            <DropdownMenuCheckboxItem
              key={d}
              checked={difficultyFilter.includes(d)}
              onCheckedChange={() => toggleDifficulty(d)}
              className="text-sm"
            >
              {d}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-sm font-normal",
              statusFilter.length > 0 && "border-foreground",
            )}
          >
            Status
            {statusFilter.length > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px]">
                {statusFilter.length}
              </Badge>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(["solved", "unsolved"] as StatusFilter[]).map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={statusFilter.includes(s)}
              onCheckedChange={() => toggleStatus(s)}
              className="text-sm capitalize"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tags */}
      {allTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-sm font-normal",
                tagFilter.length > 0 && "border-foreground",
              )}
            >
              Tags
              {tagFilter.length > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px]">
                  {tagFilter.length}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-52 max-h-64 overflow-y-auto"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Topics
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={tagFilter.includes(tag.id)}
                onCheckedChange={() => toggleTag(tag.id)}
                className="text-sm"
              >
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clear all */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={clearAll}
        >
          <X className="w-3.5 h-3.5" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}

//  ACTIVE FILTER CHIPS

function ActiveFilterChips({
  difficultyFilter,
  toggleDifficulty,
  statusFilter,
  toggleStatus,
  tagFilter,
  toggleTag,
  allTags,
}: {
  difficultyFilter: DifficultyFilter[];
  toggleDifficulty: (d: DifficultyFilter) => void;
  statusFilter: StatusFilter[];
  toggleStatus: (s: StatusFilter) => void;
  tagFilter: number[];
  toggleTag: (id: number) => void;
  allTags: Tag[];
}) {
  const chips = [
    ...difficultyFilter.map((d) => ({
      key: `d-${d}`,
      label: d,
      onRemove: () => toggleDifficulty(d),
    })),
    ...statusFilter.map((s) => ({
      key: `s-${s}`,
      label: s.charAt(0).toUpperCase() + s.slice(1),
      onRemove: () => toggleStatus(s),
    })),
    ...tagFilter.map((id) => ({
      key: `t-${id}`,
      label: allTags.find((t) => t.id === id)?.name ?? `Tag ${id}`,
      onRemove: () => toggleTag(id),
    })),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-foreground hover:border-foreground/50 hover:bg-muted transition-colors"
        >
          {chip.label}
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

//  PROBLEM ROW
function ProblemRow({ problem, index }: { problem: Problem; index: number }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/learning/tracks/lessons?type=problem&id=${problem.id}`);
  };

  return (
    <BlurFade delay={0.025 * index} inView>
      <button
        onClick={handleClick}
        className="group w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 cursor-pointer"
      >
        {/* Solved status */}
        <div className="shrink-0">
          {problem.solved ? (
            <CheckCircle2 color="green" className="w-[18px] h-[18px]" />
          ) : (
            <Circle className="w-[18px] h-[18px] text-muted-foreground/30" />
          )}
        </div>

        {/* Title + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{problem.title}</span>
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0 text-muted-foreground"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
            {problem.description}
          </p>
        </div>

        {/* Right meta */}
        <div className="flex items-center gap-3 shrink-0">
          {problem.acceptanceRate !== null && (
            <span className="text-xs text-muted-foreground hidden md:block">
              {problem.acceptanceRate.toFixed(0)}% acc.
            </span>
          )}
          {problem.timeLimitSeconds !== null && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {Math.round(problem.timeLimitSeconds / 60)}m
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
            <Zap className="w-2.5 h-2.5" />
            {problem.xpReward} XP
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </button>
    </BlurFade>
  );
}

//  PROBLEMS LIST CARD

function ProblemsListCard({ problems }: { problems: Problem[] }) {
  return (
    <BlurFade delay={0.1} inView>
      <Card className="relative overflow-hidden">
        <BorderBeam
          size={450}
          duration={12}
          colorFrom="hsl(var(--foreground))"
          colorTo="transparent"
          borderWidth={1}
        />
        <CardContent className="px-0 py-2">
          {problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Puzzle className="w-8 h-8 opacity-25" />
              <p className="text-sm">No problems match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {problems.map((problem, i) => (
                <ProblemRow key={problem.id} problem={problem} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  );
}

//  PAGE

export default function ProblemsPage() {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter[]>(
    [],
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
  const [tagFilter, setTagFilter] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/standalone-problems", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") {
          setAllProblems(res.data);
          setAllTags(res.tags);
        } else {
          toast.error("Failed to load problems");
        }
      })
      .catch(() => toast.error("Network error"))
      .finally(() => setLoading(false));
  }, []);

  const toggleDifficulty = (d: DifficultyFilter) =>
    setDifficultyFilter((p) => toggle(p, d));
  const toggleStatus = (s: StatusFilter) =>
    setStatusFilter((p) => toggle(p, s));
  const toggleTag = (id: number) => setTagFilter((p) => toggle(p, id));

  const activeCount =
    difficultyFilter.length +
    statusFilter.length +
    tagFilter.length +
    (search ? 1 : 0);

  function clearAll() {
    setDifficultyFilter([]);
    setStatusFilter([]);
    setTagFilter([]);
    setSearch("");
  }

  // Client-side filter
  const filtered = allProblems.filter((p) => {
    if (difficultyFilter.length && !difficultyFilter.includes(p.difficulty))
      return false;
    if (statusFilter.length) {
      const ok =
        (statusFilter.includes("solved") && p.solved) ||
        (statusFilter.includes("unsolved") && !p.solved);
      if (!ok) return false;
    }
    if (tagFilter.length) {
      const ids = p.tags.map((t) => t.id);
      if (!tagFilter.every((id) => ids.includes(id))) return false;
    }
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <>
      <ScrollProgress />

      <div className="relative min-h-screen bg-background text-foreground font-[Inter,sans-serif] overflow-x-hidden">
        {/* Background dot pattern */}
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
          {/* Header */}
          <BlurFade delay={0} inView>
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-3">
                <Puzzle className="w-6 h-6" />
                <h1 className="text-3xl font-semibold tracking-tight">
                  Problems
                </h1>
              </div>
              <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                Practice standalone SQL challenges across all difficulty levels.
                Filter by topic, difficulty, or completion status.
              </p>
            </div>
          </BlurFade>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
              Loading problems…
            </div>
          ) : (
            <>
              {/* Stats */}
              <SummaryStrip problems={allProblems} />

              {/* Filters */}
              <BlurFade delay={0.12} inView>
                <FilterBar
                  allTags={allTags}
                  search={search}
                  setSearch={setSearch}
                  difficultyFilter={difficultyFilter}
                  toggleDifficulty={toggleDifficulty}
                  statusFilter={statusFilter}
                  toggleStatus={toggleStatus}
                  tagFilter={tagFilter}
                  toggleTag={toggleTag}
                  activeCount={activeCount}
                  clearAll={clearAll}
                />
                <ActiveFilterChips
                  difficultyFilter={difficultyFilter}
                  toggleDifficulty={toggleDifficulty}
                  statusFilter={statusFilter}
                  toggleStatus={toggleStatus}
                  tagFilter={tagFilter}
                  toggleTag={toggleTag}
                  allTags={allTags}
                />
              </BlurFade>

              {/* Results count */}
              <BlurFade delay={0.14} inView>
                <p className="text-xs text-muted-foreground mb-3">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {filtered.length}
                  </span>{" "}
                  of {allProblems.length} problems
                </p>
              </BlurFade>

              {/* List */}
              <ProblemsListCard problems={filtered} />
            </>
          )}

          {/* Wordmark footer */}
          <div className="mt-28 mb-4 flex flex-col items-center gap-4 select-none">
            <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-9xl leading-none font-semibold text-transparent dark:from-white dark:to-slate-900/10">
              Vorn
            </span>
            <p className="pl-2 text-sm text-muted-foreground uppercase tracking-wide">
              built for SQL mastery
            </p>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes border-beam-spin { from { --beam-angle: 0; } to { --beam-angle: 360; } }
      `}</style>
    </>
  );
}
