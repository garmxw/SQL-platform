"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── shadcn/ui ─────────────────────────────────────────────────────────────────
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── magic ui ──────────────────────────────────────────────────────────────────
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedList } from "@/components/ui/animated-list";
import { BorderBeam } from "@/components/ui/border-beam";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Meteors } from "@/components/ui/meteors";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { Marquee } from "@/components/ui/marquee";
import { BlurFade } from "@/components/ui/blur-fade";
import { PulsatingButton } from "@/components/ui/pulsating-button";

// ── icons ─────────────────────────────────────────────────────────────────────
import {
  Flame,
  Trophy,
  Zap,
  BookOpen,
  Code2,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  Play,
  BarChart2,
  Target,
  Sparkles,
  Medal,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DotPattern — shared background component
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Fetch helper
// ─────────────────────────────────────────────────────────────────────────────
async function fetchHome(path: string) {
  const res = await fetch(`/api/home${path}`);
  if (!res.ok) throw new Error(`Home API error: ${path}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Me {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  bio: string | null;
  location: string | null;
  totalSolved: number;
  totalBadges: number;
  totalCerts: number;
}
interface ContinueData {
  track: {
    id: number;
    title: string;
    difficulty: string;
    coverImageUrl: string | null;
    completedProblems: number;
    totalProblems: number;
    progressPct: number;
  } | null;
  lesson: {
    id: number;
    title: string;
    lesson_order: number;
    xp_reward: number;
  } | null;
  problem: {
    id: number;
    title: string;
    difficulty: string;
    xp_reward: number;
  } | null;
}
interface Stats {
  totalSolved: number;
  totalAttempts: number;
  correctRate: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  level: number;
  certificates: number;
  weeklyXp: number;
}
interface ActivityDay {
  day: string;
  submissions: number;
  correct: number;
}
interface Badge_ {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  rarity: string;
  xpReward: number;
  earnedAt: string;
}
interface ContentItem {
  type: "lesson" | "problem";
  id: number;
  title: string;
  difficulty?: string;
  xpReward: number;
  createdAt: string;
  trackTitle?: string;
  acceptanceRate?: number | null;
}
interface RecommendedProblem {
  id: number;
  title: string;
  difficulty: string;
  xpReward: number;
  acceptanceRate: number | null;
}
interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  isMe: boolean;
}
interface LeaderboardData {
  top: LeaderboardEntry[];
  myRank: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function difficultyColor(d?: string) {
  if (!d) return "text-muted-foreground";
  if (d === "easy" || d === "beginner") return "text-emerald-500";
  if (d === "hard") return "text-destructive";
  return "text-amber-500";
}

function difficultyBadgeVariant(
  d?: string,
): "secondary" | "destructive" | "outline" | "default" {
  if (d === "easy" || d === "beginner") return "secondary";
  if (d === "hard") return "destructive";
  return "default";
}

function rarityColor(r?: string) {
  if (r === "legendary") return "text-yellow-500";
  if (r === "epic") return "text-purple-500";
  if (r === "rare") return "text-blue-500";
  return "text-muted-foreground";
}

const RANK_ICONS = [
  <Medal size={15} className="text-yellow-500" />,
  <Medal size={15} className="text-slate-400" />,
  <Medal size={15} className="text-amber-700" />,
];

// ─────────────────────────────────────────────────────────────────────────────
// Component: HeroGreeting
// ─────────────────────────────────────────────────────────────────────────────
function HeroGreeting() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetchHome("/me").then(setMe).catch(console.error);
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!me) {
    return (
      <div className="relative col-span-full rounded-xl border bg-card overflow-hidden h-44 animate-pulse" />
    );
  }

  return (
    <div className="relative col-span-full rounded-xl border bg-card overflow-hidden p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <Meteors number={18} />
      <BorderBeam size={220} duration={10} />

      <Avatar className="w-16 h-16 ring-2 ring-primary/30 shrink-0">
        <AvatarImage src={me.avatarUrl ?? undefined} alt={me.displayName} />
        <AvatarFallback className="text-xl font-bold">
          {me.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 z-10">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold tracking-tight truncate">
          {me.displayName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Badge variant="secondary" className="gap-1">
            <Zap size={11} /> Level {me.level}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Flame size={11} className="text-orange-500" />
            {me.currentStreak} day streak
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Trophy size={11} className="text-yellow-500" />
            {me.xp.toLocaleString()} XP
          </Badge>
        </div>
      </div>

      <div className="flex flex-col sm:items-end gap-2 z-10 shrink-0">
        <div className="flex gap-4 text-center">
          {[
            { label: "Solved", value: me.totalSolved },
            { label: "Badges", value: me.totalBadges },
            { label: "Certs", value: me.totalCerts },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <Link href="/tracks">
          <ShimmerButton className="h-8 px-4 text-xs rounded-lg">
            Browse Tracks <ArrowRight size={12} className="ml-1" />
          </ShimmerButton>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ContinueLearning
// ─────────────────────────────────────────────────────────────────────────────
function ContinueLearning() {
  const [data, setData] = useState<ContinueData | null>(null);

  useEffect(() => {
    fetchHome("/continue").then(setData).catch(console.error);
  }, []);

  if (!data)
    return <div className="rounded-xl border bg-card p-5 h-52 animate-pulse" />;

  if (!data.track) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Play size={15} /> Start Learning
          </CardTitle>
          <CardDescription>You haven't started any track yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/tracks">
            <PulsatingButton className="w-full text-sm h-9">
              Explore Tracks
            </PulsatingButton>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { track, lesson, problem } = data;

  return (
    <Card className="relative overflow-hidden">
      <BorderBeam
        size={150}
        duration={14}
        colorFrom="var(--chart-1)"
        colorTo="var(--chart-3)"
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <Play size={10} /> Continue Learning
            </p>
            <CardTitle className="text-base leading-tight truncate">
              {track.title}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[11px] ${difficultyColor(track.difficulty)}`}
          >
            {track.difficulty}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              {track.completedProblems} / {track.totalProblems} problems
            </span>
            <span>{track.progressPct}%</span>
          </div>
          <Progress value={track.progressPct} className="h-2" />
        </div>

        <Separator />

        <div className="space-y-2">
          {lesson && (
            <Link
              href={`/lessons/${lesson.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 hover:bg-foreground/5 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen size={13} className="text-chart-1 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {lesson.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-[10px]">
                  +{lesson.xp_reward} XP
                </Badge>
                <ArrowRight
                  size={12}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>
          )}

          {problem && (
            <Link
              href={`/problems/${problem.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 hover:bg-foreground/5 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Code2 size={13} className="text-chart-2 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {problem.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[11px] font-medium ${difficultyColor(problem.difficulty)}`}
                >
                  {problem.difficulty}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  +{problem.xp_reward} XP
                </Badge>
                <ArrowRight
                  size={12}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: StatsStrip
// ─────────────────────────────────────────────────────────────────────────────
function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchHome("/stats").then(setStats).catch(console.error);
  }, []);

  const tiles = stats
    ? [
        {
          label: "Problems Solved",
          value: stats.totalSolved,
          icon: <CheckCircle2 size={16} className="text-emerald-500" />,
        },
        {
          label: "Success Rate",
          value: stats.correctRate,
          icon: <Target size={16} className="text-chart-1" />,
          suffix: "%",
        },
        {
          label: "Day Streak",
          value: stats.currentStreak,
          icon: <Flame size={16} className="text-orange-500" />,
        },
        {
          label: "XP This Week",
          value: stats.weeklyXp,
          icon: <Zap size={16} className="text-yellow-500" />,
        },
      ]
    : null;

  return (
    <div className="col-span-full grid grid-cols-2 xl:grid-cols-4 gap-3">
      {tiles
        ? tiles.map((t, i) => (
            <BlurFade key={t.label} delay={0.08 * i} inView>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      {t.label}
                    </p>
                    <p className="text-2xl font-bold">
                      <NumberTicker value={t.value} />
                      {t.suffix ?? ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </BlurFade>
          ))
        : Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card h-20 animate-pulse"
            />
          ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ActivityHeatmap
// ─────────────────────────────────────────────────────────────────────────────
function ActivityHeatmap() {
  const [days, setDays] = useState<ActivityDay[]>([]);

  useEffect(() => {
    fetchHome("/activity?days=30").then(setDays).catch(console.error);
  }, []);

  function cellColor(d: ActivityDay) {
    if (d.submissions === 0) return "bg-muted";
    if (d.correct === 0) return "bg-destructive/20";
    const ratio = d.correct / d.submissions;
    if (ratio >= 0.8) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-emerald-500/60";
    return "bg-emerald-500/30";
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart2 size={15} /> 30-Day Activity
        </CardTitle>
        <CardDescription>Your daily submission heatmap</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1">
            {days.map((d) => (
              <Tooltip key={d.day}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-4 h-4 rounded-sm cursor-default transition-opacity hover:opacity-80 ${cellColor(d)}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">
                    {new Date(d.day).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.submissions} submission{d.submissions !== 1 ? "s" : ""} ·{" "}
                    {d.correct} correct
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {days.length === 0 && (
              <div className="flex flex-wrap gap-1 animate-pulse">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-4 h-4 rounded-sm bg-muted" />
                ))}
              </div>
            )}
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-[11px] text-muted-foreground">Less</span>
          {[
            "bg-muted",
            "bg-emerald-500/30",
            "bg-emerald-500/60",
            "bg-emerald-500",
          ].map((c) => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[11px] text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: RecentBadges
// ─────────────────────────────────────────────────────────────────────────────
function RecentBadges() {
  const [badges, setBadges] = useState<Badge_[]>([]);

  useEffect(() => {
    fetchHome("/recent-badges?limit=5").then(setBadges).catch(console.error);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award size={15} /> Recent Badges
        </CardTitle>
        <CardDescription>Your latest achievements</CardDescription>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
            <Award size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No badges earned yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Solve problems to unlock your first badge!
            </p>
          </div>
        ) : (
          <AnimatedList delay={600}>
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2"
              >
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {b.iconUrl ? (
                    <img
                      src={b.iconUrl}
                      alt={b.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Award size={18} className={rarityColor(b.rarity)} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {b.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-[11px] font-medium capitalize ${rarityColor(b.rarity)}`}
                  >
                    {b.rarity}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    +{b.xpReward} XP
                  </p>
                </div>
              </div>
            ))}
          </AnimatedList>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: NewContent
// ─────────────────────────────────────────────────────────────────────────────
function NewContent() {
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetchHome("/new-content?limit=8").then(setItems).catch(console.error);
  }, []);

  return (
    <Card className="col-span-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles size={15} /> What's New
        </CardTitle>
        <CardDescription>
          Recently published lessons and problems
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        {items.length === 0 ? (
          <div className="px-6 h-20 animate-pulse rounded-lg bg-muted mx-6" />
        ) : (
          <Marquee pauseOnHover className="[--duration:35s]">
            {items.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={
                  item.type === "lesson"
                    ? `/lessons/${item.id}`
                    : `/problems/${item.id}`
                }
                className="mx-2 shrink-0"
              >
                <div className="w-56 rounded-xl border border-foreground/10 bg-card hover:bg-muted/40 transition-colors p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={item.type === "lesson" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {item.type === "lesson" ? (
                        <BookOpen size={9} className="mr-1" />
                      ) : (
                        <Code2 size={9} className="mr-1" />
                      )}
                      {item.type}
                    </Badge>
                    {item.difficulty && (
                      <span
                        className={`text-[11px] font-medium ${difficultyColor(item.difficulty)}`}
                      >
                        {item.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      +{item.xpReward} XP
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </Marquee>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: RecommendedProblems
// ─────────────────────────────────────────────────────────────────────────────
function RecommendedProblems() {
  const [problems, setProblems] = useState<RecommendedProblem[]>([]);

  useEffect(() => {
    fetchHome("/recommended-problems?limit=4")
      .then(setProblems)
      .catch(console.error);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target size={15} /> Recommended Problems
        </CardTitle>
        <CardDescription>Handpicked for your current level</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {problems.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))
          : problems.map((p) => (
              <Link
                key={p.id}
                href={`/problems/${p.id}`}
                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 hover:bg-foreground/5 transition-colors group"
              >
                <Code2 size={13} className="text-muted-foreground shrink-0" />
                <p className="text-xs font-medium flex-1 truncate">{p.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-medium ${difficultyColor(p.difficulty)}`}
                  >
                    {p.difficulty}
                  </span>
                  {p.acceptanceRate != null && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {p.acceptanceRate}% AC
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    +{p.xpReward} XP
                  </Badge>
                  <ArrowRight
                    size={11}
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
              </Link>
            ))}
        <div className="pt-1">
          <Link href="/problems">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
            >
              All Problems <ArrowRight size={11} />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: LeaderboardPeek
// ─────────────────────────────────────────────────────────────────────────────
function LeaderboardPeek() {
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    fetchHome("/leaderboard-peek?limit=5").then(setData).catch(console.error);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={15} /> Leaderboard
            </CardTitle>
            <CardDescription>Top students by XP</CardDescription>
          </div>
          {data?.myRank && (
            <Badge variant="outline" className="gap-1 text-xs shrink-0">
              <Star size={10} /> Your rank: #{data.myRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {!data
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
            ))
          : data.top.map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  u.isMe
                    ? "bg-primary/10 border border-primary/20"
                    : "border border-transparent hover:bg-muted/40"
                }`}
              >
                <span className="w-5 shrink-0 flex items-center justify-center">
                  {i < 3 ? (
                    RANK_ICONS[i]
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      #{i + 1}
                    </span>
                  )}
                </span>
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage
                    src={u.avatarUrl ?? undefined}
                    alt={u.displayName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {u.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {u.displayName}
                    {u.isMe && (
                      <span className="ml-1 text-[10px] text-primary">
                        (you)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">
                    {u.xp.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
              </div>
            ))}
        <div className="pt-2">
          <Link href="/leaderboard">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
            >
              Full Leaderboard <ArrowRight size={11} />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: QuickLinks
// ─────────────────────────────────────────────────────────────────────────────
const LINKS = [
  {
    href: "/tracks",
    label: "Tracks",
    desc: "Browse all learning tracks",
    icon: <BookOpen size={18} />,
    color: "text-chart-1",
  },
  {
    href: "/problems",
    label: "Problems",
    desc: "Practice SQL challenges",
    icon: <Code2 size={18} />,
    color: "text-chart-2",
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    desc: "See where you rank",
    icon: <Trophy size={18} />,
    color: "text-yellow-500",
  },
  {
    href: "/profile",
    label: "Profile",
    desc: "Your stats & achievements",
    icon: <Star size={18} />,
    color: "text-chart-4",
  },
];

function QuickLinks() {
  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Navigation</CardTitle>
        <CardDescription>Jump to any section of the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LINKS.map((l, i) => (
            <BlurFade key={l.href} delay={0.06 * i} inView>
              <Link href={l.href}>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 hover:bg-muted/40 transition-colors text-center cursor-pointer group">
                  <div
                    className={`${l.color} group-hover:scale-110 transition-transform`}
                  >
                    {l.icon}
                  </div>
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {l.desc}
                  </p>
                </div>
              </Link>
            </BlurFade>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — Home Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Dot pattern background — fixed so it covers the full viewport on scroll */}
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

      {/* All content sits above the dot layer */}
      <div className="relative z-10 pt-16 pb-8 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="col-span-full">
          <HeroGreeting />
        </div>

        {/* Row 2 */}
        <StatsStrip />

        {/* Row 3 */}
        <div className="col-span-full">
          <NewContent />
        </div>

        {/* Row 4 */}
        <div className="lg:col-span-1 2xl:col-span-1">
          <ContinueLearning />
        </div>
        <div className="lg:col-span-1 2xl:col-span-2">
          <ActivityHeatmap />
        </div>
        <div className="lg:col-span-1 2xl:col-span-1 lg:col-start-2 2xl:col-start-auto">
          <RecentBadges />
        </div>

        {/* Row 5 */}
        <div className="lg:col-span-1 2xl:col-span-2">
          <RecommendedProblems />
        </div>
        <div className="lg:col-span-1 2xl:col-span-2">
          <LeaderboardPeek />
        </div>

        {/* Row 6 */}
        <div className="col-span-full">
          <QuickLinks />
        </div>

        {/* Vorn wordmark footer — identical to tracks page */}
        <div className="col-span-full mt-28 mb-4 flex flex-col items-center gap-4 select-none">
          <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-9xl leading-none font-semibold text-transparent dark:from-white dark:to-slate-900/10">
            Vorn
          </span>
          <p className="pl-2 text-sm text-muted-foreground uppercase tracking-wide">
            built for SQL mastery
          </p>
        </div>
      </div>
    </div>
  );
}
