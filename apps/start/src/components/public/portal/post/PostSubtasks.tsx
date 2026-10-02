import { formatTaskKey } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";

export interface PostSubtaskItem {
	id: string;
	shortId: number | null;
	title: string | null;
	status: string;
}

interface PostSubtasksProps {
	subtasks: ReadonlyArray<PostSubtaskItem>;
	orgShortId: string;
	orgSlug: string;
	className?: string;
}

/** Compact "Sub-tasks" list under the description. Renders nothing when there are none. */
export function PostSubtasks({ subtasks, orgShortId, orgSlug, className }: PostSubtasksProps) {
	if (subtasks.length === 0) return null;

	return (
		<section aria-labelledby="post-subtasks-heading" className={className}>
			<h2 id="post-subtasks-heading" className="mb-2 font-semibold text-[15px] text-portal-fg">
				Sub-tasks
			</h2>
			<ul className="overflow-hidden rounded-portal-lg border border-portal-line bg-portal-surface">
				{subtasks.map((subtask) => (
					<li key={subtask.id} className="border-portal-line border-t first:border-t-0">
						{subtask.shortId != null ? (
							<Link
								to="/orgs/$orgSlug/$shortId"
								params={{ orgSlug, shortId: String(subtask.shortId) }}
								className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-portal-hover focus-visible:bg-portal-hover"
							>
								<span className="shrink-0 text-[13px] text-portal-fg-3">
									{formatTaskKey(orgShortId, subtask.shortId)}
								</span>
								<span className="min-w-0 flex-1 truncate font-medium text-sm text-portal-fg">
									{subtask.title ?? "Untitled"}
								</span>
								<StatusChip status={subtask.status} />
							</Link>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
