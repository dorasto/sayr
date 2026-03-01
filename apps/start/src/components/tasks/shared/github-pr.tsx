"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBrandGithub,
  IconExternalLink,
  IconGitMerge,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface GlobalTaskGithubPrProps {
  task: schema.TaskWithLabels;
  /** Compact mode shows only the PR number. */
  compact?: boolean;
  /** Show only the merge icon, hide all text. */
  iconOnly?: boolean;
  /**
   * Rendering variant.
   * - `"button"` (default) — small toolbar/mobile button.
   * - `"sidebar"` — inline row matching ComboBoxTrigger spacing used by other sidebar fields.
   */
  variant?: "button" | "sidebar";
  /** Extra className merged onto the outer element. */
  className?: string;
}

export default function GlobalTaskGithubPr({
  task,
  compact = false,
  iconOnly = false,
  variant = "button",
  className,
}: GlobalTaskGithubPrProps) {
  if (!task.githubPullRequest?.prUrl) return null;

  const prNumber = task.githubPullRequest.prNumber;
  const urlParts = task.githubPullRequest.prUrl.split("/");
  const gitHubRepo = urlParts[4];
  const gitHubOrg = urlParts[3];

  if (variant === "sidebar") {
    return (
      <Link
        to={task.githubPullRequest.prUrl}
        target="_blank"
        className={cn(
          "bg-transparent p-1 h-auto w-fit inline-flex items-center rounded-lg hover:bg-secondary border border-transparent hover:border-border group/link transition-all",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          <IconGitMerge className="h-4 w-4 shrink-0" />
          <span className="truncate">
            PR #{gitHubOrg}/{gitHubRepo}/{prNumber}
          </span>
          {task.githubPullRequest.merged ? (
            <Badge className="h-4" variant={"secondary"}>
              Merged
            </Badge>
          ) : task.githubPullRequest.state === "closed" ? (
            <Badge className="h-4" variant={"secondary"}>
              Closed
            </Badge>
          ) : (
            <Badge className="h-4" variant={"secondary"}>
              Open
            </Badge>
            // <span className="text-blue-600 text-[10px] font-medium">Open</span>
          )}
          <IconExternalLink className="size-3 shrink-0 text-foreground/0 group-hover/link:text-foreground transition-all" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={task.githubPullRequest.prUrl}
      target="_blank"
      className="shrink-0"
    >
      <Button
        variant="primary"
        className={cn("h-[26px] p-1 w-fit bg-accent text-xs", className)}
        size="sm"
        tooltipText="View linked GitHub PR"
        tooltipSide="bottom"
      >
        <IconGitMerge className="size-4" />
        {!iconOnly && (compact ? <>#{prNumber}</> : <> PR #{prNumber}</>)}
      </Button>
    </Link>
  );
}
