import type { schema } from "@repo/database";
import { formatCount } from "@repo/util";
import { IconChevronUp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { findRelatedPosts } from "@/lib/portal/related";
import { DetailSection } from "./detail-section";

interface RelatedPostsProps {
	/** The org's public posts to match against. */
	tasks: ReadonlyArray<schema.TaskWithLabels>;
}

/** Posts sharing the open post's category or labels; renders nothing when none match. */
export function RelatedPosts({ tasks }: RelatedPostsProps) {
	const { task, orgSlug } = usePublicTask();
	const related = findRelatedPosts({ id: task.id, category: task.category, labels: task.labels }, tasks);

	if (related.length === 0) return null;

	return (
		<DetailSection label="Related posts">
			<ul className="flex w-full flex-col gap-0.5">
				{related.map((post) =>
					post.shortId != null ? (
						<li key={post.id}>
							<Link
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(post.shortId) }}
								className="flex items-center gap-2 rounded-lg border border-transparent p-1 transition-colors hover:border-border hover:bg-secondary focus-visible:border-border"
							>
								<StatusChip status={post.status} />
								<span className="min-w-0 flex-1 truncate">{post.title}</span>
								<span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground text-xs tabular-nums">
									<IconChevronUp aria-hidden className="size-3.5" />
									{formatCount(post.voteCount)}
								</span>
							</Link>
						</li>
					) : null
				)}
			</ul>
		</DetailSection>
	);
}
