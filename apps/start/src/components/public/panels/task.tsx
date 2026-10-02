import type { schema } from "@repo/database";
import { formatCount, formatDate, getDisplayName } from "@repo/util";
import { IconArrowUpRight, IconBrandGithub, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { LabelTag } from "@/components/public/portal/ui/LabelTag";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { PortalCard, PortalCardTitle } from "@/components/public/portal/ui/PortalCard";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteButton } from "@/components/public/portal/ui/VoteButton";
import { priorityConfig } from "@/components/tasks/shared/config";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { findRelatedPosts } from "@/lib/portal/related";

/** "Open internally" shortcut for org members, rendered in the drawer's native header next to the close button. */
export function PublicTaskPanelHeaderActions() {
	const { organization } = usePublicOrganizationLayout();
	const { task, isMember } = usePublicTask();

	if (!isMember) return null;

	return (
		<a
			href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs transition-colors hover:bg-accent focus-visible:bg-accent hover:text-foreground focus-visible:text-foreground"
		>
			<IconArrowUpRight aria-hidden className="size-3.5" />
			Open internally
		</a>
	);
}

function VoteCard() {
	const { task, isVoted, voteCount, voteDisabled, handleVote } = usePublicTask();

	return (
		<PortalCard>
			<div className="mb-1 flex items-baseline gap-2">
				<span className="font-bold text-4xl text-portal-fg leading-10 tracking-[-0.03em] tabular-nums">
					{formatCount(voteCount)}
				</span>
				<span className="text-portal-fg-2 text-sm">
					{voteCount === 1 ? "person wants this" : "people want this"}
				</span>
			</div>
			<p className="mb-4 text-portal-fg-3 text-[13px]">
				{voteDisabled || task.status === "canceled"
					? "Voting is closed on this post."
					: "Your vote helps the team decide what to build next."}
			</p>
			<VoteButton count={voteCount} voted={isVoted} disabled={voteDisabled} onToggle={handleVote} />
		</PortalCard>
	);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3 border-portal-line border-t py-1 text-[13.5px] first:border-t-0">
			<dt className="text-portal-fg-3">{label}</dt>
			<dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-portal-fg">
				{children}
			</dd>
		</div>
	);
}

function DetailsCard() {
	const { categories } = usePublicOrganizationLayout();
	const { task, release, orgSlug } = usePublicTask();

	const priority = task.priority !== "none" ? priorityConfig[task.priority as keyof typeof priorityConfig] : undefined;
	const category = categories.find((c) => c.id === task.category);
	const github = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;
	const assignees = task.assignees ?? [];
	const labels = task.labels ?? [];

	return (
		<PortalCard>
			<PortalCardTitle>Details</PortalCardTitle>
			<dl className="flex flex-col">
				<DetailRow label="Status">
					<StatusChip status={task.status} />
				</DetailRow>
				{priority && <DetailRow label="Priority">{priority.label}</DetailRow>}
				{category && (
					<DetailRow label="Category">
						<CategoryTag category={category} className="text-portal-fg" />
					</DetailRow>
				)}
				{release && (
					<DetailRow label="Release">
						<Link
							to="/orgs/$orgSlug/releases/$releaseSlug"
							params={{ orgSlug, releaseSlug: release.slug }}
							className="inline-flex items-center gap-1.5 font-medium text-portal-accent-ink hover:underline focus-visible:underline"
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
								<PortalAvatar name={getDisplayName(assignee)} image={assignee.image} size={20} />
								{getDisplayName(assignee)}
							</span>
						))
					) : (
						<span className="text-portal-fg-3">No one yet</span>
					)}
				</DetailRow>
				{task.githubIssue && (
					<DetailRow label="GitHub">
						<a
							href={task.githubIssue.issueUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 font-medium text-portal-accent-ink hover:underline focus-visible:underline"
						>
							<IconBrandGithub aria-hidden className="size-3.5" />
							{github ? `${github.repo}#${github.number}` : `#${task.githubIssue.issueNumber}`}
						</a>
					</DetailRow>
				)}
				{labels.length > 0 && (
					<DetailRow label="Labels">
						{labels.map((label) => (
							<LabelTag key={label.id} label={label} className="text-portal-fg" />
						))}
					</DetailRow>
				)}
				{task.createdAt && <DetailRow label="Posted">{formatDate(task.createdAt, "en-GB")}</DetailRow>}
				{task.updatedAt && <DetailRow label="Updated">{formatDate(task.updatedAt, "en-GB")}</DetailRow>}
			</dl>
		</PortalCard>
	);
}

function RelatedPostsCard({ tasks }: { tasks: ReadonlyArray<schema.TaskWithLabels> }) {
	const { task, orgSlug } = usePublicTask();
	const related = findRelatedPosts({ id: task.id, category: task.category, labels: task.labels }, tasks);

	if (related.length === 0) return null;

	return (
		<PortalCard>
			<PortalCardTitle className="mb-1.5">Related posts</PortalCardTitle>
			<ul>
				{related.map((post) => (
					<li key={post.id} className="border-portal-line border-t first:border-t-0">
						{post.shortId != null ? (
							<Link
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(post.shortId) }}
								className="flex gap-3 py-2.5 transition-colors hover:text-portal-accent-ink focus-visible:text-portal-accent-ink"
							>
								<span className="min-w-7 pt-px text-center font-semibold text-[13px] text-portal-fg-2 tabular-nums">
									{formatCount(post.voteCount)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block font-medium text-sm leading-5 text-portal-fg">{post.title}</span>
									<span className="mt-1.5 block">
										<StatusChip status={post.status} />
									</span>
								</span>
							</Link>
						) : null}
					</li>
				))}
			</ul>
		</PortalCard>
	);
}

interface PublicTaskPanelContentProps {
	/** The org's public posts, for Related posts. Related hides when none match. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
}

/**
 * Details drawer for a post: Vote card, Details, Related posts. Reads live state from `usePublicTask()` /
 * `usePublicOrganizationLayout()`, so it is handed to the panel once (memoised on `tasks`) and stays in sync.
 */
export function PublicTaskPanelContent({ tasks }: PublicTaskPanelContentProps) {
	return (
		<div className="flex flex-col gap-3 p-1">
			<VoteCard />
			<DetailsCard />
			<RelatedPostsCard tasks={tasks} />
		</div>
	);
}
