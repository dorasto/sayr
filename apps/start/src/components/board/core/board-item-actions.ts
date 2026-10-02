import type { schema } from "@repo/database";

// A deliberate fork of apps/start/src/components/tasks/actions/types.ts's
// `FieldUpdatePayload` family: the board may not import from components/tasks/**
// (see core/admin-board-provider.tsx, the one adapter that does). The shapes are
// kept identical, and that adapter assigns the real `useTaskFieldAction` result to
// `BoardItemActions`, so any drift between the two fails type-checking there.

interface BoardToastMessages {
	loading: { title: string; description?: string };
	success: { title: string; description?: string };
	error: { title: string; description?: string };
}

interface SingleFieldUpdatePayload {
	kind: "single";
	field: string;
	updateData: Record<string, unknown>;
	optimisticTask: schema.TaskWithLabels;
	toastMessages: BoardToastMessages;
}

interface MultiFieldUpdatePayload {
	kind: "multi";
	actionId: string;
	apiFn: () => Promise<{ success: boolean; data?: schema.TaskWithLabels; skipped?: boolean; error?: string }>;
	optimisticTask: schema.TaskWithLabels;
	toastMessages: BoardToastMessages;
}

interface ParentFieldUpdatePayload {
	kind: "parent";
	operation: "set" | "remove";
	actionId: string;
	apiFn: () => Promise<{ success: boolean; data?: schema.TaskWithLabels; error?: string }>;
	optimisticTask: schema.TaskWithLabels;
	toastMessages: BoardToastMessages;
}

interface RelationFieldUpdatePayload {
	kind: "relation";
	actionId: string;
	apiFn: () => Promise<{ success: boolean; data?: schema.TaskWithLabels; error?: string }>;
	toastMessages: BoardToastMessages;
}

/** One field edit a picker/menu/drag asks the data source to perform (optimistic update + API call). */
export type BoardFieldUpdatePayload =
	| SingleFieldUpdatePayload
	| MultiFieldUpdatePayload
	| ParentFieldUpdatePayload
	| RelationFieldUpdatePayload;

/** What a board row/card/menu can do to the one item it renders. */
export interface BoardItemActions {
	execute: (payload: BoardFieldUpdatePayload) => Promise<void>;
}
