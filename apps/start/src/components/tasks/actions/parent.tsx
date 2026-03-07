import type { schema } from "@repo/database";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconGitBranch } from "@tabler/icons-react";
import { setTaskParentAction, removeTaskParentAction } from "@/lib/fetches/task";
import type { FieldDisplay, FieldOption, ParentFieldUpdatePayload } from "./types";

/**
 * Builds the list of eligible parent task options.
 * Filters out the current task, tasks that already have parents,
 * and tasks that already have subtasks (single-level nesting).
 * Includes a "No Parent" option at the top.
 */
export function getParentOptions(
	task: schema.TaskWithLabels,
	tasks: schema.TaskWithLabels[],
): FieldOption<string | null>[] {
	const noneOption: FieldOption<string | null> = {
		id: "none",
		label: "No Parent (top-level)",
		icon: <IconGitBranch className="h-4 w-4 text-muted-foreground" />,
		value: null,
		keywords: "parent none remove top level",
	};

	const eligibleTasks = tasks
		.filter((t) => t.id !== task.id && !t.parentId && (t.subtaskCount ?? 0) === 0)
		.map((t) => ({
			id: t.id,
			label: `#${t.shortId} ${t.title}`,
			icon: <StatusIcon status={t.status} className="h-4 w-4" />,
			value: t.id,
			keywords: `parent ${t.title} ${t.shortId}`,
		}));

	return [noneOption, ...eligibleTasks];
}

/**
 * Returns display info for the current parent state of a task.
 */
export function getParentDisplay(task: schema.TaskWithLabels): FieldDisplay {
	return {
		label: task.parent ? `#${task.parent.shortId}` : "None",
		icon: <IconGitBranch className="h-4 w-4 opacity-60" />,
	};
}

/**
 * Builds the update payload for setting or removing a parent task.
 */
export function getParentUpdatePayload(
	task: schema.TaskWithLabels,
	newParentId: string | null,
	tasks: schema.TaskWithLabels[],
	wsClientId: string,
): ParentFieldUpdatePayload {
	if (newParentId === null) {
		// Remove parent
		return {
			kind: "parent",
			operation: "remove",
			actionId: "remove-parent",
			apiFn: () => removeTaskParentAction(task.organizationId, task.id, wsClientId),
			optimisticTask: { ...task, parentId: null, parent: null },
			toastMessages: {
				loading: { title: "Removing parent..." },
				success: { title: "Parent removed" },
				error: { title: "Failed to remove parent" },
			},
		};
	}

	// Set parent
	const parentTask = tasks.find((t) => t.id === newParentId);
	return {
		kind: "parent",
		operation: "set",
		actionId: "set-parent",
		apiFn: () => setTaskParentAction(task.organizationId, task.id, newParentId, wsClientId),
		optimisticTask: {
			...task,
			parentId: newParentId,
			parent: parentTask
				? { id: parentTask.id, shortId: parentTask.shortId, title: parentTask.title, status: parentTask.status }
				: null,
		},
		toastMessages: {
			loading: { title: "Setting parent..." },
			success: { title: "Parent set", description: parentTask ? `Set to #${parentTask.shortId}` : undefined },
			error: { title: "Failed to set parent" },
		},
	};
}
