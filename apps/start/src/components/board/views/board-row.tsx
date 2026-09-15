import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { FieldToolbar } from "../fields/field-toolbar";

interface BoardRowProps {
	task: schema.TaskWithLabels;
}

/**
 * A single list row — org badge, task key, title, and the field toolbar for
 * inline editing. Always a real link to the task's own org detail page
 * (org is explicit per row from task.organizationId); no cross-org task
 * detail surface is needed.
 */
export function BoardRow({ task }: BoardRowProps) {
	return (
		<div className="flex items-center gap-3 px-3 py-2 border-b hover:bg-accent/50 transition-colors">
			<Link
				to="/$orgId/tasks/$taskShortId"
				params={{ orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() }}
				className="flex flex-1 min-w-0 items-center gap-3"
			>
				{task.organization && (
					<Avatar className="size-5 shrink-0">
						<AvatarImage src={task.organization.logo ?? undefined} alt={task.organization.name} />
						<AvatarFallback className="text-[10px]">{getInitials(task.organization.name)}</AvatarFallback>
					</Avatar>
				)}
				<span className="text-xs text-muted-foreground shrink-0 tabular-nums">
					{task.organization ? formatTaskKey(task.organization.shortId, task.shortId) : task.shortId}
				</span>
				<span
					className={cn(
						"text-sm font-medium truncate",
						(task.status === "done" || task.status === "canceled") && "text-muted-foreground line-through"
					)}
				>
					{task.title || "Untitled"}
				</span>
			</Link>
			<div className="shrink-0">
				<FieldToolbar task={task} fields={["status", "priority", "assignee"]} />
			</div>
		</div>
	);
}
