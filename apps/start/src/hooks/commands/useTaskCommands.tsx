"use client";

import type { schema } from "@repo/database";
import {
	IconArrowLeft,
	IconArrowRight,
	IconCategory,
	IconCheck,
	IconCopy,
	IconEye,
	IconLink,
	IconLock,
	IconLockOpen2,
	IconRocket,
	IconTag,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { commandActions } from "@/lib/command-store";
import {
	updateAssigneesToTaskAction,
	updateLabelToTaskAction,
	updateTaskAction,
} from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { CommandItem, CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

// --- Static configs for status and priority ---

const statusConfig = {
	backlog: { label: "Backlog", icon: <StatusIcon status="backlog" className="h-4 w-4" /> },
	todo: { label: "Todo", icon: <StatusIcon status="todo" className="h-4 w-4" /> },
	"in-progress": {
		label: "In Progress",
		icon: <StatusIcon status="in-progress" className="h-4 w-4" />,
	},
	done: { label: "Done", icon: <StatusIcon status="done" className="h-4 w-4" /> },
	canceled: { label: "Canceled", icon: <StatusIcon status="canceled" className="h-4 w-4" /> },
} as const;

const priorityConfig = {
	none: {
		label: "No Priority",
		icon: <PriorityIcon bars="none" className="h-4 w-4 text-muted-foreground" />,
	},
	low: { label: "Low", icon: <PriorityIcon bars={1} className="h-4 w-4 text-gray-500" /> },
	medium: {
		label: "Medium",
		icon: <PriorityIcon bars={2} className="h-4 w-4 text-yellow-500" />,
	},
	high: { label: "High", icon: <PriorityIcon bars={3} className="h-4 w-4 text-red-500" /> },
	urgent: {
		label: "Urgent",
		icon: <PriorityIcon bars={3} className="h-4 w-4 text-destructive" />,
	},
} as const;

const visibilityConfig = {
	public: {
		label: "Public",
		description: "Visible to everyone",
		icon: <IconLockOpen2 className="h-4 w-4 text-muted-foreground" />,
	},
	private: {
		label: "Private",
		description: "Only visible to team members",
		icon: <IconLock className="h-4 w-4 text-primary" />,
	},
} as const;

/**
 * Registers single-task-specific commands when viewing a task.
 * Commands live in a sub-view (task-{taskId}) that the palette auto-drills into.
 * A root-level entry allows re-entering the sub-view after navigating back.
 *
 * Includes field-editing sub-views for status, priority, category, release,
 * visibility, assignees, and labels.
 */
export function useTaskCommands() {
	const navigate = useNavigate();
	const { organization, labels: orgLabels, categories, releases } = useLayoutOrganization();
	const { task, setTask } = useLayoutTask();
	const { tasks, setTasks } = useLayoutTasks();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast } = useToastAction();

	const subViewId = `task-${task.id}`;
	const badgeLabel = `${organization.slug}/#${task.shortId}`;

	// Set the initial view so the command palette opens pre-drilled into this task
	useEffect(() => {
		commandActions.setInitialView(subViewId, badgeLabel);
		return () => {
			commandActions.clearInitialView();
		};
	}, [subViewId, badgeLabel]);

	// --- Shared update helper ---
	const handleFieldUpdate = useCallback(
		async (
			field: string,
			updateData: Parameters<typeof updateTaskAction>[2],
			optimisticTask: schema.TaskWithLabels,
			toastMessages: {
				loading: { title: string; description?: string };
				success: { title: string; description?: string };
				error: { title: string; description?: string };
			},
		) => {
			// Optimistic update
			setTask(optimisticTask);
			setTasks(tasks.map((t) => (t.id === task.id ? optimisticTask : t)));

			const data = await runWithToast(
				`update-task-${field}`,
				toastMessages,
				() => updateTaskAction(task.organizationId, task.id, updateData, wsClientId),
			);

			if (data?.success && data.data) {
				setTask(data.data);
				setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
				sendWindowMessage(window, { type: "timeline-update", payload: data.data.id }, "*");
			}
		},
		[task, tasks, setTask, setTasks, wsClientId, runWithToast],
	);

	const commands: CommandMap = useMemo(() => {
		const orgId = organization.id;

		// --- Sub-view IDs ---
		const statusViewId = `task-${task.id}-status`;
		const priorityViewId = `task-${task.id}-priority`;
		const categoryViewId = `task-${task.id}-category`;
		const releaseViewId = `task-${task.id}-release`;
		const visibilityViewId = `task-${task.id}-visibility`;
		const assigneesViewId = `task-${task.id}-assignees`;
		const labelsViewId = `task-${task.id}-labels`;

		// --- Status sub-view items ---
		const statusItems: CommandItem[] = Object.entries(statusConfig).map(([key, config]) => {
			const isCurrent = task.status === key;
			return {
				id: `task-status-${task.id}-${key}`,
				label: config.label,
				icon: config.icon,
				action: () => {
					if (isCurrent) return;
					handleFieldUpdate(
						"status",
						{ status: key },
						{ ...task, status: key as typeof task.status },
						{
							loading: { title: "Updating status..." },
							success: { title: "Status updated", description: `Changed to ${config.label}` },
							error: { title: "Failed to update status" },
						},
					);
				},
				closeOnSelect: true,
				metadata: isCurrent ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: `status ${config.label}`,
			};
		});

		// --- Priority sub-view items ---
		const priorityItems: CommandItem[] = Object.entries(priorityConfig).map(([key, config]) => {
			const isCurrent = (task.priority || "none") === key;
			return {
				id: `task-priority-${task.id}-${key}`,
				label: config.label,
				icon: config.icon,
				action: () => {
					if (isCurrent) return;
					handleFieldUpdate(
						"priority",
						{ priority: key === "none" ? null : key },
						{ ...task, priority: (key === "none" ? null : key) as typeof task.priority },
						{
							loading: { title: "Updating priority..." },
							success: { title: "Priority updated", description: `Changed to ${config.label}` },
							error: { title: "Failed to update priority" },
						},
					);
				},
				closeOnSelect: true,
				metadata: isCurrent ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: `priority ${config.label}`,
			};
		});

		// --- Category sub-view items ---
		const categoryItems: CommandItem[] = [
			{
				id: `task-category-${task.id}-none`,
				label: "No Category",
				icon: <IconCategory className="h-4 w-4 text-muted-foreground" />,
				action: () => {
					if (!task.category) return;
					handleFieldUpdate(
						"category",
						{ category: null },
						{ ...task, category: null },
						{
							loading: { title: "Removing category..." },
							success: { title: "Category removed" },
							error: { title: "Failed to remove category" },
						},
					);
				},
				closeOnSelect: true,
				metadata: !task.category ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: "category none remove",
			},
			...categories.map((cat) => {
				const isCurrent = task.category === cat.id;
				return {
					id: `task-category-${task.id}-${cat.id}`,
					label: cat.name,
					icon: (
						<div
							className="h-3 w-3 rounded-full border shrink-0"
							style={{ backgroundColor: cat.color || "#cccccc" }}
						/>
					),
					action: () => {
						if (isCurrent) return;
						handleFieldUpdate(
							"category",
							{ category: cat.id },
							{ ...task, category: cat.id },
							{
								loading: { title: "Updating category..." },
								success: { title: "Category updated", description: `Changed to ${cat.name}` },
								error: { title: "Failed to update category" },
							},
						);
					},
					closeOnSelect: true,
					metadata: isCurrent ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
					keywords: `category ${cat.name}`,
				};
			}),
		];

		// --- Release sub-view items ---
		const releaseItems: CommandItem[] = [
			{
				id: `task-release-${task.id}-none`,
				label: "No Release",
				icon: <IconRocket className="h-4 w-4 text-muted-foreground" />,
				action: () => {
					if (!task.releaseId) return;
					handleFieldUpdate(
						"release",
						{ releaseId: null },
						{ ...task, releaseId: null },
						{
							loading: { title: "Removing release..." },
							success: { title: "Release removed" },
							error: { title: "Failed to remove release" },
						},
					);
				},
				closeOnSelect: true,
				metadata: !task.releaseId ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: "release none remove",
			},
			...releases.map((rel) => {
				const isCurrent = task.releaseId === rel.id;
				return {
					id: `task-release-${task.id}-${rel.id}`,
					label: rel.name,
					icon: rel.icon ? (
						<span className="text-sm shrink-0">{rel.icon}</span>
					) : (
						<IconRocket className="h-4 w-4 text-muted-foreground shrink-0" />
					),
					action: () => {
						if (isCurrent) return;
						handleFieldUpdate(
							"release",
							{ releaseId: rel.id },
							{ ...task, releaseId: rel.id },
							{
								loading: { title: "Updating release..." },
								success: { title: "Release updated", description: `Changed to ${rel.name}` },
								error: { title: "Failed to update release" },
							},
						);
					},
					closeOnSelect: true,
					metadata: isCurrent ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
					keywords: `release ${rel.name}`,
				};
			}),
		];

		// --- Visibility sub-view items ---
		const visibilityItems: CommandItem[] = Object.entries(visibilityConfig).map(
			([key, config]) => {
				const currentVisibility = task.visible || "public";
				const isCurrent = currentVisibility === key;
				return {
					id: `task-visibility-${task.id}-${key}`,
					label: config.label,
					icon: config.icon,
					action: () => {
						if (isCurrent) return;
						handleFieldUpdate(
							"visibility",
							{ visible: key as "public" | "private" },
							{ ...task, visible: key as "public" | "private" },
							{
								loading: { title: "Updating visibility..." },
								success: {
									title: "Visibility updated",
									description: `Task is now ${key}`,
								},
								error: { title: "Failed to update visibility" },
							},
						);
					},
					closeOnSelect: true,
					metadata: isCurrent ? (
						<IconCheck className="h-4 w-4 text-primary" />
					) : (
						<span className="text-xs text-muted-foreground">{config.description}</span>
					),
					keywords: `visibility ${config.label} ${key}`,
				};
			},
		);

		// --- Assignees sub-view items (multi-select) ---
		const members = organization.members || [];
		const currentAssigneeIds = new Set((task.assignees || []).map((a) => a.id));

		const assigneeItems: CommandItem[] = members.map((member) => {
			const user = member.user;
			const isAssigned = currentAssigneeIds.has(user.id);
			return {
				id: `task-assignee-${task.id}-${user.id}`,
				label: user.name || user.email || "Unknown",
				icon: <IconUser className="h-4 w-4 text-muted-foreground shrink-0" />,
				action: () => {
					const newAssigneeIds = isAssigned
						? [...currentAssigneeIds].filter((id) => id !== user.id)
						: [...currentAssigneeIds, user.id];

					const newAssignees = isAssigned
						? (task.assignees || []).filter((a) => a.id !== user.id)
						: [
								...(task.assignees || []),
								{ id: user.id, name: user.name, email: user.email, image: user.image },
							];

					const optimisticTask = { ...task, assignees: newAssignees };
					setTask(optimisticTask);
					setTasks(tasks.map((t) => (t.id === task.id ? optimisticTask : t)));

					runWithToast(
						"update-task-assignees",
						{
							loading: { title: "Updating assignees..." },
							success: {
								title: "Assignees updated",
								description: isAssigned
									? `Removed ${user.name || user.email}`
									: `Added ${user.name || user.email}`,
							},
							error: { title: "Failed to update assignees" },
						},
						() =>
							updateAssigneesToTaskAction(
								task.organizationId,
								task.id,
								newAssigneeIds,
								wsClientId,
							),
					).then((data) => {
						if (data?.success && data.data) {
							setTask(data.data);
							setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
							sendWindowMessage(
								window,
								{ type: "timeline-update", payload: data.data.id },
								"*",
							);
						}
					});
				},
				closeOnSelect: false,
				metadata: isAssigned ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: `assignee ${user.name || ""} ${user.email || ""}`,
			};
		});

		// --- Labels sub-view items (multi-select) ---
		const currentLabelIds = new Set((task.labels || []).map((l) => l.id));

		const labelItems: CommandItem[] = orgLabels.map((label) => {
			const isActive = currentLabelIds.has(label.id);
			return {
				id: `task-label-${task.id}-${label.id}`,
				label: label.name,
				icon: (
					<div
						className="h-3 w-3 rounded-full border shrink-0"
						style={{ backgroundColor: label.color || "#cccccc" }}
					/>
				),
				action: () => {
					const newLabelIds = isActive
						? [...currentLabelIds].filter((id) => id !== label.id)
						: [...currentLabelIds, label.id];

					const newLabels = isActive
						? (task.labels || []).filter((l) => l.id !== label.id)
						: [...(task.labels || []), label];

					const optimisticTask = { ...task, labels: newLabels };
					setTask(optimisticTask);
					setTasks(tasks.map((t) => (t.id === task.id ? optimisticTask : t)));

					runWithToast(
						"update-task-labels",
						{
							loading: { title: "Updating labels..." },
							success: {
								title: "Labels updated",
								description: isActive ? `Removed ${label.name}` : `Added ${label.name}`,
							},
							error: { title: "Failed to update labels" },
						},
						() =>
							updateLabelToTaskAction(
								task.organizationId,
								task.id,
								newLabelIds,
								wsClientId,
							),
					).then((data) => {
						if (data?.success && data.data) {
							setTask(data.data);
							setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
							sendWindowMessage(
								window,
								{ type: "timeline-update", payload: data.data.id },
								"*",
							);
						}
					});
				},
				closeOnSelect: false,
				metadata: isActive ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
				keywords: `label tag ${label.name}`,
			};
		});

		// --- Current value display helpers ---
		const currentStatusLabel =
			statusConfig[task.status as keyof typeof statusConfig]?.label || task.status;
		const currentPriorityLabel =
			priorityConfig[(task.priority || "none") as keyof typeof priorityConfig]?.label || "None";
		const currentCategoryName =
			categories.find((c) => c.id === task.category)?.name || "None";
		const currentReleaseName =
			releases.find((r) => r.id === task.releaseId)?.name || "None";
		const currentVisibilityLabel =
			visibilityConfig[(task.visible || "public") as keyof typeof visibilityConfig]?.label ||
			"Public";
		const assigneeCount = (task.assignees || []).length;
		const labelCount = (task.labels || []).length;

		return {
			root: [
				{
					heading: `Task #${task.shortId}`,
					priority: 5,
					items: [
						{
							id: `task-drill-${task.id}`,
							label: `Task #${task.shortId}: ${task.title}`,
							icon: (
								<IconArrowRight size={16} className="opacity-60" aria-hidden="true" />
							),
							subId: subViewId,
							keywords: "current open view",
						},
					],
				},
			],
			[subViewId]: [
				{
					heading: "Edit fields",
					priority: 1,
					items: [
						{
							id: `task-change-status-${task.id}`,
							label: "Change status",
							icon:
								statusConfig[task.status as keyof typeof statusConfig]?.icon || (
									<StatusIcon status="backlog" className="h-4 w-4" />
								),
							subId: statusViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{currentStatusLabel}
								</span>
							),
							keywords: "status change update workflow",
						},
						{
							id: `task-change-priority-${task.id}`,
							label: "Change priority",
							icon:
								priorityConfig[
									(task.priority || "none") as keyof typeof priorityConfig
								]?.icon || (
									<PriorityIcon bars="none" className="h-4 w-4 text-muted-foreground" />
								),
							subId: priorityViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{currentPriorityLabel}
								</span>
							),
							keywords: "priority change update level",
						},
						{
							id: `task-change-category-${task.id}`,
							label: "Change category",
							icon: <IconCategory className="h-4 w-4 opacity-60" />,
							subId: categoryViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{currentCategoryName}
								</span>
							),
							keywords: "category change update type",
						},
						{
							id: `task-change-release-${task.id}`,
							label: "Change release",
							icon: <IconRocket className="h-4 w-4 opacity-60" />,
							subId: releaseViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{currentReleaseName}
								</span>
							),
							keywords: "release change update milestone version",
						},
						{
							id: `task-change-visibility-${task.id}`,
							label: "Change visibility",
							icon:
								visibilityConfig[
									(task.visible || "public") as keyof typeof visibilityConfig
								]?.icon || <IconEye className="h-4 w-4 opacity-60" />,
							subId: visibilityViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{currentVisibilityLabel}
								</span>
							),
							keywords: "visibility change public private",
						},
						{
							id: `task-change-assignees-${task.id}`,
							label: "Change assignees",
							icon: <IconUsers className="h-4 w-4 opacity-60" />,
							subId: assigneesViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{assigneeCount > 0 ? `${assigneeCount} assigned` : "None"}
								</span>
							),
							keywords: "assignees change add remove people members",
						},
						{
							id: `task-change-labels-${task.id}`,
							label: "Change labels",
							icon: <IconTag className="h-4 w-4 opacity-60" />,
							subId: labelsViewId,
							metadata: (
								<span className="text-xs text-muted-foreground">
									{labelCount > 0 ? `${labelCount} labels` : "None"}
								</span>
							),
							keywords: "labels change add remove tags",
						},
					],
				},
				{
					priority: 10,
					items: [
						{
							id: `task-copy-link-${task.id}`,
							label: "Copy task link",
							icon: (
								<IconLink size={16} className="opacity-60" aria-hidden="true" />
							),
							action: () => {
								const url = `${window.location.origin}/${orgId}/tasks/${task.shortId}`;
								navigator.clipboard.writeText(url);
							},
							closeOnSelect: true,
							keywords: "url share",
						},
						{
							id: `task-copy-id-${task.id}`,
							label: `Copy task ID (#${task.shortId})`,
							icon: (
								<IconCopy size={16} className="opacity-60" aria-hidden="true" />
							),
							action: () => {
								navigator.clipboard.writeText(`#${task.shortId}`);
							},
							closeOnSelect: true,
							keywords: "identifier number",
						},
						{
							id: `task-go-back-${task.id}`,
							label: "Go back to tasks list",
							icon: (
								<IconArrowLeft
									size={16}
									className="opacity-60"
									aria-hidden="true"
								/>
							),
							action: () =>
								navigate({ to: "/$orgId/tasks", params: { orgId } }),
							keywords: "return list overview",
						},
					],
				},
			],
			// --- Field sub-views ---
			[statusViewId]: [
				{
					heading: "Status",
					priority: 1,
					items: statusItems,
				},
			],
			[priorityViewId]: [
				{
					heading: "Priority",
					priority: 1,
					items: priorityItems,
				},
			],
			[categoryViewId]: [
				{
					heading: "Category",
					priority: 1,
					items: categoryItems,
				},
			],
			[releaseViewId]: [
				{
					heading: "Release",
					priority: 1,
					items: releaseItems,
				},
			],
			[visibilityViewId]: [
				{
					heading: "Visibility",
					priority: 1,
					items: visibilityItems,
				},
			],
			[assigneesViewId]: [
				{
					heading: "Assignees",
					priority: 1,
					items: assigneeItems,
				},
			],
			[labelsViewId]: [
				{
					heading: "Labels",
					priority: 1,
					items: labelItems,
				},
			],
		};
	}, [
		navigate,
		organization.id,
		organization.members,
		task,
		tasks,
		subViewId,
		categories,
		releases,
		orgLabels,
		handleFieldUpdate,
		setTask,
		setTasks,
		wsClientId,
		runWithToast,
	]);

	useRegisterCommands("task-commands", commands);
}
