import { formatCount, formatTaskKey, getDisplayName } from "@repo/util";
import { IconChevronUp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { ListContainer } from "@/components/public/portal/ui/ListContainer";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";

export interface ReleaseListTask {
	id: string;
	shortId: number | null;
	title: string | null;
	status: string;
	voteCount: number;
	assignees: ReadonlyArray<{ id: string; name: string; image: string | null; displayName?: string | null }>;
}

interface ReleaseTaskListProps {
	/** Already ordered (see `orderReleaseTasks`). */
	tasks: ReadonlyArray<ReleaseListTask>;
	orgSlug: string;
	/** The org's task key prefix (`SAY`). */
	orgPrefix: string;
}

/** "What is in it": compact 56px rows (key, title, status, votes, assignee), each linking to its post. */
export function ReleaseTaskList({ tasks, orgSlug, orgPrefix }: ReleaseTaskListProps) {
	if (tasks.length === 0) {
		return (
			<ListContainer>
				<p className="px-5 py-8 text-center text-[13.5px] text-portal-fg-3">
					No public posts are linked to this release yet.
				</p>
			</ListContainer>
		);
	}

	return (
		<ListContainer>
			{tasks.map((task) => {
				const assignee = task.assignees[0];
				const row = (
					<>
						<span className="min-w-[58px] rounded-[5px] bg-portal-neutral-soft px-1.5 py-px text-center font-semibold text-[12.5px] text-portal-fg-2">
							{task.shortId != null ? formatTaskKey(orgPrefix, task.shortId) : "—"}
						</span>
						<span className="min-w-0 flex-1 truncate font-medium text-[14.5px] text-portal-fg">
							{task.title || "Untitled post"}
						</span>
						<StatusChip status={task.status} className="hidden shrink-0 sm:inline-flex" />
						<span className="hidden w-11 shrink-0 items-center gap-1 text-[13px] text-portal-fg-2 tabular-nums sm:inline-flex">
							<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
							{formatCount(task.voteCount)}
						</span>
						<span className="hidden w-6 shrink-0 justify-end sm:flex">
							{assignee && <PortalAvatar name={getDisplayName(assignee)} image={assignee.image} size={24} />}
						</span>
					</>
				);
				const className =
					"flex h-14 items-center gap-3.5 border-portal-line border-t px-4 transition-colors first:border-t-0 hover:bg-portal-hover focus-visible:bg-portal-hover sm:px-5";

				return task.shortId != null ? (
					<Link
						key={task.id}
						to="/orgs/$orgSlug/$shortId"
						params={{ orgSlug, shortId: String(task.shortId) }}
						className={className}
					>
						{row}
					</Link>
				) : (
					<div key={task.id} className={className}>
						{row}
					</div>
				);
			})}
		</ListContainer>
	);
}
