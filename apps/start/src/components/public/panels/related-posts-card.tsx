import type { schema } from "@repo/database";
import { formatCount } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { findRelatedPosts } from "@/lib/portal/related";

interface RelatedPostsCardProps {
	/** The org's public posts to match against. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
}

/** Posts sharing the open post's category or labels; renders nothing when none match. */
export function RelatedPostsCard({ tasks }: RelatedPostsCardProps) {
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
