import type { schema } from "@repo/database";

/**
 * The minimum a thing needs to be shown on the board. Only the task entity is
 * built today; new modules are typed against this so another entity (releases,
 * etc.) can adopt the board later without a rewrite of the data plumbing.
 */
export interface BoardItem {
	id: string;
}

/** The one entity the board renders today. */
export type TaskItem = schema.TaskWithLabels;
