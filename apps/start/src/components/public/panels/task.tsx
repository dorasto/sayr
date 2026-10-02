import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { ensureCdnUrl, formatCount, formatDate, getDisplayName, getInitials } from "@repo/util";
import { IconArrowUpRight, IconBrandGithub, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CategoryTag } from "@/components/public/portal/ui/CategoryTag";
import { LabelTag } from "@/components/public/portal/ui/LabelTag";
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
		<div className="rounded-xl border bg-card p-5">
			<div className="mb-1 flex items-baseline gap-2">
				<span className="font-bold text-4xl text-foreground leading-10 tracking-[-0.03em] tabular-nums">
					{formatCount(voteCount)}
				</span>
				<span className="text-muted-foreground text-sm">
					{voteCount === 1 ? "person wants this" : "people want this"}
				</span>
			</div>
			<p className="mb-4 text-muted-foreground text-[13px]">
				{voteDisabled || task.status === "canceled"
					? "Voting is closed on this post."
					: "Your vote helps the team decide what to build next."}
			</p>
			<VoteButton count={voteCount} voted={isVoted} disabled={voteDisabled} onToggle={handleVote} />
		</div>
	);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-h-10 items-center justify-between gap-3 border-t py-1 text-[13.5px] first:border-t-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-foreground">
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

function RelatedPostsCard({ tasks }: { tasks: ReadonlyArray<schema.TaskWithLabels> }) {
	const { task, orgSlug } = usePublicTask();
	const related = findRelatedPosts({ id: task.id, category: task.category, labels: task.labels }, tasks);

	if (related.length === 0) return null;

	return (
		<div className="rounded-xl border bg-card p-5">
			<h3 className="mb-1.5 font-semibold text-[13px] text-foreground">Related posts</h3>
			<ul>
				{related.map((post) => (
					<li key={post.id} className="border-t first:border-t-0">
						{post.shortId != null ? (
							<Link
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(post.shortId) }}
								className="flex gap-3 py-2.5 transition-colors hover:text-primary focus-visible:text-primary"
							>
								<span className="min-w-7 pt-px text-center font-semibold text-[13px] text-muted-foreground tabular-nums">
									{formatCount(post.voteCount)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block font-medium text-sm leading-5 text-foreground">{post.title}</span>
									<span className="mt-1.5 block">
										<StatusChip status={post.status} />
									</span>
								</span>
							</Link>
						) : null}
					</li>
				))}
			</ul>
		</div>
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
