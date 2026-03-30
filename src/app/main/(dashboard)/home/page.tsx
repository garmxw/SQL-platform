"use client";

import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarAngleAxis,
  RadarChart,
  Radar,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Trophy,
  BarChart3,
  Star,
  Lock,
  Zap,
  Target,
  TrendingUp,
  Settings,
  Upload,
  Github,
  Globe,
  Twitter,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Heatmap
function generateHeatmapData() {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const rand = Math.random();
    let count = 0;
    if (rand > 0.55) count = Math.floor(Math.random() * 3) + 1;
    if (rand > 0.75) count = Math.floor(Math.random() * 4) + 3;
    if (rand > 0.9) count = Math.floor(Math.random() * 4) + 6;
    data.push({ date: dateStr, count });
  }
  return data;
}

function getIntensity(count: number) {
  if (count === 0) return "bg-muted"; // or this bg-[var(--color-heatmap-0)]
  if (count <= 2) return "bg-[var(--color-heatmap-1)]";
  if (count <= 5) return "bg-[var(--color-heatmap-2)]";
  if (count <= 8) return "bg-[var(--color-heatmap-3)]";
  return "bg-[var(--color-heatmap-4)]";
}

function SubmissionHeatmap() {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setData(generateHeatmapData());
    setMounted(true);
  }, []);

  const totalSolved = data.reduce((s, d) => s + (d.count > 0 ? 1 : 0), 0);

  if (!mounted) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submission Activity</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Loading activity…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const weeks: { date: string; count: number }[][] = [];
  let week: { date: string; count: number }[] = [];
  const firstDay = new Date(data[0].date).getDay();
  for (let p = 0; p < firstDay; p++) week.push({ date: "", count: -1 });
  data.forEach((d) => {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length > 0) weeks.push(week);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const first = w.find((d) => d.date);
    if (first?.date) {
      const m = new Date(first.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: months[m], col: wi });
        lastMonth = m;
      }
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Submission Activity</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {totalSolved} active days in the past year
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            {[
              "bg-muted",
              "bg-[var(--color-heatmap-1)]",
              "bg-[var(--color-heatmap-2)]",
              "bg-[var(--color-heatmap-3)]",
              "bg-[var(--color-heatmap-4)]",
            ].map((cls) => (
              <span
                key={cls}
                className={`w-3 h-3 rounded-sm inline-block ${cls} border border-border/40`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-max">
            <div className="flex mb-1 ml-7">
              {weeks.map((_, wi) => {
                const lbl = monthLabels.find((m) => m.col === wi);
                return (
                  <div
                    key={wi}
                    className="w-4 mr-0.5 text-[10px] text-muted-foreground"
                  >
                    {lbl ? lbl.label : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0.5">
              <div className="flex flex-col gap-0.5 mr-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 text-[10px] text-muted-foreground flex items-center justify-center"
                  >
                    {i % 2 === 1 ? d : ""}
                  </div>
                ))}
              </div>
              {weeks.map((w, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {w.map((day, di) => {
                    if (day.count === -1)
                      return <div key={di} className="w-4 h-4" />;
                    return (
                      <TooltipProvider key={di} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-4 h-4 rounded-sm cursor-default transition-opacity hover:opacity-80 border border-border/20 ${getIntensity(day.count)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {day.count === 0
                              ? `No submissions on ${day.date}`
                              : `${day.count} submission${day.count > 1 ? "s" : ""} on ${day.date}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Radial Chart — Grid
const radialData = [
  { name: "Hard", value: 33, fill: "var(--chart-1)" },
  { name: "Medium", value: 63, fill: "var(--chart-2)" },
  { name: "Easy", value: 88, fill: "var(--chart-3)" },
];
const radialConfig = {
  Hard: { label: "Hard" },
  Medium: { label: "Medium" },
  Easy: { label: "Easy" },
} satisfies ChartConfig;

function SolvedRadialChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Solved by Difficulty</CardTitle>
        <CardDescription className="text-xs">
          Completion rate per tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={radialConfig} className="mx-auto h-[220px]">
          <RadialBarChart
            data={radialData}
            startAngle={-90}
            endAngle={270}
            innerRadius={28}
            outerRadius={90}
            cy="45%"
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
            />
            <RadialBar dataKey="value" background cornerRadius={4} />
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="name" hideLabel />}
            />
            <ChartLegend
              verticalAlign="bottom"
              content={(props) => (
                <ChartLegendContent
                  payload={props.payload}
                  verticalAlign={props.verticalAlign}
                />
              )}
              className="mt-3 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

//  Radar Chart — Dots
const radarData = [
  { category: "JOINs", score: 88 },
  { category: "Aggregates", score: 74 },
  { category: "Window Fn", score: 55 },
  { category: "Subqueries", score: 80 },
  { category: "DDL / DML", score: 62 },
  { category: "Indexes", score: 40 },
];
const radarConfig = {
  score: { label: "Skill Score", color: "var(--chart-2)" },
} satisfies ChartConfig;

function SkillRadarChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skill Radar</CardTitle>
        <CardDescription className="text-xs">
          Strength across SQL categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={radarConfig} className="mx-auto h-[220px] ">
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
            <Radar
              dataKey="score"
              fill="var(--chart-2)"
              fillOpacity={0.12}
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "var(--chart-2)", strokeWidth: 0 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const recentSubmissions = [
  {
    id: 1,
    title: "Top N Salaries",
    difficulty: "Medium",
    status: "Accepted",
    time: "2h ago",
    runtime: "120ms",
  },
  {
    id: 2,
    title: "Second Highest Salary",
    difficulty: "Easy",
    status: "Accepted",
    time: "5h ago",
    runtime: "80ms",
  },
  {
    id: 3,
    title: "Department Highest Salary",
    difficulty: "Medium",
    status: "Wrong Answer",
    time: "1d ago",
    runtime: "—",
  },
  {
    id: 4,
    title: "Consecutive Numbers",
    difficulty: "Medium",
    status: "Accepted",
    time: "2d ago",
    runtime: "145ms",
  },
  {
    id: 5,
    title: "Rank Scores",
    difficulty: "Medium",
    status: "Time Limit",
    time: "3d ago",
    runtime: "—",
  },
  {
    id: 6,
    title: "Human Traffic of Stadium",
    difficulty: "Hard",
    status: "Accepted",
    time: "4d ago",
    runtime: "200ms",
  },
];

const problems = [
  {
    id: 1,
    title: "Employees Earning More Than Managers",
    difficulty: "Easy",
    category: "JOIN",
    solved: true,
  },
  {
    id: 2,
    title: "Duplicate Emails",
    difficulty: "Easy",
    category: "GROUP BY",
    solved: true,
  },
  {
    id: 3,
    title: "Rising Temperature",
    difficulty: "Easy",
    category: "DATE",
    solved: false,
  },
  {
    id: 4,
    title: "Delete Duplicate Emails",
    difficulty: "Easy",
    category: "DELETE",
    solved: false,
  },
  {
    id: 5,
    title: "Customers Who Never Order",
    difficulty: "Easy",
    category: "JOIN",
    solved: true,
  },
  {
    id: 6,
    title: "Department Top Three Salaries",
    difficulty: "Hard",
    category: "WINDOW",
    solved: false,
  },
];

const badgeList = [
  { label: "50 Day Streak", icon: Flame, earned: true },
  { label: "Speed Solver", icon: Zap, earned: true },
  { label: "Hard Crusher", icon: Target, earned: false },
  { label: "Top 10%", icon: TrendingUp, earned: false },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "Accepted")
    return <CheckCircle2 color="green" className="w-4 h-4 text-foreground " />;
  if (status === "Wrong Answer")
    return <XCircle color="red" className="w-4 h-4 " />;
  return <Clock color="yellow" className="w-4 h-4 " />;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant =
    difficulty === "Easy"
      ? "outline"
      : difficulty === "Medium"
        ? "secondary"
        : "default";
  return (
    <Badge variant={variant} className="text-xs font-normal">
      {difficulty}
    </Badge>
  );
}

// ─── Profile Types & Edit Dialog ──────────────────────────────────────────────
interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  github: string;
  twitter: string;
  avatarUrl: string;
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ProfileData;
  onSave: (p: ProfileData) => void;
}) {
  const [form, setForm] = useState<ProfileData>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) setForm(profile);
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setForm((f) => ({ ...f, avatarUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const set =
    (k: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Profile</DialogTitle>
          <DialogDescription className="text-xs">
            Update your public profile information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border shrink-0">
              <AvatarImage src={form.avatarUrl} />
              <AvatarFallback className="text-base font-semibold">
                {form.displayName?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                JPG, PNG or GIF · max 2 MB
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input
                className="h-8 text-xs"
                value={form.username}
                onChange={set("username")}
                placeholder="gh.aen"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input
                className="h-8 text-xs"
                value={form.displayName}
                onChange={set("displayName")}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bio</Label>
            <Textarea
              className="text-xs resize-none"
              rows={3}
              value={form.bio}
              onChange={set("bio")}
              placeholder="Tell us a little about yourself…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </Label>
              <Input
                className="h-8 text-xs"
                value={form.location}
                onChange={set("location")}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Website
              </Label>
              <Input
                className="h-8 text-xs"
                value={form.website}
                onChange={set("website")}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Github className="w-3 h-3" /> GitHub
              </Label>
              <Input
                className="h-8 text-xs"
                value={form.github}
                onChange={set("github")}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Twitter className="w-3 h-3" /> Twitter / X
              </Label>
              <Input
                className="h-8 text-xs"
                value={form.twitter}
                onChange={set("twitter")}
                placeholder="@handle"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={() => {
              onSave(form);
              onOpenChange(false);
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    username: "John Kratos",
    displayName: "John Kratos",
    bio: "Passionate about databases and query optimization. Building ssql to make SQL practice more engaging for everyone.",
    location: "Tlemcen, Algeria",
    website: "",
    github: "ghaen",
    twitter: "",
    avatarUrl: "https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_13.png",
  });
  const [activeFilter, setActiveFilter] = useState("All");

  // Logic: Filter problems based on the button clicked
  const filteredProblems = problems.filter((p) => {
    if (activeFilter === "All") return true;
    return p.difficulty === activeFilter;
  });

  const solved = 87;
  const total = 200;
  const easy = 42;
  const easyTotal = 80;
  const medium = 35;
  const mediumTotal = 90;
  const hard = 10;
  const hardTotal = 30;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* ── Profile Header ── */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
          {/* Avatar — larger */}
          <Avatar className="h-24 w-24 border-2 border-border shrink-0">
            <AvatarImage src={profile.avatarUrl} />
            <AvatarFallback className="text-xl font-semibold">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.displayName}
              </h1>
              <Badge variant="outline" className="text-xs font-normal gap-1">
                <Star className="w-3 h-3 text-[#FFC107] fill-[#FFC107]" /> Rank
                #1,204
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <Flame className="w-3 h-3 text-[#FF5722] fill-[#FF5722] " /> 50
                day streak
              </Badge>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mb-3 max-w-lg leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  {profile.website}
                </a>
              )}
              {profile.github && (
                <span className="flex items-center gap-1">
                  <Github className="w-3 h-3" />
                  {profile.github}
                </span>
              )}
              {profile.twitter && (
                <span className="flex items-center gap-1">
                  <Twitter className="w-3 h-3" />
                  {profile.twitter}
                </span>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span>Joined Jan 2024</span>
            </div>
          </div>

          {/* Edit button */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 shrink-0 gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Settings className="w-3 h-3" />
            Edit Profile
          </Button>
        </div>

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSave={setProfile}
        />

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-9">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="problems" className="text-xs">
              Problems
            </TabsTrigger>
            <TabsTrigger value="submissions" className="text-xs">
              Submissions
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Solved",
                  value: solved,
                  sub: `/ ${total}`,
                  icon: CheckCircle2,
                  // Just the outline in green
                  colorClass: "text-[#22C55E]",
                },
                {
                  label: "Acceptance",
                  value: "76%",
                  sub: "all time",
                  icon: BarChart3,
                  // Just the outline in your brand blue
                  colorClass: "text-[#3b82f6]",
                },
                {
                  label: "Streak",
                  value: "50",
                  sub: "days",
                  icon: Flame,
                  // Filled Orange
                  colorClass: "text-[#FF5722] fill-[#FF5722]",
                },
                {
                  label: "Points",
                  value: "2,340",
                  sub: "total",
                  icon: Trophy,
                  // Filled Gold
                  colorClass: "text-[#FFC107] fill-[#FFC107]",
                },
              ].map(({ label, value, sub, icon: Icon, colorClass }) => (
                <Card key={label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-2xl font-semibold tracking-tight mt-0.5">
                          {value}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {sub}
                        </p>
                      </div>
                      {/* We use cn() to merge the size with your custom colors */}
                      <Icon className={cn("w-4 h-4 mt-0.5", colorClass)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts: Radial + Radar */}
            <div className="grid md:grid-cols-2 gap-4">
              <SolvedRadialChart />
              <SkillRadarChart />
            </div>

            {/* Progress bars */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Progress by Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Easy", solved: easy, total: easyTotal },
                  { label: "Medium", solved: medium, total: mediumTotal },
                  { label: "Hard", solved: hard, total: hardTotal },
                ].map(({ label, solved, total }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">
                        {solved}{" "}
                        <span className="text-muted-foreground">/ {total}</span>
                      </span>
                    </div>
                    <Progress
                      value={(solved / total) * 100}
                      className="h-1.5 [&>div]:bg-chart-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Heatmap */}
            <SubmissionHeatmap />

            {/* Badges + Recent */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {badgeList.map(({ label, icon: Icon, earned }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2.5 rounded-md border p-3 transition-colors ${
                          earned
                            ? "border-border"
                            : "border-border/40 opacity-40"
                        }`}
                      >
                        {earned ? (
                          <Icon className="w-4 h-4 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-xs leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Recent Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentSubmissions.slice(0, 5).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StatusIcon status={s.status} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {s.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {s.time}
                            </p>
                          </div>
                        </div>
                        <DifficultyBadge difficulty={s.difficulty} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/*PROBLEMS */}
          <TabsContent value="problems" className="mt-0">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Problem Set
                  </CardTitle>
                  <div className="flex gap-1.5">
                    {["All", "Easy", "Medium", "Hard"].map((f) => (
                      <Button
                        key={f}
                        // UI: Active button uses secondary (light blue/grey) to stand out
                        variant={activeFilter === f ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-7 text-xs px-2.5 transition-all",
                          activeFilter === f &&
                            "bg-secondary text-secondary-foreground",
                        )}
                        onClick={() => setActiveFilter(f)}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-xs w-8 pl-6">#</TableHead>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Difficulty</TableHead>
                      <TableHead className="text-xs text-right pr-6">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProblems.map((p) => (
                      <TableRow
                        key={p.id}
                        className="group cursor-pointer border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground pl-6">
                          {p.id}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {p.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-normal bg-muted/20 border-border/50"
                          >
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* Dynamic Difficulty Badge */}
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              p.difficulty === "Easy" && "text-emerald-500",
                              p.difficulty === "Medium" && "text-amber-500",
                              p.difficulty === "Hard" && "text-rose-500",
                            )}
                          >
                            {p.difficulty}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {p.solved ? (
                            <CheckCircle2
                              className="w-4 h-4 inline-block text-[#22C55E]"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted/50 inline-block" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Empty State when no problems match the filter */}
                    {filteredProblems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground text-xs"
                        >
                          No {activeFilter.toLowerCase()} problems found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          {/* ════ SUBMISSIONS ════ */}
          <TabsContent value="submissions" className="mt-0">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">All Submissions</CardTitle>
                <CardDescription className="text-xs">
                  Your complete submission history
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-xs pl-6">Problem</TableHead>
                      <TableHead className="text-xs">Difficulty</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Runtime</TableHead>
                      <TableHead className="text-xs text-right pr-6">
                        Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSubmissions.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer border-border"
                      >
                        <TableCell className="text-xs font-medium pl-6">
                          {s.title}
                        </TableCell>
                        <TableCell>
                          <DifficultyBadge difficulty={s.difficulty} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={s.status} />
                            <span className="text-xs">{s.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {s.runtime}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right pr-6">
                          {s.time}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />
        <p className="text-center text-[11px] text-muted-foreground">
          Vorn · built for SQL mastery
        </p>
      </main>
    </div>
  );
}
