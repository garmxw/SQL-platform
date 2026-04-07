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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  SlidersHorizontal,
  X,
  MoreHorizontal,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  Mail,
  MapPin,
  Github,
  Globe,
  Twitter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  BookOpen,
  Activity,
  Trophy,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Helper: initials from any name string
function getInitials(name: string): string {
  const t = name?.trim() || "";
  return t ? t.slice(0, 2).toUpperCase() : "??";
}

// Helper: relative time string
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Shape of a user row returned by GET /api/admin/users
interface UserRow {
  id: number;
  username: string;
  display_name: string | null;
  email: string;
  user_role: string;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  location: string | null;
  avatar_url: string | null;
  github_name: string | null;
  twitter_name: string | null;
  portfolio_url: string | null;
  bio: string | null;
  solved_count: number;
  submission_count: number;
}

// Shape of the detail payload from GET /api/admin/users/:id
interface UserDetail {
  user: UserRow & { login_streak?: number };
  badges: Array<{
    id: number;
    name: string;
    rarity: string;
    icon_url: string | null;
    earned_at: string;
  }>;
  submissions: Array<{
    id: number;
    is_correct: boolean;
    execution_time_ms: number | null;
    created_at: string;
    problem_title: string;
    difficulty: string;
  }>;
  tracks: Array<{
    track_title: string;
    track_difficulty: string;
    completed_problems: number;
    total_problems: number;
    completed: boolean;
  }>;
}

// Pagination metadata returned alongside the user list
interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Active filter state
interface Filters {
  search: string;
  role: string;
  verified: string;
  location: string;
  sort: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  role: "",
  verified: "",
  location: "",
  sort: "newest",
};

// Rarity colors for badges in the detail panel
const rarityColor: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-emerald-500",
  rare: "text-blue-500",
  epic: "text-violet-500",
  legendary: "text-amber-500",
};

// User detail side panel shown when clicking a row
function UserDetailPanel({
  userId,
  onClose,
  onRoleChange,
  onVerifiedChange,
  onDelete,
}: {
  userId: number | null;
  onClose: () => void;
  onRoleChange: (id: number, role: string) => void;
  onVerifiedChange: (id: number, verified: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [patching, setPatching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/users/${userId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") setDetail(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const patch = async (body: Record<string, unknown>) => {
    if (!userId) return;
    setPatching(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Patch failed");
      if (body.user_role !== undefined)
        onRoleChange(userId, body.user_role as string);
      if (body.is_verified !== undefined)
        onVerifiedChange(userId, body.is_verified as boolean);
      toast.success("User updated");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setPatching(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setPatching(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      onDelete(userId);
      onClose();
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setPatching(false);
      setConfirmDelete(false);
    }
  };

  if (!userId) return null;

  const u = detail?.user;

  return (
    <>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Delete user?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete <strong>{u?.username}</strong> and
              all their data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs h-8"
              onClick={handleDelete}
              disabled={patching}
            >
              {patching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Delete permanently"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIXED: Now uses a full Card with borders on ALL sides (top, right, bottom, left) + rounded corners */}
      {/* This makes the detail panel look like a proper card instead of a half-bordered cropped panel */}
      <Card className="w-80 shrink-0 border-border shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-medium">User detail</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full rounded" />
              ))}
            </div>
          ) : !u ? (
            <p className="p-4 text-xs text-muted-foreground">
              Failed to load user.
            </p>
          ) : (
            <div className="p-4 space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border shrink-0">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-sm font-semibold">
                    {getInitials(u.display_name || u.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.display_name || u.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>

              {/* Role + verified controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Role</span>
                  <Select
                    value={u.user_role}
                    onValueChange={(role) => patch({ user_role: role })}
                    disabled={patching}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student" className="text-xs">
                        Student
                      </SelectItem>
                      <SelectItem value="admin" className="text-xs">
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Verified</span>
                  <Button
                    variant={u.is_verified ? "outline" : "secondary"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => patch({ is_verified: !u.is_verified })}
                    disabled={patching}
                  >
                    {u.is_verified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-muted-foreground mr-1 text-rose-500" />
                        Unverified
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "XP", value: u.xp.toLocaleString(), icon: Zap },
                  { label: "Level", value: String(u.level), icon: Trophy },
                  {
                    label: "Solved",
                    value: String(u.solved_count),
                    icon: BookOpen,
                  },
                  {
                    label: "Submissions",
                    value: String(u.submission_count),
                    icon: Activity,
                  },
                  {
                    label: "Streak",
                    value: `${u.current_streak}d`,
                    icon: Flame,
                  },
                  {
                    label: "Best streak",
                    value: `${u.longest_streak}d`,
                    icon: Flame,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none">
                        {label}
                      </p>
                      <p className="text-xs font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Contact / social */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {u.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </span>
                )}
                {u.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {u.location}
                  </span>
                )}
                {u.portfolio_url && (
                  <a
                    href={u.portfolio_url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    {u.portfolio_url}
                  </a>
                )}
                {u.github_name && (
                  <span className="flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 shrink-0" />
                    {u.github_name}
                  </span>
                )}
                {u.twitter_name && (
                  <span className="flex items-center gap-1.5">
                    <Twitter className="w-3.5 h-3.5 shrink-0" />
                    {u.twitter_name}
                  </span>
                )}
              </div>

              {/* Dates */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{timeAgo(u.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last login</span>
                  <span>{timeAgo(u.last_login)}</span>
                </div>
              </div>

              {/* Badges */}
              {detail?.badges && detail.badges.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium mb-2">
                      Badges ({detail.badges.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.badges.map((b) => (
                        <TooltipProvider key={b.id} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "text-[11px] font-medium px-2 py-0.5 rounded-full border border-border cursor-default",
                                  rarityColor[b.rarity] || rarityColor.common,
                                )}
                              >
                                {b.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs capitalize">
                              {b.rarity}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Track progress */}
              {detail?.tracks && detail.tracks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium mb-2">Track Progress</p>
                    <div className="space-y-2">
                      {detail.tracks.map((t, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="truncate text-muted-foreground max-w-[160px]">
                              {t.track_title}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {t.completed_problems}/{t.total_problems}
                            </span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-chart-2 rounded-full"
                              style={{
                                width: t.total_problems
                                  ? `${(t.completed_problems / t.total_problems) * 100}%`
                                  : "0%",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Recent submissions */}
              {detail?.submissions && detail.submissions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium mb-2">
                      Recent Submissions
                    </p>
                    <div className="space-y-1.5">
                      {detail.submissions.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {s.is_correct ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          )}
                          <span className="truncate text-muted-foreground flex-1">
                            {s.problem_title}
                          </span>
                          <span className="shrink-0 text-muted-foreground/60">
                            {timeAgo(s.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Danger zone */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 text-rose-500 border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500"
                onClick={() => setConfirmDelete(true)}
                disabled={patching}
              >
                Delete account
              </Button>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

// Filter panel that expands below the search bar
function FilterPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}) {
  const activeCount = Object.entries(filters).filter(
    ([k, v]) => k !== "sort" && v !== "",
  ).length;

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          Filters{" "}
          {activeCount > 0 && (
            <span className="ml-1 text-muted-foreground">
              ({activeCount} active)
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Role</Label>
          <Select
            value={filters.role || "all"}
            onValueChange={(v) => onChange("role", v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Any role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Any role
              </SelectItem>
              <SelectItem value="student" className="text-xs">
                Student
              </SelectItem>
              <SelectItem value="admin" className="text-xs">
                Admin
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Verified</Label>
          <Select
            value={filters.verified || "all"}
            onValueChange={(v) => onChange("verified", v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Any status
              </SelectItem>
              <SelectItem value="true" className="text-xs">
                Verified
              </SelectItem>
              <SelectItem value="false" className="text-xs">
                Unverified
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Location</Label>
          <Input
            className="h-8 text-xs"
            placeholder="e.g. Paris"
            value={filters.location}
            onChange={(e) => onChange("location", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sort by</Label>
          <Select
            value={filters.sort}
            onValueChange={(v) => onChange("sort", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">
                Newest first
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Oldest first
              </SelectItem>
              <SelectItem value="xp" className="text-xs">
                Most XP
              </SelectItem>
              <SelectItem value="level" className="text-xs">
                Highest level
              </SelectItem>
              <SelectItem value="username" className="text-xs">
                Username A–Z
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// Main users management page
export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchTimeout = useRef<number | undefined>(undefined);

  // Debounced fetch triggered by filter changes
  const fetchUsers = useCallback((f: Filters, page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    if (f.role) params.set("role", f.role);
    if (f.verified) params.set("verified", f.verified);
    if (f.location) params.set("location", f.location);
    if (f.sort) params.set("sort", f.sort);
    params.set("page", String(page));
    params.set("limit", "20");

    fetch(`/api/admin/users?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setUsers(d.data);
          setMeta(d.meta);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch whenever filters change, with 300ms debounce on the search field
  useEffect(() => {
    window.clearTimeout(searchTimeout.current);

    searchTimeout.current = window.setTimeout(
      () => {
        fetchUsers(filters, 1);
      },
      filters.search ? 300 : 0,
    );

    return () => window.clearTimeout(searchTimeout.current);
  }, [filters, fetchUsers]);

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Called by the detail panel after a role or verified patch so the table stays in sync
  const handleRoleChange = (id: number, role: string) =>
    setUsers((list) =>
      list.map((u) => (u.id === id ? { ...u, user_role: role } : u)),
    );
  const handleVerifiedChange = (id: number, verified: boolean) =>
    setUsers((list) =>
      list.map((u) => (u.id === id ? { ...u, is_verified: verified } : u)),
    );
  const handleDelete = (id: number) =>
    setUsers((list) => list.filter((u) => u.id !== id));

  // NEW: Quick actions from the 3-dot dropdown (same API call + toast pattern as the detail panel)
  const updateUserRole = useCallback(
    async (id: number, role: string) => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_role: role }),
        });
        if (!res.ok) throw new Error("Patch failed");

        handleRoleChange(id, role);
        toast.success("User updated");
      } catch {
        toast.error("Failed to update role");
      }
    },
    [handleRoleChange],
  );

  const updateUserVerified = useCallback(
    async (id: number, verified: boolean) => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ is_verified: verified }),
        });
        if (!res.ok) throw new Error("Patch failed");

        handleVerifiedChange(id, verified);
        toast.success("User updated");
      } catch {
        toast.error("Failed to update verification");
      }
    },
    [handleVerifiedChange],
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "sort" && v !== "",
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading
                ? "Loading…"
                : `${meta.total.toLocaleString()} total users`}
            </p>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-xs"
                placeholder="Search by username, name, email, or location…"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
              />
              {filters.search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => updateFilter("search", "")}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-xs shrink-0",
                showFilters && "bg-muted",
              )}
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-medium">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={updateFilter}
              onClear={clearFilters}
            />
          )}
        </div>

        {/* Main content: table + optional detail panel */}
        <div className="flex gap-4 min-h-[500px]">
          {/* Table */}
          <div className="flex-1 min-w-0">
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-xs pl-4 w-[280px]">
                          User
                        </TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Level / XP</TableHead>
                        <TableHead className="text-xs">Solved</TableHead>
                        <TableHead className="text-xs">Streak</TableHead>
                        <TableHead className="text-xs">Joined</TableHead>
                        <TableHead className="text-xs w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i} className="border-border/40">
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2.5">
                                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                                <div className="space-y-1.5">
                                  <Skeleton className="h-3 w-28 rounded" />
                                  <Skeleton className="h-2.5 w-20 rounded" />
                                </div>
                              </div>
                            </TableCell>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-3 w-16 rounded" />
                              </TableCell>
                            ))}
                            <TableCell />
                          </TableRow>
                        ))
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-40 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground">
                                No users found
                              </p>
                              {activeFilterCount > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={clearFilters}
                                >
                                  Clear filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow
                            key={u.id}
                            className={cn(
                              "border-border/40 cursor-pointer transition-colors",
                              selectedId === u.id
                                ? "bg-muted/50"
                                : "hover:bg-muted/30",
                            )}
                            onClick={() =>
                              setSelectedId((prev) =>
                                prev === u.id ? null : u.id,
                              )
                            }
                          >
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="w-8 h-8 border border-border shrink-0">
                                  <AvatarImage
                                    src={u.avatar_url ?? undefined}
                                  />
                                  <AvatarFallback className="text-xs font-semibold">
                                    {getInitials(u.display_name || u.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {u.display_name || u.username}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    @{u.username} · {u.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {u.user_role === "admin" && (
                                  <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                                )}
                                <span
                                  className={cn(
                                    "text-xs capitalize",
                                    u.user_role === "admin"
                                      ? "font-medium"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {u.user_role}
                                </span>
                                {!u.is_verified && (
                                  <XCircle className="w-3 h-3 text-muted-foreground/50 shrink-0 text-rose-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <span className="font-medium">
                                  Lv {u.level}
                                </span>
                                <span className="text-muted-foreground ml-1">
                                  · {u.xp.toLocaleString()} XP
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">{u.solved_count}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs">
                                {u.current_streak > 0 && (
                                  <Flame className="w-3 h-3 text-orange-500 shrink-0" />
                                )}
                                <span
                                  className={
                                    u.current_streak > 0
                                      ? ""
                                      : "text-muted-foreground"
                                  }
                                >
                                  {u.current_streak}d
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {timeAgo(u.created_at)}
                              </span>
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
                                <DropdownMenuContent
                                  align="end"
                                  className="text-xs"
                                >
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedId(u.id);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newRole =
                                        u.user_role === "admin"
                                          ? "student"
                                          : "admin";
                                      updateUserRole(u.id, newRole);
                                    }}
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                    {u.user_role === "admin"
                                      ? "Demote to student"
                                      : "Promote to admin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newVerified = !u.is_verified;
                                      updateUserVerified(u.id, newVerified);
                                    }}
                                  >
                                    {u.is_verified ? (
                                      <>
                                        <XCircle className="w-3.5 h-3.5 text-rose-500" />{" "}
                                        Unverify
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                        Verify
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {!loading && meta.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Page {meta.page} of {meta.pages} ·{" "}
                      {meta.total.toLocaleString()} users
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={meta.page <= 1}
                        onClick={() => fetchUsers(filters, meta.page - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={meta.page >= meta.pages}
                        onClick={() => fetchUsers(filters, meta.page + 1)}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail panel - now a full bordered Card */}
          {selectedId && (
            <UserDetailPanel
              userId={selectedId}
              onClose={() => setSelectedId(null)}
              onRoleChange={handleRoleChange}
              onVerifiedChange={handleVerifiedChange}
              onDelete={handleDelete}
            />
          )}
        </div>

        <Separator className="my-8" />
        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Vorn Admin · built for SQL mastery
        </p>
      </main>
    </div>
  );
}
