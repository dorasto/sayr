import type { schema } from "@repo/database";
import StatusIcon from "@repo/ui/components/icons/status";
import { statusConfig as sharedStatusConfig } from "../shared/config";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

type StatusKey = keyof typeof sharedStatusConfig;

const STATUS_ICON_CLASS = "h-4 w-4";

/**
 * Returns all available status options for the command palette / action surfaces.
 * Imports labels from the shared `config.tsx` and renders icons at a fixed size.
 */
export function getStatusOptions(): FieldOption<string>[] {
	return (Object.keys(sharedStatusConfig) as StatusKey[]).map((key) => ({
		id: key,
		label: sharedStatusConfig[key].label,
		icon: <StatusIcon status={key} className={STATUS_ICON_CLASS} />,
		value: key,
		keywords: `status ${sharedStatusConfig[key].label}`,
	}));
}

/**
 * Returns the display representation of the task's current status.
 */
export function getStatusDisplay(task: schema.TaskWithLabels): FieldDisplay {
	const key = task.status as StatusKey;
	const config = sharedStatusConfig[key];
	return {
		label: config?.label ?? task.status,
		icon: <StatusIcon status={key} className={STATUS_ICON_CLASS} />,
	};
}

/**
 * Builds the update payload for changing a task's status.
 */
export function getStatusUpdatePayload(
	task: schema.TaskWithLabels,
	newStatus: string,
): SingleFieldUpdatePayload {
	const label = sharedStatusConfig[newStatus as StatusKey]?.label ?? newStatus;
	return {
		kind: "single",
		field: "status",
		updateData: { status: newStatus },
		optimisticTask: { ...task, status: newStatus as typeof task.status },
		toastMessages: {
			loading: { title: "Updating status..." },
			success: { title: "Status updated", description: `Changed to ${label}` },
			error: { title: "Failed to update status" },
		},
	};
}
