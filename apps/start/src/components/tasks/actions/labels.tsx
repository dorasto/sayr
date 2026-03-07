import type { schema } from "@repo/database";
import { IconTag } from "@tabler/icons-react";
import { updateLabelToTaskAction } from "@/lib/fetches/task";
import type { FieldDisplay, FieldOption, MultiFieldUpdatePayload } from "./types";

const LABEL_DOT_CLASS = "h-3 w-3 rounded-full border shrink-0";

/**
 * Builds label options from the org's label list.
 */
export function getLabelOptions(orgLabels: schema.labelType[]): FieldOption<string>[] {
	return orgLabels.map((label) => ({
		id: label.id,
		label: label.name,
		icon: (
			<div
				className={LABEL_DOT_CLASS}
				style={{ backgroundColor: label.color || "#cccccc" }}
			/>
		),
		value: label.id,
		keywords: `label tag ${label.name}`,
	}));
}

/**
 * Returns display info for the current label state of a task.
 */
export function getLabelDisplay(task: schema.TaskWithLabels): FieldDisplay {
	const count = (task.labels || []).length;
	return {
		label: count > 0 ? `${count} labels` : "None",
		icon: <IconTag className="h-4 w-4 opacity-60" />,
	};
}

/**
 * Builds the update payload for toggling a single label on/off.
 */
export function getLabelUpdatePayload(
	task: schema.TaskWithLabels,
	labelId: string,
	orgLabels: schema.labelType[],
	wsClientId: string,
): MultiFieldUpdatePayload {
	const currentLabelIds = new Set((task.labels || []).map((l) => l.id));
	const isActive = currentLabelIds.has(labelId);
	const label = orgLabels.find((l) => l.id === labelId);
	const displayName = label?.name ?? "Unknown";

	const newLabelIds = isActive
		? [...currentLabelIds].filter((id) => id !== labelId)
		: [...currentLabelIds, labelId];

	const newLabels = isActive
		? (task.labels || []).filter((l) => l.id !== labelId)
		: [...(task.labels || []), ...(label ? [label] : [])];

	return {
		kind: "multi",
		actionId: "update-task-labels",
		apiFn: () => updateLabelToTaskAction(task.organizationId, task.id, newLabelIds, wsClientId),
		optimisticTask: { ...task, labels: newLabels },
		toastMessages: {
			loading: { title: "Updating labels..." },
			success: {
				title: "Labels updated",
				description: isActive ? `Removed ${displayName}` : `Added ${displayName}`,
			},
			error: { title: "Failed to update labels" },
		},
	};
}

/**
 * Builds the update payload for setting the full label list at once.
 *
 * Unlike `getLabelUpdatePayload` (which toggles a single label), this
 * accepts the complete new `values` array — matching the shape provided by
 * the multi-select ComboBox's `onValuesChange` callback.
 *
 * Used by `TaskFieldToolbar` which needs to debounce rapid multi-select
 * toggles while still producing a payload the action system can execute.
 */
export function getLabelBulkUpdatePayload(
	task: schema.TaskWithLabels,
	values: string[],
	availableLabels: schema.labelType[],
	wsClientId: string,
): MultiFieldUpdatePayload {
	const newLabels = availableLabels.filter((label) => values.includes(label.id));

	return {
		kind: "multi",
		actionId: "update-task-labels",
		apiFn: () => updateLabelToTaskAction(task.organizationId, task.id, values, wsClientId),
		optimisticTask: {
			...task,
			labels: newLabels,
		},
		toastMessages: {
			loading: {
				title: "Updating task...",
				description: "Updating your task... changes are already visible.",
			},
			success: {
				title: "Task saved",
				description: "Your changes have been saved successfully.",
			},
			error: {
				title: "Save failed",
				description: "Your changes are showing, but we couldn't save them to the server. Please try again.",
			},
		},
	};
}
