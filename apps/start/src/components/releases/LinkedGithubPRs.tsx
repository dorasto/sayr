"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { IconX, IconGitBranch, IconGitPullRequest } from "@tabler/icons-react";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { unlinkGithubPRFromReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { useEffect, useState } from "react";

interface LinkedGithubPRsProps {
	organizationId: string;
	releaseId: string;
	githubPR: schema.githubPullRequestType | null;
	onUnlinkPR?: (prId: string) => void;
	editable?: boolean;
	// Add a prop to fetch repo name by ID
	getRepositoryName?: (repoId: string) => Promise<string>;
}

export function LinkedGithubPRs({
	organizationId,
	releaseId,
	githubPR,
	onUnlinkPR,
	editable = true,
	getRepositoryName,
}: LinkedGithubPRsProps) {
	const { runWithToast } = useToastAction();
	const [repoName, setRepoName] = useState<string>("");

	// Fetch repository name if getRepositoryName is provided
	useEffect(() => {
		if (githubPR && getRepositoryName) {
			getRepositoryName(githubPR.repositoryId).then(setRepoName);
		}
	}, [githubPR, getRepositoryName]);

	const handleUnlinkPR = async (prId: string) => {
		await runWithToast(
			"unlink-github-pr",
			{
				loading: {
					title: "Unlinking PR...",
					description: "Removing GitHub PR from this release.",
				},
				success: {
					title: "PR unlinked",
					description: "GitHub PR has been removed from this release.",
				},
				error: {
					title: "Failed to unlink PR",
					description: "Could not remove the GitHub PR from this release.",
				},
			},
			() => unlinkGithubPRFromReleaseAction(organizationId, releaseId, prId),
		);
		onUnlinkPR?.(prId);
	};

	if (!githubPR) {
		return null;
	}

	return (
		<div className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent transition-colors">
			<a
				href={githubPR.prUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex-1 min-w-0"
			>
				<div className="flex items-center gap-2">
					<IconGitPullRequest className="h-4 w-4 text-muted-foreground" />
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							{repoName && (
								<span className="text-sm text-muted-foreground">{repoName}</span>
							)}
							<span className="font-medium text-sm">#{githubPR.prNumber}</span>
							<span className="text-sm truncate">{githubPR.title}</span>
						</div>
						<div className="flex items-center gap-2 mt-1">
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<IconGitBranch className="h-3 w-3" />
								<span>{githubPR.headBranch}</span>
								<span className="text-muted-foreground/50">←</span>
								<span>{githubPR.baseBranch}</span>
							</div>
							<Badge
								variant="secondary"
								className={cn(
									"h-4 text-xs",
									githubPR.state === "open" ? "bg-green-100 text-green-800" :
										githubPR.state === "closed" ? "bg-red-100 text-red-800" :
											"bg-gray-100 text-gray-800" // draft or other states
								)}
							>
								{githubPR.state}
							</Badge>
							{githubPR.merged && (
								<Badge variant="secondary" className="h-4 text-xs bg-purple-100 text-purple-800">
									Merged
								</Badge>
							)}
						</div>
					</div>
				</div>
			</a>
			{editable && (
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-muted-foreground hover:text-foreground"
					onClick={() => handleUnlinkPR(githubPR.id)}
				>
					<IconX className="h-3 w-3" />
				</Button>
			)}
		</div>
	);
}