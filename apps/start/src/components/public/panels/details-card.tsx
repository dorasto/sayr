import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import { IconBrandGithub, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { LabelTag } from "@/components/public/portal/ui/LabelTag";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { priorityConfig } from "@/components/tasks/shared/config";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { DetailRow } from "./detail-row";

/** The post's metadata: status, priority, category, release, assignees, GitHub issue, labels, dates. */
export function DetailsCard() {
	const { categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug } = usePublicTask();

	const priority = task.priority !== "none" ? priorityConfig[task.priority as keyof typeof priorityConfig] : undefined;
	const category = categories.find((c) => c.id === task.category);
	const github = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;
	const assignees = task.assignees ?? [];
	const labels = task.labels ?? [];

	return (
		<div className="rounded-xl border bg-card p-5">
			<h3 className="mb-3 font-semibold text-[13px] text-foreground">Details</h3>
			<dl className="flex flex-col">
				<DetailRow label="Status">
					<StatusChip status={task.status} />
				</DetailRow>
				{priority && <DetailRow label="Priority">{priority.label}</DetailRow>}
				{category && (
					<DetailRow label="Category">
						<CategoryTag category={category} className="text-foreground" />
					</DetailRow>
				)}
				{release && (
					<DetailRow label="Release">
						<Link
							to="/orgs/$orgSlug/releases/$releaseSlug"
							params={{ orgSlug, releaseSlug: release.slug }}
							className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:underline"
						>
							<IconRocket aria-hidden className="size-3.5" />
							{release.name}
						</Link>
					</DetailRow>
				)}
				<DetailRow label={assignees.length > 1 ? "Assignees" : "Assignee"}>
					{assignees.length > 0 ? (
						assignees.map((assignee) => (
							<span key={assignee.id} className="inline-flex items-center gap-2">
								<Avatar className="size-5">
									{assignee.image ? (
										<AvatarImage src={ensureCdnUrl(assignee.image)} alt={getDisplayName(assignee)} />
									) : null}
									<AvatarFallback className="font-semibold text-xs">
										{getInitials(getDisplayName(assignee))}
									</AvatarFallback>
								</Avatar>
								{getDisplayName(assignee)}
							</span>
						))
					) : (
						<span className="text-muted-foreground">No one yet</span>
					)}
				</DetailRow>
				{task.githubIssue && (
					<DetailRow label="GitHub">
						<a
							href={task.githubIssue.issueUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:underline"
						>
							<IconBrandGithub aria-hidden className="size-3.5" />
							{github ? `${github.repo}#${github.number}` : `#${task.githubIssue.issueNumber}`}
						</a>
					</DetailRow>
				)}
				{labels.length > 0 && (
					<DetailRow label="Labels">
						{labels.map((label) => (
							<LabelTag key={label.id} label={label} className="text-foreground" />
						))}
					</DetailRow>
				)}
				{task.createdAt && <DetailRow label="Posted">{formatDate(task.createdAt, "en-GB")}</DetailRow>}
				{task.updatedAt && <DetailRow label="Updated">{formatDate(task.updatedAt, "en-GB")}</DetailRow>}
			</dl>
		</div>
	);
}
