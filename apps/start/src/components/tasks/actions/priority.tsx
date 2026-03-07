import type { schema } from "@repo/database";
import { IconAlertSquareFilled } from "@tabler/icons-react";
import PriorityIcon from "@repo/ui/components/icons/priority";
import { priorityConfig as sharedPriorityConfig } from "../shared/config";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

type PriorityKey = keyof typeof sharedPriorityConfig;

const PRIORITY_ICON_CLASS = "h-4 w-4";

/**
 * Maps priority keys to the specific icon styling used in command palette items.
 * The shared config uses factory functions; here we render concrete elements with
 * colour classes matching the original useTaskCommands behaviour.
 */
const priorityIconMap: Record<PriorityKey, React.ReactNode> = {
	none: <PriorityIcon bars="none" className={`${PRIORITY_ICON_CLASS} text-muted-foreground`} />,
	low: <PriorityIcon bars={1} className={`${PRIORITY_ICON_CLASS} text-gray-500`} />,
	medium: <PriorityIcon bars={2} className={`${PRIORITY_ICON_CLASS} text-yellow-500`} />,
	high: <PriorityIcon bars={3} className={`${PRIORITY_ICON_CLASS} text-red-500`} />,
	urgent: <IconAlertSquareFilled className={`${PRIORITY_ICON_CLASS} text-destructive`} />,
};

export function getPriorityOptions(): FieldOption<string | null>[] {
	return (Object.keys(sharedPriorityConfig) as PriorityKey[]).map((key) => ({
		id: key,
		label: sharedPriorityConfig[key].label,
		icon: priorityIconMap[key],
		value: key === "none" ? null : key,
		keywords: `priority ${sharedPriorityConfig[key].label}`,
	}));
}

export function getPriorityDisplay(task: schema.TaskWithLabels): FieldDisplay {
	const key = (task.priority || "none") as PriorityKey;
	return {
		label: sharedPriorityConfig[key]?.label ?? "None",
		icon: priorityIconMap[key] ?? priorityIconMap.none,
	};
}

export function getPriorityUpdatePayload(
	task: schema.TaskWithLabels,
	newPriority: string | null,
): SingleFieldUpdatePayload {
	const key = (newPriority ?? "none") as PriorityKey;
	const label = sharedPriorityConfig[key]?.label ?? "None";
	return {
		kind: "single",
		field: "priority",
		updateData: { priority: newPriority },
		optimisticTask: { ...task, priority: newPriority as typeof task.priority },
		toastMessages: {
			loading: { title: "Updating priority..." },
			success: { title: "Priority updated", description: `Changed to ${label}` },
			error: { title: "Failed to update priority" },
		},
	};
}
