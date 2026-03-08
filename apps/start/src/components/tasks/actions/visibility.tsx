import type { schema } from "@repo/database";
import { IconLock, IconLockOpen2 } from "@tabler/icons-react";
import type { FieldDisplay, FieldOption, SingleFieldUpdatePayload } from "./types";

type VisibilityKey = "public" | "private";

const ICON_CLASS = "h-4 w-4";

const visibilityDefs: Record<VisibilityKey, { label: string; description: string; icon: React.ReactNode }> = {
	public: {
		label: "Public",
		description: "Visible to everyone",
		icon: <IconLockOpen2 className={`${ICON_CLASS} text-muted-foreground`} />,
	},
	private: {
		label: "Private",
		description: "Only visible to team members",
		icon: <IconLock className={`${ICON_CLASS} text-primary`} />,
	},
};

export function getVisibilityOptions(): FieldOption<string>[] {
	return (Object.keys(visibilityDefs) as VisibilityKey[]).map((key) => ({
		id: key,
		label: visibilityDefs[key].label,
		icon: visibilityDefs[key].icon,
		value: key,
		keywords: `visibility ${visibilityDefs[key].label} ${key}`,
		description: visibilityDefs[key].description,
	}));
}

export function getVisibilityDisplay(task: schema.TaskWithLabels): FieldDisplay {
	const key = (task.visible || "public") as VisibilityKey;
	const def = visibilityDefs[key] ?? visibilityDefs.public;
	return {
		label: def.label,
		icon: def.icon,
	};
}

export function getVisibilityUpdatePayload(
	task: schema.TaskWithLabels,
	newVisibility: string,
): SingleFieldUpdatePayload {
	return {
		kind: "single",
		field: "visibility",
		updateData: { visible: newVisibility as "public" | "private" },
		optimisticTask: { ...task, visible: newVisibility as "public" | "private" },
		toastMessages: {
			loading: { title: "Updating visibility..." },
			success: { title: "Visibility updated", description: `Task is now ${newVisibility}` },
			error: { title: "Failed to update visibility" },
		},
	};
}
