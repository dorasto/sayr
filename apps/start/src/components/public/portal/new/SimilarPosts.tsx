import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronUp, IconMessageCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useBoardVote } from "../board/useBoardVote";
import { StatusChip } from "../ui/StatusChip";
import { VoteBox } from "../ui/VoteBox";

function SimilarPostRow({ task }: { task: schema.TaskWithLabels }) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const commentCount = task.comments?.length ?? 0;

	return (
		<li className="flex items-center gap-3.5 border-portal-line border-t py-3 pr-3.5 pl-3 max-md:block max-md:p-3.5">
			<VoteBox
				size="sm"
				count={vote.voteCount}
				voted={vote.voted}
				disabled={vote.disabled}
				onToggle={vote.toggle}
				className="max-md:hidden"
			/>
			<div className="min-w-0 flex-1">
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
					className="block font-semibold text-[14.5px] text-portal-fg leading-[21px] hover:underline focus-visible:underline max-md:text-[15px]"
				>
					{task.title}
				</Link>
				<div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-portal-fg-3 max-md:mb-3">
					<StatusChip status={task.status} />
					<span className="md:hidden">
						{vote.voteCount} {vote.voteCount === 1 ? "vote" : "votes"}
					</span>
					<span className="inline-flex items-center gap-1 max-md:hidden">
						<IconMessageCircle aria-hidden className="size-3.5" />
						{commentCount} {commentCount === 1 ? "comment" : "comments"}
					</span>
				</div>
			</div>
			{!vote.disabled && (
				<button
					type="button"
					aria-pressed={vote.voted}
					onClick={() => void vote.toggle()}
					className={cn(
						"inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-portal-sm border font-medium text-[13px] outline-none transition-colors",
						"h-[30px] px-2.5 max-md:h-11 max-md:w-full max-md:rounded-portal-md max-md:text-sm",
						vote.voted
							? "border-portal-accent-line bg-portal-accent-soft text-portal-accent-ink"
							: "border-portal-line-2 bg-portal-surface text-portal-fg hover:bg-portal-raised focus-visible:bg-portal-raised max-md:border-portal-accent-line max-md:bg-portal-accent-soft max-md:text-portal-accent-ink"
					)}
				>
					<IconChevronUp aria-hidden className="size-4 md:hidden" stroke={2} />
					{vote.voted ? "You upvoted this" : "Upvote this instead"}
				</button>
			)}
		</li>
	);
}

interface SimilarPostsProps {
	/** Already ranked (see `useSimilarPosts`); renders nothing when empty. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
	className?: string;
}

/**
 * "N posts look similar" card for a draft title: an accent-bordered card with a tinted header, then one row per post with
 * a vote box, status, comment count and an "Upvote this instead" action. Voting works logged out. On phones the rows
 * stack and the action is a full-width 44px button.
 */
export function SimilarPosts({ tasks, className }: SimilarPostsProps) {
	if (tasks.length === 0) return null;

	return (
		<section
			aria-live="polite"
			className={cn(
				"overflow-hidden rounded-portal-lg border border-portal-accent-line bg-portal-surface",
				className
			)}
		>
			<h3 className="m-0 flex flex-wrap items-center gap-x-2.5 bg-portal-accent-soft px-4 py-3 font-semibold text-portal-accent-ink text-sm">
				{tasks.length === 1 ? "1 post looks similar." : `${tasks.length} posts look similar.`}
				<span className="font-normal text-portal-fg-2 max-md:hidden">
					Upvote one instead of posting a duplicate.
				</span>
			</h3>
			<ul>
				{tasks.map((task) => (
					<SimilarPostRow key={task.id} task={task} />
				))}
			</ul>
		</section>
	);
}
