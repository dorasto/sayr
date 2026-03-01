"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconGitMerge } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface GlobalTaskGithubPrProps {
	task: schema.TaskWithLabels;
	/** Compact mode shows only the PR number. */
	compact?: boolean;
	/** Show only the merge icon, hide all text. */
	iconOnly?: boolean;
	/** Extra className merged onto the button. */
	className?: string;
}

export default function GlobalTaskGithubPr({
	task,
	compact = false,
	iconOnly = false,
	className,
}: GlobalTaskGithubPrProps) {
	if (!task.githubPullRequest?.prUrl) return null;

	const prNumber = task.githubPullRequest.prNumber;

	return (
		<Link to={task.githubPullRequest.prUrl} target="_blank" className="shrink-0">
			<Button
				variant="primary"
				className={cn("h-[26px] p-1 w-fit bg-accent text-xs", className)}
				size="sm"
				tooltipText="View linked GitHub PR"
				tooltipSide="bottom"
			>
				<IconGitMerge className="size-4" />
				{!iconOnly &&
					(compact ? (
						<>#{prNumber}</>
					) : (
						<> PR #{prNumber}</>
					))}
			</Button>
		</Link>
	);
}
