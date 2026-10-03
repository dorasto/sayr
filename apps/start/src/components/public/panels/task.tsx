import type { schema } from "@repo/database";
import { VoteButton } from "@/components/public/portal/ui/VoteButton";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { PostDetails } from "./post-details";
import { RelatedPosts } from "./related-posts";

interface PublicTaskPanelContentProps {
	/** The org's public posts, for Related posts. Related hides when none match. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
}

/**
 * Details drawer for a post: the vote button, the post's details and related posts. Reads live state from
 * `usePublicTask()` / `usePublicOrganizationLayout()`, so it is handed to the panel once (memoised on `tasks`) and stays
 * in sync.
 */
export function PublicTaskPanelContent({ tasks }: PublicTaskPanelContentProps) {
	const { voteCount, isVoted, voteDisabled, handleVote } = usePublicTask();

	return (
		<div className="flex flex-col gap-4">
			<VoteButton count={voteCount} voted={isVoted} disabled={voteDisabled} onToggle={handleVote} showCount />
			<PostDetails />
			<RelatedPosts tasks={tasks} />
		</div>
	);
}
