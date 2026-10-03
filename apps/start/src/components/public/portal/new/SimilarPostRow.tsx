import type { schema } from "@repo/database";
import { Link } from "@tanstack/react-router";
import { useBoardVote } from "@/components/public/portal/board/useBoardVote";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { VoteBox } from "@/components/public/portal/ui/VoteBox";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";

interface SimilarPostRowProps {
	task: schema.TaskWithLabels;
}

/** One similar post: status, title (opens the post) and the same vote chip as the board cards. */
export function SimilarPostRow({ task }: SimilarPostRowProps) {
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);

	return (
		<li className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary">
			<StatusChip status={task.status} />
			<Link
				to="/orgs/$orgSlug/$shortId"
				params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
				className="min-w-0 flex-1 truncate font-medium text-foreground text-sm hover:underline"
			>
				{task.title}
			</Link>
			<VoteBox
				size="chip"
				count={vote.voteCount}
				voted={vote.voted}
				disabled={vote.disabled}
				onToggle={vote.toggle}
			/>
		</li>
	);
}
