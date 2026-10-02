import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconBrandGithub, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { memo, type MouseEvent } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { buildExcerpt } from "@/lib/portal/excerpt";
import { formatBoardTime, formatShortName } from "@/lib/portal/board-row";
import { isTeamMember } from "@/lib/portal/team";
import { CategoryTag } from "./portal/ui/CategoryTag";
import { LabelTag } from "./portal/ui/LabelTag";
import { ListRow } from "./portal/ui/ListContainer";
import { PortalAvatar } from "./portal/ui/PortalAvatar";
import { ReleaseTag } from "./portal/ui/ReleaseTag";
import { StatusChip } from "./portal/ui/StatusChip";
import { VoteBox } from "./portal/ui/VoteBox";
import { useBoardVote } from "./portal/board/useBoardVote";

export interface PublicTaskItemProps {
	task: schema.TaskWithLabels;
	categories: ReadonlyArray<schema.categoryType>;
	/** The release this post belongs to, when known. The tag is only shown while the post is not done yet. */
	release?: { name: string } | null;
	/** Marks the row open in Peek: raised background and an accent bar. */
	selected?: boolean;
	/** Compact rows (a post is showing in the board panel) drop the excerpt. */
	compact?: boolean;
	/**
	 * Seam for Peek: called when the row's link is clicked. Call `event.preventDefault()` to stop the navigation to
	 * `/orgs/$orgSlug/$shortId` (e.g. to open the panel instead); leave the event alone to let the link navigate.
	 */
	onOpen?: (task: schema.TaskWithLabels, event: MouseEvent<HTMLAnchorElement>) => void;
}

/** One post on the board. The whole row is a link; the vote box sits above it and never navigates. */
function PublicTaskItemBase({
	task,
	categories,
	release,
	selected = false,
	compact = false,
	onOpen,
}: PublicTaskItemProps) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);

	const category = task.category ? categories.find((c) => c.id === task.category) : undefined;
	const releaseTag = release && task.status !== "done" ? release : null;
	const labels = task.labels ?? [];
	const excerpt = compact ? "" : buildExcerpt(task.description);
	const commentCount = task.comments?.length ?? 0;
	const creator = task.createdBy ?? null;
	const creatorName = formatShortName(creator?.displayName || creator?.name);
	const time = formatBoardTime(task.createdAt);

	const voteProps = {
		count: vote.voteCount,
		voted: vote.voted,
		disabled: vote.disabled,
		onToggle: vote.toggle,
	};

	return (
		<ListRow selected={selected}>
			<div className={cn("flex gap-3 p-4 md:gap-4 md:py-5 md:pr-6 md:pl-5", compact && "md:py-4 md:pr-5 md:pl-4")}>
				<div className="relative z-10 shrink-0 self-start">
					<VoteBox {...voteProps} size="sm" className="md:hidden" />
					<VoteBox {...voteProps} size="md" className="hidden md:flex" />
				</div>

				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
					onClick={(event) => onOpen?.(task, event)}
					className="block min-w-0 flex-1 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-portal-focus focus-visible:after:ring-inset"
				>
					<h3
						className={cn(
							"font-semibold text-base leading-[22px] tracking-[-0.011em] md:leading-6",
							excerpt ? "mb-1 md:mb-0.5" : "mb-2"
						)}
					>
						{task.title}
					</h3>
					{excerpt && (
						<p className="mb-2.5 line-clamp-2 text-[14px] text-portal-fg-2 leading-[21px] md:mb-3 md:leading-[22px]">
							{excerpt}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-portal-fg-3 leading-[18px] md:flex-nowrap md:gap-3.5">
						<span className="flex min-w-0 items-center gap-3.5 md:overflow-hidden">
							<StatusChip status={task.status} />
							{category && <CategoryTag category={category} className="hidden md:inline-flex" />}
							{releaseTag && <ReleaseTag name={releaseTag.name} className="hidden md:inline-flex" />}
							{!releaseTag && labels[0] && (
								<span className="hidden items-center gap-1.5 md:inline-flex">
									<LabelTag label={labels[0]} />
									{labels.length > 1 && <span className="text-portal-fg-3">+{labels.length - 1}</span>}
								</span>
							)}
						</span>
						<span className="hidden grow md:block" />
						<span className="flex shrink-0 items-center gap-3 md:gap-3.5">
							<span className="inline-flex items-center gap-1.5">
								<IconMessage aria-hidden className="size-[15px]" stroke={1.75} />
								<span className="sr-only">Comments: </span>
								{commentCount}
							</span>
							{task.githubIssue && (
								<span
									className="hidden items-center md:inline-flex"
									title={`Linked GitHub issue #${task.githubIssue.issueNumber}`}
								>
									<IconBrandGithub aria-hidden className="size-[15px]" stroke={1.75} />
									<span className="sr-only">Linked GitHub issue</span>
								</span>
							)}
							{creator && creatorName && (
								<span className="inline-flex items-center gap-[7px]">
									<PortalAvatar
										name={creator.displayName || creator.name}
										image={creator.image}
										size={20}
										ring={isTeamMember(creator.id, organization)}
									/>
									<span className="font-medium text-portal-fg-2">{creatorName}</span>
								</span>
							)}
							{time && <span className="whitespace-nowrap md:min-w-16 md:text-right">{time}</span>}
						</span>
					</div>
				</Link>
			</div>
		</ListRow>
	);
}

export const PublicTaskItem = memo(PublicTaskItemBase);
