"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy,
  Flame,
  CheckCircle2,
  BarChart3,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Medal,
  Users,
  Crown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Magic UI
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { Meteors } from "@/components/ui/meteors";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardType = "xp" | "solved" | "streak" | "quality" | "badges";

interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  score: number;
  meta: {
    currentStreak?: number;
    longestStreak?: number;
    totalSubs?: number;
    correctSubs?: number;
  };
}

interface BoardMeta {
  type: BoardType;
  label: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MySummaryEntry {
  type: BoardType;
  label: string;
  rank: number | null;
  score: number;
  meta: {
    currentStreak?: number;
    longestStreak?: number;
    totalSubs?: number;
    correctSubs?: number;
  };
  totalRanked: number | null;
  qualified?: boolean;
}

// ─── Board configs ────────────────────────────────────────────────────────────

const BOARDS: {
  type: BoardType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  scoreLabel: string;
  formatScore: (n: number) => string;
  color: string;
  bgAccent: string;
  subLabel: (entry: MySummaryEntry) => string;
}[] = [
  {
    type: "xp",
    label: "Experience",
    shortLabel: "XP",
    description: "Total experience points earned",
    icon: Trophy,
    scoreLabel: "XP",
    formatScore: (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)),
    // amber is semantic for XP/trophies throughout the app
    color: "text-amber-500",
    bgAccent: "from-amber-500/10",
    subLabel: (e) =>
      e.meta.currentStreak ? `${e.meta.currentStreak}d streak` : `Lv —`,
  },
  {
    type: "solved",
    label: "Problems",
    shortLabel: "Solved",
    description: "Distinct problems solved correctly",
    icon: CheckCircle2,
    scoreLabel: "Solved",
    formatScore: (n) => String(n),
    // emerald is semantic for "correct / solved" throughout the app
    color: "text-emerald-500",
    bgAccent: "from-emerald-500/10",
    subLabel: () => "problems",
  },
  {
    type: "streak",
    label: "Streak",
    shortLabel: "Streak",
    description: "Current daily solving streak",
    icon: Flame,
    scoreLabel: "Days",
    formatScore: (n) => `${n}d`,
    // streaks use foreground — no extra accent color needed
    color: "text-foreground",
    bgAccent: "",
    subLabel: (e) =>
      e.meta.longestStreak ? `best ${e.meta.longestStreak}d` : "days",
  },
  {
    type: "quality",
    label: "Quality",
    shortLabel: "Quality",
    description: "Acceptance rate (min. 10 submissions)",
    icon: TrendingUp,
    scoreLabel: "Acc. Rate",
    formatScore: (n) => `${n}%`,
    // blue is the app's deliberate third accent — used here and nowhere else decoratively
    color: "text-blue-500",
    bgAccent: "from-blue-500/10",
    subLabel: (e) =>
      e.meta.totalSubs
        ? `${e.meta.correctSubs}/${e.meta.totalSubs} correct`
        : "submissions",
  },
  {
    type: "badges",
    label: "Badges",
    shortLabel: "Badges",
    description: "Total badges earned",
    icon: Star,
    scoreLabel: "Badges",
    formatScore: (n) => String(n),
    // badges use foreground — amber already covers trophy/achievement theming
    color: "text-foreground",
    bgAccent: "",
    subLabel: () => "badges earned",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const t = name?.trim() || "";
  return t ? t.slice(0, 2).toUpperCase() : "??";
}

// ─── Rank medal display ───────────────────────────────────────────────────────

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 text-amber-500">
        <Crown className="w-3.5 h-3.5" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-400/15 text-zinc-400">
        <Medal className="w-3.5 h-3.5" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground">
        <Medal className="w-3.5 h-3.5" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ count = 10 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0"
        >
          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-5 w-14 rounded" />
        </div>
      ))}
    </>
  );
}

// ─── My summary strip ─────────────────────────────────────────────────────────
// Shows the user's ACTUAL stats (xp value, solved count, etc.) + their rank

function MySummaryStrip({
  summary,
  loading,
  activeType,
  onSelect,
}: {
  summary: MySummaryEntry[];
  loading: boolean;
  activeType: BoardType;
  onSelect: (t: BoardType) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
      {BOARDS.map((board) => {
        const entry = summary.find((s) => s.type === board.type);
        const Icon = board.icon;
        const isActive = activeType === board.type;
        const percentile =
          entry?.rank && entry?.totalRanked
            ? Math.max(
                1,
                Math.round(
                  ((entry.totalRanked - entry.rank) / entry.totalRanked) * 100,
                ),
              )
            : 0;

        return (
          <button
            key={board.type}
            onClick={() => onSelect(board.type)}
            className={cn(
              "relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all overflow-hidden",
              isActive
                ? "border-foreground/20 bg-muted/60 shadow-sm"
                : "border-border hover:border-border/80 hover:bg-muted/20",
            )}
          >
            {isActive && (
              <BorderBeam size={80} duration={6} borderWidth={1.5} />
            )}

            {/* Icon + label */}
            <div className="flex items-center justify-between">
              <Icon className={cn("w-3.5 h-3.5 shrink-0", board.color)} />
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                {board.shortLabel}
              </span>
            </div>

            {loading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ) : (
              <div className="flex items-end justify-between gap-1">
                {/* Score + sub-label */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums leading-none",
                      board.color,
                    )}
                  >
                    {entry && entry.score > 0 ? (
                      <NumberTicker
                        value={entry.score}
                        decimalPlaces={board.type === "quality" ? 1 : 0}
                        className={board.color}
                      />
                    ) : (
                      <span className="text-muted-foreground text-base">—</span>
                    )}
                    {board.type === "quality" && entry && entry.score > 0 && (
                      <span className="text-sm font-semibold ml-0.5">%</span>
                    )}
                    {board.type === "streak" && entry && entry.score > 0 && (
                      <span className="text-sm font-semibold ml-0.5">d</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {entry ? board.subLabel(entry) : "—"}
                  </p>
                </div>

                {/* Circular progress showing percentile */}
                {entry?.rank != null && entry.totalRanked && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="shrink-0">
                          <AnimatedCircularProgressBar
                            max={100}
                            min={0}
                            value={percentile}
                            gaugePrimaryColor="hsl(var(--foreground))"
                            gaugeSecondaryColor="hsl(var(--muted))"
                            className="w-9 h-9 text-[9px]"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        #{entry.rank} of {entry.totalRanked} · top{" "}
                        {100 - percentile + 1}%
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Rank pill */}
            {!loading && entry?.rank != null && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  Rank #{entry.rank}
                </span>
                {entry.rank <= 3 && (
                  <Crown className="w-2.5 h-2.5 text-amber-500" />
                )}
              </div>
            )}
            {!loading && entry?.rank == null && (
              <span className="text-[10px] text-muted-foreground/60">
                {board.type === "quality" && entry && !entry.qualified
                  ? "needs 10+ submissions"
                  : "not ranked"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({
  entries,
  board,
  loading,
}: {
  entries: LeaderboardEntry[];
  board: (typeof BOARDS)[0];
  loading: boolean;
}) {
  const top3 = entries.slice(0, 3);
  // Layout: 2nd | 1st | 3rd
  const ordered =
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : top3;

  const heights = ["h-20", "h-28", "h-16"];
  const avatarSizes = [
    "h-12 w-12 text-sm",
    "h-16 w-16 text-base",
    "h-10 w-10 text-xs",
  ];
  const badgeStyles = [
    "bg-zinc-400/15 text-zinc-400 border-zinc-400/30",
    "bg-amber-500/15 text-amber-500 border-amber-500/30",
    "bg-muted text-muted-foreground border-border",
  ];
  const orders = ["order-1", "order-2", "order-3"];

  if (loading) {
    return (
      <div className="flex items-end justify-center gap-4 py-6 px-4">
        {[1, 0, 2].map((i) => (
          <div
            key={i}
            className={cn("flex flex-col items-center gap-2", orders[i])}
          >
            <Skeleton
              className={cn(
                "rounded-full shrink-0",
                avatarSizes[i].split(" ").slice(0, 2).join(" "),
              )}
            />
            <Skeleton className="w-4 h-3 rounded" />
            <Skeleton className={cn("w-16 rounded-t-md", heights[i])} />
          </div>
        ))}
      </div>
    );
  }

  if (top3.length === 0) return null;

  const Icon = board.icon;

  return (
    <div className="relative overflow-hidden">
      {/* Meteors behind the podium for atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <Meteors number={8} />
      </div>

      <div className="relative flex items-end justify-center gap-4 pt-8 pb-0 px-4">
        {ordered.map((entry) => {
          const realRank = entry.rank;
          const posIdx = realRank === 2 ? 0 : realRank === 1 ? 1 : 2;

          return (
            <div
              key={entry.id}
              className={cn(
                "flex flex-col items-center gap-1.5",
                orders[posIdx],
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar
                  className={cn(
                    "border-2 shrink-0",
                    avatarSizes[posIdx],
                    badgeStyles[posIdx].split(" ").slice(2).join(" "),
                  )}
                >
                  <AvatarImage src={entry.avatarUrl ?? undefined} />
                  <AvatarFallback className="font-semibold">
                    {getInitials(entry.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -top-2 -right-2 w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center",
                    badgeStyles[posIdx],
                  )}
                >
                  {realRank}
                </span>
              </div>

              {/* Name + score */}
              <div className="text-center">
                <p
                  className={cn(
                    "font-semibold leading-tight",
                    posIdx === 1 ? "text-sm" : "text-xs",
                  )}
                >
                  {entry.displayName.length > 9
                    ? entry.displayName.slice(0, 8) + "…"
                    : entry.displayName}
                </p>
                <p
                  className={cn(
                    "flex items-center gap-0.5 justify-center font-bold",
                    board.color,
                    posIdx === 1 ? "text-sm" : "text-xs",
                  )}
                >
                  <Icon className={posIdx === 1 ? "w-3.5 h-3.5" : "w-3 h-3"} />
                  <NumberTicker
                    value={entry.score}
                    decimalPlaces={board.type === "quality" ? 1 : 0}
                    className={board.color}
                  />
                  {board.type === "quality" && "%"}
                  {board.type === "streak" && "d"}
                </p>
              </div>

              {/* Podium block */}
              <div
                className={cn(
                  "w-16 rounded-t-md border-t border-x border-border/50 bg-muted/40 flex items-start justify-center pt-1.5",
                  heights[posIdx],
                  posIdx === 1 && "border-amber-500/20 bg-amber-500/5",
                )}
              >
                <span className="text-[10px] text-muted-foreground font-medium">
                  #{realRank}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  board,
  isMe,
  index,
}: {
  entry: LeaderboardEntry;
  board: (typeof BOARDS)[0];
  isMe: boolean;
  index: number;
}) {
  const Icon = board.icon;
  const [ticked, setTicked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTicked(true), index * 30);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <BlurFade delay={index * 0.03} inView>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 transition-colors",
          isMe
            ? "bg-muted/60 border-l-2 border-l-foreground/20"
            : "hover:bg-muted/20",
          entry.rank <= 3 && !isMe && "bg-muted/10",
        )}
      >
        <div className="shrink-0">
          <RankDisplay rank={entry.rank} />
        </div>

        <Avatar className="h-8 w-8 shrink-0 border border-border">
          <AvatarImage src={entry.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(entry.displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium truncate">
              {entry.displayName}
            </span>
            {isMe && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
              >
                you
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>@{entry.username}</span>
            <span>·</span>
            <Zap className="w-2.5 h-2.5 text-foreground/50 shrink-0" />
            <span>Lv {entry.level}</span>
            {board.type === "streak" &&
              entry.meta.longestStreak != null &&
              entry.meta.longestStreak > 0 && (
                <>
                  <span>·</span>
                  <span>best {entry.meta.longestStreak}d</span>
                </>
              )}
            {board.type === "xp" &&
              entry.meta.currentStreak != null &&
              entry.meta.currentStreak > 0 && (
                <>
                  <span>·</span>
                  <Flame className="w-2.5 h-2.5 text-foreground/60 shrink-0" />
                  <span>{entry.meta.currentStreak}d</span>
                </>
              )}
            {board.type === "quality" && entry.meta.totalSubs != null && (
              <>
                <span>·</span>
                <span>
                  {entry.meta.correctSubs}/{entry.meta.totalSubs}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Animated score */}
        <div className="shrink-0 flex items-baseline gap-1">
          <span className={cn("text-sm font-bold tabular-nums", board.color)}>
            {ticked ? (
              <NumberTicker
                value={entry.score}
                decimalPlaces={board.type === "quality" ? 1 : 0}
                className={board.color}
              />
            ) : (
              "0"
            )}
          </span>
          {board.type === "quality" && (
            <span className={cn("text-xs font-semibold", board.color)}>%</span>
          )}
          {board.type === "streak" && (
            <span className={cn("text-xs font-semibold", board.color)}>d</span>
          )}
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {board.scoreLabel}
          </span>
        </div>
      </div>
    </BlurFade>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [activeType, setActiveType] = useState<BoardType>("xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [boardMeta, setBoardMeta] = useState<BoardMeta | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [myId, setMyId] = useState<number | null>(null);
  const [summary, setSummary] = useState<MySummaryEntry[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Fetch self id
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile/get-ProfileData", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.status === "success") setMyId(data.data?.id ?? null);
      } catch {}
    })();
  }, []);

  // Fetch summary (real scores + ranks on all boards)
  useEffect(() => {
    (async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch("/api/leaderboard/summary", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.status === "success") setSummary(data.data);
      } catch {
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, []);

  // Fetch board entries
  const fetchBoard = useCallback(async (type: BoardType, p: number) => {
    setBoardLoading(true);
    setEntries([]); // clear so BlurFade re-animates
    try {
      const res = await fetch(
        `/api/leaderboard?type=${type}&page=${p}&limit=50`,
        {
          credentials: "include",
        },
      );
      const data = await res.json();
      if (data.status === "success") {
        setEntries(data.data);
        setBoardMeta(data.meta);
      }
    } catch {
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchBoard(activeType, 1);
  }, [activeType, fetchBoard]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchBoard(activeType, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeBoardCfg = BOARDS.find((b) => b.type === activeType)!;
  const showPodium = page === 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
        {/* Page header */}
        <BlurFade delay={0} inView>
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-semibold tracking-tight">
                Leaderboard
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Student rankings across {BOARDS.length} categories.
            </p>
          </div>
        </BlurFade>

        {/* My stats summary — shows your ACTUAL score per category */}
        <BlurFade delay={0.05} inView>
          <MySummaryStrip
            summary={summary}
            loading={summaryLoading}
            activeType={activeType}
            onSelect={(t) => setActiveType(t)}
          />
        </BlurFade>

        {/* Board selector */}
        <BlurFade delay={0.1} inView>
          <div className="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            {BOARDS.map((board) => {
              const Icon = board.icon;
              const isActive = activeType === board.type;
              return (
                <button
                  key={board.type}
                  onClick={() => setActiveType(board.type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      isActive ? board.color : "",
                    )}
                  />
                  {board.label}
                </button>
              );
            })}
          </div>
        </BlurFade>

        {/* Board card */}
        <BlurFade delay={0.15} inView>
          <Card className="overflow-hidden">
            {/* Card header */}
            <CardHeader className="pb-0 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = activeBoardCfg.icon;
                    return (
                      <Icon
                        className={cn("w-4 h-4 shrink-0", activeBoardCfg.color)}
                      />
                    );
                  })()}
                  <CardTitle className="text-base">
                    {activeBoardCfg.label} Rankings
                  </CardTitle>
                </div>
                {boardMeta && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {boardMeta.total} students
                  </span>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                {activeBoardCfg.description}
              </CardDescription>
            </CardHeader>

            {/* Podium — page 1 only */}
            {showPodium && (
              <>
                <Podium
                  entries={entries}
                  board={activeBoardCfg}
                  loading={boardLoading}
                />
                <Separator className="mt-2" />
              </>
            )}

            {/* Rows */}
            <CardContent className="p-0">
              {boardLoading ? (
                <SkeletonRows count={showPodium ? 7 : 10} />
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/60">
                    <Trophy className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No rankings yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px] leading-relaxed">
                    {activeType === "quality"
                      ? "Students need at least 10 submissions to appear here."
                      : "Be the first to claim the top spot."}
                  </p>
                </div>
              ) : (
                <div>
                  {(showPodium ? entries.slice(3) : entries).map((entry, i) => (
                    <LeaderboardRow
                      key={`${entry.id}-${activeType}-${page}`}
                      entry={entry}
                      board={activeBoardCfg}
                      isMe={entry.id === myId}
                      index={i}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {boardMeta && boardMeta.totalPages > 1 && !boardLoading && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {boardMeta.totalPages} · {boardMeta.total}{" "}
                    students
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page >= boardMeta.totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFade>

        {activeType === "quality" && (
          <BlurFade delay={0.2} inView>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Only students with 10 or more submissions are ranked on the
              Quality board.
            </p>
          </BlurFade>
        )}

        <Separator className="my-8" />
        <p className="text-center text-[11px] text-muted-foreground">
          Vorn · built for SQL mastery
        </p>
      </main>
    </div>
  );
}
