import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Checkbox } from "@repo/ui/components/checkbox";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { Link } from "@tanstack/react-router";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import { BoardTaskContextMenu } from "../fields/board-task-context-menu";
import { FieldToolbar } from "../fields/field-toolbar";
import { BOARD_TASK_SELECTION_KEY } from "../selection/board-selection-constants";

interface BoardCardProps {
	task: schema.TaskWithLabels;
}

/**
 * A single kanban card — org badge, task key, title, and the field toolbar
 * for inline editing. Same link/data shape as BoardRow, laid out vertically.
 * Same multi-select checkbox (hover/selected reveal) and right-click context
 * menu as BoardRow, sharing the same selection state (see
 * selection/board-selection-constants.ts) so switching list/kanban doesn't
 * lose a selection.
 */
export function BoardCard({ task }: BoardCardProps) {
	const { isSelected, toggleTask } = useTaskSelection(undefined, BOARD_TASK_SELECTION_KEY);
	const selected = isSelected(task.id);

	return (
		<BoardTaskContextMenu task={task}>
			<div
				className={cn(
					"group relative flex flex-col gap-2 rounded-xl bg-card p-3 hover:bg-accent transition-all",
					selected && "bg-primary/10 hover:bg-primary/10"
				)}
			>
				<Checkbox
					checked={selected}
					onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
					className={cn(
						"absolute top-2 right-2 size-3.5 rounded-md opacity-0 group-hover:opacity-100 data-checked:opacity-100 transition-all"
					)}
				/>
				<Link
					to="/$orgId/tasks/$taskShortId"
					params={{
						orgId: task.organizationId,
						taskShortId: (task.shortId ?? task.id).toString(),
					}}
					className="flex flex-col gap-1.5"
				>
					<div className="flex items-center gap-2 pr-5">
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
		</BoardTaskContextMenu>
	);
}
