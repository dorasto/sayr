import type { schema } from "@repo/database";

// A port of `getTaskFieldPermissions` (components/tasks/shared/task-field-toolbar-types.ts): the board
// may not import from components/tasks/** (see core/task-board-provider.tsx, the one adapter that
// does), and that file also drags in `@/` imports vitest can't resolve. Same rules, narrowed to the
// fields the board edits, with one difference in shape: every field is always present (true/false)
// instead of the old "absent = editable" partial record. Pure — unit-tested in field-permissions.test.ts.

/** The task fields the board's pickers, context menu and bulk bar can edit. */
export type BoardPermissionField =
	| "status"
	| "priority"
	| "assignees"
	| "labels"
	| "category"
	| "visibility"
	| "release";

/** Per-field editability for one task: `true` = the viewer may edit it. */
export type BoardFieldPermissions = Readonly<Record<BoardPermissionField, boolean>>;

/** Everything editable. */
export const ALL_FIELDS_EDITABLE: BoardFieldPermissions = {
	status: true,
	priority: true,
	assignees: true,
	labels: true,
	category: true,
	visibility: true,
	release: true,
};

/** Nothing editable. */
export const NO_FIELDS_EDITABLE: BoardFieldPermissions = {
	status: false,
	priority: false,
	assignees: false,
	labels: false,
	category: false,
	visibility: false,
	release: false,
};

/** The task's own people, which are all the rules look at on the task. */
type PermissionTask = {
	createdBy?: { id: string } | null;
	assignees?: readonly { id: string }[] | null;
};

/**
 * What `userId` may edit on `task`, given their permissions in the task's org.
 *
 * - No viewer id or no permissions for the org = no gating (everything editable), exactly like the old
 *   helper: a board that supplies no permission data behaves as it did before permissions existed.
 * - The task's creator and its assignees may edit everything on it.
 * - `admin.administrator` may edit everything.
 * - Otherwise: status <- tasks.changeStatus, priority <- tasks.changePriority, assignees <- tasks.assign,
 *   and labels/category/visibility/release <- tasks.editAny.
 */
export function getBoardFieldPermissions(
	task: PermissionTask,
	userId: string | null | undefined,
	permissions: schema.TeamPermissions | null | undefined
): BoardFieldPermissions {
	if (!userId || !permissions) return ALL_FIELDS_EDITABLE;

	const isCreator = task.createdBy?.id === userId;
	const isAssignee = task.assignees?.some((assignee) => assignee.id === userId) ?? false;
	if (isCreator || isAssignee) return ALL_FIELDS_EDITABLE;

	if (permissions.admin?.administrator) return ALL_FIELDS_EDITABLE;

	const editAny = permissions.tasks?.editAny ?? false;
	return {
		status: permissions.tasks?.changeStatus ?? false,
		priority: permissions.tasks?.changePriority ?? false,
		assignees: permissions.tasks?.assign ?? false,
		labels: editAny,
		category: editAny,
		visibility: editAny,
		release: editAny,
	};
}

/**
 * The fields editable on EVERY one of several tasks (the bulk bar: a bulk edit applies to all
 * selected tasks, so a field one of them forbids is off for the batch). No tasks = nothing editable.
 */
export function intersectFieldPermissions(all: readonly BoardFieldPermissions[]): BoardFieldPermissions {
	if (all.length === 0) return NO_FIELDS_EDITABLE;
	if (all.every((permissions) => permissions === ALL_FIELDS_EDITABLE)) return ALL_FIELDS_EDITABLE;
	const result: Record<BoardPermissionField, boolean> = { ...ALL_FIELDS_EDITABLE };
	for (const field of Object.keys(result) as BoardPermissionField[]) {
		result[field] = all.every((permissions) => permissions[field]);
	}
	return result;
}
