import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronUp, IconMessageCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useBoardVote } from "@/components/public/portal/board/useBoardVote";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";

interface SimilarPostRowProps {
	task: schema.TaskWithLabels;
}

/** One similar-post row: vote box, title, status and comment count, plus an "Upvote this instead" action. */
export function SimilarPostRow({ task }: SimilarPostRowProps) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const commentCount = task.comments?.length ?? 0;

	return (
		<li className="flex items-center gap-3.5 border-t py-3 pr-3.5 pl-3 max-md:block max-md:p-3.5">
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
					className="block font-semibold text-[14.5px] text-foreground leading-[21px] hover:underline max-md:text-[15px]"
				>
					{task.title}
				</Link>
				<div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground max-md:mb-3">
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
				<Button
					variant="outline"
					aria-pressed={vote.voted}
					onClick={() => void vote.toggle()}
					className={cn(
						"h-8 px-2.5 text-[13px] max-md:h-11 max-md:w-full max-md:text-sm",
						vote.voted
							? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20"
							: "max-md:border-primary/50 max-md:bg-primary/15 max-md:text-primary"
					)}
				>
					<IconChevronUp aria-hidden className="md:hidden" stroke={2} />
					{vote.voted ? "You upvoted this" : "Upvote this instead"}
				</Button>
			)}
		</li>
	);
}
