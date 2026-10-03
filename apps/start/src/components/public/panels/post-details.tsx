import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, formatDate, generateSlug, getDisplayName, getInitials } from "@repo/util";
import { IconBrandGithub } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { FieldAssignee } from "@/components/board/fields/field-assignee";
import { FieldCategory } from "@/components/board/fields/field-category";
import { FieldLabel } from "@/components/board/fields/field-label";
import { FieldRelease } from "@/components/board/fields/field-release";
import { FieldStatus } from "@/components/board/fields/field-status";
import { Pill } from "@/components/public/portal/ui/Pill";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { getPortalStatus } from "@/lib/portal/status";
import { isTeamMember } from "@/lib/portal/team";
import { DetailSection } from "./detail-section";

/** Hover/focus for a field chip that links somewhere (the board filtered by it, or the release). */
const FIELD_LINK_CLASS =
	"rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The post's details in the panel, one label/value row each, using the board's read-only `Field*` components (the page
 * wraps it in a `BoardProvider`). Category and labels open the board filtered by them; the release opens its page.
 * Priority is the team's own triage, so it is not shown.
 */
export function PostDetails() {
	const { organization, categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug } = usePublicTask();
	const category = categories.find((c) => c.id === task.category);
	const creator = task.createdBy;
	const creatorName = creator ? getDisplayName(creator) : null;
	const github = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;

	return (
		<div className="flex flex-col gap-1.5">
			<DetailSection label="Status">
				<FieldStatus task={task} label={getPortalStatus(task.status).label} />
			</DetailSection>
			{category && (
				<DetailSection label="Category">
					<Link
						to="/orgs/$orgSlug"
						params={{ orgSlug }}
						search={{ category: generateSlug(category.name) }}
						aria-label={`Posts in ${category.name}`}
						className={FIELD_LINK_CLASS}
					>
						<FieldCategory task={task} />
					</Link>
				</DetailSection>
			)}
			{creator && creatorName && (
				<DetailSection label="Created by">
					<Avatar className="size-5">
						{creator.image ? <AvatarImage src={ensureCdnUrl(creator.image)} alt={creatorName} /> : null}
						<AvatarFallback className="text-[10px]">{getInitials(creatorName)}</AvatarFallback>
					</Avatar>
					<span className="font-medium">{creatorName}</span>
					{isTeamMember(creator.id, organization) && <Pill variant="team" />}
					{task.createdAt && (
						<span className="text-muted-foreground">
							on{" "}
							<time dateTime={new Date(task.createdAt).toISOString()}>
								{formatDate(task.createdAt, "en-GB")}
							</time>
						</span>
					)}
				</DetailSection>
			)}
			{release && (
				<DetailSection label="Release">
					<Link
						to="/orgs/$orgSlug/releases/$releaseSlug"
						params={{ orgSlug, releaseSlug: release.slug }}
						aria-label={`Release ${release.name}`}
						className={FIELD_LINK_CLASS}
					>
						<FieldRelease task={task} />
					</Link>
				</DetailSection>
			)}
			{task.assignees.length > 0 && (
				<DetailSection label="Assigned to">
					<FieldAssignee task={task} />
				</DetailSection>
			)}
			{task.labels.length > 0 && (
				<DetailSection label="Labels">
					{/* One chip per label (a one-label task each), so every label links to its own filter. */}
					{task.labels.map((label) => (
						<Link
							key={label.id}
							to="/orgs/$orgSlug"
							params={{ orgSlug }}
							search={{ labels: label.id }}
							aria-label={`Posts labelled ${label.name}`}
							className={FIELD_LINK_CLASS}
						>
							<FieldLabel task={{ ...task, labels: [label] }} />
						</Link>
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
		</div>
	);
}
