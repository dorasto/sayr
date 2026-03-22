import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  MessageSquareText,
  ShieldCheck,
  Star,
  Zap,
  GitPullRequest,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ── Feature Card ── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  children,
  span = 1,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-2xl border bg-card p-6 relative overflow-hidden group hover:border-primary/30 transition-colors ${span === 2 ? "md:col-span-2" : ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="size-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </motion.div>
  );
}

/* ── Visibility Mini Demo ── */

function VisibilityDemo() {
  const items = [
    { label: "Task", name: "Dark mode support", vis: "public" },
    { label: "Task", name: "Fix auth token refresh", vis: "private" },
    { label: "Comment", name: '"Love this feature!"', vis: "public" },
    { label: "Comment", name: '"Blocked on design tokens"', vis: "internal" },
  ];

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.name}`}
          className={`flex items-center justify-between py-1.5 px-3 rounded-md text-xs ${
            item.vis === "public"
              ? "bg-muted/50"
              : "bg-muted/30 border border-dashed border-border"
          }`}
        >
          <span
            className={
              item.vis === "public"
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            {item.name}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span
              className={`text-[10px] ${item.vis === "public" ? "text-success" : "text-muted-foreground/50"}`}
            >
              {item.vis}
            </span>
            {item.vis === "public" ? (
              <Eye className="size-3 text-success" />
            ) : (
              <EyeOff className="size-3 text-muted-foreground/40" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── GitHub Mini Demo ── */

function GitHubDemo() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
        <GitBranch className="size-3.5 text-primary shrink-0" />
        <span className="font-mono">feat/dark-mode</span>
        <span className="text-muted-foreground/50">{"\u2192"}</span>
        <span>SAY-188</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
        <GitPullRequest className="size-3.5 text-success shrink-0" />
        <span className="font-mono">PR #287</span>
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-success border-success/30"
        >
          Merged
        </Badge>
        <span className="text-muted-foreground/50">{"\u2192"}</span>
        <span>SAY-188 {"\u2192"} Done</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
        <CircleDot className="size-3.5 text-primary shrink-0" />
        <span className="font-mono">Issue #54</span>
        <span className="text-muted-foreground/50">{"\u2194"}</span>
        <span>SAY-201 (synced)</span>
      </div>
    </div>
  );
}

/* ── Features Section ── */

export function FeaturesSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-(--breakpoint-lg) mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
            Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Built for teams.{" "}
            <span className="text-primary">Visible to users.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage work internally and share progress
            externally — in one place.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1: Public Portal (wide) + Voting */}
          <FeatureCard
            icon={Globe}
            title="Public Portal"
            description="A customer-facing hub where users browse tasks, submit feedback, and track what your team is working on."
            span={2}
          />

          <FeatureCard
            icon={Star}
            title="User Voting"
            description="Users upvote what matters to them. Your team prioritizes based on real demand."
          />

          {/* Row 2: Visibility + Comments + Real-Time */}
          <FeatureCard
            icon={Eye}
            title="Visibility Control"
            description="Tasks, labels, and comments each have their own visibility. Keep internal work private."
          >
            <VisibilityDemo />
          </FeatureCard>

          <FeatureCard
            icon={MessageSquareText}
            title="Public & Internal Comments"
            description="One timeline, two audiences. Public comments for users, internal comments for your team."
          />

          <FeatureCard
            icon={Zap}
            title="Real-Time Updates"
            description="Powered by server-sent events for live collaboration. Every change is instant — no refresh needed."
          />

          {/* Row 3: GitHub (wide) + RBAC */}
          <FeatureCard
            icon={GitBranch}
            title="GitHub Integration"
            description="Link repos, sync issues, and track PRs. Merging a PR can automatically update task status."
            span={2}
          >
            <GitHubDemo />
          </FeatureCard>

          <FeatureCard
            icon={ShieldCheck}
            title="Role-Based Access"
            description="External users submit and vote. Members manage tasks. Admins control everything. No one sees more than they should."
          />
        </div>
      </div>
    </section>
  );
}
