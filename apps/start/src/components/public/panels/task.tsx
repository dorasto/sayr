import type { schema } from "@repo/database";
import { PostDetails } from "./post-details";
import { RelatedPosts } from "./related-posts";

interface PublicTaskPanelContentProps {
	/** The org's public posts, for Related posts. Related hides when none match. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
}

/**
 * Details drawer for a post: the post's details and related posts (voting is the chip beside the status on the page).
 * Reads live state from `usePublicTask()` / `usePublicOrganizationLayout()`, so it is handed to the panel once
 * (memoised on `tasks`) and stays in sync.
 */
export function PublicTaskPanelContent({ tasks }: PublicTaskPanelContentProps) {
	return (
		<div className="flex flex-col gap-4">
			<PostDetails />
			<RelatedPosts tasks={tasks} />
		</div>
	);
}
