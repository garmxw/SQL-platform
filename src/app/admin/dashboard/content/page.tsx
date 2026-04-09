"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Code2,
  Trophy,
  Shield,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Clock,
  Zap,
  Star,
  AlertTriangle,
  FileText,
  Layers,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Matches the difficulty colors used on the student side
function DifficultyBadge({ d }: { d: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium capitalize",
        d === "easy"
          ? "text-emerald-500"
          : d === "medium"
            ? "text-amber-500"
            : "text-rose-500",
      )}
    >
      {d}
    </span>
  );
}
// Published status pill
function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
        published
          ? "bg-emerald-500/15 text-emerald-500"
          : "bg-muted text-muted-foreground",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
// Simple confirmation dialog reused across the page
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs h-8"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// Hint row editor — used in both lesson and standalone problem forms
function HintEditor({
  hints,
  onChange,
}: {
  hints: { hint_order: number; content: string; xp_penalty: number }[];
  onChange: (h: typeof hints) => void;
}) {
  const add = () =>
    onChange([
      ...hints,
      { hint_order: hints.length + 1, content: "", xp_penalty: 5 },
    ]);
  const remove = (i: number) =>
    onChange(
      hints
        .filter((_, idx) => idx !== i)
        .map((h, idx) => ({ ...h, hint_order: idx + 1 })),
    );
  const update = (i: number, key: string, val: string | number) =>
    onChange(hints.map((h, idx) => (idx === i ? { ...h, [key]: val } : h)));
  return (
    <div className="space-y-2">
      {hints.map((h, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 space-y-1.5">
            <Textarea
              className="text-xs resize-none min-h-[56px]"
              placeholder={`Hint ${i + 1}`}
              value={h.content}
              onChange={(e) => update(i, "content", e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground shrink-0">
                XP penalty
              </Label>
              <Input
                type="number"
                className="h-6 text-xs w-16"
                min={0}
                max={100}
                value={h.xp_penalty}
                onChange={(e) =>
                  update(i, "xp_penalty", Number(e.target.value))
                }
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 mt-0.5"
            onClick={() => remove(i)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5 w-full"
        onClick={add}
      >
        <Plus className="w-3 h-3" /> Add hint
      </Button>
    </div>
  );
}
// Shared problem form fields — reused for both lesson-embedded and standalone problems

export function ProblemFields({
  form,
  onChange,
}: {
  form: any;
  onChange: (key: string, val: any) => void;
}) {
  // Local state to handle the tag input field before it becomes a badge
  const [tagInput, setTagInput] = useState("");

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault(); // Prevent typing the comma or submitting a form
      const newTag = tagInput.trim();

      if (newTag) {
        const currentTags = form.tags || [];
        // Prevent duplicates
        if (!currentTags.includes(newTag)) {
          onChange("tags", [...currentTags, newTag]);
        }
      }
      // Clear the input after creating the badge
      setTagInput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            className="h-8 text-xs"
            value={form.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Problem title"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Difficulty</Label>
          <Select
            value={form.difficulty || "easy"}
            onValueChange={(v) => onChange("difficulty", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy" className="text-xs">
                Easy
              </SelectItem>
              <SelectItem value="medium" className="text-xs">
                Medium
              </SelectItem>
              <SelectItem value="hard" className="text-xs">
                Hard
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description (Markdown)</Label>
        <Textarea
          className="text-xs font-mono resize-none min-h-[100px]"
          value={form.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Describe the problem…"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Schema SQL (CREATE TABLE setup for the editor sandbox)
        </Label>
        <Textarea
          className="text-xs font-mono resize-none min-h-[80px]"
          value={form.schema_sql || ""}
          onChange={(e) => onChange("schema_sql", e.target.value)}
          placeholder="CREATE TABLE employees (...);"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Starter SQL (pre-loaded in editor)</Label>
        <Textarea
          className="text-xs font-mono resize-none min-h-[60px]"
          value={form.starter_sql || ""}
          onChange={(e) => onChange("starter_sql", e.target.value)}
          placeholder="SELECT * FROM ..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Solution SQL (accepted answer)</Label>
        <Textarea
          className="text-xs font-mono resize-none min-h-[60px]"
          value={form.solution_sql_text || ""}
          onChange={(e) => onChange("solution_sql_text", e.target.value)}
          placeholder="SELECT ..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Solution Explanation (Markdown, shown after solving)
        </Label>
        <Textarea
          className="text-xs resize-none min-h-[60px]"
          value={form.solution_explanation || ""}
          onChange={(e) => onChange("solution_explanation", e.target.value)}
          placeholder="Explain the approach…"
        />
      </div>

      {/* Fixed grid with better label wrapping and bottom alignment for inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col justify-end h-full space-y-1.5">
          <Label className="text-xs">XP reward</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.xp_reward ?? 20}
            onChange={(e) => onChange("xp_reward", Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col justify-end h-full space-y-1.5">
          <Label className="text-xs">Hint XP penalty</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.hint_xp_penalty ?? 5}
            onChange={(e) =>
              onChange("hint_xp_penalty", Number(e.target.value))
            }
          />
        </div>
        <div className="flex flex-col justify-end h-full space-y-1.5">
          <Label className="text-xs">Solution XP penalty</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.solution_xp_penalty ?? 10}
            onChange={(e) =>
              onChange("solution_xp_penalty", Number(e.target.value))
            }
          />
        </div>
        <div className="flex flex-col justify-end h-full space-y-1.5">
          <Label className="text-xs whitespace-normal leading-tight">
            Time limit (sec, 0 = none)
          </Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.time_limit_seconds ?? 0}
            onChange={(e) =>
              onChange("time_limit_seconds", Number(e.target.value) || null)
            }
          />
        </div>
      </div>

      {/* Improved Tags input with live preview and keydown listener */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tags (Type and press comma)</Label>
        <Input
          className="h-8 text-xs"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="e.g. SELECT, JOIN..."
        />
        {/* Live preview as nice badges */}
        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {form.tags.map((tag: string, i: number) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] px-2.5 py-px flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-rose-500 text-xs leading-none"
                  onClick={() => {
                    const updated = form.tags.filter(
                      (_: any, idx: number) => idx !== i,
                    );
                    onChange("tags", updated);
                  }}
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Hints</Label>
        <HintEditor
          hints={form.hints || []}
          onChange={(v: any) => onChange("hints", v)}
        />
      </div>
    </div>
  );
}
// Lesson form fields — the lesson body is a markdown editor
function LessonFields({
  form,
  onChange,
}: {
  form: any;
  onChange: (key: string, val: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            className="h-8 text-xs"
            value={form.title || ""}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Lesson title"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Order in track</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={1}
            value={form.lesson_order ?? 1}
            onChange={(e) => onChange("lesson_order", Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Lesson content (Markdown)</Label>
        <p className="text-[10px] text-muted-foreground">
          This is the full lesson body shown on the left panel of the lesson
          page.
        </p>
        <Textarea
          className="text-xs font-mono resize-none min-h-[220px] leading-relaxed"
          value={form.content || ""}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder={`# SQL Data Types\n\nIn SQL, each column must be assigned a data type…\n\n### Numeric Types\n\n\`\`\`sql\nCREATE TABLE example (\n id INT PRIMARY KEY\n);\n\`\`\``}
          spellCheck={false}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">
          Demo SQL (pre-loaded in editor when lesson opens)
        </Label>
        <Textarea
          className="text-xs font-mono resize-none min-h-[60px]"
          value={form.demo_sql || ""}
          onChange={(e) => onChange("demo_sql", e.target.value)}
          placeholder="-- Try running this query\nSELECT * FROM employees;"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">XP reward</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.xp_reward ?? 10}
            onChange={(e) => onChange("xp_reward", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hint XP penalty</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.hint_xp_penalty ?? 5}
            onChange={(e) =>
              onChange("hint_xp_penalty", Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Solution XP penalty</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            min={0}
            value={form.solution_xp_penalty ?? 10}
            onChange={(e) =>
              onChange("solution_xp_penalty", Number(e.target.value))
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={!!form.is_published}
          onCheckedChange={(v) => onChange("is_published", v)}
          id="lesson_published"
        />
        <Label htmlFor="lesson_published" className="text-xs cursor-pointer">
          Published
        </Label>
      </div>
    </div>
  );
}
// Badge form dialog
function BadgeFormDialog({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: any | null;
  onSaved: (b: any) => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  useEffect(() => {
    if (open)
      setForm(
        initial
          ? {
              ...initial,
              criteria_type: initial.criteria_json?.type || "",
              criteria_value: initial.criteria_json?.value ?? "",
            }
          : {
              name: "",
              code: "",
              description: "",
              xp_reward: 0,
              rarity: "common",
              is_active: true,
              criteria_type: "",
              criteria_value: "",
            },
      );
  }, [open, initial]);
  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description || null,
      icon_url: form.icon_url || null,
      xp_reward: form.xp_reward ?? 0,
      rarity: form.rarity || "common",
      is_active: form.is_active ?? true,
      criteria_json: form.criteria_type
        ? {
            type: form.criteria_type,
            value: Number(form.criteria_value) || form.criteria_value,
          }
        : null,
    };
    try {
      const url = initial
        ? `/api/content/badges/${initial.id}`
        : "/api/content/badges";
      const meth = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      onSaved(data.data);
      onClose();
      toast.success(initial ? "Badge updated" : "Badge created");
    } catch {
      toast.error("Failed to save badge");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial ? "Edit Badge" : "New Badge"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8 text-xs"
                value={form.name || ""}
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Code (unique key)</Label>
              <Input
                className="h-8 text-xs font-mono"
                value={form.code || ""}
                onChange={(e) => upd("code", e.target.value)}
                placeholder="streak_7"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              className="text-xs resize-none min-h-[56px]"
              value={form.description || ""}
              onChange={(e) => upd("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Icon URL</Label>
              <Input
                className="h-8 text-xs"
                value={form.icon_url || ""}
                onChange={(e) => upd("icon_url", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">XP reward</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                min={0}
                value={form.xp_reward ?? 0}
                onChange={(e) => upd("xp_reward", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Rarity</Label>
              <Select
                value={form.rarity || "common"}
                onValueChange={(v) => upd("rarity", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["common", "uncommon", "rare", "epic", "legendary"].map(
                    (r) => (
                      <SelectItem
                        key={r}
                        value={r}
                        className="text-xs capitalize"
                      >
                        {r}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Award criteria type</Label>
              <Select
                value={form.criteria_type || "none"}
                onValueChange={(v) =>
                  upd("criteria_type", v === "none" ? "" : v)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    Manual only
                  </SelectItem>
                  <SelectItem value="streak" className="text-xs">
                    Streak days
                  </SelectItem>
                  <SelectItem value="problems_solved" className="text-xs">
                    Problems solved
                  </SelectItem>
                  <SelectItem value="lessons_completed" className="text-xs">
                    Lessons completed
                  </SelectItem>
                  <SelectItem value="xp_reached" className="text-xs">
                    XP reached
                  </SelectItem>
                  <SelectItem value="track_completed" className="text-xs">
                    Track completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.criteria_type && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Criteria value (e.g. 7 for 7-day streak)
              </Label>
              <Input
                className="h-8 text-xs"
                value={form.criteria_value ?? ""}
                onChange={(e) => upd("criteria_value", e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={!!form.is_active}
              onCheckedChange={(v) => upd("is_active", v)}
              id="badge_active"
            />
            <Label htmlFor="badge_active" className="text-xs cursor-pointer">
              Active (can be awarded)
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create badge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// Exam question row editor used inside the exam dialog
function ExamQuestionRow({ q, onDelete }: { q: any; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20 group">
      <span className="text-[10px] text-muted-foreground mt-1 shrink-0 w-4">
        {q.question_order}.
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{q.question_text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground capitalize">
            {q.question_type.replace("_", " ")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            · {q.points} pts
          </span>
          {q.choices && (
            <span className="text-[10px] text-muted-foreground">
              · {q.choices.length} choices
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3 text-rose-500" />
      </Button>
    </div>
  );
}
// Exam form dialog — creates/edits a track exam and its questions
function ExamDialog({
  open,
  onClose,
  trackId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  trackId: number;
  initial: any | null;
  onSaved: () => void;
}) {
  const [meta, setMeta] = useState<any>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQ, setNewQ] = useState<any>({
    question_type: "multiple_choice",
    points: 10,
    choices: [{ choice_text: "", is_correct: false, choice_order: 1 }],
  });
  const [saving, setSaving] = useState(false);
  const [addingQ, setAddingQ] = useState(false);
  const [showQForm, setShowQForm] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setMeta({
        title: initial.title,
        description: initial.description || "",
        time_limit_seconds: initial.time_limit_seconds,
        pass_threshold: initial.pass_threshold,
        cert_threshold: initial.cert_threshold,
        is_published: initial.is_published,
      });
      fetch(`/api/content/exams/${initial.id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "success") setQuestions(d.data.questions);
        })
        .catch(console.error);
    } else {
      setMeta({
        title: "",
        description: "",
        time_limit_seconds: 3600,
        pass_threshold: 85,
        cert_threshold: 90,
        is_published: false,
      });
      setQuestions([]);
    }
  }, [open, initial]);
  const saveMeta = async () => {
    setSaving(true);
    try {
      if (initial) {
        await fetch(`/api/content/exams/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(meta),
        });
      } else {
        await fetch("/api/content/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ track_id: trackId, ...meta }),
        });
      }
      onSaved();
      onClose();
      toast.success(initial ? "Exam updated" : "Exam created");
    } catch {
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };
  const addQuestion = async () => {
    if (!initial) {
      toast.error("Save exam metadata first");
      return;
    }
    setAddingQ(true);
    try {
      const payload = { ...newQ, question_order: questions.length + 1 };
      const res = await fetch(`/api/content/exams/${initial.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions((q) => [...q, data.data]);
      setNewQ({
        question_type: "multiple_choice",
        points: 10,
        choices: [{ choice_text: "", is_correct: false, choice_order: 1 }],
      });
      setShowQForm(false);
      toast.success("Question added");
    } catch {
      toast.error("Failed to add question");
    } finally {
      setAddingQ(false);
    }
  };
  const deleteQuestion = async (qId: number) => {
    await fetch(`/api/content/questions/${qId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setQuestions((q) => q.filter((x) => x.id !== qId));
  };
  const updNewQ = (k: string, v: any) =>
    setNewQ((q: any) => ({ ...q, [k]: v }));
  const updChoice = (i: number, k: string, v: any) =>
    setNewQ((q: any) => ({
      ...q,
      choices: q.choices.map((c: any, idx: number) =>
        idx === i ? { ...c, [k]: v } : c,
      ),
    }));
  const addChoice = () =>
    setNewQ((q: any) => ({
      ...q,
      choices: [
        ...q.choices,
        {
          choice_text: "",
          is_correct: false,
          choice_order: q.choices.length + 1,
        },
      ],
    }));
  const removeChoice = (i: number) =>
    setNewQ((q: any) => ({
      ...q,
      choices: q.choices.filter((_: any, idx: number) => idx !== i),
    }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[560px] p-0 flex flex-col gap-0 overflow-hidden"
        style={{ height: "min(92vh, 720px)" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-base">
            {initial ? "Edit Track Exam" : "New Track Exam"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure the exam that unlocks the next track.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
          {/* Exam metadata */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Exam Settings
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                className="h-8 text-xs"
                value={meta.title || ""}
                onChange={(e) =>
                  setMeta((m: any) => ({ ...m, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                className="text-xs resize-none min-h-[56px]"
                value={meta.description || ""}
                onChange={(e) =>
                  setMeta((m: any) => ({ ...m, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time limit (sec)
                </Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  min={60}
                  value={meta.time_limit_seconds ?? 3600}
                  onChange={(e) =>
                    setMeta((m: any) => ({
                      ...m,
                      time_limit_seconds: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pass threshold %</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  min={0}
                  max={100}
                  value={meta.pass_threshold ?? 85}
                  onChange={(e) =>
                    setMeta((m: any) => ({
                      ...m,
                      pass_threshold: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cert threshold %</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  min={0}
                  max={100}
                  value={meta.cert_threshold ?? 90}
                  onChange={(e) =>
                    setMeta((m: any) => ({
                      ...m,
                      cert_threshold: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!!meta.is_published}
                onCheckedChange={(v) =>
                  setMeta((m: any) => ({ ...m, is_published: v }))
                }
                id="exam_pub"
              />
              <Label htmlFor="exam_pub" className="text-xs cursor-pointer">
                Published
              </Label>
            </div>
          </div>
          <Separator />
          {/* Questions list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Questions ({questions.length})
              </p>
              {initial && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => setShowQForm((v) => !v)}
                >
                  <Plus className="w-3 h-3" /> Add question
                </Button>
              )}
              {!initial && (
                <p className="text-[11px] text-muted-foreground">
                  Save exam settings first to add questions.
                </p>
              )}
            </div>
            {questions.map((q) => (
              <ExamQuestionRow
                key={q.id}
                q={q}
                onDelete={() => deleteQuestion(q.id)}
              />
            ))}
            {!questions.length && !showQForm && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No questions yet.
              </p>
            )}
            {showQForm && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs font-medium">New question</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={newQ.question_type}
                      onValueChange={(v) => updNewQ("question_type", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice" className="text-xs">
                          Multiple choice
                        </SelectItem>
                        <SelectItem value="true_false" className="text-xs">
                          True / False
                        </SelectItem>
                        <SelectItem value="sql_problem" className="text-xs">
                          SQL Problem
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Points</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      min={1}
                      value={newQ.points ?? 10}
                      onChange={(e) =>
                        updNewQ("points", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Question text</Label>
                  <Textarea
                    className="text-xs resize-none min-h-[60px]"
                    value={newQ.question_text || ""}
                    onChange={(e) => updNewQ("question_text", e.target.value)}
                  />
                </div>
                {(newQ.question_type === "multiple_choice" ||
                  newQ.question_type === "true_false") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Choices</Label>
                    {newQ.choices.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Switch
                          checked={c.is_correct}
                          onCheckedChange={(v) => updChoice(i, "is_correct", v)}
                          className="shrink-0"
                        />
                        <Input
                          className="h-7 text-xs flex-1"
                          value={c.choice_text}
                          onChange={(e) =>
                            updChoice(i, "choice_text", e.target.value)
                          }
                          placeholder={`Choice ${i + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeChoice(i)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={addChoice}
                    >
                      <Plus className="w-3 h-3" /> Add choice
                    </Button>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowQForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addQuestion}
                    disabled={addingQ}
                  >
                    {addingQ ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Add question"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={saveMeta}
            disabled={saving}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create exam"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Lesson + its embedded problem — full form dialog
function LessonDialog({
  open,
  onClose,
  trackId,
  tracks,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  trackId: number | null;
  tracks: any[];
  initial: any | null;
  onSaved: () => void;
}) {
  const [lessonForm, setLessonForm] = useState<any>({});
  const [problemForm, setProblemForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("lesson");
  useEffect(() => {
    if (!open) return;
    if (initial) {
      fetch(`/api/content/lessons/${initial.id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "success") {
            setLessonForm({
              ...d.data.lesson,
              track_id: d.data.lesson.track_id,
            });
            if (d.data.problem) {
              const p = d.data.problem;
              setProblemForm({
                ...p,
                solution_sql_text: Array.isArray(p.solution_sql)
                  ? p.solution_sql[0]
                  : typeof p.solution_sql === "string"
                    ? p.solution_sql
                    : "",
                hints: p.hints_arr
                  ? p.hints_arr.map((c: string, i: number) => ({
                      hint_order: i + 1,
                      content: c,
                      xp_penalty: 5,
                    }))
                  : [],
              });
            }
          }
        })
        .catch(console.error);
    } else {
      setLessonForm({
        track_id: trackId,
        lesson_order: 1,
        xp_reward: 10,
        hint_xp_penalty: 5,
        solution_xp_penalty: 10,
        is_published: false,
      });
      setProblemForm({
        difficulty: "easy",
        xp_reward: 20,
        hint_xp_penalty: 5,
        solution_xp_penalty: 10,
        is_published: false,
        order_matters: false,
        hints: [],
      });
    }
    setTab("lesson");
  }, [open, initial, trackId]);
  const updLesson = (k: string, v: any) =>
    setLessonForm((f: any) => ({ ...f, [k]: v }));
  const updProblem = (k: string, v: any) =>
    setProblemForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...lessonForm,
        problem: {
          ...problemForm,
          title: problemForm.title || lessonForm.title,
          solution_sql: problemForm.solution_sql_text
            ? [problemForm.solution_sql_text]
            : [],
        },
      };
      const url = initial
        ? `/api/content/lessons/${initial.id}`
        : "/api/content/lessons";
      const meth = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
      onClose();
      toast.success(initial ? "Lesson updated" : "Lesson created");
    } catch {
      toast.error("Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[640px] p-0 flex flex-col gap-0 overflow-hidden"
        style={{ height: "min(92vh, 760px)" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-base">
            {initial ? "Edit Lesson" : "New Lesson"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            The lesson and its embedded practice problem are saved together.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 shrink-0">
          <div className="flex gap-1 border-b border-border pb-0">
            {(["lesson", "problem"] as const).map((t) => (
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
                {t === "lesson" ? "Lesson Content" : "Practice Problem"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "lesson" && (
            <>
              <div className="space-y-1.5 mb-4">
                <Label className="text-xs">Track</Label>
                <Select
                  value={String(lessonForm.track_id || "")}
                  onValueChange={(v) => updLesson("track_id", Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        className="text-xs"
                      >
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LessonFields form={lessonForm} onChange={updLesson} />
            </>
          )}
          {tab === "problem" && (
            <ProblemFields form={problemForm} onChange={updProblem} />
          )}
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Standalone problem dialog
function ProblemDialog({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: any | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (initial) {
      fetch(`/api/content/problems/${initial.id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "success") {
            const p = d.data.problem;
            setForm({
              ...p,
              solution_sql_text: d.data.solutions?.[0]?.sql_text || "",
              solution_explanation: d.data.solutions?.[0]?.explanation || "",
              hints: d.data.hints.map((h: any) => ({ ...h })),
            });
          }
        })
        .catch(console.error);
    } else {
      setForm({
        difficulty: "medium",
        xp_reward: 20,
        hint_xp_penalty: 5,
        solution_xp_penalty: 10,
        is_published: false,
        is_standalone: true,
        order_matters: false,
        hints: [],
      });
    }
  }, [open, initial]);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        solution_sql: form.solution_sql_text ? [form.solution_sql_text] : [],
        is_standalone: true,
      };
      const url = initial
        ? `/api/content/problems/${initial.id}`
        : "/api/content/problems";
      const meth = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
      onClose();
      toast.success(initial ? "Problem updated" : "Problem created");
    } catch {
      toast.error("Failed to save problem");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] p-0 flex flex-col gap-0 overflow-hidden"
        style={{ height: "min(92vh, 740px)" }}
      >
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-base">
            {initial ? "Edit Problem" : "New Problem"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ProblemFields form={form} onChange={upd} />
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create problem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Track form dialog — full CREATE/EDIT (adapted to match all other dialogs in the file)
function TrackDialog({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial: any | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            title: initial.title,
            description: initial.description || "",
            difficulty: initial.difficulty || "beginner",
            track_order: initial.track_order ?? 0,
            pass_threshold: initial.pass_threshold ?? 85,
            cert_threshold: initial.cert_threshold ?? 90,
            cover_image_url: initial.cover_image_url || "",
            is_published: initial.is_published ?? false,
          }
        : {
            title: "",
            description: "",
            difficulty: "beginner",
            track_order: 0,
            pass_threshold: 85,
            cert_threshold: 90,
            cover_image_url: "",
            is_published: false,
          },
    );
  }, [open, initial]);

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cover_image_url: form.cover_image_url || null,
      };
      const url = initial
        ? `/api/content/tracks/${initial.id}`
        : "/api/content/tracks";
      const meth = initial ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Save failed");
      }

      onSaved();
      onClose();
      toast.success(initial ? "Track updated" : "Track created");
    } catch (err: any) {
      toast.error(err.message || "Failed to save track");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {initial ? "Edit Track" : "New Track"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Tracks are learning paths made up of ordered lessons.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input
              className="h-8 text-xs"
              value={form.title || ""}
              onChange={(e) => upd("title", e.target.value)}
              placeholder="e.g. SQL Fundamentals"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              className="text-xs resize-none min-h-[72px]"
              value={form.description || ""}
              onChange={(e) => upd("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Difficulty</Label>
              <Select
                value={form.difficulty || "beginner"}
                onValueChange={(v) => upd("difficulty", v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner" className="text-xs">
                    Beginner
                  </SelectItem>
                  <SelectItem value="intermediate" className="text-xs">
                    Intermediate
                  </SelectItem>
                  <SelectItem value="advanced" className="text-xs">
                    Advanced
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order (lower = first)</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                min={0}
                value={form.track_order ?? 0}
                onChange={(e) => upd("track_order", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pass threshold %</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                min={0}
                max={100}
                value={form.pass_threshold ?? 85}
                onChange={(e) => upd("pass_threshold", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cert threshold %</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                min={0}
                max={100}
                value={form.cert_threshold ?? 90}
                onChange={(e) => upd("cert_threshold", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cover image URL (optional)</Label>
            <Input
              className="h-8 text-xs"
              value={form.cover_image_url || ""}
              onChange={(e) => upd("cover_image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!form.is_published}
              onCheckedChange={(v) => upd("is_published", v)}
              id="track_published"
            />
            <Label htmlFor="track_published" className="text-xs cursor-pointer">
              Published (visible to students)
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create track"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main page
export default function AdminContent() {
  const [tab, setTab] = useState("tracks");
  const [tracks, setTracks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    tracks: true,
    lessons: true,
    problems: true,
    badges: true,
    exams: true,
  });
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);

  // Dialog states
  const [lessonDialog, setLessonDialog] = useState<{
    open: boolean;
    initial: any | null;
  }>({ open: false, initial: null });
  const [problemDialog, setProblemDialog] = useState<{
    open: boolean;
    initial: any | null;
  }>({ open: false, initial: null });
  const [badgeDialog, setBadgeDialog] = useState<{
    open: boolean;
    initial: any | null;
  }>({ open: false, initial: null });
  const [examDialog, setExamDialog] = useState<{
    open: boolean;
    initial: any | null;
    trackId: number;
  }>({ open: false, initial: null, trackId: 0 });
  const [trackDialog, setTrackDialog] = useState<{
    open: boolean;
    initial: any | null;
  }>({ open: false, initial: null });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: string;
    id: number;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setLoad = (key: string, v: boolean) =>
    setLoading((l) => ({ ...l, [key]: v }));

  const fetchTracks = useCallback(() => {
    setLoad("tracks", true);
    fetch("/api/content/tracks", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setTracks(d.data);
      })
      .catch(console.error)
      .finally(() => setLoad("tracks", false));
  }, []);

  const fetchLessons = useCallback((trackId?: number) => {
    setLoad("lessons", true);
    const url = trackId
      ? `/api/content/lessons?track_id=${trackId}`
      : "/api/content/lessons";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setLessons(d.data);
      })
      .catch(console.error)
      .finally(() => setLoad("lessons", false));
  }, []);

  const fetchProblems = useCallback(() => {
    setLoad("problems", true);
    fetch("/api/content/problems", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setProblems(d.data);
      })
      .catch(console.error)
      .finally(() => setLoad("problems", false));
  }, []);

  const fetchBadges = useCallback(() => {
    setLoad("badges", true);
    fetch("/api/content/badges", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setBadges(d.data);
      })
      .catch(console.error)
      .finally(() => setLoad("badges", false));
  }, []);

  const fetchExams = useCallback(() => {
    setLoad("exams", true);
    fetch("/api/content/exams", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setExams(d.data);
      })
      .catch(console.error)
      .finally(() => setLoad("exams", false));
  }, []);

  useEffect(() => {
    fetchTracks();
    fetchLessons();
    fetchProblems();
    fetchBadges();
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedTrack) fetchLessons(selectedTrack);
  }, [selectedTrack]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const urlMap: Record<string, string> = {
        lesson: `/api/content/lessons/${deleteConfirm.id}`,
        problem: `/api/content/problems/${deleteConfirm.id}`,
        badge: `/api/content/badges/${deleteConfirm.id}`,
        track: `/api/content/tracks/${deleteConfirm.id}`,
      };
      const res = await fetch(urlMap[deleteConfirm.type], {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteConfirm.type} deleted`);
      if (deleteConfirm.type === "lesson")
        fetchLessons(selectedTrack ?? undefined);
      if (deleteConfirm.type === "problem") fetchProblems();
      if (deleteConfirm.type === "badge") fetchBadges();
      if (deleteConfirm.type === "track") fetchTracks();
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const rarityColor: Record<string, string> = {
    common: "text-muted-foreground",
    uncommon: "text-emerald-500",
    rare: "text-blue-500",
    epic: "text-violet-500",
    legendary: "text-amber-500",
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-10">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Content Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage tracks, lessons, problems, exams and badges
            </p>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 h-9">
            <TabsTrigger value="tracks" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="lessons" className="text-xs gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="problems" className="text-xs gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              Problems
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-xs gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="badges" className="text-xs gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Badges
            </TabsTrigger>
          </TabsList>

          {/* TRACKS TAB */}
          <TabsContent value="tracks" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Tracks</CardTitle>
                    <CardDescription className="text-xs">
                      Learning paths available on Vorn
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() =>
                      setTrackDialog({ open: true, initial: null })
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Track
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading.tracks
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="px-6 py-4 border-b border-border/40"
                      >
                        <Skeleton className="h-4 w-48 rounded" />
                      </div>
                    ))
                  : tracks.map((track) => (
                      <div
                        key={track.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <div
                          className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setExpandedTrack(
                              expandedTrack === track.id ? null : track.id,
                            );
                            setSelectedTrack(track.id);
                          }}
                        >
                          {expandedTrack === track.id ? (
                            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {track.title}
                              </span>
                              <StatusPill published={track.is_published} />
                              <DifficultyBadge
                                d={track.difficulty || "beginner"}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {track.lesson_count} lesson
                              {track.lesson_count !== 1 ? "s" : ""} · Pass{" "}
                              {track.pass_threshold}% · Cert{" "}
                              {track.cert_threshold}%
                              {track.exam_id && (
                                <span className="ml-2">
                                  · Exam{" "}
                                  {track.exam_published ? "published" : "draft"}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExamDialog({
                                  open: true,
                                  initial:
                                    exams.find(
                                      (ex) => ex.track_id === track.id,
                                    ) || null,
                                  trackId: track.id,
                                });
                              }}
                            >
                              <ClipboardList className="w-3 h-3" />{" "}
                              {track.exam_id ? "Exam" : "Add exam"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLessonDialog({ open: true, initial: null });
                                setSelectedTrack(track.id);
                              }}
                            >
                              <Plus className="w-3 h-3" /> Lesson
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTrackDialog({ open: true, initial: track });
                              }}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                          </div>
                        </div>
                        {expandedTrack === track.id && (
                          <div className="pl-10 pr-6 pb-3 space-y-1">
                            {lessons
                              .filter((l) => l.track_id === track.id)
                              .map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors group"
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                                  <span className="text-xs font-medium flex-1 truncate">
                                    {lesson.lesson_order}. {lesson.title}
                                  </span>
                                  <StatusPill published={lesson.is_published} />
                                  {lesson.problem_title && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                      → {lesson.problem_title}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        setLessonDialog({
                                          open: true,
                                          initial: lesson,
                                        })
                                      }
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        setDeleteConfirm({
                                          open: true,
                                          type: "lesson",
                                          id: lesson.id,
                                          name: lesson.title,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            {!lessons.filter((l) => l.track_id === track.id)
                              .length && (
                              <p className="text-xs text-muted-foreground px-3 py-2">
                                No lessons yet.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LESSONS TAB */}
          <TabsContent value="lessons" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base">Lessons</CardTitle>
                    <CardDescription className="text-xs">
                      Each lesson includes a practice problem
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTrack ? String(selectedTrack) : "all"}
                      onValueChange={(v) => {
                        setSelectedTrack(v === "all" ? null : Number(v));
                        fetchLessons(v === "all" ? undefined : Number(v));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="All tracks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          All tracks
                        </SelectItem>
                        {tracks.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={String(t.id)}
                            className="text-xs"
                          >
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() =>
                        setLessonDialog({ open: true, initial: null })
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Lesson
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs pl-6">#</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Track</TableHead>
                        <TableHead className="text-xs">Problem</TableHead>
                        <TableHead className="text-xs">XP</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading.lessons
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={7} className="py-3 pl-6">
                                <Skeleton className="h-3 w-48 rounded" />
                              </TableCell>
                            </TableRow>
                          ))
                        : lessons.map((l) => (
                            <TableRow
                              key={l.id}
                              className="border-border/40 hover:bg-muted/20 cursor-pointer"
                              onClick={() =>
                                setLessonDialog({ open: true, initial: l })
                              }
                            >
                              <TableCell className="text-xs text-muted-foreground pl-6">
                                {l.lesson_order}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {l.title}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {tracks.find((t) => t.id === l.track_id)
                                  ?.title || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {l.problem_title || (
                                  <span className="text-muted-foreground/40">
                                    None
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {l.xp_reward}
                              </TableCell>
                              <TableCell>
                                <StatusPill published={l.is_published} />
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLessonDialog({
                                          open: true,
                                          initial: l,
                                        });
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs gap-2 text-rose-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          open: true,
                                          type: "lesson",
                                          id: l.id,
                                          name: l.title,
                                        });
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      {!loading.lessons && !lessons.length && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-20 text-center text-xs text-muted-foreground"
                          >
                            No lessons found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROBLEMS TAB */}
          <TabsContent value="problems" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Standalone Problems
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Problems available on the Problems page (LeetCode-style)
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() =>
                      setProblemDialog({ open: true, initial: null })
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Problem
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs pl-6">Title</TableHead>
                        <TableHead className="text-xs">Difficulty</TableHead>
                        <TableHead className="text-xs">XP</TableHead>
                        <TableHead className="text-xs">Hints</TableHead>
                        <TableHead className="text-xs">Time limit</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading.problems
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={7} className="py-3 pl-6">
                                <Skeleton className="h-3 w-48 rounded" />
                              </TableCell>
                            </TableRow>
                          ))
                        : problems.map((p) => (
                            <TableRow
                              key={p.id}
                              className="border-border/40 hover:bg-muted/20 cursor-pointer"
                              onClick={() =>
                                setProblemDialog({ open: true, initial: p })
                              }
                            >
                              <TableCell className="text-xs font-medium pl-6">
                                {p.title}
                              </TableCell>
                              <TableCell>
                                <DifficultyBadge d={p.difficulty || "medium"} />
                              </TableCell>
                              <TableCell className="text-xs">
                                {p.xp_reward}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {p.hint_count || 0}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {p.time_limit_seconds
                                  ? `${Math.floor(p.time_limit_seconds / 60)}m`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <StatusPill published={p.is_published} />
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setProblemDialog({
                                          open: true,
                                          initial: p,
                                        });
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs gap-2 text-rose-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          open: true,
                                          type: "problem",
                                          id: p.id,
                                          name: p.title,
                                        });
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      {!loading.problems && !problems.length && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-20 text-center text-xs text-muted-foreground"
                          >
                            No problems found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXAMS TAB */}
          <TabsContent value="exams" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Track Exams</CardTitle>
                    <CardDescription className="text-xs">
                      One exam per track — unlocks the next track on passing
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs pl-6">Track</TableHead>
                        <TableHead className="text-xs">Exam title</TableHead>
                        <TableHead className="text-xs">Questions</TableHead>
                        <TableHead className="text-xs">Time limit</TableHead>
                        <TableHead className="text-xs">Pass / Cert %</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading.exams
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={7} className="py-3 pl-6">
                                <Skeleton className="h-3 w-48 rounded" />
                              </TableCell>
                            </TableRow>
                          ))
                        : exams.map((ex) => (
                            <TableRow
                              key={ex.id}
                              className="border-border/40 hover:bg-muted/20 cursor-pointer"
                              onClick={() =>
                                setExamDialog({
                                  open: true,
                                  initial: ex,
                                  trackId: ex.track_id,
                                })
                              }
                            >
                              <TableCell className="text-xs font-medium pl-6">
                                {ex.track_title}
                              </TableCell>
                              <TableCell className="text-xs">
                                {ex.title}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {ex.question_count || 0}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {Math.floor(ex.time_limit_seconds / 60)}m
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {ex.pass_threshold}% / {ex.cert_threshold}%
                              </TableCell>
                              <TableCell>
                                <StatusPill published={ex.is_published} />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExamDialog({
                                      open: true,
                                      initial: ex,
                                      trackId: ex.track_id,
                                    });
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      {!loading.exams && !exams.length && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-20 text-center text-xs text-muted-foreground"
                          >
                            No exams yet. Create one from the Tracks tab.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BADGES TAB */}
          <TabsContent value="badges" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Badges</CardTitle>
                    <CardDescription className="text-xs">
                      Achievements awarded to students
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() =>
                      setBadgeDialog({ open: true, initial: null })
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Badge
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs pl-6">Name</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Rarity</TableHead>
                        <TableHead className="text-xs">XP reward</TableHead>
                        <TableHead className="text-xs">Criteria</TableHead>
                        <TableHead className="text-xs">Active</TableHead>
                        <TableHead className="text-xs w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading.badges
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={7} className="py-3 pl-6">
                                <Skeleton className="h-3 w-48 rounded" />
                              </TableCell>
                            </TableRow>
                          ))
                        : badges.map((b) => (
                            <TableRow
                              key={b.id}
                              className="border-border/40 hover:bg-muted/20 cursor-pointer"
                              onClick={() =>
                                setBadgeDialog({ open: true, initial: b })
                              }
                            >
                              <TableCell className="text-xs font-medium pl-6">
                                {b.name}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {b.code}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "text-xs font-medium capitalize",
                                    rarityColor[b.rarity] || rarityColor.common,
                                  )}
                                >
                                  {b.rarity}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {b.xp_reward}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {b.criteria_json
                                  ? `${b.criteria_json.type} ≥ ${b.criteria_json.value}`
                                  : "Manual"}
                              </TableCell>
                              <TableCell>
                                {b.is_active ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBadgeDialog({
                                          open: true,
                                          initial: b,
                                        });
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-xs gap-2 text-rose-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          open: true,
                                          type: "badge",
                                          id: b.id,
                                          name: b.name,
                                        });
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                      {!loading.badges && !badges.length && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-20 text-center text-xs text-muted-foreground"
                          >
                            No badges yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Separator className="my-8" />
        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Vorn Admin · built for SQL mastery
        </p>
      </main>

      {/* Dialogs */}
      <LessonDialog
        open={lessonDialog.open}
        onClose={() => setLessonDialog({ open: false, initial: null })}
        trackId={selectedTrack}
        tracks={tracks}
        initial={lessonDialog.initial}
        onSaved={() => {
          fetchLessons(selectedTrack ?? undefined);
          fetchTracks();
        }}
      />
      <ProblemDialog
        open={problemDialog.open}
        onClose={() => setProblemDialog({ open: false, initial: null })}
        initial={problemDialog.initial}
        onSaved={fetchProblems}
      />
      <BadgeFormDialog
        open={badgeDialog.open}
        onClose={() => setBadgeDialog({ open: false, initial: null })}
        initial={badgeDialog.initial}
        onSaved={() => fetchBadges()}
      />
      <ExamDialog
        open={examDialog.open}
        onClose={() => setExamDialog((e) => ({ ...e, open: false }))}
        trackId={examDialog.trackId}
        initial={examDialog.initial}
        onSaved={() => {
          fetchExams();
          fetchTracks();
        }}
      />
      <TrackDialog
        open={trackDialog.open}
        onClose={() => setTrackDialog({ open: false, initial: null })}
        initial={trackDialog.initial}
        onSaved={fetchTracks}
      />
      {deleteConfirm && (
        <ConfirmDialog
          open={deleteConfirm.open}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title={`Delete ${deleteConfirm.type}`}
          description={`This will permanently delete "${deleteConfirm.name}" and all related data.`}
          loading={deleting}
        />
      )}
    </div>
  );
}
