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
import { toast } from "sonner";

// ===================== MAGIC UI COMPONENTS =====================
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
    const unsubscribe = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
    return unsubscribe; // cleanup to prevent memory leak
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

function InteractiveHoverButton({ children, className, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md border border-input bg-background px-5 text-sm font-medium text-foreground shadow-xs transition-colors duration-200 font-[Inter,sans-serif]",
        "hover:border-foreground hover:bg-foreground hover:text-background",
        className,
      )}
    >
      <span className="relative z-10 flex items-center gap-2 transition-transform duration-200 group-hover:-translate-x-2">
        {children}
      </span>
      <ArrowRight className="absolute right-4 z-10 w-4 h-4 translate-x-6 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  );
}

function AnimatedCircularProgressBar({
  value,
  gaugePrimaryColor = "hsl(var(--foreground))",
  gaugeSecondaryColor = "hsl(var(--muted))",
}: any) {
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

function CompletedBanner() {
  return (
    <div className="relative flex items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-foreground px-4 py-2.5">
      <Sparkles className="w-4 h-4 text-background shrink-0" />
      <span className="text-sm font-semibold text-background tracking-wide">
        Track Completed
      </span>
      <Trophy className="w-4 h-4 text-background shrink-0" />
      <div className="pointer-events-none absolute inset-0 [background:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] [animation:shimmer-sweep_2.5s_linear_infinite] [background-size:200%_100%]" />
    </div>
  );
}

// ===================== TYPES =====================
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
  icon: any;
  tag: "Beginner" | "Intermediate" | "Advanced";
  totalLessons: number;
  lessons: Lesson[];
  unlocked: boolean;
}

// ===================== HELPERS =====================
function computeCompletion(track: Track) {
  let total = 0,
    done = 0;
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

function getIcon(difficulty: string) {
  const d = difficulty.toLowerCase();
  if (d === "beginner") return Bookmark;
  if (d === "intermediate") return Layers;
  return Code2;
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

// ===================== LESSON DIALOG =====================
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
      ? 50
      : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] font-[Inter,sans-serif]">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {lesson.type === "challenge" ? (
              <Badge variant="outline" className="text-xs gap-1 px-2">
                <Puzzle className="w-3 h-3" />
                Challenge
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 px-2">
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
                    <span className="text-sm">{lesson.problem.title}</span>
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

// ===================== LESSON ROW & TRACK CARD =====================
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
        onClick={() => !isLocked && onOpen(lesson)}
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
              <span className="text-xs">{lesson.problem.title}</span>
              <DifficultyBadge difficulty={lesson.problem.difficulty} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {lesson.duration && (
            <span className="text-xs text-muted-foreground">
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

function TrackCard({
  track,
  index,
  onLessonOpen,
}: {
  track: Track;
  index: number;
  onLessonOpen: (l: Lesson) => void;
}) {
  const [open, setOpen] = useState(index === 0); // First track always starts open
  const completion = computeCompletion(track);
  const completedLessons = track.lessons.filter((l) => l.completed).length;
  const isCompleted = completion === 100;
  const Icon = track.icon;

  // First track is ALWAYS unlocked
  const isTrackLocked = index > 0 && !track.unlocked;

  return (
    <BlurFade delay={0.08 + index * 0.09} inView>
      <Collapsible open={open && !isTrackLocked} onOpenChange={setOpen}>
        <Card
          className={cn(
            "relative overflow-hidden transition-shadow hover:shadow-md",
            isTrackLocked && "opacity-50",
          )}
        >
          <BorderBeam
            size={350}
            duration={8 + index * 2}
            delay={index * 1.2}
            colorFrom="hsl(var(--foreground))"
            colorTo="transparent"
            borderWidth={1}
          />

          <CollapsibleTrigger asChild>
            <button
              className="w-full text-left focus-visible:outline-none focus-visible:ring-0"
              disabled={isTrackLocked}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 shrink-0">
                    <AnimatedCircularProgressBar value={completion} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-lg text-foreground">
                        {track.title}
                      </CardTitle>
                      <TagBadge tag={track.tag} />
                      {isTrackLocked && (
                        <Lock className="w-4 h-4 text-rose-500" />
                      )}
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
                      <span className="flex items-center gap-1">
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
              {!isCompleted && !isTrackLocked && (
                <div className="px-5 pt-4">
                  <InteractiveHoverButton>
                    <PlayCircle className="w-4 h-4" />
                    {completedLessons > 0 ? "Continue Track" : "Start Track"}
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

// ===================== SUMMARY STRIP =====================
function SummaryStrip({ tracks = [] }: { tracks: Track[] }) {
  const totalLessons = tracks.reduce((s, t) => s + t.totalLessons, 0);
  const doneLessons = tracks.reduce(
    (s, t) => s + t.lessons.filter((l) => l.completed).length,
    0,
  );
  const totalProblems = tracks.reduce(
    (s, t) => s + t.lessons.filter((l) => l.problem).length,
    0,
  );
  const doneProblems = tracks.reduce(
    (s, t) => s + t.lessons.filter((l) => l.problem?.completed).length,
    0,
  );
  const tracksStarted = tracks.filter((t) => computeCompletion(t) > 0).length;
  const overallPct = tracks.length
    ? Math.round(
        tracks.reduce((s, t) => s + computeCompletion(t), 0) / tracks.length,
      )
    : 0;

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
      suffix: `/${tracks.length}`,
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

// ===================== MAIN PAGE =====================
export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tracks", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res.status === "success") {
          const enriched = res.data.map((t: any) => ({
            ...t,
            icon: getIcon(t.difficulty),
          }));
          setTracks(enriched);
        } else toast.error("Failed to load tracks");
      })
      .catch(() => toast.error("Network error"))
      .finally(() => setLoading(false));
  }, []);

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setDialogOpen(true);
  }

  return (
    <>
      <ScrollProgress />
      <div className="relative min-h-screen bg-background text-foreground font-[Inter,sans-serif] overflow-x-hidden">
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

          <SummaryStrip tracks={tracks} />

          <div className="space-y-5">
            {tracks.map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                index={i}
                onLessonOpen={openLesson}
              />
            ))}
          </div>

          <div className="mt-28 mb-4 flex flex-col items-center gap-4 select-none">
            <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-9xl leading-none font-semibold text-transparent dark:from-white dark:to-slate-900/10">
              Vorn
            </span>
            <p className="pl-2 text-sm text-muted-foreground uppercase tracking-wide">
              built for SQL mastery
            </p>
          </div>
        </main>

        <LessonDialog
          lesson={selectedLesson}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      </div>

      <style>{`
        @keyframes border-beam-spin { from { --beam-angle: 0; } to { --beam-angle: 360; } }
        @keyframes shimmer-sweep { from { background-position: -200% center; } to { background-position: 200% center; } }
      `}</style>
    </>
  );
}
