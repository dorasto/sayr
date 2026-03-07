import type { schema } from "@repo/database";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconArrowUpRight, IconCopy, IconLink } from "@tabler/icons-react";
import { createTaskRelationAction } from "@/lib/fetches/task";
import type { FieldOption, RelationFieldUpdatePayload } from "./types";

export type RelationType = "related" | "blocking" | "duplicate";

/**
 * Returns the three relation type options shown as the first-level sub-view.
 */
export function getRelationTypeOptions(): FieldOption<RelationType>[] {
	return [
		{
			id: "blocking",
			label: "Blocking",
			icon: <IconArrowUpRight className="h-4 w-4 text-destructive" />,
			value: "blocking",
			keywords: "blocking blocks",
		},
		{
			id: "related",
			label: "Related to",
			icon: <IconLink className="h-4 w-4 text-muted-foreground" />,
			value: "related",
			keywords: "related",
		},
		{
			id: "duplicate",
			label: "Duplicate of",
			icon: <IconCopy className="h-4 w-4 text-muted-foreground" />,
			value: "duplicate",
			keywords: "duplicate copy",
		},
	];
}

/**
 * Builds the list of candidate tasks for a given relation type.
 * Filters out the current task.
 */
export function getRelationTargetOptions(
	task: schema.TaskWithLabels,
	tasks: schema.TaskWithLabels[],
): FieldOption<string>[] {
	return tasks
		.filter((t) => t.id !== task.id)
		.map((t) => ({
			id: t.id,
			label: `#${t.shortId} ${t.title}`,
			icon: <StatusIcon status={t.status} className="h-4 w-4" />,
			value: t.id,
			keywords: `${t.title} ${t.shortId}`,
		}));
}

/**
 * Builds the update payload for creating a relation.
 */
export function getRelationUpdatePayload(
	task: schema.TaskWithLabels,
	targetTaskId: string,
	type: RelationType,
	tasks: schema.TaskWithLabels[],
	wsClientId: string,
): RelationFieldUpdatePayload {
	const targetTask = tasks.find((t) => t.id === targetTaskId);
	const shortIdLabel = targetTask ? `#${targetTask.shortId}` : targetTaskId;

	return {
		kind: "relation",
		actionId: "add-relation",
		apiFn: () => createTaskRelationAction(task.organizationId, task.id, targetTaskId, type, wsClientId),
		toastMessages: {
			loading: { title: "Adding relation..." },
			success: { title: "Relation added", description: `${type} ${shortIdLabel}` },
			error: { title: "Failed to add relation" },
		},
	};
}
