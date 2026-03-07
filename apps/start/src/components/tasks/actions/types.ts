import type { schema } from "@repo/database";
import type { ReactNode } from "react";

/**
 * A single selectable option within a task field (e.g. one status value, one label).
 *
 * For single-select fields (status, priority, category, release, visibility):
 *   - `value` is the new field value (string or null)
 *
 * For multi-select fields (assignees, labels):
 *   - `value` is the individual item ID being toggled
 */
export interface FieldOption<TValue = string | null> {
	/** Unique option key (e.g. "backlog", "urgent", a UUID). */
	id: string;
	/** Display label shown in UIs. */
	label: string;
	/** Icon/element rendered beside the label. */
	icon: ReactNode;
	/** The underlying value this option represents. */
	value: TValue;
	/** Extra keywords for search/filtering. */
	keywords?: string;
	/** Optional description text (e.g. visibility "Only visible to team members"). */
	description?: string;
}

/**
 * How the *current* value of a field should be displayed in a summary context
 * (e.g. the root-level CmdK item that says "Change status → In Progress").
 */
export interface FieldDisplay {
	/** Human-readable label of the current value. */
	label: string;
	/** Icon representing the current value. */
	icon: ReactNode;
}

/**
 * Toast message triplet used by the update hook.
 */
export interface ToastMessages {
	loading: { title: string; description?: string };
	success: { title: string; description?: string };
	error: { title: string; description?: string };
}

/**
 * Payload returned by a single-select field's `getUpdatePayload()`.
 * Tells the update hook which API to call and how to build the optimistic task.
 */
export interface SingleFieldUpdatePayload {
	kind: "single";
	/** The field name used for `updateTaskAction` (e.g. "status", "priority"). */
	field: string;
	/** Data passed to `updateTaskAction`'s third argument. */
	updateData: Record<string, unknown>;
	/** Optimistic task with the field already applied. */
	optimisticTask: schema.TaskWithLabels;
	/** Toast messages for this update. */
	toastMessages: ToastMessages;
}

/**
 * Payload for multi-select fields (assignees, labels) that use dedicated APIs.
 */
export interface MultiFieldUpdatePayload {
	kind: "multi";
	/** Unique toast action ID. */
	actionId: string;
	/** The API call to execute. */
	apiFn: () => Promise<{ success: boolean; data?: schema.TaskWithLabels; skipped?: boolean; error?: string }>;
	/** Optimistic task with the change already applied. */
	optimisticTask: schema.TaskWithLabels;
	/** Toast messages for this update. */
	toastMessages: ToastMessages;
}

/**
 * Payload for parent task changes that use set/remove parent APIs.
 */
export interface ParentFieldUpdatePayload {
	kind: "parent";
	/** "set" or "remove". */
	operation: "set" | "remove";
	/** Unique toast action ID. */
	actionId: string;
	/** The API call to execute. */
	apiFn: () => Promise<{ success: boolean; data?: schema.TaskWithLabels; error?: string }>;
	/** Optimistic task. */
	optimisticTask: schema.TaskWithLabels;
	/** Toast messages. */
	toastMessages: ToastMessages;
}

/**
 * Payload for relation creation (no optimistic update on the task itself).
 */
export interface RelationFieldUpdatePayload {
	kind: "relation";
	/** Unique toast action ID. */
	actionId: string;
	/** The API call to execute. */
	apiFn: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
	/** Toast messages. */
	toastMessages: ToastMessages;
}

export type FieldUpdatePayload =
	| SingleFieldUpdatePayload
	| MultiFieldUpdatePayload
	| ParentFieldUpdatePayload
	| RelationFieldUpdatePayload;
