"use client";

import React, { useState, useEffect, useMemo } from "react";

//  recharts
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

//  shadcn chart
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  type ChartConfig,
} from "@/components/ui/chart";

//  shadcn ui ─
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

//  icons ─
import {
  Users,
  BookOpen,
  Code2,
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Flame,
  Star,
  ShieldCheck,
  Medal,
} from "lucide-react";

// ─
// Fetch helper
// ─
async function fetchAdmin(path: string) {
  const res = await fetch(`/api/adminDashboard${path}`);
  if (!res.ok) throw new Error(`API error: ${path}`);
  return res.json();
}

async function fetchLeaderboard(path: string) {
  const res = await fetch(`/api/leaderboard${path}`);
  if (!res.ok) throw new Error(`Leaderboard API error: ${path}`);
  return res.json();
}

// ─
// Types
// ─
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
interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  score: number;
  meta: Record<string, unknown>;
}

// ─
// helpers
// ─
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function difficultyColor(d: string) {
  if (!d) return "text-muted-foreground";
  if (d === "easy" || d === "beginner") return "text-emerald-500";
  if (d === "hard") return "text-destructive";
  return "text-amber-500";
}

const RANK_ICONS = [
  <Medal size={16} className="text-yellow-500" />,
  <Medal size={16} className="text-slate-400" />,
  <Medal size={16} className="text-amber-700" />,
];

// ─
// Component: StatsRow — 4 KPI cards  (UNCHANGED from doc 2, layout only fixed)
// ─
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-2 rounded-md bg-muted text-muted-foreground shrink-0">
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
              <TrendingUp size={11} /> {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsRow() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchAdmin("/stats").then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="col-span-full grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 h-24 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      title: "Total Users",
      value: stats.totalUsers ?? 0,
      subtitle: `+${stats.newUsersLast30Days ?? 0} this month`,
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
    <div className="col-span-full grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <StatCard key={c.title} {...c} />
      ))}
    </div>
  );
}

// ─
// Component: AppBarChart — UNCHANGED from doc 2
// ─
const submissionChartConfig = {
  correct: { label: "Correct", color: "var(--chart-1)" },
  incorrect: { label: "Incorrect", color: "var(--chart-2)" },
} satisfies ChartConfig;

function AppBarChart() {
  const [data, setData] = useState<SubmissionPoint[]>([]);
  const [months, setMonths] = useState("6");

  useEffect(() => {
    fetchAdmin(`/submission-activity?months=${months}`)
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

      {/* manual legend — avoids ChartLegendContent ref crash */}
      <div className="flex items-center gap-4 mb-3">
        {Object.entries(submissionChartConfig).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: v.color }}
            />
            <span className="text-xs text-muted-foreground">{v.label}</span>
          </div>
        ))}
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
          <Bar dataKey="correct" fill="var(--color-correct)" radius={4} />
          <Bar dataKey="incorrect" fill="var(--color-incorrect)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// ─
// Component: AppAreaChart — cumulative + new users per month
// ─
const growthChartConfig = {
  cumulativeUsers: { label: "Total Users", color: "var(--chart-1)" },
  newUsers: { label: "New This Month", color: "var(--chart-2)" },
} satisfies ChartConfig;

function AppAreaChart() {
  const [data, setData] = useState<
    (UserGrowthPoint & { cumulativeUsers: number })[]
  >([]);
  const [months, setMonths] = useState("6");

  useEffect(() => {
    fetchAdmin(`/user-growth?months=${months}`)
      .then(setData)
      .catch(console.error);
  }, [months]);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-lg font-medium">User Growth</h1>
          <p className="text-xs text-muted-foreground mb-6">
            Total users &amp; new registrations per month
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
            <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-cumulativeUsers)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-cumulativeUsers)"
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-newUsers)"
                stopOpacity={0.6}
              />
              <stop
                offset="95%"
                stopColor="var(--color-newUsers)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <Area
            dataKey="cumulativeUsers"
            type="monotoneX"
            fill="url(#fillCumulative)"
            fillOpacity={0.4}
            stroke="var(--color-cumulativeUsers)"
            stackId="a"
          />
          <Area
            dataKey="newUsers"
            type="monotoneX"
            fill="url(#fillNew)"
            fillOpacity={0.4}
            stroke="var(--color-newUsers)"
            stackId="b"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

// ─
// Component: AppPieChart — UNCHANGED from doc 2
// ─
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "var(--chart-1)",
  medium: "var(--chart-2)",
  hard: "var(--chart-3)",
  Unset: "var(--chart-4)",
};

function AppPieChart() {
  const id = "pie-difficulty";
  const [rawData, setRawData] = useState<DifficultyPoint[]>([]);
  const [activeDifficulty, setActive] = useState<string>("");

  useEffect(() => {
    fetchAdmin("/difficulty-distribution")
      .then((d: DifficultyPoint[]) => {
        setRawData(d);
        if (d.length > 0) setActive(d[0].difficulty);
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
        <Select value={activeDifficulty} onValueChange={setActive}>
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
                if (chartData[index]) setActive(chartData[index].difficulty);
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

// ─
// Component: TopProblems — UNCHANGED from doc 2
// ─
function TopProblems() {
  const [problems, setProblems] = useState<TopProblem[]>([]);

  useEffect(() => {
    fetchAdmin("/top-problems?limit=5").then(setProblems).catch(console.error);
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
              <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <span
                  className={`text-xs font-medium ${difficultyColor(p.difficulty ?? "")}`}
                >
                  {p.difficulty ?? "—"}
                </span>
              </div>
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

// ─
// Component: RecentUsers — UNCHANGED from doc 2
// ─
function RecentUsers() {
  const [users, setUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    fetchAdmin("/recent-users?limit=5").then(setUsers).catch(console.error);
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
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage
                  src={u.avatarUrl ?? undefined}
                  alt={u.displayName}
                />
                <AvatarFallback>
                  {u.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  @{u.username}
                </p>
              </div>
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

// ─
// Component: TrackCompletionList — UNCHANGED from doc 2
// ─
function TrackCompletionList() {
  const [tracks, setTracks] = useState<TrackCompletion[]>([]);

  useEffect(() => {
    fetchAdmin("/track-completion").then(setTracks).catch(console.error);
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
              <Progress value={t.completionRate} className="h-1.5" />
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

// ─
// Component: Leaderboard — NEW
// Uses /api/leaderboard?type=xp|solved|streak|quality|badges (doc 3 API)
// Tabs map to the 5 board types. Table built with shadcn Table.
// ─
const BOARD_TABS = [
  { type: "xp", label: "XP", icon: <Star size={13} /> },
  { type: "solved", label: "Solved", icon: <CheckCircle2 size={13} /> },
  { type: "streak", label: "Streak", icon: <Flame size={13} /> },
  { type: "quality", label: "Quality", icon: <ShieldCheck size={13} /> },
  { type: "badges", label: "Badges", icon: <Trophy size={13} /> },
] as const;

type BoardType = (typeof BOARD_TABS)[number]["type"];

const SCORE_SUFFIX: Record<BoardType, string> = {
  xp: "XP",
  solved: "solved",
  streak: "days",
  quality: "%",
  badges: "badges",
};

function Leaderboard() {
  const [activeTab, setActiveTab] = useState<BoardType>("xp");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(`?type=${activeTab}&limit=10`)
      .then((res) => setData(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium">Leaderboard</h1>
          <p className="text-xs text-muted-foreground">
            Top students across all categories
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BoardType)}
      >
        <TabsList className="mb-4">
          {BOARD_TABS.map((t) => (
            <TabsTrigger
              key={t.type}
              value={t.type}
              className="flex items-center gap-1.5 text-xs"
            >
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {BOARD_TABS.map((t) => (
          <TabsContent key={t.type} value={t.type}>
            {loading ? (
              <div className="flex flex-col gap-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Level</TableHead>
                    <TableHead className="text-right">{t.label}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u, i) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {i === 0 ? (
                          <span className="flex items-center">
                            {RANK_ICONS[0]}
                          </span>
                        ) : i === 1 ? (
                          <span className="flex items-center">
                            {RANK_ICONS[1]}
                          </span>
                        ) : i === 2 ? (
                          <span className="flex items-center">
                            {RANK_ICONS[2]}
                          </span>
                        ) : (
                          <span className="text-xs">#{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarImage
                              src={u.avatarUrl ?? undefined}
                              alt={u.displayName}
                            />
                            <AvatarFallback className="text-[10px]">
                              {u.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {u.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">Lv {u.level}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {typeof u.score === "number"
                          ? t.type === "quality"
                            ? `${u.score}%`
                            : `${u.score.toLocaleString()} ${SCORE_SUFFIX[t.type]}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─
// Component: PlatformHealth — NEW
// Quick-glance submission health stats. Uses /stats (already fetched elsewhere
// but kept self-contained so it can be split into its own file).
// ─
function PlatformHealth() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchAdmin("/stats").then(setStats).catch(console.error);
  }, []);

  const items = [
    {
      label: "Correct",
      value: stats ? (stats.correctSubmissions ?? 0).toLocaleString() : "—",
      icon: <CheckCircle2 size={15} className="text-emerald-500" />,
    },
    {
      label: "Incorrect",
      value: stats
        ? (
            (stats.totalSubmissions ?? 0) - (stats.correctSubmissions ?? 0)
          ).toLocaleString()
        : "—",
      icon: <XCircle size={15} className="text-destructive" />,
    },
    {
      label: "Active (7d)",
      value: stats ? (stats.activeUsersLast7Days ?? 0).toLocaleString() : "—",
      icon: <Clock size={15} className="text-chart-1" />,
    },
    {
      label: "New (30d)",
      value: stats ? (stats.newUsersLast30Days ?? 0).toLocaleString() : "—",
      icon: <Users size={15} className="text-chart-2" />,
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-medium">Platform Health</h1>
      <p className="text-xs text-muted-foreground mb-5">
        Submission & activity snapshot
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-4 py-3 flex items-center gap-3"
          >
            <div className="shrink-0">{item.icon}</div>
            <div className="min-w-0">
              <p className="text-xl font-semibold">{item.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─
// Component: ExamStats — NEW
// Shows latest exam submissions: pass rate, avg score, cert eligible count.
// Uses /track-completion as proxy (tracks that have exams show pass data).
// ─
interface ExamRow {
  id: number;
  title: string;
  difficulty: string;
  enrolled: number;
  completed: number;
  completionRate: number;
}

function ExamStats() {
  const [tracks, setTracks] = useState<ExamRow[]>([]);

  useEffect(() => {
    fetchAdmin("/track-completion").then(setTracks).catch(console.error);
  }, []);

  const total = tracks.reduce((s, t) => s + t.enrolled, 0);
  const completed = tracks.reduce((s, t) => s + t.completed, 0);
  const avgRate =
    tracks.length > 0
      ? Math.round(
          tracks.reduce((s, t) => s + t.completionRate, 0) / tracks.length,
        )
      : 0;

  return (
    <div>
      <h1 className="text-lg font-medium">Exam Overview</h1>
      <p className="text-xs text-muted-foreground mb-5">
        Completion across all tracks
      </p>

      {/* summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Enrolled", value: total.toLocaleString() },
          { label: "Completed", value: completed.toLocaleString() },
          { label: "Avg Rate", value: `${avgRate}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-center"
          >
            <p className="text-lg font-semibold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Separator className="mb-4" />

      <ScrollArea className="max-h-[240px] overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          {tracks.slice(0, 8).map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground truncate flex-1">
                {t.title}
              </p>
              <span
                className={`text-[11px] font-medium shrink-0 ${difficultyColor(t.difficulty)}`}
              >
                {t.difficulty}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Progress value={t.completionRate} className="h-1.5 w-20" />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {t.completionRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─
// Dashboard — grid layout
//
// 4-col grid (2xl). Every row sums to exactly 4 cols → no voids.
//
// Row 1:  StatsRow          [4 cols — col-span-full]
// Row 2:  AppBarChart [2] + RecentUsers [1] + AppPieChart [1]
// Row 3:  TrackCompletion[1] + AppAreaChart [2] + TopProblems [1]
// Row 4:  PlatformHealth [1] + ExamStats [1] + Leaderboard [2]
//
// pt-[var(--navbar-height)] fixes the navbar overlap.
// If your navbar is a fixed <header> with h-16 (64px), set --navbar-height
// in your globals.css, or just change pt-16 to match your actual height.
// ─
function Dashboard() {
  return (
    <div className="pt-16 pb-6 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
      {/* Row 1 — KPI cards */}
      <StatsRow />

      {/* Row 2 */}
      <div className="bg-primary-foreground p-4 rounded-lg lg:col-span-2 ring-1 ring-foreground/10">
        <AppBarChart />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <RecentUsers />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <AppPieChart />
      </div>

      {/* Row 3 */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <TrackCompletionList />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg lg:col-span-2">
        <AppAreaChart />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <TopProblems />
      </div>

      {/* Row 4 */}
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <PlatformHealth />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg">
        <ExamStats />
      </div>
      <div className="bg-primary-foreground ring-1 ring-foreground/10 p-4 rounded-lg lg:col-span-2">
        <Leaderboard />
      </div>
    </div>
  );
}

export default Dashboard;

/**
 * ─ HOW TO SPLIT INTO SEPARATE FILES
 *
 * Each component section → its own file under components/admin/:
 *   StatCard.tsx · StatsRow.tsx · AppBarChart.tsx · AppAreaChart.tsx
 *   AppPieChart.tsx · TopProblems.tsx · RecentUsers.tsx
 *   TrackCompletionList.tsx · Leaderboard.tsx
 *   PlatformHealth.tsx · ExamStats.tsx
 *
 * Shared types + fetch helpers → lib/admin-api.ts
 */
