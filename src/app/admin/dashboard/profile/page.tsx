"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Settings,
  Upload,
  Github,
  Globe,
  Twitter,
  MapPin,
  Mail,
  Loader2,
  ImageIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Eye,
  Edit3,
  Shield,
  Users,
  BookOpen,
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Zap,
  ArrowUpRight,
  Code2,
  PenLine,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// DotPattern — shared background component (uses useId for unique SVG pattern ids)
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

// Helper: initials from display name
function getInitials(name: string): string {
  const t = name?.trim() || "";
  return t ? t.slice(0, 2).toUpperCase() : "??";
}

// Helper: format a timestamp as a relative string e.g. "2h ago"
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("default", {
    month: "short",
    day: "numeric",
  });
}

// Canvas-based image compression — skips GIFs to preserve animation
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

// Cloudinary signed upload helpers
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

// Discord-style drag-to-crop modal
interface CropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  outputW: number;
  outputH: number;
  shape: "circle" | "rect";
  onConfirm: (f: File, url: string) => void;
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
  const PW = 320,
    PH = Math.round(320 * (outputH / outputW));

  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setScale(Math.max(PW / img.naturalWidth, PH / img.naturalHeight));
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PW, PH);
    const dw = img.naturalWidth * scale,
      dh = img.naturalHeight * scale;
    const x = (PW - dw) / 2 + offset.x,
      y = (PH - dh) / 2 + offset.y;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, PW, PH);
    ctx.globalCompositeOperation = "destination-out";
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(PW / 2, PH / 2, Math.min(PW, PH) / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, PW, PH);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(PW / 2, PH / 2, Math.min(PW, PH) / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(PW / 2, PH / 2, Math.min(PW, PH) / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(0.75, 0.75, PW - 1.5, PH - 1.5);
    }
  }, [scale, offset, imageSrc, shape]);

  const onMD = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onMM = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my),
      });
    },
    [dragging],
  );
  const ts = useRef({ tx: 0, ty: 0, ox: 0, oy: 0 });
  const zoom = (d: number) =>
    setScale((s) => Math.min(5, Math.max(0.2, s + d)));
  const reset = () => {
    const img = imgRef.current;
    if (img) {
      setScale(Math.max(PW / img.naturalWidth, PH / img.naturalHeight));
      setOffset({ x: 0, y: 0 });
    }
  };
  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = outputW;
    out.height = outputH;
    const ctx = out.getContext("2d")!;
    const sx = outputW / PW,
      sy = outputH / PH;
    const dw = img.naturalWidth * scale,
      dh = img.naturalHeight * scale;
    const x = ((PW - dw) / 2 + offset.x) * sx,
      y = ((PH - dh) / 2 + offset.y) * sy;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, x, y, dw * sx, dh * sy);
    out.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(
          new File([blob], originalFileName.replace(/\.[^.]+$/, ".webp"), {
            type: "image/webp",
          }),
          URL.createObjectURL(blob),
        );
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
        style={{ width: 368, maxWidth: "95vw" }}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-sm font-medium">
            {shape === "circle" ? "Crop Avatar" : "Crop Banner"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center px-6 pb-3">
          <canvas
            ref={canvasRef}
            width={PW}
            height={PH}
            className="rounded-lg cursor-grab active:cursor-grabbing"
            style={{ width: PW, height: PH, background: "#111" }}
            onMouseDown={onMD}
            onMouseMove={onMM}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
            onTouchStart={(e) => {
              const t = e.touches[0];
              ts.current = {
                tx: t.clientX,
                ty: t.clientY,
                ox: offset.x,
                oy: offset.y,
              };
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              setOffset({
                x: ts.current.ox + (t.clientX - ts.current.tx),
                y: ts.current.oy + (t.clientY - ts.current.ty),
              });
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-2 pb-3 px-6">
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
        <p className="text-center text-[11px] text-muted-foreground pb-3">
          Drag to reposition · slider to zoom
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
          <Button size="sm" className="text-xs h-8" onClick={confirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Minimal markdown renderer — no external deps
function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let h = md
    .replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (_, _l, c) =>
        `<pre class="bg-muted rounded-md px-4 py-3 text-xs  overflow-x-auto my-3"><code>${esc(c.trim())}</code></pre>`,
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
      '<code class="bg-muted rounded px-1 py-0.5 text-[11px] ">$1</code>',
    )
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-foreground underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener">$1</a>',
    )
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(
      /\n{2,}/g,
      '</p><p class="text-sm leading-relaxed text-foreground/90 my-2">',
    )
    .replace(/\n/g, "<br />");
  return `<p class="text-sm leading-relaxed text-foreground/90">${h}</p>`;
}

// Auto-grow textarea
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

// Profile data shape
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

// Edit profile dialog
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
  const [tab, setTab] = useState("images");
  const [cropSrc, setCropSrc] = useState("");
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [readmeTab, setReadmeTab] = useState<"edit" | "preview">("edit");
  const [showAboutMe, setShowAboutMe] = useState(true);

  useEffect(() => {
    if (open) {
      setForm(profile);
      setTab("images");
      setShowAboutMe(!!profile.profileReadme?.trim());
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
        handleCrop(type, file, URL.createObjectURL(file));
        return;
      }
      setCropSrc(URL.createObjectURL(file));
      setCropFile(file.name);
      setCropType(type);
      setCropOpen(true);
    };
    input.click();
  };

  const handleCrop = useCallback(
    async (
      type: "avatar" | "banner",
      croppedFile: File,
      previewUrl: string,
    ) => {
      setCropOpen(false);
      URL.revokeObjectURL(cropSrc);
      const setU = type === "avatar" ? setAvatarUploading : setBannerUploading;
      setU(true);
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
        window.dispatchEvent(new Event("profileUpdate"));
        toast.success(`${type === "avatar" ? "Avatar" : "Banner"} updated`);
      } catch (err) {
        console.error(err);
        setForm((f) => ({
          ...f,
          [type === "avatar" ? "avatarUrl" : "bannerUrl"]:
            type === "avatar" ? profile.avatarUrl : profile.bannerUrl,
        }));
        URL.revokeObjectURL(previewUrl);
        toast.error("Upload failed");
      } finally {
        setU(false);
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
        if (!showAboutMe) next = "";
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
      const final = { ...form };
      if (!showAboutMe) final.profileReadme = "";
      onSave(final);
      onOpenChange(false);
      window.dispatchEvent(new Event("profileUpdate"));
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
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
        originalFileName={cropFile}
        onConfirm={(f, u) => handleCrop(cropType, f, u)}
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
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors",
                    tab === t
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
            {tab === "images" && (
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
            {tab === "info" && (
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
            {tab === "readme" && (
              <div className="h-full flex flex-col px-6 py-4 gap-3 overflow-hidden">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Write Markdown to customise your profile — shown as a pinned
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
                    Show About Me card on profile
                  </span>
                  <Switch
                    checked={showAboutMe}
                    onCheckedChange={setShowAboutMe}
                  />
                </div>
                {readmeTab === "edit" ? (
                  <textarea
                    className="flex-1 w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none overflow-y-auto"
                    value={form.profileReadme}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, profileReadme: e.target.value }))
                    }
                    placeholder={`# Hi, I'm ${form.displayName || "your name"} 👋\n\nWrite anything here using **Markdown**.`}
                    spellCheck={false}
                  />
                ) : (
                  <div
                    className="flex-1 overflow-y-auto rounded-md border border-border px-4 py-3 text-sm"
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

// Platform stats
interface PlatformStatsData {
  total_users: number;
  new_users_week: number;
  total_problems: number;
  total_submissions: number;
  submissions_today: number;
  correct_submissions: number;
}

function PlatformStats({
  data,
  loading,
}: {
  data: PlatformStatsData | null;
  loading: boolean;
}) {
  const cards = data
    ? [
        {
          label: "Total Users",
          value: data.total_users.toLocaleString(),
          delta: `+${data.new_users_week} this week`,
          icon: Users,
          positive: true,
        },
        {
          label: "Problems",
          value: data.total_problems.toLocaleString(),
          delta: "published",
          icon: Code2,
          positive: true,
        },
        {
          label: "Submissions",
          value: data.total_submissions.toLocaleString(),
          delta: `+${data.submissions_today} today`,
          icon: Activity,
          positive: true,
        },
        {
          label: "Accuracy",
          value:
            data.total_submissions > 0
              ? `${Math.round((data.correct_submissions / data.total_submissions) * 100)}%`
              : "—",
          delta: "correct submissions",
          icon: CheckCircle2,
          positive: true,
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-6 w-16 mb-2 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </CardContent>
            </Card>
          ))
        : cards.map(({ label, value, delta, icon: Icon, positive }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold tracking-tight mt-0.5">
                      {value}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5",
                        positive ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {delta}
                    </p>
                  </div>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}

// Activity feed
interface ActivityEvent {
  kind: string;
  text: string;
  sub: string;
  event_time: string;
}

const kindMeta: Record<string, { icon: React.ElementType; color: string }> = {
  user_join: { icon: Users, color: "text-blue-500" },
  submission: { icon: Activity, color: "text-emerald-500" },
  problem_edit: { icon: PenLine, color: "text-violet-500" },
  default: { icon: AlertCircle, color: "text-amber-500" },
};

function ActivityFeed({
  events,
  loading,
}: {
  events: ActivityEvent[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Platform events across all users
            </CardDescription>
          </div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                Full log — coming soon
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3">
              <Skeleton className="w-7 h-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40 rounded" />
                <Skeleton className="h-2.5 w-56 rounded" />
              </div>
              <Skeleton className="h-2.5 w-12 rounded shrink-0" />
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="px-6 py-8 text-center text-xs text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          events.map((item, i) => {
            const meta = kindMeta[item.kind] || kindMeta.default;
            const Icon = meta.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="mt-0.5 shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-muted/60">
                  <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{item.text}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.sub}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                  {timeAgo(item.event_time)}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// Quick actions
const quickActions = [
  {
    label: "Manage Users",
    description: "View, filter, and manage accounts",
    icon: Users,
    href: "/dashboard/users",
    disabled: false,
  },
  {
    label: "Content Editor",
    description: "Create or edit SQL problems",
    icon: Code2,
    href: "/dashboard/content",
    disabled: false,
  },
  {
    label: "Announcements",
    description: "Post platform-wide notices",
    icon: BookOpen,
    href: "/admin/announce",
    disabled: true,
    note: "Coming soon",
  },
  {
    label: "System Logs",
    description: "Browse application logs",
    icon: Database,
    href: "/admin/logs",
    disabled: true,
    note: "Coming soon",
  },
];

function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardDescription className="text-xs">
          Jump to frequently used admin tools
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {quickActions.map(
          ({ label, description, icon: Icon, href, disabled, note }) => (
            <a
              key={label}
              href={disabled ? undefined : href}
              aria-disabled={disabled}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border p-3 transition-colors",
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-muted/40 cursor-pointer",
              )}
            >
              <div className="mt-0.5 shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-muted/60">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{label}</p>
                  {note && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal h-4 px-1.5 py-0"
                    >
                      {note}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {description}
                </p>
              </div>
            </a>
          ),
        )}
      </CardContent>
    </Card>
  );
}

// System status
const systemChecks = [
  { label: "API", ok: true },
  { label: "Database", ok: true },
  { label: "Cloudinary", ok: true },
  { label: "Auth service", ok: true },
  { label: "Job queue", ok: false },
];

function SystemStatus() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">System Status</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Live health indicators
            </CardDescription>
          </div>
          <Zap className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {systemChecks.map(({ label, ok }) => (
          <div
            key={label}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-muted-foreground">{label}</span>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full",
                  ok ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              <span className={ok ? "text-emerald-500" : "text-rose-500"}>
                {ok ? "Operational" : "Degraded"}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Admin notes scratchpad
function AdminNotes() {
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/admin/notes", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setNotes(d.data.notes || "");
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      setEditing(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Admin Notes</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Private scratchpad — only visible to you
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={editing ? save : () => setEditing(true)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : editing ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Edit3 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            ref={ref}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        ) : notes ? (
          <div className="space-y-1">
            {notes
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed"
                >
                  {line}
                </p>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No notes yet. Click the edit button to add some.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main admin profile page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProfile() {
  const [editOpen, setEditOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStatsData | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
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
    createdAt: "",
  });

  useEffect(() => {
    fetch("/api/profile/get-ProfileData", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
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
            createdAt: d.created_at ?? "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setStats(d.data);
      })
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/activity?limit=10", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setActivity(d.data);
      })
      .catch(console.error)
      .finally(() => setActivityLoading(false));
  }, []);

  const renderedReadme = useMemo(
    () => (profile.profileReadme ? renderMarkdown(profile.profileReadme) : ""),
    [profile.profileReadme],
  );
  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
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

      {/* Main content sits above the dot layer */}
      <main className="relative z-10 w-full max-w-4xl mx-auto pb-10">
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

        <div className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 -mt-10 sm:-mt-12 mb-8">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shrink-0 shadow-sm">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-xl font-semibold">
                {getInitials(profile.displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 w-full pt-2 sm:pt-12">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  {profileLoading ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-7 w-36 rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                          {profile.displayName || "—"}
                        </h1>
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium gap-1 h-5 px-2"
                        >
                          <Shield className="w-3 h-3" /> Admin
                        </Badge>
                      </div>
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
                  <Settings className="w-3 h-3" /> Edit Profile
                </Button>
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

        <div className="px-4 sm:px-6 space-y-6">
          <PlatformStats data={stats} loading={statsLoading} />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ActivityFeed events={activity} loading={activityLoading} />
              <QuickActions />
            </div>
            <div className="space-y-6">
              <SystemStatus />
              <AdminNotes />
            </div>
          </div>
        </div>

        {/* Footer — Vorn wordmark replacing the old plain text footer */}
        <div className="px-4 sm:px-6">
          <Separator className="my-8" />
          <div className="mt-8 mb-4 flex flex-col items-center gap-4 select-none">
            <span className="pointer-events-none bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-9xl leading-none font-semibold text-transparent dark:from-white dark:to-slate-900/10">
              Vorn
            </span>
            <p className="pl-2 text-sm text-muted-foreground uppercase tracking-wide">
              built for SQL mastery
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
