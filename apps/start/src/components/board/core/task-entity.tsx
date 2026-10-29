import { BUILT_IN_GROUPINGS, buildSubtaskMap, getTopLevelTasks, TASK_GROUPING_MENU } from "../config/groupings";
import { extractTaskFieldValue, FIELD_CONFIGS } from "../filter/filter-config";
import { isTaskSortField, sortTasks, TASK_SORT_FIELDS } from "../filter/sort-config";
import type { FilterField } from "../filter/types";
import { BoardBulkActionBar } from "../selection/board-bulk-action-bar";
import { BoardCard } from "../views/board-card";
import { BoardDragMutationExecutor } from "../views/board-drag-actions";
import { BoardRow } from "../views/board-row";
import { useBoardRenderers } from "./board-data";
import type { TaskItem } from "./board-item";
import { deriveFilterUsers } from "./board-users";
import type { BoardEntity, BoardEntityCardProps, BoardEntityDropExecutorProps, BoardEntityRowProps } from "./entity";

// The board's built-in entity, and the default when a `BoardProvider` names none: every task board
// (/home, an org's tasks, a release's task list, the public Feedback/Activity/Roadmap) runs on it.
//
// Import-cycle note: board-data.tsx imports this module (for the default), and the views/fields imported
// here import board-data.tsx. So the object below must only reference, at module-evaluation time, modules
// outside that cycle (groupings, filter config, sort config, board-users) and this file's own function
// declarations — the cycle's components (BoardRow, BoardCard, …) are only referenced inside function bodies.

/** The task id `useBoardData()` checks before handing out task-typed data. */
export const TASK_ENTITY_ID = "task";

// The multi-value, cross-task "browse and narrow" fields — status/priority are already the board's own
// primary grouping/columns, so they're not repeated as a facet. `org` is dropped on single-org boards.
const TASK_QUICK_FILTER_FIELDS: readonly FilterField[] = ["label", "org", "category", "assignee", "release"];

/** A list row: the provider's `renderers.row`, else the admin `BoardRow`. */
function TaskEntityRow({ item, nested }: BoardEntityRowProps<TaskItem>) {
	const Row = useBoardRenderers().row ?? BoardRow;
	return <Row task={item} nested={nested} />;
}

/** A kanban / grid card: the provider's `renderers.card`, else the admin `BoardCard`. */
function TaskEntityCard({ item, variant }: BoardEntityCardProps<TaskItem>) {
	const Card = useBoardRenderers().card ?? BoardCard;
	return <Card task={item} variant={variant} />;
}

function TaskEntityDropExecutor({ mutation, onHandled }: BoardEntityDropExecutorProps<TaskItem>) {
	return <BoardDragMutationExecutor mutation={mutation} onHandled={onHandled} />;
}

function TaskEntityBulkBar({ items }: { items: readonly TaskItem[] }) {
	return <BoardBulkActionBar tasks={items} />;
}

export const TASK_ENTITY: BoardEntity<TaskItem> = {
	id: TASK_ENTITY_ID,
	noun: { singular: "task", plural: "tasks" },
	groupings: BUILT_IN_GROUPINGS,
	groupingMenu: TASK_GROUPING_MENU,
	filterFields: FIELD_CONFIGS,
	quickFilterFields: TASK_QUICK_FILTER_FIELDS,
	extractFilterValue: extractTaskFieldValue,
	sortFields: TASK_SORT_FIELDS,
	sort: (items, sortBy, direction) => (isTaskSortField(sortBy) ? sortTasks(items, sortBy, direction) : items),
	isCompleted: (task) => task.status === "done" || task.status === "canceled",
	completedToggleLabel: "Show completed tasks",
	Row: TaskEntityRow,
	Card: TaskEntityCard,
	DropExecutor: TaskEntityDropExecutor,
	BulkBar: TaskEntityBulkBar,
	subItems: { topLevel: getTopLevelTasks, childrenByParent: buildSubtaskMap },
	deriveUsers: deriveFilterUsers,
};
