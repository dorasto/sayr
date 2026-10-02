import type { schema } from "@repo/database";
import { SimilarPostRow } from "@/components/public/portal/new/SimilarPostRow";

interface SimilarPostsListProps {
	posts: schema.TaskWithLabels[];
}

/** The "N posts look similar" box under the title, nudging the visitor to upvote instead of posting a duplicate. */
export function SimilarPostsList({ posts }: SimilarPostsListProps) {
	return (
		<section aria-live="polite" className="mt-4 overflow-hidden rounded-xl border border-primary/50 bg-background">
			<h3 className="m-0 flex flex-wrap items-center gap-x-2.5 bg-primary/15 px-4 py-3 font-semibold text-primary text-sm">
				{posts.length === 1 ? "1 post looks similar." : `${posts.length} posts look similar.`}
				<span className="font-normal text-muted-foreground max-md:hidden">
					Upvote one instead of posting a duplicate.
				</span>
			</h3>
			<ul>
				{posts.map((task) => (
					<SimilarPostRow key={task.id} task={task} />
				))}
			</ul>
		</section>
	);
}
