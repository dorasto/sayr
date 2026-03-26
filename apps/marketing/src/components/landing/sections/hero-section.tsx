import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  Globe,
  Lock,
  MessageSquare,
  ChevronUp,
  Circle,
  Clock,
  CircleDot,
  CheckCircle2,
  Search,
  ChevronDown,
  Github,
  AlertTriangle,
  Tag,
  Folder,
  GitBranch,
  Calendar,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TasqIcon from "@repo/ui/components/brand-icon";
import Waitlist from "./waitlist";
import SayrIcon from "@repo/ui/components/brand-icon";

/* ── Status Config ── */

const statusConfig = {
  backlog: {
    label: "Backlog",
    color: "#6B7280",
    icon: Circle,
    hsla: "hsla(220, 9%, 46%, 0.1)",
  },
  todo: {
    label: "Todo",
    color: "#3B82F6",
    icon: Clock,
    hsla: "hsla(217, 91%, 60%, 0.1)",
  },
  "in-progress": {
    label: "In Progress",
    color: "#F59E0B",
    icon: CircleDot,
    hsla: "hsla(38, 92%, 50%, 0.1)",
  },
  done: {
    label: "Done",
    color: "#10B981",
    icon: CheckCircle2,
    hsla: "hsla(160, 84%, 39%, 0.1)",
  },
};

/* ── Priority Config ── */

const priorityConfig = {
  urgent: { label: "Urgent", color: "#DC2626", bars: 4 },
  high: { label: "High", color: "#EF4444", bars: 3 },
  medium: { label: "Medium", color: "#F59E0B", bars: 2 },
  low: { label: "Low", color: "#6B7280", bars: 1 },
};

type Status = keyof typeof statusConfig;
type Priority = keyof typeof priorityConfig;

/* ── Priority Icon (bar chart style) ── */

function PriorityIcon({
  priority,
  size = 14,
}: {
  priority: Priority;
  size?: number;
}) {
  const config = priorityConfig[priority];
  const barHeights = [0.3, 0.5, 0.7, 1.0];
  const barCount = config.bars;

  if (priority === "urgent") {
    return <AlertTriangle size={size} style={{ color: config.color }} />;
  }

  const barIds = ["bar-1", "bar-2", "bar-3", "bar-4"];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label={`${config.label} priority`}
    >
      <title>{config.label} priority</title>
      {barHeights.map((h, i) => (
        <rect
          key={barIds[i]}
          x={1 + i * 4}
          y={16 - h * 12}
          width={3}
          height={h * 12}
          rx={0.5}
          fill={i < barCount ? config.color : `${config.color}30`}
        />
      ))}
    </svg>
  );
}

/* ── Dummy Task Data ── */

interface TaskData {
  shortId: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  visible: "public" | "private";
  category: { name: string; color: string };
  labels: { name: string; color: string }[];
  release?: string;
  githubSync?: boolean;
  votes: number;
  comments: number;
  assignees: { name: string; color: string }[];
  date?: string;
}

const allTasks: TaskData[] = [
  {
    shortId: "188",
    title: "Dark mode for the dashboard",
    description:
      "Add full dark mode support across all dashboard views with system preference detection.",
    status: "in-progress",
    priority: "high",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [
      { name: "UI/UX", color: "#8b5cf6" },
      { name: "Accessibility", color: "#14b8a6" },
    ],
    votes: 42,
    comments: 15,
    assignees: [
      { name: "Tom", color: "#6366f1" },
      { name: "Mia", color: "#f43f5e" },
    ],
    date: "Jan 15",
  },
  {
    shortId: "192",
    title: "Migrate auth to session cookies",
    status: "in-progress",
    priority: "high",
    visible: "private",
    category: { name: "Improvement", color: "#06b6d4" },
    labels: [
      { name: "Auth", color: "#f97316" },
      { name: "Security", color: "#ef4444" },
      { name: "Sprint 16", color: "#f59e0b" },
    ],
    votes: 0,
    comments: 8,
    assignees: [{ name: "Alex", color: "#3b82f6" }],
    date: "Jan 12",
  },
  {
    shortId: "196",
    title: "Add SSO authentication",
    description:
      "Support SAML 2.0 and OIDC for enterprise single sign-on integration with identity providers.",
    status: "in-progress",
    priority: "medium",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "Auth", color: "#f97316" }],
    release: "v2.4",
    votes: 34,
    comments: 11,
    assignees: [{ name: "Sarah", color: "#ec4899" }],
    date: "Jan 10",
  },
  {
    shortId: "195",
    title: "Email notifications for status changes",
    description:
      "Notify users via email when tasks they voted on change status.",
    status: "todo",
    priority: "high",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "Notifications", color: "#f59e0b" }],
    release: "v2.4",
    votes: 28,
    comments: 9,
    assignees: [{ name: "Sarah", color: "#ec4899" }],
    date: "Jan 8",
  },
  {
    shortId: "199",
    title: "Fix pagination offset on filtered views",
    status: "todo",
    priority: "urgent",
    visible: "private",
    category: { name: "Bug", color: "#ef4444" },
    labels: [
      { name: "Bug", color: "#ef4444" },
      { name: "Sprint 16", color: "#f59e0b" },
    ],
    votes: 0,
    comments: 3,
    assignees: [{ name: "Tom", color: "#6366f1" }],
    date: "Jan 6",
  },
  {
    shortId: "201",
    title: "CSV export for task data",
    description:
      "Allow exporting task lists and analytics data to CSV format for external reporting.",
    status: "backlog",
    priority: "low",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "Backend", color: "#3b82f6" }],
    votes: 7,
    comments: 2,
    assignees: [],
    date: "Jan 4",
  },
  {
    shortId: "208",
    title: "Refactor queue worker retry logic",
    status: "backlog",
    priority: "medium",
    visible: "private",
    category: { name: "Improvement", color: "#06b6d4" },
    labels: [
      { name: "Infra", color: "#64748b" },
      { name: "Sprint 16", color: "#f59e0b" },
    ],
    votes: 0,
    comments: 4,
    assignees: [{ name: "Alex", color: "#3b82f6" }],
    date: "Jan 3",
  },
  {
    shortId: "212",
    title: "API rate limiting per org",
    description:
      "Implement configurable rate limits at the organization level to prevent abuse.",
    status: "backlog",
    priority: "medium",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "API", color: "#10b981" }],
    votes: 14,
    comments: 6,
    assignees: [],
    date: "Jan 2",
  },
  {
    shortId: "178",
    title: "GitHub issue sync",
    description:
      "Two-way synchronization between Sayr tasks and GitHub issues.",
    status: "done",
    priority: "high",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "Integration", color: "#22c55e" }],
    githubSync: true,
    votes: 31,
    comments: 12,
    assignees: [{ name: "Tom", color: "#6366f1" }],
    date: "Dec 28",
  },
  {
    shortId: "183",
    title: "User profile picture uploads",
    status: "done",
    priority: "low",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "UI/UX", color: "#8b5cf6" }],
    votes: 5,
    comments: 3,
    assignees: [{ name: "Mia", color: "#f43f5e" }],
    date: "Dec 22",
  },
  {
    shortId: "180",
    title: "Fix SSE reconnect on mobile",
    status: "done",
    priority: "medium",
    visible: "private",
    category: { name: "Bug", color: "#ef4444" },
    labels: [{ name: "Bug", color: "#ef4444" }],
    votes: 0,
    comments: 5,
    assignees: [{ name: "Alex", color: "#3b82f6" }],
    date: "Dec 20",
  },
  {
    shortId: "205",
    title: "Webhook events for task updates",
    description:
      "Send webhook payloads when tasks are created, updated, or deleted.",
    status: "todo",
    priority: "medium",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [
      { name: "API", color: "#10b981" },
      { name: "Integration", color: "#22c55e" },
    ],
    release: "v2.5",
    votes: 19,
    comments: 5,
    assignees: [],
    date: "Jan 5",
  },
  {
    shortId: "210",
    title: "Bulk task operations",
    description:
      "Select multiple tasks and apply status changes, label assignments, or deletions in bulk.",
    status: "todo",
    priority: "low",
    visible: "public",
    category: { name: "Feature Request", color: "#7c3aed" },
    labels: [{ name: "UI/UX", color: "#8b5cf6" }],
    votes: 11,
    comments: 3,
    assignees: [{ name: "Mia", color: "#f43f5e" }],
    date: "Jan 1",
  },
];

/* ── Helpers ── */

function getTasksByStatus(status: Status, tasks: TaskData[]) {
  return tasks.filter((t) => t.status === status);
}

function getTasksByPriorityAndStatus(
  priority: Priority,
  status: Status,
  tasks: TaskData[],
) {
  return tasks.filter((t) => t.priority === priority && t.status === status);
}

const statuses: Status[] = ["backlog", "todo", "in-progress", "done"];
const priorities: Priority[] = ["urgent", "high", "medium", "low"];

/* ── Team View: Kanban Task Card ── */

function KanbanCard({ task }: { task: TaskData }) {
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;
  const maxLabels = 3;
  const visibleLabels = task.labels.slice(0, maxLabels);
  const overflowCount = task.labels.length - maxLabels;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-accent p-2 rounded-lg shadow-sm hover:bg-secondary transition-colors cursor-default"
    >
      {/* Top row: shortId + status/priority icons */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground font-mono">
          #{task.shortId}
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon size={12} style={{ color: status.color }} />
          <PriorityIcon priority={task.priority} size={12} />
        </div>
      </div>

      {/* Title */}
      <p className="font-medium text-xs leading-tight line-clamp-2 mb-1.5">
        {task.title}
      </p>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {visibleLabels.map((l) => (
            <span
              key={l.name}
              className="inline-flex items-center gap-1 text-[10px] py-0 px-1.5 rounded-2xl bg-accent border border-border h-[18px]"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: l.color }}
              />
              {l.name}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="inline-flex items-center text-[10px] py-0 px-1.5 rounded-2xl bg-accent border border-border text-muted-foreground h-[18px]">
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: category + release | assignees */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {/* Category */}
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Folder size={10} style={{ color: task.category.color }} />
            <span className="truncate max-w-[60px]">{task.category.name}</span>
          </span>
          {/* Release */}
          {task.release && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Tag size={9} />
              {task.release}
            </span>
          )}
          {/* GitHub sync */}
          {task.githubSync && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <GitBranch size={9} />
            </span>
          )}
        </div>
        {task.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {task.assignees.map((a) => (
              <div
                key={a.name}
                className="size-5 rounded-full border-2 border-accent flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: a.color }}
                title={a.name}
              >
                {a.name[0]}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Team View: Grid Board ── */

function TeamViewBoard() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Column headers (status) */}
        <div className="grid grid-cols-4 bg-muted">
          {statuses.map((s, i) => {
            const config = statusConfig[s];
            const StatusIcon = config.icon;
            const count = getTasksByStatus(s, allTasks).length;
            return (
              <div
                key={s}
                className={`flex items-center gap-2 p-2 px-3 ${i < statuses.length - 1 ? "border-r border-border" : ""}`}
              >
                <StatusIcon size={14} style={{ color: config.color }} />
                <span className="text-xs font-semibold">{config.label}</span>
                <span className="text-[10px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-md">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Priority row bands */}
        {priorities.map((p) => {
          const pConfig = priorityConfig[p];
          const rowTasks = allTasks.filter((t) => t.priority === p);
          if (rowTasks.length === 0) return null;
          return (
            <div key={p}>
              {/* Full-width priority row header */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent border-b border-border">
                <PriorityIcon priority={p} size={14} />
                <span className="text-xs font-semibold">{pConfig.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {rowTasks.length}
                </span>
              </div>
              {/* Cards distributed into status columns */}
              <div className="grid grid-cols-4">
                {statuses.map((s, i) => {
                  const cellTasks = getTasksByPriorityAndStatus(p, s, allTasks);
                  return (
                    <div
                      key={s}
                      className={`p-2 space-y-2 min-h-[80px] ${i < statuses.length - 1 ? "border-r border-border" : ""}`}
                    >
                      <AnimatePresence mode="popLayout">
                        {cellTasks.map((task) => (
                          <KanbanCard key={task.shortId} task={task} />
                        ))}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Public View: Task Tile ── */

function PublicTaskTile({ task }: { task: TaskData }) {
  const status = statusConfig[task.status];
  const [voted, setVoted] = useState(false);
  const maxLabels = 1;
  const visibleLabels = task.labels.slice(0, maxLabels);
  const overflowCount = task.labels.length - maxLabels;
  const overflowColors = task.labels.slice(maxLabels).map((l) => l.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-4 px-5 py-4 bg-accent hover:bg-secondary rounded-lg transition-colors cursor-default"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold leading-snug mb-0.5">
          {task.title}
        </h3>
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">
            {task.description}
          </p>
        )}
        {/* Metadata row */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted-foreground">
          {/* Date with calendar icon */}
          {task.date && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {task.date}
            </span>
          )}
          {/* Comments */}
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={12} /> {task.comments}
          </span>
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium"
            style={{
              backgroundColor: status.hsla,
              color: status.color,
            }}
          >
            {(() => {
              const StatusIcon = status.icon;
              return <StatusIcon size={12} />;
            })()}
            {status.label}
          </span>
          {/* GitHub Sync badge */}
          {task.githubSync && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted font-medium">
              <GitBranch size={12} />
              GitHub Sync
            </span>
          )}
          {/* Labels */}
          {visibleLabels.map((l) => (
            <span key={l.name} className="inline-flex items-center gap-1">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: l.color }}
              />
              <span className="truncate max-w-[140px]">{l.name}</span>
            </span>
          ))}
          {/* Overflow: colored dots + "N more" */}
          {overflowCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex items-center -space-x-0.5">
                {overflowColors.map((color, i) => (
                  <span
                    key={`overflow-${task.shortId}-${i}`}
                    className="size-2.5 rounded-full border border-card"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              {overflowCount} more
            </span>
          )}
          {/* Category */}
          <span className="inline-flex items-center gap-1">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: task.category.color }}
            />
            {task.category.name}
          </span>
          {/* Short ID */}
          <span className="font-mono">#{task.shortId}</span>
        </div>
      </div>

      {/* Vote button */}
      <button
        type="button"
        onClick={() => setVoted(!voted)}
        className={`flex flex-col items-center justify-center w-[52px] h-[56px] rounded-lg border text-sm font-semibold transition-all shrink-0 ${
          voted
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
        }`}
      >
        <ChevronUp size={16} className={voted ? "text-primary" : ""} />
        <span className="leading-none">
          {voted ? task.votes + 1 : task.votes}
        </span>
      </button>
    </motion.div>
  );
}

/* ── Public View: Feed Layout ── */

function PublicViewFeed() {
  const publicTasks = allTasks.filter((t) => t.visible === "public");
  const filters = [
    {
      name: "Open",
      count: publicTasks.filter((t) => t.status !== "done").length,
      icon: Globe,
      active: true,
    },
    {
      name: "Feature Request",
      count: publicTasks.filter((t) => t.githubSync).length,
      icon: GitBranch,
      active: false,
    },
  ];

  return (
    <div className="flex min-h-105 p-3">
      {/* Sidebar — compact, top-aligned, sticky */}
      <div className="hidden md:block w-50 rounded-lg bg-accent h-fit shrink-0">
        <div className="sticky top-0 p-4 space-y-4">
          {/* Org name */}
          <div className="flex items-center gap-2.5">
            {/*<div className="size-8 rounded-lg bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xs">
              S
            </div>*/}
            <TasqIcon />
            <span className="text-sm font-bold">Sayr</span>
          </div>

          {/* Filters */}
          <div className="space-y-0.5">
            {filters.map((f) => {
              const FilterIcon = f.icon;
              return (
                <div
                  key={f.name}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-default ${f.active ? "text-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
                >
                  <FilterIcon size={16} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Task list */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 pt-0">
          <AnimatePresence mode="popLayout">
            {publicTasks
              .filter((t) => t.status !== "done")
              .sort((a, b) => b.votes - a.votes)
              .map((task) => (
                <PublicTaskTile key={task.shortId} task={task} />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Main Hero Section ── */

export function HeroSection() {
  const [viewMode, setViewMode] = useState<"team" | "public">("team");

  return (
    <section className="relative min-h-[95dvh] flex flex-col items-center justify-center overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-(--breakpoint-lg) mx-auto px-6 pt-16 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge
            variant="secondary"
            className="rounded-full py-1.5 px-4 border-border mb-8"
            asChild
          >
            <a
              href="https://github.com/dorasto/sayr"
              target="_blank"
              rel="noreferrer"
            >
              Source Available & Self-Hostable{" "}
              <ArrowUpRight className="ml-1 size-3.5" />
            </a>
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-[4.5rem] font-semibold tracking-[-0.04em] leading-[1.08]! max-w-4xl mx-auto"
        >
          Project management your{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            users can see
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Sayr is an source-available project management platform with a
          public-facing portal. Your team works internally while users submit
          feedback, vote on features, and track progress — all from the same
          tool.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          {/*<Waitlist />*/}
          <Button
            size="lg"
            className="rounded-full text-base px-8 shadow-lg shadow-primary/20"
            asChild
          >
            <a href="https://admin.sayr.io">
              Start Building <ArrowUpRight className="h-5! w-5!" />
            </a>
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full text-base shadow-none"
            asChild
          >
            <a href="https://platform.sayr.io">
              <SayrIcon className="size-4" /> Project Board
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Unified Card Window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative z-10 w-full max-w-(--breakpoint-xl) mx-auto px-4 mt-8"
      >
        <div className="rounded-2xl border bg-card/60 backdrop-blur shadow-2xl overflow-hidden">
          {/* Card header with view toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("team")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === "team" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Lock className="size-3" /> Team View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("public")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === "public" ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Globe className="size-3" /> Public View
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {viewMode === "team"
                ? "Internal view — all tasks, labels, and metadata visible"
                : "Public portal — only public tasks shown to users"}
            </span>
          </div>

          {/* Board content */}
          <AnimatePresence mode="wait">
            {viewMode === "team" ? (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <TeamViewBoard />
              </motion.div>
            ) : (
              <motion.div
                key="public"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PublicViewFeed />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/8 via-primary/3 to-primary/8 rounded-3xl blur-2xl -z-10" />
      </motion.div>
    </section>
  );
}
