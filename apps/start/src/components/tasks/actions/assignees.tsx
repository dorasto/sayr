import type { schema } from "@repo/database";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { updateAssigneesToTaskAction } from "@/lib/fetches/task";
import type { FieldDisplay, FieldOption, MultiFieldUpdatePayload } from "./types";

export interface AssigneeOptionMeta {
	image: string | null;
	displayName: string | null;
}

/**
 * Builds assignee options from the org's member list.
 */
export function getAssigneeOptions(
	members: schema.OrganizationWithMembers["members"],
): FieldOption<string, AssigneeOptionMeta>[] {
	return (members || []).map((member) => {
		const user = member.user;
		return {
			id: user.id,
			label: user.name || user.email || "Unknown",
			icon: <IconUser className="h-4 w-4 text-muted-foreground shrink-0" />,
			value: user.id,
			keywords: `assignee ${user.name || ""} ${user.email || ""}`,
			metadata: {
				image: user.image ?? null,
				displayName: user.displayName ?? null,
			},
		};
	});
}

/**
 * Builds assignee options from a flat user array.
 *
 * Many surfaces (shared components, task views, toolbar) receive
 * `availableUsers: schema.userType[]` rather than the nested `members`
 * structure. This helper produces the same `FieldOption` shape so those
 * consumers can use the action system directly.
 */
export function getAssigneeOptionsFromUsers(
	users: schema.userType[],
): FieldOption<string, AssigneeOptionMeta>[] {
	return (users || []).map((user) => ({
		id: user.id,
		label: user.name || user.email || "Unknown",
		icon: <IconUser className="h-4 w-4 text-muted-foreground shrink-0" />,
		value: user.id,
		keywords: `assignee ${user.name || ""} ${user.email || ""}`,
		metadata: {
			image: user.image ?? null,
			displayName: user.displayName ?? null,
		},
	}));
}

/**
 * Returns display info for the current assignee state of a task.
 */
export function getAssigneeDisplay(task: schema.TaskWithLabels): FieldDisplay {
	const count = (task.assignees || []).length;
	return {
		label: count > 0 ? `${count} assigned` : "None",
		icon: <IconUsers className="h-4 w-4 opacity-60" />,
	};
}

/**
 * Builds the update payload for toggling a single assignee on/off.
 */
export function getAssigneeUpdatePayload(
	task: schema.TaskWithLabels,
	userId: string,
	members: schema.OrganizationWithMembers["members"],
	sseClientId: string,
): MultiFieldUpdatePayload {
	const currentAssigneeIds = new Set((task.assignees || []).map((a) => a.id));
	const isAssigned = currentAssigneeIds.has(userId);

	const member = (members || []).find((m) => m.user.id === userId);
	const user = member?.user;
	const displayName = user?.name || user?.email || "Unknown";

	const newAssigneeIds = isAssigned
		? [...currentAssigneeIds].filter((id) => id !== userId)
		: [...currentAssigneeIds, userId];

	const newAssignees = isAssigned
		? (task.assignees || []).filter((a) => a.id !== userId)
		: [
			...(task.assignees || []),
			{ id: userId, name: user?.name ?? "", image: user?.image ?? null },
		];

	return {
		kind: "multi",
		actionId: "update-task-assignees",
		apiFn: () => updateAssigneesToTaskAction(task.organizationId, task.id, newAssigneeIds, sseClientId),
		optimisticTask: { ...task, assignees: newAssignees },
		toastMessages: {
			loading: { title: "Updating assignees..." },
			success: {
				title: "Assignees updated",
				description: isAssigned ? `Removed ${displayName}` : `Added ${displayName}`,
			},
			error: { title: "Failed to update assignees" },
		},
	};
}

/**
 * Builds the update payload for setting the full assignee list at once.
 *
 * Unlike `getAssigneeUpdatePayload` (which toggles a single user), this
 * accepts the complete new `values` array — matching the shape provided by
 * the multi-select ComboBox's `onValuesChange` callback.
 *
 * Used by `GlobalTaskAssignees` which needs to debounce rapid multi-select
 * toggles while still producing a payload the action system can execute.
 */
export function getAssigneeBulkUpdatePayload(
	task: schema.TaskWithLabels,
	values: string[],
	availableUsers: schema.userType[],
	sseClientId: string,
): MultiFieldUpdatePayload {
	const newAssignees = availableUsers.filter((user) => values.includes(user.id));

	return {
		kind: "multi",
		actionId: "update-task-assignees",
		apiFn: () => updateAssigneesToTaskAction(task.organizationId, task.id, values, sseClientId),
		optimisticTask: {
			...task,
			assignees: newAssignees,
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
