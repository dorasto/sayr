import type { schema } from "@repo/database";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useMemo } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { updateTaskAction } from "@/lib/fetches/task";
import type { OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import { commandActions } from "@/lib/command-store";
import { inReleaseMeta, taskStatusIcon } from "@/lib/command-item-helpers";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Registers release-specific commands when viewing a release detail page:
 * - "Add tasks to this release" in the root command list (drills into a sub-view)
 * - The sub-view lists tasks ALREADY in the release with a remove action
 * - When the sub-view is active, AdminCommand replaces global search with
 *   live org-task search (assignment mode via taskAssignmentContext)
 */
export function useReleaseCommands(
	release: schema.ReleaseWithTasks | null,
	tasks: schema.TaskWithLabels[],
	setTasks: React.Dispatch<React.SetStateAction<schema.TaskWithLabels[]>>,
) {
	const { organization } = useLayoutOrganization();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const addTasksViewId = `release-add-tasks-${release?.id ?? "none"}`;

	const assignedTaskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

	// Callbacks for the assignment context
	const onAssign = useMemo(
		() => async (task: OrgTaskSearchResult) => {
			if (!release) return;
			const result = await updateTaskAction(organization.id, task.id, { releaseId: release.id }, sseClientId);
			if (result.success) {
				setTasks((prev) => [...prev, result.data as schema.TaskWithLabels]);
			}
		},
		[release, organization.id, sseClientId, setTasks],
	);

	const onRemove = useMemo(
		() => async (taskId: string) => {
			if (!release) return;
			const result = await updateTaskAction(organization.id, taskId, { releaseId: null }, sseClientId);
			if (result.success) {
				setTasks((prev) => prev.filter((t) => t.id !== taskId));
			}
		},
		[release, organization.id, sseClientId, setTasks],
	);

	// Register / update assignment context whenever relevant deps change
	useEffect(() => {
		if (!release) return;
		commandActions.setTaskAssignmentContext({
			viewId: addTasksViewId,
			orgId: organization.id,
			assignedTaskIds,
			onAssign,
			onRemove,
		});
		return () => {
			commandActions.clearTaskAssignmentContext();
		};
	}, [addTasksViewId, organization.id, assignedTaskIds, onAssign, onRemove, release]);

	const commands: CommandMap | null = useMemo(() => {
		if (!release) return null;

		// Sub-view: tasks already in the release (with remove action)
		const inReleaseItems = tasks.map((t) => ({
			id: `release-in-release-${release.id}-${t.id}`,
			label: t.title || "Untitled task",
			icon: taskStatusIcon(t.status, true),
			metadata: inReleaseMeta(t.shortId),
			keywords: `${t.shortId ?? ""} ${t.title ?? ""}`,
			closeOnSelect: false,
			action: async () => {
				await onRemove(t.id);
			},
		}));

		return {
			root: [
				{
					heading: release.name,
					priority: 3,
					items: [
						{
							id: `release-add-tasks-cmd-${release.id}`,
							label: "Add tasks to this release",
							icon: <IconPlus size={16} className="opacity-60" aria-hidden="true" />,
							subId: addTasksViewId,
							keywords: "add task assign include release",
						},
					],
				},
			],
			[addTasksViewId]: [
				...(inReleaseItems.length > 0
					? [{ heading: "In this release", priority: 1, items: inReleaseItems }]
					: [{ heading: "In this release", priority: 1, items: [{ id: "release-empty", label: "No tasks in this release yet", icon: <IconMinus size={16} className="opacity-40" />, action: () => {} }] }]),
			],
		};
	}, [release, tasks, addTasksViewId, onRemove]);

	useRegisterCommands(`release-commands-${release?.id ?? "none"}`, commands);
}
