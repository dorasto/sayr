import type { schema } from "@repo/database";
import { DetailsCard } from "./details-card";
import { RelatedPostsCard } from "./related-posts-card";
import { VoteCard } from "./vote-card";

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
