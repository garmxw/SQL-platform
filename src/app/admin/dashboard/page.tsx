/**
 * Admin Dashboard – all components in one file.
 * When everything looks correct, cut each section into its own file
 * and import it back into the default export at the bottom.
 *
 * API base: /api/admin  (mounted from admin-dashboard-api.js)
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BookOpen,
  Code2,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Award,
  Layers,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared fetch helper
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAdminApi(path: string) {
  const res = await fetch(`/api/adminDashboard${path}`);
  if (!res.ok) throw new Error(`API error: ${path}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  newUsersLast30Days: number;
  activeUsersLast7Days: number;
  totalSubmissions: number;
  correctSubmissions: number;
  successRate: number;
  publishedTracks: number;
  publishedLessons: number;
  publishedProblems: number;
  activeBadges: number;
  certificatesIssued: number;
}

interface UserGrowthPoint {
  month: string;
  newUsers: number;
}

interface SubmissionPoint {
  month: string;
  correct: number;
  incorrect: number;
  total: number;
}

interface DifficultyPoint {
  difficulty: string;
  count: number;
}

interface TopProblem {
  id: number;
  title: string;
  difficulty: string;
  acceptanceRate: number;
  totalAttempts: number;
}

interface RecentUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  createdAt: string;
  isVerified: boolean;
  role: string;
}

interface TrackCompletion {
  id: number;
  title: string;
  difficulty: string;
  enrolled: number;
  completed: number;
  completionRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: StatCard  (KPI tile)
// ─────────────────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="bg-primary-foreground ring-1 ring-foreground/10 rounded-lg p-4 flex items-start gap-4">
      <div className="p-2 rounded-md bg-foreground/5 text-foreground/70 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{title}</p>
        <p className="text-2xl font-semibold mt-0.5">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
            <TrendingUp size={11} />
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: StatsRow  (top KPI grid)
// ─────────────────────────────────────────────────────────────────────────────
function StatsRow() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchAdminApi("/stats").then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="col-span-full grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-primary-foreground ring-1 ring-foreground/10 rounded-lg p-4 h-24"
          />
        ))}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      title: "Total Users",
      value: stats.totalUsers ?? 0,
      subtitle: `${stats.newUsersLast30Days ?? 0} joined this month`,
      icon: <Users size={18} />,
      trend: `${stats.activeUsersLast7Days ?? 0} active this week`,
    },
    {
      title: "Total Submissions",
      value: stats.totalSubmissions ?? 0,
      subtitle: `${(stats.correctSubmissions ?? 0).toLocaleString()} correct`,
      icon: <Code2 size={18} />,
      trend: `${stats.successRate ?? 0}% success rate`,
    },
    {
      title: "Published Content",
      value: (stats.publishedLessons ?? 0) + (stats.publishedProblems ?? 0),
      subtitle: `${stats.publishedTracks ?? 0} tracks · ${stats.publishedLessons ?? 0} lessons · ${stats.publishedProblems ?? 0} problems`,
      icon: <BookOpen size={18} />,
    },
    {
      title: "Certificates Issued",
      value: stats.certificatesIssued ?? 0,
      subtitle: `${stats.activeBadges ?? 0} active badges`,
      icon: <Award size={18} />,
    },
  ];

  return (
    <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} {...c} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: AppBarChart  (monthly submission activity)
// ─────────────────────────────────────────────────────────────────────────────
const submissionChartConfig = {
  correct: { label: "Correct", color: "#22c55e" },
  incorrect: { label: "Incorrect", color: "#ef4444" },
} satisfies ChartConfig;

function AppBarChart() {
  const [data, setData] = useState<SubmissionPoint[]>([]);
  const [months, setMonths] = useState("6");

  useEffect(() => {
    fetchAdminApi(`/submission-activity?months=${months}`)
      .then(setData)
      .catch(console.error);
  }, [months]);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-lg font-medium">Submission Activity</h1>
          <p className="text-xs text-muted-foreground mb-6">
            Correct vs incorrect submissions per month
          </p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="h-7 w-[100px] rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["3", "6", "12"].map((m) => (
              <SelectItem key={m} value={m}>
                {m} months
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartContainer
        config={submissionChartConfig}
        className="min-h-[200px] w-full"
      >
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(v) => v.slice(0, 3)}
          />
          <YAxis tickLine={false} tickMargin={10} axisLine={false} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <ChartLegend content={ChartLegendContent} />
          <Bar dataKey="correct" fill="var(--color-correct)" radius={4} />
          <Bar dataKey="incorrect" fill="var(--color-incorrect)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: AppAreaChart  (user growth over time)
// ─────────────────────────────────────────────────────────────────────────────
const growthChartConfig = {
  newUsers: { label: "New Users", color: "#2563eb" },
} satisfies ChartConfig;

function AppAreaChart() {
  const [data, setData] = useState<UserGrowthPoint[]>([]);
  const [months, setMonths] = useState("6");

  useEffect(() => {
    fetchAdminApi(`/user-growth?months=${months}`)
      .then(setData)
      .catch(console.error);
  }, [months]);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-lg font-medium">User Growth</h1>
          <p className="text-xs text-muted-foreground mb-6">
            New registrations per month
          </p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="h-7 w-[100px] rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["3", "6", "12"].map((m) => (
              <SelectItem key={m} value={m}>
                {m} months
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartContainer config={growthChartConfig}>
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ left: 12, right: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(v) => v.slice(0, 3)}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-newUsers)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-newUsers)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <Area
            dataKey="newUsers"
            type="natural"
            fill="url(#fillUsers)"
            fillOpacity={0.4}
            stroke="var(--color-newUsers)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: AppPieChart  (difficulty distribution)
// ─────────────────────────────────────────────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "var(--chart-1)",
  medium: "var(--chart-2)",
  hard: "var(--chart-3)",
  Unset: "var(--chart-4)",
};

function AppPieChart() {
  const id = "pie-difficulty";
  const [rawData, setRawData] = useState<DifficultyPoint[]>([]);
  const [activeDifficulty, setActiveDifficulty] = useState<string>("");

  useEffect(() => {
    fetchAdminApi("/difficulty-distribution")
      .then((d) => {
        setRawData(d);
        if (d.length > 0) setActiveDifficulty(d[0].difficulty);
      })
      .catch(console.error);
  }, []);

  const chartData = useMemo(
    () =>
      rawData.map((r) => ({
        ...r,
        fill: DIFFICULTY_COLORS[r.difficulty] ?? "var(--chart-5)",
      })),
    [rawData],
  );

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = { count: { label: "Problems" } };
    rawData.forEach((r) => {
      cfg[r.difficulty] = {
        label: r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1),
        color: DIFFICULTY_COLORS[r.difficulty] ?? "var(--chart-5)",
      };
    });
    return cfg;
  }, [rawData]);

  const activeIndex = chartData.findIndex(
    (d) => d.difficulty === activeDifficulty,
  );

  return (
    <div className="flex flex-col h-full w-full items-center justify-center">
      <div className="w-full flex flex-col items-start pb-0">
        <h1 className="mb-[10px] text-lg font-medium">Problem Difficulty</h1>
        <p className="text-xs mb-4 text-muted-foreground">
          Distribution of published problems
        </p>
      </div>

      <div className="w-full flex justify-end">
        <Select value={activeDifficulty} onValueChange={setActiveDifficulty}>
          <SelectTrigger
            className="h-7 w-[130px] rounded-lg pl-2.5 text-xs"
            aria-label="Select difficulty"
          >
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {rawData.map((r) => (
              <SelectItem
                key={r.difficulty}
                value={r.difficulty}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-xs"
                    style={{
                      backgroundColor:
                        DIFFICULTY_COLORS[r.difficulty] ?? "var(--chart-5)",
                    }}
                  />
                  {r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 w-full flex items-center justify-center">
        <ChartStyle id={id} config={chartConfig} />
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[280px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="difficulty"
              innerRadius={60}
              outerRadius={90}
              strokeWidth={2}
              onClick={(_, index) => {
                if (chartData[index])
                  setActiveDifficulty(chartData[index].difficulty);
              }}
            >
              {chartData.map((entry, index) => {
                const isActive = index === (activeIndex >= 0 ? activeIndex : 0);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={isActive ? 1 : 0.45}
                    stroke={isActive ? entry.fill : "transparent"}
                    strokeWidth={isActive ? 2 : 0}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                );
              })}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const active =
                      chartData[activeIndex >= 0 ? activeIndex : 0];
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {active?.count ?? 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          problems
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: TopProblems  (replaces "Popular Content")
// ─────────────────────────────────────────────────────────────────────────────
const difficultyBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  easy: "secondary",
  medium: "default",
  hard: "destructive",
};

function difficultyColor(d: string) {
  if (d === "easy") return "text-emerald-500";
  if (d === "hard") return "text-red-500";
  return "text-amber-500";
}

function TopProblems() {
  const [problems, setProblems] = useState<TopProblem[]>([]);

  useEffect(() => {
    fetchAdminApi("/top-problems?limit=5")
      .then(setProblems)
      .catch(console.error);
  }, []);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-lg mb-6 font-medium">Top Problems</h1>
        <div className="flex flex-col gap-2">
          {problems.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
            >
              {/* Rank */}
              <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">
                #{i + 1}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <span
                  className={`text-xs font-medium ${difficultyColor(p.difficulty ?? "")}`}
                >
                  {p.difficulty ?? "—"}
                </span>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  {p.totalAttempts.toLocaleString()}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    tries
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.acceptanceRate}% AC
                </p>
              </div>
            </div>
          ))}

          {problems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: RecentUsers  (replaces "Recent Transactions")
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RecentUsers() {
  const [users, setUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    fetchAdminApi("/recent-users?limit=5").then(setUsers).catch(console.error);
  }, []);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-lg mb-6 font-medium">Recent Users</h1>
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full relative overflow-hidden shrink-0 bg-foreground/10">
                {u.avatarUrl ? (
                  <Image
                    src={u.avatarUrl}
                    alt={u.displayName}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center h-full text-sm font-semibold text-muted-foreground">
                    {u.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  @{u.username}
                </p>
              </div>

              {/* Right */}
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-[10px] mb-1">
                  Lv {u.level}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(u.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: TrackCompletionChart  (replaces TodoList)
// ─────────────────────────────────────────────────────────────────────────────
function TrackCompletionList() {
  const [tracks, setTracks] = useState<TrackCompletion[]>([]);

  useEffect(() => {
    fetchAdminApi("/track-completion").then(setTracks).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-lg mb-2 font-medium">Track Completion</h1>
      <p className="text-xs text-muted-foreground mb-5">
        Enrolled vs completed per track
      </p>

      <ScrollArea className="max-h-[380px] overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium truncate max-w-[70%]">
                  {t.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t.completionRate}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-foreground/10">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${t.completionRate}%` }}
                />
              </div>

              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {t.enrolled.toLocaleString()} enrolled
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t.completed.toLocaleString()} completed
                </span>
              </div>
            </div>
          ))}

          {tracks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tracks yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — Dashboard page
// When you split files, import each component from its own file here.
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
      {/* ── KPI Cards — full width ── */}
      <StatsRow />

      {/* ── Submission Bar Chart — 2 cols ── */}
      <div className="bg-primary-foreground p-4 rounded-lg lg:col-span-2 ring-1 ring-foreground/10">
        <AppBarChart />
      </div>

      {/* ── Recent Users ── */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <RecentUsers />
      </div>

      {/* ── Difficulty Pie Chart ── */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <AppPieChart />
      </div>

      {/* ── Track Completion List ── */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <TrackCompletionList />
      </div>

      {/* ── User Growth Area Chart — 2 cols ── */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg lg:col-span-2">
        <AppAreaChart />
      </div>

      {/* ── Top Problems ── */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <TopProblems />
      </div>
    </div>
  );
}

export default Dashboard;

/**
 * ─── HOW TO SPLIT INTO SEPARATE FILES ──────────────────────────────────────
 *
 * 1. Cut each "Component: Xxx" section into its own file, e.g.
 *      app/components/StatCard.tsx
 *      app/components/StatsRow.tsx
 *      app/components/AppBarChart.tsx
 *      app/components/AppAreaChart.tsx
 *      app/components/AppPieChart.tsx
 *      app/components/TopProblems.tsx
 *      app/components/RecentUsers.tsx
 *      app/components/TrackCompletionList.tsx
 *
 * 2. Keep the shared Types and fetchAdminApi helper in:
 *      lib/admin-api.ts
 *
 * 3. In the Dashboard page file, replace the inline components with imports:
 *      import StatsRow          from "@/components/StatsRow";
 *      import AppBarChart       from "@/components/AppBarChart";
 *      ...etc
 */
