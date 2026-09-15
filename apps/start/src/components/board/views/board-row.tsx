import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Checkbox } from "@repo/ui/components/checkbox";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { IconCornerDownRight, IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { OrgHoverCard } from "@/components/hover-cards";
import { ORG_KEY_SLOT_CLASS, ROW_LEADING_GUTTER_CLASS } from "../config/field-config";
import { FieldAssignee } from "../fields/field-assignee";
import { FieldPriority } from "../fields/field-priority";
import { FieldStatus } from "../fields/field-status";

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
 * chevron — not wired to multi-select yet, just reserving the spot. Status +
 * priority + task key are clustered after that, title follows, assignees
 * sit on the right. Always a real link to the task's own org detail page
 * (org is explicit per row from task.organizationId); no cross-org task
 * detail surface is needed.
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
 */
export function BoardRow({ task, nested = false }: BoardRowProps) {
	const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
			e.preventDefault();
		}
	};

	return (
		<Link
			to="/$orgId/tasks/$taskShortId"
			params={{ orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() }}
			onClick={handleLinkClick}
			className="group flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-accent transition-colors rounded-xl"
		>
			{/* Not wired up yet — a placeholder for future multi-select, sized/positioned to match the header's chevron. */}
			<Checkbox
				data-no-propagate
				className={cn(
					ROW_LEADING_GUTTER_CLASS,
					"h-3.5 shrink-0 opacity-0 group-hover:opacity-100 data-checked:opacity-100"
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
			<div className="shrink-0">
				<FieldAssignee task={task} />
			</div>
		</Link>
	);
}
