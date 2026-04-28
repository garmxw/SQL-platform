"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
  Mail,
  BookOpen,
  Sparkles,
  Loader2,
  ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Eye,
  Edit3,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const t = name?.trim() || "";
  return t ? t.slice(0, 2).toUpperCase() : "??";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── IMAGE COMPRESSION ──────────────────────────────────────────────────────

async function compressImageFile(
  file: File,
  opts: { maxDim?: number; targetKB?: number } = {},
): Promise<File> {
  const { maxDim = 1200, targetKB = 400 } = opts;
  if (file.type === "image/gif") return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const target = targetKB * 1024;
      let lo = 0.1,
        hi = 0.95,
        q = 0.8;
      const iter = (n: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("toBlob failed"));
              return;
            }
            if (n === 0 || (blob.size <= target && blob.size > target * 0.6)) {
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                  type: "image/webp",
                }),
              );
              return;
            }
            if (blob.size > target) {
              hi = q;
              q = (lo + q) / 2;
            } else {
              lo = q;
              q = (q + hi) / 2;
            }
            iter(n - 1);
          },
          "image/webp",
          q,
        );
      };
      iter(7);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("load failed"));
    };
    img.src = blobUrl;
  });
}

// ─── CLOUDINARY UPLOAD ──────────────────────────────────────────────────────

interface CloudSig {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  tags: string;
  eager: string;
}
async function getSignature(type: "avatar" | "banner"): Promise<CloudSig> {
  const res = await fetch(`/api/profile/cloudinary-signature?type=${type}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Signature fetch failed ${res.status}`);
  return res.json();
}
async function uploadToCloudinary(file: File, sig: CloudSig): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.api_key);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  fd.append("tags", sig.tags);
  fd.append("eager", sig.eager);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error("Cloudinary upload failed");
  return (await res.json()).secure_url as string;
}

// ─── CROP MODAL (unchanged) ─────────────────────────────────────────────────

interface CropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  outputW: number;
  outputH: number;
  shape: "circle" | "rect";
  onConfirm: (croppedFile: File, previewUrl: string) => void;
  originalFileName: string;
}
function CropModal({
  open,
  onClose,
  imageSrc,
  outputW,
  outputH,
  shape,
  onConfirm,
  originalFileName,
}: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const PREV_W = 320;
  const PREV_H = Math.round(PREV_W * (outputH / outputW));

  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const fitScale = Math.max(
        PREV_W / img.naturalWidth,
        PREV_H / img.naturalHeight,
      );
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PREV_W, PREV_H);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (PREV_W - drawW) / 2 + offset.x;
    const y = (PREV_H - drawH) / 2 + offset.y;
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, PREV_W, PREV_H);
    ctx.globalCompositeOperation = "destination-out";
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(
        PREV_W / 2,
        PREV_H / 2,
        Math.min(PREV_W, PREV_H) / 2 - 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, PREV_W, PREV_H);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(
        PREV_W / 2,
        PREV_H / 2,
        Math.min(PREV_W, PREV_H) / 2 - 2,
        0,
        Math.PI * 2,
      );
      ctx.clip();
    }
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(
        PREV_W / 2,
        PREV_H / 2,
        Math.min(PREV_W, PREV_H) / 2 - 2,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else {
      ctx.strokeRect(0.75, 0.75, PREV_W - 1.5, PREV_H - 1.5);
    }
  }, [scale, offset, imageSrc, shape]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my),
      });
    },
    [dragging],
  );
  const onMouseUp = () => setDragging(false);
  const touchStart = useRef({ tx: 0, ty: 0, ox: 0, oy: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = {
      tx: t.clientX,
      ty: t.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setOffset({
      x: touchStart.current.ox + (t.clientX - touchStart.current.tx),
      y: touchStart.current.oy + (t.clientY - touchStart.current.ty),
    });
  };
  const zoom = (delta: number) =>
    setScale((s) => Math.min(5, Math.max(0.2, s + delta)));
  const reset = () => {
    const img = imgRef.current;
    if (!img) return;
    setScale(Math.max(PREV_W / img.naturalWidth, PREV_H / img.naturalHeight));
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = outputW;
    out.height = outputH;
    const ctx = out.getContext("2d")!;
    const scaleX = outputW / PREV_W;
    const scaleY = outputH / PREV_H;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = ((PREV_W - drawW) / 2 + offset.x) * scaleX;
    const y = ((PREV_H - drawH) / 2 + offset.y) * scaleY;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, x, y, drawW * scaleX, drawH * scaleY);
    out.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File(
          [blob],
          originalFileName.replace(/\.[^.]+$/, ".webp"),
          { type: "image/webp" },
        );
        onConfirm(croppedFile, URL.createObjectURL(blob));
      },
      "image/webp",
      0.92,
    );
  };

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ width: PREV_W + 48, maxWidth: "95vw" }}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-medium">
            {shape === "circle" ? "Crop Avatar" : "Crop Banner"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center px-6 pb-3">
          <canvas
            ref={canvasRef}
            width={PREV_W}
            height={PREV_H}
            className="rounded-lg cursor-grab active:cursor-grabbing"
            style={{
              width: PREV_W,
              height: PREV_H,
              display: "block",
              background: "#111",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
          />
        </div>
        <div className="flex items-center justify-center gap-2 pb-4 px-6">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => zoom(-0.1)}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <input
            type="range"
            min={0.2}
            max={5}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-32 accent-foreground"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => zoom(0.1)}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-1"
            onClick={reset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground pb-3 -mt-2">
          Drag to reposition · scroll or use slider to zoom
        </p>
        <DialogFooter className="px-6 pb-5 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button size="sm" className="text-xs h-8" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MARKDOWN RENDERER (unchanged) ──────────────────────────────────────────

function renderMarkdown(md: string): string {
  let html = md
    .replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (_, lang, code) =>
        `<pre class="bg-muted rounded-md px-4 py-3 text-xs overflow-x-auto my-3"><code>${escHtml(code.trim())}</code></pre>`,
    )
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>',
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 class="text-base font-semibold mt-5 mb-2">$1</h2>',
    )
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-6 mb-2">$1</h1>')
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-2 border-border pl-3 text-muted-foreground text-sm italic my-2">$1</blockquote>',
    )
    .replace(/^---$/gm, '<hr class="border-border my-4" />')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-muted rounded px-1 py-0.5 text-[11px]">$1</code>',
    )
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-md max-w-full my-2" />',
    )
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-foreground underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener">$1</a>',
    )
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    .replace(
      /\n{2,}/g,
      '</p><p class="text-sm leading-relaxed text-foreground/90 my-2">',
    )
    .replace(/\n/g, "<br />");
  return `<p class="text-sm leading-relaxed text-foreground/90">${html}</p>`;
}
function escHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── AUTO-GROW TEXTAREA (unchanged) ─────────────────────────────────────────

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  minRows = 3,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={minRows}
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden resize-none break-words",
        className,
      )}
      style={{ minHeight: `${minRows * 24}px` }}
    />
  );
}

// ─── EMPTY PLACEHOLDER ───────────────────────────────────────────────────────

function EmptyPlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/60">
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60 max-w-[220px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ─── ERROR STATE ─────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
        <AlertCircle className="w-5 h-5 text-destructive" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
}

// ─── HEATMAP ────────────────────────────────────────────────────────────────

function getIntensity(n: number) {
  if (n === 0) return "bg-muted";
  if (n <= 2) return "bg-[var(--color-heatmap-1)]";
  if (n <= 5) return "bg-[var(--color-heatmap-2)]";
  if (n <= 8) return "bg-[var(--color-heatmap-3)]";
  return "bg-[var(--color-heatmap-4)]";
}

function buildFullHeatmap(
  apiData: { date: string; count: number }[],
): { date: string; count: number }[] {
  const countMap = new Map(apiData.map((d) => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, count: countMap.get(key) ?? 0 });
  }
  return result;
}

function SubmissionHeatmap({
  heatmapData,
  loading,
  error,
}: {
  heatmapData: { date: string; count: number }[];
  loading: boolean;
  error: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => buildFullHeatmap(heatmapData), [heatmapData]);
  const totalActiveDays = data.filter((d) => d.count > 0).length;

  // Always show skeleton until mounted (prevents hydration mismatch) or while loading
  if (!mounted || loading)
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submission Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );

  if (error)
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submission Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message="Could not load activity data." />
        </CardContent>
      </Card>
    );

  if (totalActiveDays === 0)
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submission Activity</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            No activity yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyPlaceholder
            icon={<BarChart3 className="w-6 h-6 text-muted-foreground/50" />}
            title="No submissions yet"
            description="Start solving problems and your activity will show up here."
          />
        </CardContent>
      </Card>
    );

  // Build week grid
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
  if (week.length) weeks.push(week);

  const MONTHS = [
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
  let lastM = -1;
  weeks.forEach((w, wi) => {
    const f = w.find((d) => d.date);
    if (f?.date) {
      const m = new Date(f.date).getMonth();
      if (m !== lastM) {
        monthLabels.push({ label: MONTHS[m], col: wi });
        lastM = m;
      }
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Submission Activity</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {totalActiveDays} active days in the past year
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
            ].map((c) => (
              <span
                key={c}
                className={`w-3 h-3 rounded-sm inline-block ${c} border border-border/40`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels */}
            <div className="flex mb-1 ml-7">
              {weeks.map((_, wi) => {
                const l = monthLabels.find((m) => m.col === wi);
                return (
                  <div
                    key={wi}
                    className="w-4 mr-0.5 text-[10px] text-muted-foreground"
                  >
                    {l?.label ?? ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0.5">
              {/* Day-of-week labels */}
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
              {/* Cells */}
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

// ─── RADIAL CHART ────────────────────────────────────────────────────────────

const radialConfig = {
  Hard: { label: "Hard" },
  Medium: { label: "Medium" },
  Easy: { label: "Easy" },
} satisfies ChartConfig;

const RADIAL_FILL: Record<string, string> = {
  Easy: "var(--chart-3)",
  Medium: "var(--chart-2)",
  Hard: "var(--chart-1)",
};

function SolvedRadialChart({
  radialData,
  loading,
  error,
}: {
  radialData: { name: string; value: number; solved: number; total: number }[];
  loading: boolean;
  error: boolean;
}) {
  // Only show empty state when we have data back AND all difficulties have 0 total problems
  const hasData = radialData.length > 0;
  const isEmpty =
    !loading && !error && hasData && radialData.every((d) => d.total === 0);
  const chartData = radialData.map((d) => ({
    ...d,
    fill: RADIAL_FILL[d.name] ?? "var(--chart-1)",
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Solved by Difficulty</CardTitle>
        <CardDescription className="text-xs">
          Completion rate per tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || !hasData ? (
          <div className="h-[220px] w-full rounded-md bg-muted/40 animate-pulse" />
        ) : error ? (
          <ErrorState message="Could not load chart." />
        ) : isEmpty ? (
          <EmptyPlaceholder
            icon={<BookOpen className="w-6 h-6 text-muted-foreground/50" />}
            title="No problems solved yet"
            description="Solve your first problem to see your difficulty breakdown."
          />
        ) : (
          <ChartContainer config={radialConfig} className="mx-auto h-[220px]">
            <RadialBarChart
              data={chartData}
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
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    hideLabel
                    formatter={(value, name, item) => [
                      `${item.payload.solved}/${item.payload.total} (${value}%)`,
                      name,
                    ]}
                  />
                }
              />
              <ChartLegend
                verticalAlign="bottom"
                content={(p) => (
                  <ChartLegendContent
                    payload={p.payload}
                    verticalAlign={p.verticalAlign}
                  />
                )}
                className="mt-3 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
              />
            </RadialBarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────

const radarConfig = {
  score: { label: "Skill Score", color: "var(--chart-2)" },
} satisfies ChartConfig;

function SkillRadarChart({
  radarData,
  loading,
  error,
}: {
  radarData: { category: string; score: number }[];
  loading: boolean;
  error: boolean;
}) {
  const hasData = radarData.length > 0;
  // isEmpty only when fetch is done, no error, and truly no tag data exists
  const isEmpty = !loading && !error && !hasData;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skill Radar</CardTitle>
        <CardDescription className="text-xs">
          Strength across SQL categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || (!hasData && !isEmpty) ? (
          <div className="h-[220px] w-full rounded-md bg-muted/40 animate-pulse" />
        ) : error ? (
          <ErrorState message="Could not load chart." />
        ) : isEmpty ? (
          <EmptyPlaceholder
            icon={<Sparkles className="w-6 h-6 text-muted-foreground/50" />}
            title="Skill data not available yet"
            description="Complete problems across categories to build your skill radar."
          />
        ) : (
          <ChartContainer config={radarConfig} className="mx-auto h-[220px]">
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
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent formatter={(v) => [`${v}%`, "Solved"]} />
                }
              />
            </RadarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── STATUS / DIFFICULTY HELPERS ─────────────────────────────────────────────

function StatusIcon({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === true)
    return <CheckCircle2 color="green" className="w-4 h-4 shrink-0" />;
  if (isCorrect === false)
    return <XCircle color="red" className="w-4 h-4 shrink-0" />;
  return <Clock color="yellow" className="w-4 h-4 shrink-0" />;
}

function statusLabel(isCorrect: boolean | null): string {
  if (isCorrect === true) return "Accepted";
  if (isCorrect === false) return "Wrong Answer";
  return "Pending";
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  const d =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  const v = d === "Easy" ? "outline" : d === "Medium" ? "secondary" : "default";
  return (
    <Badge variant={v} className="text-xs font-normal">
      {difficulty}
    </Badge>
  );
}

// ─── PROFILE TYPES ───────────────────────────────────────────────────────────

interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  github: string;
  twitter: string;
  avatarUrl: string;
  bannerUrl: string;
  profileReadme: string;
  email: string;
  loginStreak: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}
const FIELD_MAP: Array<{ formKey: keyof ProfileData; dbKey: string }> = [
  { formKey: "username", dbKey: "username" },
  { formKey: "displayName", dbKey: "display_name" },
  { formKey: "bio", dbKey: "bio" },
  { formKey: "location", dbKey: "location" },
  { formKey: "website", dbKey: "portfolio_url" },
  { formKey: "github", dbKey: "github_name" },
  { formKey: "twitter", dbKey: "twitter_name" },
  { formKey: "avatarUrl", dbKey: "avatar_url" },
  { formKey: "bannerUrl", dbKey: "banner_url" },
  { formKey: "profileReadme", dbKey: "profile_readme" },
];

// ─── OVERVIEW DATA TYPES ─────────────────────────────────────────────────────

interface OverviewData {
  stats: {
    totalSolved: number;
    totalProblems: number;
    acceptanceRate: number;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    loginStreak: number;
  };
  difficultyBreakdown: Record<string, { solved: number; total: number }>;
  radialData: { name: string; value: number; solved: number; total: number }[];
  badges: {
    id: number;
    name: string;
    description: string | null;
    iconUrl: string | null;
    code: string;
    rarity: string | null;
    xpReward: number | null;
    earned: boolean;
    earnedAt: string | null;
  }[];
  recentSubmissions: {
    id: number;
    title: string;
    difficulty: string | null;
    isCorrect: boolean | null;
    executionTimeMs: number | null;
    createdAt: string;
    engine: string | null;
  }[];
  heatmap: { date: string; count: number }[];
  radarData: {
    category: string;
    score: number;
    solved: number;
    total: number;
  }[];
}

interface ProblemRow {
  id: number;
  title: string;
  difficulty: string | null;
  acceptanceRate: number | null;
  xpReward: number | null;
  tags: string[];
  isSolved: boolean;
  attempts: number;
  solvedAt: string | null;
  firstAttemptAt: string | null;
}
interface SubmissionRow {
  id: number;
  title: string;
  difficulty: string | null;
  isCorrect: boolean | null;
  submittedSql: string;
  executionTimeMs: number | null;
  createdAt: string;
  engine: string | null;
}

// ─── BADGE ICON MAP ──────────────────────────────────────────────────────────
// Maps badge codes to icons. Extend as you add more badge types.
const BADGE_ICON_MAP: Record<string, React.ElementType> = {
  streak_50: Flame,
  speed_solver: Zap,
  hard_crusher: Target,
  top_10: TrendingUp,
  first_solve: CheckCircle2,
  default: Trophy,
};
function BadgeIcon({ code, className }: { code: string; className?: string }) {
  const Icon = BADGE_ICON_MAP[code] ?? BADGE_ICON_MAP.default;
  return <Icon className={cn("w-4 h-4 shrink-0", className)} />;
}

// ─── EDIT PROFILE DIALOG (unchanged logic, kept intact) ──────────────────────

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
  const [saving, setSaving] = useState(false);
  const [dialogTab, setDialogTab] = useState("images");
  const [cropSrc, setCropSrc] = useState("");
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFileName, setCropFileName] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [readmeTab, setReadmeTab] = useState<"edit" | "preview">("edit");
  const [showAboutMeOnProfile, setShowAboutMeOnProfile] = useState(true);

  useEffect(() => {
    if (open) {
      setForm(profile);
      setDialogTab("images");
      setShowAboutMeOnProfile(!!profile.profileReadme?.trim());
    }
  }, [open, profile]);

  const setField =
    (k: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const openCropFor = (type: "avatar" | "banner") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      type === "avatar"
        ? "image/jpeg,image/png,image/gif"
        : "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.type === "image/gif") {
        handleCropConfirm(type, file, URL.createObjectURL(file));
        return;
      }
      setCropSrc(URL.createObjectURL(file));
      setCropFileName(file.name);
      setCropType(type);
      setCropOpen(true);
    };
    input.click();
  };

  const handleCropConfirm = useCallback(
    async (
      type: "avatar" | "banner",
      croppedFile: File,
      previewUrl: string,
    ) => {
      setCropOpen(false);
      URL.revokeObjectURL(cropSrc);
      const setUploading =
        type === "avatar" ? setAvatarUploading : setBannerUploading;
      setUploading(true);
      setForm((f) => ({
        ...f,
        [type === "avatar" ? "avatarUrl" : "bannerUrl"]: previewUrl,
      }));
      try {
        const compressed = await compressImageFile(croppedFile, {
          maxDim: type === "avatar" ? 800 : 1600,
          targetKB: type === "avatar" ? 300 : 800,
        });
        const sig = await getSignature(type);
        const url = await uploadToCloudinary(compressed, sig);
        setForm((f) => ({
          ...f,
          [type === "avatar" ? "avatarUrl" : "bannerUrl"]: url,
        }));
        URL.revokeObjectURL(previewUrl);
        if (type === "avatar") window.dispatchEvent(new Event("profileUpdate"));
        toast.success(`${type === "avatar" ? "Avatar" : "Banner"} updated`, {
          description: "Your profile image has been updated successfully.",
        });
      } catch (err) {
        console.error(`${type} upload failed:`, err);
        setForm((f) => ({
          ...f,
          [type === "avatar" ? "avatarUrl" : "bannerUrl"]:
            type === "avatar" ? profile.avatarUrl : profile.bannerUrl,
        }));
        URL.revokeObjectURL(previewUrl);
        toast.error("Upload failed", {
          description: `${type} could not be updated.`,
        });
      } finally {
        setUploading(false);
      }
    },
    [cropSrc, profile.avatarUrl, profile.bannerUrl],
  );

  const handleSave = async () => {
    const payload: Record<string, string | null> = {};
    for (const { formKey, dbKey } of FIELD_MAP) {
      let next = (form[formKey] as string) ?? "";
      const prev = (profile[formKey] as string) ?? "";
      if (formKey === "profileReadme") {
        if (!showAboutMeOnProfile) next = "";
        if (!next.trim()) {
          payload[dbKey] = null;
          continue;
        }
      }
      if (next !== prev) payload[dbKey] = next;
    }
    if (!Object.keys(payload).length) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update-ProfileData", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      const finalProfile = { ...form };
      if (!showAboutMeOnProfile) finalProfile.profileReadme = "";
      onSave(finalProfile);
      onOpenChange(false);
      window.dispatchEvent(new Event("profileUpdate"));
      toast.success("Profile updated", {
        description: "Your changes have been saved successfully.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Error", { description: "Failed to save profile changes." });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || avatarUploading || bannerUploading;

  return (
    <>
      <CropModal
        open={cropOpen}
        onClose={() => {
          setCropOpen(false);
          URL.revokeObjectURL(cropSrc);
        }}
        imageSrc={cropSrc}
        outputW={cropType === "avatar" ? 400 : 1500}
        outputH={cropType === "avatar" ? 400 : 500}
        shape={cropType === "avatar" ? "circle" : "rect"}
        originalFileName={cropFileName}
        onConfirm={(file, url) => handleCropConfirm(cropType, file, url)}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[520px] p-0 flex flex-col gap-0 overflow-hidden"
          style={{ height: "min(92vh, 640px)" }}
        >
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
            <DialogTitle className="text-base">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="px-6 shrink-0">
            <div className="flex gap-1 border-b border-border pb-0">
              {(["images", "info", "readme"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDialogTab(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                    dialogTab === t
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "readme"
                    ? "About Me"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {dialogTab === "images" && (
              <div className="h-full flex flex-col gap-5 px-6 py-5 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" /> Profile Banner
                  </Label>
                  <div className="relative w-full h-[88px] rounded-lg border border-border overflow-hidden bg-muted/40">
                    {form.bannerUrl ? (
                      <>
                        <img
                          src={form.bannerUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {bannerUploading && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!bannerUploading && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, bannerUrl: "" }))
                            }
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[11px]">No banner set</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-2 shrink-0"
                      onClick={() => openCropFor("banner")}
                      disabled={bannerUploading}
                      type="button"
                    >
                      {bannerUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      {bannerUploading ? "Uploading…" : "Upload Banner"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      JPG, PNG, WEBP or GIF · max 8 MB
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <Avatar className="h-16 w-16 border border-border">
                      <AvatarImage src={form.avatarUrl} />
                      <AvatarFallback className="text-base font-semibold">
                        {getInitials(form.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {avatarUploading && (
                      <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-2"
                      onClick={() => openCropFor("avatar")}
                      disabled={avatarUploading}
                      type="button"
                    >
                      {avatarUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {avatarUploading ? "Uploading…" : "Upload Photo"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      JPG, PNG or GIF · max 3 MB
                    </p>
                  </div>
                </div>
              </div>
            )}
            {dialogTab === "info" && (
              <div className="h-full flex flex-col gap-4 px-6 py-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Username</Label>
                    <Input
                      className="h-8 text-xs"
                      value={form.username}
                      onChange={setField("username")}
                      placeholder="gh.aen"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      className="h-8 text-xs"
                      value={form.displayName}
                      onChange={setField("displayName")}
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bio</Label>
                  <AutoGrowTextarea
                    value={form.bio}
                    onChange={setField("bio")}
                    placeholder="Tell us a little about yourself…"
                    maxLength={200}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {form.bio.length}/200
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Location
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={form.location}
                      onChange={setField("location")}
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
                      onChange={setField("website")}
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
                      onChange={setField("github")}
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
                      onChange={setField("twitter")}
                      placeholder="@handle"
                    />
                  </div>
                </div>
              </div>
            )}
            {dialogTab === "readme" && (
              <div className="h-full flex flex-col px-6 py-4 gap-3 overflow-hidden">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Write Markdown to customise your profile shown as a pinned
                    About Me card.
                  </p>
                  <div className="flex items-center rounded-md border border-border overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => setReadmeTab("edit")}
                      className={cn(
                        "px-3 py-1 text-xs flex items-center gap-1.5 transition-colors",
                        readmeTab === "edit"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setReadmeTab("preview")}
                      className={cn(
                        "px-3 py-1 text-xs flex items-center gap-1.5 transition-colors",
                        readmeTab === "preview"
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs border border-border rounded-md px-3 py-2">
                  <span className="font-medium">
                    Show About Me card on public profile
                  </span>
                  <Switch
                    checked={showAboutMeOnProfile}
                    onCheckedChange={setShowAboutMeOnProfile}
                  />
                </div>
                {readmeTab === "edit" ? (
                  <textarea
                    className={cn(
                      "flex-1 w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-y-auto leading-relaxed",
                    )}
                    value={form.profileReadme}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, profileReadme: e.target.value }))
                    }
                    placeholder={`# Hi, I'm ${form.displayName || "your name"} 👋\n\nWrite anything here using **Markdown**.\n\n- SQL enthusiast\n- Learning daily`}
                    spellCheck={false}
                  />
                ) : (
                  <div
                    className="flex-1 overflow-y-auto rounded-md border border-border px-4 py-3 text-sm prose-sm"
                    dangerouslySetInnerHTML={{
                      __html: form.profileReadme
                        ? renderMarkdown(form.profileReadme)
                        : '<p class="text-muted-foreground text-xs italic">Nothing to preview yet.</p>',
                    }}
                  />
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={handleSave}
              disabled={busy}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Overview state
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(false);

  // Problems state
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemsError, setProblemsError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");

  // Submissions state
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [subTotal, setSubTotal] = useState(0);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [subStatusFilter, setSubStatusFilter] = useState<
    "All" | "Accepted" | "Wrong Answer"
  >("All");
  const SUB_LIMIT = 20;

  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    displayName: "",
    bio: "",
    location: "",
    website: "",
    github: "",
    twitter: "",
    avatarUrl: "",
    bannerUrl: "",
    profileReadme: "",
    email: "",
    loginStreak: 0,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: "",
  });

  // ── Fetch profile (avatar/bio section — unchanged) ───────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile/get-ProfileData", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed");
        const result = await res.json();
        if (result.status === "success" && result.data) {
          const d = result.data;
          setProfile({
            username: d.username ?? "",
            displayName: d.display_name ?? "",
            bio: d.bio ?? "",
            location: d.location ?? "",
            website: d.portfolio_url ?? "",
            github: d.github_name ?? "",
            twitter: d.twitter_name ?? "",
            avatarUrl: d.avatar_url ?? "",
            bannerUrl: d.banner_url ?? "",
            profileReadme: d.profile_readme ?? "",
            email: d.email ?? "",
            loginStreak: d.login_streak ?? 0,
            currentStreak: d.current_streak ?? 0,
            longestStreak: d.longest_streak ?? 0,
            createdAt: d.created_at ?? "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  // ── Fetch overview when tab is active ────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(false);
    try {
      const res = await fetch("/api/profile/dashboard/overview", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("overview fetch failed");
      const json = await res.json();
      if (json.status === "success") setOverviewData(json.data);
      else throw new Error("bad response");
    } catch (err) {
      console.error(err);
      setOverviewError(true);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // ── Fetch problems ────────────────────────────────────────────────────────
  const fetchProblems = useCallback(async () => {
    setProblemsLoading(true);
    setProblemsError(false);
    try {
      const res = await fetch("/api/profile/dashboard/problems", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("problems fetch failed");
      const json = await res.json();
      if (json.status === "success") setProblems(json.data.problems);
      else throw new Error("bad response");
    } catch (err) {
      console.error(err);
      setProblemsError(true);
    } finally {
      setProblemsLoading(false);
    }
  }, []);

  // ── Fetch submissions ─────────────────────────────────────────────────────
  const fetchSubmissions = useCallback(async (page: number) => {
    setSubmissionsLoading(true);
    setSubmissionsError(false);
    try {
      const res = await fetch(
        `/api/profile/dashboard/submissions?page=${page}&limit=${SUB_LIMIT}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("submissions fetch failed");
      const json = await res.json();
      if (json.status === "success") {
        setSubmissions(json.data.submissions);
        setSubTotal(json.data.pagination.total);
        setSubTotalPages(json.data.pagination.totalPages);
      } else throw new Error("bad response");
    } catch (err) {
      console.error(err);
      setSubmissionsError(true);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  // ── Load data when tab changes (lazy load) ────────────────────────────────
  useEffect(() => {
    if (activeTab === "overview" && !overviewData && !overviewLoading)
      fetchOverview();
    if (activeTab === "problems" && problems.length === 0 && !problemsLoading)
      fetchProblems();
    if (
      activeTab === "submissions" &&
      submissions.length === 0 &&
      !submissionsLoading
    )
      fetchSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchOverview, fetchProblems, fetchSubmissions]);

  // ── Pagination for submissions ────────────────────────────────────────────
  const handleSubPageChange = (newPage: number) => {
    setSubPage(newPage);
    fetchSubmissions(newPage);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : null;
  const renderedReadme = useMemo(
    () => (profile.profileReadme ? renderMarkdown(profile.profileReadme) : ""),
    [profile.profileReadme],
  );

  const isNewUser =
    overviewData !== null && overviewData.stats.totalSolved === 0;

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Case-insensitive difficulty match — DB may store "easy"/"Easy"/"EASY"
      const diffMatch =
        activeFilter === "All" ||
        (p.difficulty ?? "").toLowerCase() === activeFilter.toLowerCase();
      // Tag match — safe even if tags is empty array
      const tagMatch =
        tagFilter === "All" ||
        (Array.isArray(p.tags) && p.tags.includes(tagFilter));
      return diffMatch && tagMatch;
    });
  }, [problems, activeFilter, tagFilter]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    problems.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return ["All", ...Array.from(tagSet).sort()];
  }, [problems]);

  const overviewStats = overviewData?.stats;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <main className="w-full max-w-4xl mx-auto pb-10">
        {/* Banner (unchanged) */}
        <div className="relative w-full h-36 sm:h-44 bg-muted overflow-hidden">
          {profile.bannerUrl ? (
            <img
              src={profile.bannerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/30" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/70 to-transparent" />
        </div>

        {/* Profile header (unchanged) */}
        <div className="px-4 sm:px-6 relative">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 -mt-10 sm:-mt-12 mb-8">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shrink-0 shadow-sm">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-xl font-semibold">
                {getInitials(profile.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 w-full pt-2 sm:pt-12">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  {profileLoading ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-7 w-36 rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                        {profile.displayName || "—"}
                      </h1>
                      {profile.username && (
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                          @{profile.username}
                        </p>
                      )}
                      {joinedDate && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          Joined {joinedDate}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-9 gap-1.5 whitespace-nowrap shrink-0"
                  onClick={() => setEditOpen(true)}
                >
                  <Settings className="w-3 h-3" />
                  Edit Profile
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {profileLoading ? (
                  <>
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </>
                ) : (
                  <>
                    <Badge
                      variant="outline"
                      className="text-xs font-normal gap-1"
                    >
                      <Star className="w-3 h-3 text-[#FFC107] fill-[#FFC107]" />{" "}
                      Rank #1,204
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal gap-1"
                    >
                      <Flame className="w-3 h-3 text-[#FF5722] fill-[#FF5722]" />{" "}
                      {profile.loginStreak} day login streak
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal gap-1"
                    >
                      <Flame className="w-3 h-3 text-[#FF5722] fill-[#FF5722]" />{" "}
                      {profile.currentStreak} day solving streak
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs font-normal gap-1"
                    >
                      <Trophy className="w-3 h-3 text-amber-500" />{" "}
                      {profile.longestStreak} day longest streak
                    </Badge>
                  </>
                )}
              </div>
              {profileLoading ? (
                <div className="mt-4 space-y-1.5">
                  <Skeleton className="h-3.5 w-full max-w-xs rounded" />
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                </div>
              ) : profile.bio ? (
                <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed break-words whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-muted-foreground">
                {profileLoading ? (
                  <>
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </>
                ) : (
                  <>
                    {profile.email && (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{profile.email}</span>
                      </span>
                    )}
                    {profile.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {profile.location}
                      </span>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        {profile.website}
                      </a>
                    )}
                    {profile.github && (
                      <span className="flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5 shrink-0" />
                        {profile.github}
                      </span>
                    )}
                    {profile.twitter && (
                      <span className="flex items-center gap-1.5">
                        <Twitter className="w-3.5 h-3.5 shrink-0" />
                        {profile.twitter}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSave={setProfile}
        />

        {/* About Me card (unchanged) */}
        {profile.profileReadme?.trim() && (
          <div className="px-4 sm:px-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">
                    {profile.username || profile.displayName} / AboutMe.md
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose-sm text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderedReadme }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6">
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

            {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(overviewLoading || overviewData === null) &&
                !overviewError ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-5 pb-4">
                        <Skeleton className="h-3 w-16 mb-2" />
                        <Skeleton className="h-8 w-12 mb-1" />
                        <Skeleton className="h-3 w-14" />
                      </CardContent>
                    </Card>
                  ))
                ) : overviewError ? (
                  <div className="col-span-4">
                    <ErrorState
                      message="Could not load stats."
                      onRetry={fetchOverview}
                    />
                  </div>
                ) : (
                  [
                    {
                      label: "Solved",
                      value: `${overviewStats!.totalSolved}`,
                      sub: `/ ${overviewStats!.totalProblems}`,
                      icon: CheckCircle2,
                      cc: "text-[#22C55E]",
                    },
                    {
                      label: "Acceptance",
                      value: `${overviewStats!.acceptanceRate}%`,
                      sub: "all time",
                      icon: BarChart3,
                      cc: "text-[#3b82f6]",
                    },
                    {
                      label: "Streak",
                      value: `${overviewStats!.currentStreak}`,
                      sub: "days",
                      icon: Flame,
                      cc: "text-[#FF5722]",
                    },
                    {
                      label: "XP",
                      value: overviewStats!.xp.toLocaleString(),
                      sub: `Level ${overviewStats!.level}`,
                      icon: Trophy,
                      cc: "text-[#FFC107]",
                    },
                  ].map(({ label, value, sub, icon: Icon, cc }) => (
                    <Card key={label}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {label}
                            </p>
                            <p className="text-2xl font-semibold tracking-tight mt-0.5">
                              {value}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {sub}
                            </p>
                          </div>
                          <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cc)} />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                <SolvedRadialChart
                  radialData={overviewData?.radialData ?? []}
                  loading={overviewLoading || overviewData === null}
                  error={overviewError}
                />
                <SkillRadarChart
                  radarData={overviewData?.radarData ?? []}
                  loading={overviewLoading || overviewData === null}
                  error={overviewError}
                />
              </div>

              {/* Progress by difficulty */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Progress by Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(overviewLoading || overviewData === null) &&
                  !overviewError ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-1.5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : overviewError ? (
                    <ErrorState message="Could not load progress." />
                  ) : isNewUser ? (
                    <EmptyPlaceholder
                      icon={
                        <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
                      }
                      title="No progress yet"
                      description="Start solving problems to track your progress by difficulty."
                    />
                  ) : (
                    <div className="space-y-4">
                      {(["Easy", "Medium", "Hard"] as const).map((label) => {
                        const d = overviewData!.difficultyBreakdown[label] ?? {
                          solved: 0,
                          total: 0,
                        };
                        return (
                          <div key={label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              <span className="tabular-nums">
                                {d.solved}{" "}
                                <span className="text-muted-foreground">
                                  / {d.total}
                                </span>
                              </span>
                            </div>
                            <Progress
                              value={
                                d.total > 0 ? (d.solved / d.total) * 100 : 0
                              }
                              className="h-1.5 [&>div]:bg-chart-2"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Heatmap */}
              <SubmissionHeatmap
                heatmapData={overviewData?.heatmap ?? []}
                loading={overviewLoading || overviewData === null}
                error={overviewError}
              />

              {/* Badges + Recent Submissions */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Badges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(overviewLoading || overviewData === null) &&
                    !overviewError ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 rounded-md" />
                        ))}
                      </div>
                    ) : overviewError ? (
                      <ErrorState message="Could not load badges." />
                    ) : overviewData?.badges.length === 0 ? (
                      <EmptyPlaceholder
                        icon={
                          <Trophy className="w-6 h-6 text-muted-foreground/50" />
                        }
                        title="No badges yet"
                        description="Complete challenges and streaks to unlock badges."
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {overviewData?.badges.map((badge) => (
                          <TooltipProvider key={badge.id} delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-md border p-3 transition-colors cursor-default",
                                    badge.earned
                                      ? "border-border"
                                      : "border-border/40 opacity-40",
                                  )}
                                >
                                  {badge.earned ? (
                                    <BadgeIcon code={badge.code} />
                                  ) : (
                                    <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="text-xs leading-tight">
                                    {badge.name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {badge.description && (
                                <TooltipContent className="text-xs max-w-[180px]">
                                  <p>{badge.description}</p>
                                  {badge.earned && badge.earnedAt && (
                                    <p className="text-muted-foreground mt-1">
                                      Earned {timeAgo(badge.earnedAt)}
                                    </p>
                                  )}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Recent Submissions
                    </CardTitle>
                  </CardHeader>
                  {(overviewLoading || overviewData === null) &&
                  !overviewError ? (
                    <CardContent>
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full rounded" />
                        ))}
                      </div>
                    </CardContent>
                  ) : overviewError ? (
                    <CardContent>
                      <ErrorState message="Could not load submissions." />
                    </CardContent>
                  ) : overviewData?.recentSubmissions.length === 0 ? (
                    <CardContent>
                      <EmptyPlaceholder
                        icon={
                          <CheckCircle2 className="w-6 h-6 text-muted-foreground/50" />
                        }
                        title="No submissions yet"
                        description="Your recent problem submissions will appear here."
                      />
                    </CardContent>
                  ) : (
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {overviewData?.recentSubmissions.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-6 py-2.5 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <StatusIcon isCorrect={s.isCorrect} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {s.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {timeAgo(s.createdAt)}
                                  {s.executionTimeMs
                                    ? ` · ${s.executionTimeMs}ms`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <DifficultyBadge difficulty={s.difficulty} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* ── PROBLEMS ──────────────────────────────────────────────────── */}
            <TabsContent value="problems" className="mt-0">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base font-semibold">
                      Problem Set
                      {!problemsLoading && !problemsError && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          {problems.filter((p) => p.isSolved).length}/
                          {problems.length} solved
                        </span>
                      )}
                    </CardTitle>
                    {/* Difficulty filter — values match DB exactly */}
                    <div className="flex gap-1.5 flex-wrap">
                      {["All", "Easy", "Medium", "Hard"].map((f) => (
                        <Button
                          key={f}
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
                  {/* Tag filter row */}
                  {allTags.length > 1 && (
                    <div className="flex gap-1.5 flex-wrap pt-3 pb-1">
                      {allTags.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTagFilter(t)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] border transition-colors",
                            tagFilter === t
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-4 px-0">
                  {problemsLoading ? (
                    <div className="px-6 space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded" />
                      ))}
                    </div>
                  ) : problemsError ? (
                    <div className="px-6">
                      <ErrorState
                        message="Could not load problems."
                        onRetry={fetchProblems}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="text-xs w-8 pl-6">
                              #
                            </TableHead>
                            <TableHead className="text-xs">Title</TableHead>
                            <TableHead className="text-xs">
                              Difficulty
                            </TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">
                              Tags
                            </TableHead>
                            <TableHead className="text-xs hidden md:table-cell">
                              Acceptance
                            </TableHead>
                            <TableHead className="text-xs text-right pr-6">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProblems.map((p, idx) => (
                            <TableRow
                              key={p.id}
                              className="group cursor-pointer border-border/40 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="text-xs text-muted-foreground pl-6">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-xs font-medium max-w-[220px]">
                                <span className="block truncate">
                                  {p.title}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DifficultyBadge difficulty={p.difficulty} />
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div className="flex flex-wrap gap-1">
                                  {p.tags.length === 0 && (
                                    <span className="text-[11px] text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                  {p.tags.slice(0, 2).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[10px] font-normal bg-muted/20 border-border/50"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {p.tags.length > 2 && (
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] font-normal bg-muted/20 border-border/50 cursor-default"
                                          >
                                            +{p.tags.length - 2}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">
                                          {p.tags.slice(2).join(", ")}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                {p.acceptanceRate != null
                                  ? `${p.acceptanceRate.toFixed(1)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                {p.isSolved ? (
                                  <CheckCircle2
                                    className="w-4 h-4 inline-block text-[#22C55E]"
                                    strokeWidth={2.5}
                                  />
                                ) : p.attempts > 0 ? (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="w-4 h-4 rounded-full border-2 border-amber-400/60 inline-block cursor-default" />
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        {p.attempts} attempt
                                        {p.attempts > 1 ? "s" : ""}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted/50 inline-block" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {!filteredProblems.length && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="h-24 text-center text-muted-foreground text-xs"
                              >
                                No
                                {activeFilter !== "All"
                                  ? ` ${activeFilter.toLowerCase()}`
                                  : ""}{" "}
                                problems
                                {tagFilter !== "All"
                                  ? ` tagged "${tagFilter}"`
                                  : ""}{" "}
                                found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── SUBMISSIONS ───────────────────────────────────────────────── */}
            <TabsContent value="submissions" className="mt-0">
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        All Submissions
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Your complete submission history
                        {subTotal > 0 ? ` · ${subTotal} total` : ""}
                      </CardDescription>
                    </div>
                    {/* Status filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(["All", "Accepted", "Wrong Answer"] as const).map(
                        (f) => (
                          <Button
                            key={f}
                            variant={
                              subStatusFilter === f ? "secondary" : "ghost"
                            }
                            size="sm"
                            className={cn(
                              "h-7 text-xs px-2.5 transition-all",
                              subStatusFilter === f &&
                                "bg-secondary text-secondary-foreground",
                              f === "Accepted" &&
                                subStatusFilter === f &&
                                "text-emerald-600 dark:text-emerald-400",
                              f === "Wrong Answer" &&
                                subStatusFilter === f &&
                                "text-rose-600 dark:text-rose-400",
                            )}
                            onClick={() => setSubStatusFilter(f)}
                          >
                            {f}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 px-0">
                  {submissionsLoading ? (
                    <div className="px-6 space-y-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded" />
                      ))}
                    </div>
                  ) : submissionsError ? (
                    <div className="px-6">
                      <ErrorState
                        message="Could not load submissions."
                        onRetry={() => fetchSubmissions(subPage)}
                      />
                    </div>
                  ) : submissions.length === 0 ? (
                    <EmptyPlaceholder
                      icon={
                        <Clock className="w-6 h-6 text-muted-foreground/50" />
                      }
                      title="No submissions yet"
                      description="Once you start solving problems, all your submissions will be tracked here."
                    />
                  ) : (
                    (() => {
                      // Client-side filter on top of the paginated slice
                      const filtered = submissions.filter((s) => {
                        if (subStatusFilter === "All") return true;
                        if (subStatusFilter === "Accepted")
                          return s.isCorrect === true;
                        if (subStatusFilter === "Wrong Answer")
                          return s.isCorrect === false;
                        return true;
                      });

                      return (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-border">
                                  <TableHead className="text-xs pl-6">
                                    Problem
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Difficulty
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Status
                                  </TableHead>
                                  <TableHead className="text-xs hidden sm:table-cell">
                                    Runtime
                                  </TableHead>
                                  <TableHead className="text-xs hidden sm:table-cell">
                                    Engine
                                  </TableHead>
                                  <TableHead className="text-xs text-right pr-6">
                                    Time
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtered.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={6}
                                      className="h-24 text-center text-muted-foreground text-xs"
                                    >
                                      No{" "}
                                      {subStatusFilter !== "All"
                                        ? `"${subStatusFilter}" `
                                        : ""}
                                      submissions on this page.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  filtered.map((s) => (
                                    <TableRow
                                      key={s.id}
                                      className="cursor-pointer border-border hover:bg-muted/30 transition-colors"
                                    >
                                      <TableCell className="text-xs font-medium pl-6 max-w-[200px]">
                                        <span className="block truncate">
                                          {s.title}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <DifficultyBadge
                                          difficulty={s.difficulty}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <StatusIcon isCorrect={s.isCorrect} />
                                          <span
                                            className={cn(
                                              "text-xs",
                                              s.isCorrect === true &&
                                                "text-emerald-600 dark:text-emerald-400",
                                              s.isCorrect === false &&
                                                "text-rose-600 dark:text-rose-400",
                                            )}
                                          >
                                            {statusLabel(s.isCorrect)}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                                        {s.executionTimeMs != null
                                          ? `${s.executionTimeMs}ms`
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                                        {s.engine ?? "—"}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground text-right pr-6">
                                        {timeAgo(s.createdAt)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          {subTotalPages > 1 && (
                            <div className="flex items-center justify-between px-6 pt-4 pb-2">
                              <p className="text-xs text-muted-foreground">
                                Page {subPage} of {subTotalPages}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={subPage <= 1 || submissionsLoading}
                                  onClick={() =>
                                    handleSubPageChange(subPage - 1)
                                  }
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={
                                    subPage >= subTotalPages ||
                                    submissionsLoading
                                  }
                                  onClick={() =>
                                    handleSubPageChange(subPage + 1)
                                  }
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-8" />
          <p className="text-center text-[11px] text-muted-foreground pb-4">
            Vorn · built for SQL mastery
          </p>
        </div>
      </main>
    </div>
  );
}
