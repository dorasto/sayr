import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Checkbox } from "@repo/ui/components/checkbox";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { IconCornerDownRight, IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { OrgHoverCard } from "@/components/hover-cards";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import { ORG_KEY_SLOT_CLASS, ROW_LEADING_GUTTER_CLASS } from "../config/field-config";
import { BoardTaskContextMenu } from "../fields/board-task-context-menu";
import { FieldAssignee } from "../fields/field-assignee";
import { FieldCategory } from "../fields/field-category";
import { FieldLabel } from "../fields/field-label";
import { FieldPriority } from "../fields/field-priority";
import { FieldRelease } from "../fields/field-release";
import { FieldStatus } from "../fields/field-status";
import { BOARD_TASK_SELECTION_KEY } from "../selection/board-selection-constants";

interface BoardRowProps {
	task: schema.TaskWithLabels;
	/**
	 * Rendered as a subtask nested under its parent's row. Subtasks aren't
	 * wrapped in a sortable/draggable container by the caller (board-list-view.tsx
	 * only renders them plain, never via SortableBoardRow), so there's nothing
	 * extra to disable here — they're simply never part of the drag system.
	 */
	nested?: boolean;
}

/**
 * A single list row — flat, dense, no card/border treatment (matches the
 * existing UnifiedTaskItem list row, not a boxed item). Leads with a
 * checkbox-gutter (ROW_LEADING_GUTTER_CLASS) aligned with the group header's
 * chevron, wired to the board's own multi-select (see
 * selection/board-selection-constants.ts). Status + priority + task key are
 * clustered after that, title follows, assignees sit on the right. Always a
 * real link to the task's own org detail page (org is explicit per row from
 * task.organizationId); no cross-org task detail surface is needed.
 *
 * The checkbox is always the row's first column, at the same x for every
 * row — nested or not (Linear does the same: a subtask's checkbox lives at
 * the row's outer edge, not indented alongside its content). Nested rows
 * get one extra column after it — the connector glyph — which is what
 * actually shifts everything else over: since every column (checkbox,
 * connector, status, priority) is the same fixed ROW_LEADING_GUTTER_CLASS
 * width with the same gap-1.5 between them, that one extra column shifts
 * status/priority/etc by exactly one slot — the connector lands under the
 * parent row's status column, the subtask's own status lands under the
 * parent's priority column, and so on.
 *
 * The checkbox itself stays invisible until the row is hovered or it's
 * actually checked (data-checked, from Base UI's own Checkbox state) —
 * group-hover on the row reveals it, matching Linear's convention of not
 * showing a selection affordance until you're interacting with that row.
 *
 * Right-click anywhere on the row opens BoardTaskContextMenu — the same
 * field-update actions the pickers below use, surfaced as a menu instead.
 */
export function BoardRow({ task, nested = false }: BoardRowProps) {
	const { isSelected, toggleTask } = useTaskSelection(undefined, BOARD_TASK_SELECTION_KEY);
	const selected = isSelected(task.id);

	const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
			e.preventDefault();
		}
	};

	return (
		<BoardTaskContextMenu task={task}>
			<Link
				to="/$orgId/tasks/$taskShortId"
				params={{
					orgId: task.organizationId,
					taskShortId: (task.shortId ?? task.id).toString(),
				}}
				onClick={handleLinkClick}
				className={cn(
					"group flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-accent transition-all rounded-xl",
					selected && "bg-primary/10 hover:bg-primary/10"
				)}
			>
				<Checkbox
					data-no-propagate
					checked={selected}
					onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
					className={cn(
						ROW_LEADING_GUTTER_CLASS,
						"h-3.5 shrink-0 opacity-0 group-hover:opacity-100 data-checked:opacity-100 transition-all rounded-md"
					)}
					onClick={(e) => e.stopPropagation()}
				/>
				{nested && (
					<span
						aria-hidden="true"
						className={cn(ROW_LEADING_GUTTER_CLASS, "h-3.5 shrink-0 flex items-center justify-center")}
					>
						<IconCornerDownRight className="size-3 text-muted-foreground" />
					</span>
				)}
				<FieldStatus task={task} />
				<FieldPriority task={task} />
				{task.organization ? (
					<OrgHoverCard organization={task.organization}>
						<span className={cn("flex items-center gap-1 shrink-0", ORG_KEY_SLOT_CLASS)}>
							<Avatar className="size-3.5 rounded-sm shrink-0">
								<AvatarImage src={task.organization.logo ?? undefined} alt={task.organization.name} />
								<AvatarFallback className="rounded-sm text-[7px]">
									{getInitials(task.organization.name)}
								</AvatarFallback>
							</Avatar>
							<span className="truncate text-xs font-medium text-muted-foreground">
								{formatTaskKey(task.organization.shortId, task.shortId)}
							</span>
						</span>
					</OrgHoverCard>
				) : (
					<span className={cn("shrink-0 text-xs font-medium text-muted-foreground truncate", ORG_KEY_SLOT_CLASS)}>
						{task.shortId}
					</span>
				)}
				<span
					className={cn(
						"truncate text-sm text-foreground flex-1 min-w-0 flex items-center",
						(task.status === "done" || task.status === "canceled") && "text-muted-foreground"
					)}
				>
					{task.visible === "private" && <IconLock className="size-3.5 mr-1 text-primary shrink-0" />}
					{task.title || "Untitled"}
				</span>
				{/*
				 * shrink (not shrink-0) + min-w-0 + overflow-hidden: category/release/
				 * label pills are unbounded in number and each individually truncates
				 * its own text, but nothing capped their COMBINED width — on a task
				 * with several of them, that width was unbounded and rigid (shrink-0),
				 * which forced the title's flex-1 to collapse toward zero instead.
				 * max-w caps it at less than half the row so title always keeps the
				 * majority of the space; overflow-hidden clips whatever doesn't fit
				 * once shrunk below its natural content width (the flex-shrink default
				 * alone can't go below a flex item's own content size without it).
				 */}
				<div className="flex items-center gap-1 min-w-0 shrink overflow-hidden max-w-[40%]">
					<FieldCategory task={task} />
					<FieldRelease task={task} />
					<FieldLabel task={task} />
				</div>
				<div className="shrink-0">
					<FieldAssignee task={task} />
				</div>
			</Link>
		</BoardTaskContextMenu>
	);
}
