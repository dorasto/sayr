import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { FieldToolbar } from "../fields/field-toolbar";

interface BoardCardProps {
	task: schema.TaskWithLabels;
}

/**
 * A single kanban card — org badge, task key, title, and the field toolbar
 * for inline editing. Same link/data shape as BoardRow, laid out vertically.
 */
export function BoardCard({ task }: BoardCardProps) {
	return (
		<div className="flex flex-col gap-2 rounded-xl border bg-card p-3 hover:bg-accent/50 transition-all">
			<Link
				to="/$orgId/tasks/$taskShortId"
				params={{
					orgId: task.organizationId,
					taskShortId: (task.shortId ?? task.id).toString(),
				}}
				className="flex flex-col gap-1.5"
			>
				<div className="flex items-center gap-2">
					{task.organization && (
						<Avatar className="size-4 shrink-0">
							<AvatarImage src={task.organization.logo ?? undefined} alt={task.organization.name} />
							<AvatarFallback className="text-[9px]">{getInitials(task.organization.name)}</AvatarFallback>
						</Avatar>
					)}
					<span className="text-xs text-muted-foreground tabular-nums">
						{task.organization ? formatTaskKey(task.organization.shortId, task.shortId) : task.shortId}
					</span>
				</div>
				<p
					className={cn(
						"text-sm font-medium line-clamp-2",
						(task.status === "done" || task.status === "canceled") && "text-muted-foreground line-through"
					)}
				>
					{task.title || "Untitled"}
				</p>
			</Link>
			<FieldToolbar task={task} fields={["priority", "category", "release", "label", "assignee"]} />
		</div>
	);
}
