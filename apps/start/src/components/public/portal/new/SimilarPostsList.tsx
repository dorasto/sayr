import type { schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { SimilarPostRow } from "@/components/public/portal/new/SimilarPostRow";

interface SimilarPostsListProps {
	posts: schema.TaskWithLabels[];
}

/** "Similar posts" for the title as typed, nudging the visitor to upvote one instead of posting a duplicate. */
export function SimilarPostsList({ posts }: SimilarPostsListProps) {
	return (
		<section aria-live="polite" aria-label="Similar posts" className="rounded-lg border bg-accent/50 p-1">
			<Label variant="description" className="block px-2 pt-1 pb-1.5 text-xs">
				{posts.length === 1 ? "1 similar post" : `${posts.length} similar posts`} already on the board. Upvote one
				instead of posting a duplicate.
			</Label>
			<ul className="flex flex-col">
				{posts.map((task) => (
					<SimilarPostRow key={task.id} task={task} />
				))}
			</ul>
		</section>
	);
}
