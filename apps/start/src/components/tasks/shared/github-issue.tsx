"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconBrandGithub, IconExternalLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface GlobalTaskGithubIssueProps {
  task: schema.TaskWithLabels;
  /** Compact mode shows the issue number extracted from the URL. */
  compact?: boolean;
  /** Show only the GitHub icon, hide all text. */
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

export default function GlobalTaskGithubIssue({
  task,
  compact = false,
  iconOnly = false,
  variant = "button",
  className,
}: GlobalTaskGithubIssueProps) {
  if (!task.githubIssue?.issueUrl) return null;

  const urlParts = task.githubIssue.issueUrl.split("/");
  const issueNumber = urlParts.pop();
  const gitHubRepo = urlParts[4];
  const gitHubOrg = urlParts[3];

  if (variant === "sidebar") {
    return (
      <Link
        to={task.githubIssue.issueUrl}
        target="_blank"
        className={cn(
          "bg-transparent p-1 h-auto w-fit inline-flex items-center rounded-lg hover:bg-secondary border border-transparent hover:border-border group/link transition-all",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          <IconBrandGithub className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {gitHubOrg}/{gitHubRepo}/issues/{issueNumber}
          </span>
          <IconExternalLink className="size-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-all" />
        </div>
      </Link>
    );
  }

  return (
    <Link to={task.githubIssue.issueUrl} target="_blank" className="shrink-0">
      <Button
        variant="primary"
        className={cn("h-[26px] p-1 w-fit bg-accent text-xs", className)}
        size="sm"
        tooltipText="View linked GitHub issue"
        tooltipSide="bottom"
      >
        <IconBrandGithub className="size-4" />
        {!iconOnly &&
          (compact ? (
            <>#{issueNumber}</>
          ) : (
            <> Issue{issueNumber ? ` #${issueNumber}` : ""}</>
          ))}
      </Button>
    </Link>
  );
}
