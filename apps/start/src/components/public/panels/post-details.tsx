import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import { IconBrandGithub, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { LabelTag } from "@/components/public/portal/ui/LabelTag";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { DetailSection } from "./detail-section";

/**
 * The post's details in the panel: category, release, assignees, labels, GitHub issue and the posted date. Status sits
 * above the title on the page, and priority is the team's own triage, so neither is shown here.
 */
export function PostDetails() {
	const { categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug } = usePublicTask();

	const category = categories.find((c) => c.id === task.category);
	const github = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;
	const assignees = task.assignees ?? [];
	const labels = task.labels ?? [];

	return (
		<>
			{category && (
				<DetailSection label="Category">
					<CategoryTag category={category} className="text-foreground text-sm" />
				</DetailSection>
			)}
			{release && (
				<DetailSection label="Release">
					<Link
						to="/orgs/$orgSlug/releases/$releaseSlug"
						params={{ orgSlug, releaseSlug: release.slug }}
						className="inline-flex items-center gap-1.5 hover:underline focus-visible:underline"
					>
						<IconRocket aria-hidden className="size-4 text-muted-foreground" />
						{release.name}
					</Link>
				</DetailSection>
			)}
			{assignees.length > 0 && (
				<DetailSection label="Assigned to">
					{assignees.map((assignee) => (
						<span key={assignee.id} className="inline-flex items-center gap-1.5">
							<Avatar className="size-5">
								{assignee.image ? (
									<AvatarImage src={ensureCdnUrl(assignee.image)} alt={getDisplayName(assignee)} />
								) : null}
								<AvatarFallback className="text-[10px]">{getInitials(getDisplayName(assignee))}</AvatarFallback>
							</Avatar>
							{getDisplayName(assignee)}
						</span>
					))}
				</DetailSection>
			)}
			{labels.length > 0 && (
				<DetailSection label="Labels">
					{labels.map((label) => (
						<LabelTag key={label.id} label={label} className="text-foreground" />
					))}
				</DetailSection>
			)}
			{task.githubIssue && (
				<DetailSection label="GitHub">
					<a
						href={task.githubIssue.issueUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 hover:underline focus-visible:underline"
					>
						<IconBrandGithub aria-hidden className="size-4 text-muted-foreground" />
						{github ? `${github.repo}#${github.number}` : `#${task.githubIssue.issueNumber}`}
					</a>
				</DetailSection>
			)}
			{task.createdAt && <DetailSection label="Posted">{formatDate(task.createdAt, "en-GB")}</DetailSection>}
		</>
	);
}
