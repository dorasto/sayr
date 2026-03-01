"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface GlobalTaskGithubIssueProps {
	task: schema.TaskWithLabels;
	/** Compact mode shows the issue number extracted from the URL. */
	compact?: boolean;
	/** Show only the GitHub icon, hide all text. */
	iconOnly?: boolean;
	/** Extra className merged onto the button. */
	className?: string;
}

export default function GlobalTaskGithubIssue({
	task,
	compact = false,
	iconOnly = false,
	className,
}: GlobalTaskGithubIssueProps) {
	if (!task.githubIssue?.issueUrl) return null;

	const issueNumber = task.githubIssue.issueUrl.split("/").pop();

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
