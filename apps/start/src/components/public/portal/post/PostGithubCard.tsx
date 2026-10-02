import { cn } from "@repo/ui/lib/utils";
import { IconArrowUpRight, IconBrandGithub } from "@tabler/icons-react";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { PortalCard } from "@/components/public/portal/ui/PortalCard";
import { portalButtonVariants } from "@/components/public/portal/ui/PortalButton";

interface PostGithubCardProps {
	githubIssue: { issueUrl: string; issueNumber: number };
	className?: string;
}

/** "Tracked on GitHub" card with the repo, issue number and a View issue button. Only rendered when an issue is linked. */
export function PostGithubCard({ githubIssue, className }: PostGithubCardProps) {
	const parsed = parseGithubIssueUrl(githubIssue.issueUrl);
	const reference = parsed ? `${parsed.repo}#${parsed.number}` : `#${githubIssue.issueNumber}`;

	return (
		<PortalCard padded={false} className={cn("flex items-center gap-3.5 px-[18px] py-3.5", className)}>
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-portal-raised text-portal-fg"
			>
				<IconBrandGithub className="size-5" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-portal-fg text-sm">Tracked on GitHub</div>
				<div className="truncate text-[13px] text-portal-fg-3">{reference}</div>
			</div>
			<a
				href={githubIssue.issueUrl}
				target="_blank"
				rel="noopener noreferrer"
				className={portalButtonVariants({ size: "sm" })}
			>
				View issue
				<IconArrowUpRight aria-hidden />
			</a>
		</PortalCard>
	);
}
