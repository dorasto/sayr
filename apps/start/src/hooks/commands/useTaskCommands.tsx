"use client";

import { IconArrowLeft, IconCheck, IconCopy, IconLink } from "@tabler/icons-react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getStatusOptions,
	getStatusDisplay,
	getStatusUpdatePayload,
	getPriorityOptions,
	getPriorityDisplay,
	getPriorityUpdatePayload,
	getCategoryOptions,
	getCategoryDisplay,
	getCategoryUpdatePayload,
	getReleaseOptions,
	getReleaseDisplay,
	getReleaseUpdatePayload,
	getVisibilityOptions,
	getVisibilityDisplay,
	getVisibilityUpdatePayload,
	getAssigneeOptions,
	getAssigneeDisplay,
	getAssigneeUpdatePayload,
	getLabelOptions,
	getLabelDisplay,
	getLabelUpdatePayload,
	getParentOptions,
	getParentDisplay,
	getParentUpdatePayload,
	getRelationTypeOptions,
	getRelationTargetOptions,
	getRelationUpdatePayload,
	useTaskFieldAction,
} from "@/components/tasks/actions";
import type { FieldOption } from "@/components/tasks/actions";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import type { CommandItem, CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

// --- Helpers to convert FieldOptions into CommandItems ---

/**
 * Converts a single-select field's options into CommandItems.
 * Handles the isCurrent check and no-op on re-select pattern.
 */
function buildSingleSelectItems(
	options: FieldOption<string | null>[],
	currentValue: string | null,
	taskId: string,
	fieldPrefix: string,
	buildPayload: (value: string | null) => Parameters<ReturnType<typeof useTaskFieldAction>["execute"]>[0],
	execute: ReturnType<typeof useTaskFieldAction>["execute"],
	closeOnSelect = true,
): CommandItem[] {
	return options.map((opt) => {
		const isCurrent = currentValue === opt.value || (currentValue === null && opt.value === null);
		return {
			id: `task-${fieldPrefix}-${taskId}-${opt.id}`,
			label: opt.label,
			icon: opt.icon,
			action: () => {
				if (isCurrent) return;
				execute(buildPayload(opt.value));
			},
			closeOnSelect,
			metadata: isCurrent
				? <IconCheck className="h-4 w-4 text-primary" />
				: opt.description
					? <span className="text-xs text-muted-foreground">{opt.description}</span>
					: undefined,
			keywords: opt.keywords,
		};
	});
}

/**
 * Converts a multi-select field's options into CommandItems.
 * Handles the toggle pattern (stays open after selection).
 */
function buildMultiSelectItems(
	options: FieldOption<string>[],
	activeIds: Set<string>,
	taskId: string,
	fieldPrefix: string,
	buildPayload: (value: string) => Parameters<ReturnType<typeof useTaskFieldAction>["execute"]>[0],
	execute: ReturnType<typeof useTaskFieldAction>["execute"],
): CommandItem[] {
	return options.map((opt) => {
		const isActive = activeIds.has(opt.value);
		return {
			id: `task-${fieldPrefix}-${taskId}-${opt.id}`,
			label: opt.label,
			icon: opt.icon,
			action: () => execute(buildPayload(opt.value)),
			closeOnSelect: false,
			metadata: isActive ? <IconCheck className="h-4 w-4 text-primary" /> : undefined,
			keywords: opt.keywords,
		};
	});
}

/**
 * Registers single-task-specific commands when viewing a task.
 * Task edit fields appear directly in the root view at high priority,
 * with each field drilling into its own sub-view for value selection.
 */
export function useTaskCommands() {
	const navigate = useNavigate();
	const { organization, labels: orgLabels, categories, releases } = useLayoutOrganization();
	const { task, setTask } = useLayoutTask();
	const { tasks, setTasks } = useLayoutTasks();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const { execute } = useTaskFieldAction(task, tasks, setTask, setTasks, sseClientId);

	const commands: CommandMap = useMemo(() => {
		const orgId = organization.id;
		const members = organization.members || [];
		const hasSubtasks = (task.subtaskCount ?? 0) > 0;

		// --- Sub-view IDs ---
		const statusViewId = `task-${task.id}-status`;
		const priorityViewId = `task-${task.id}-priority`;
		const categoryViewId = `task-${task.id}-category`;
		const releaseViewId = `task-${task.id}-release`;
		const visibilityViewId = `task-${task.id}-visibility`;
		const assigneesViewId = `task-${task.id}-assignees`;
		const labelsViewId = `task-${task.id}-labels`;
		const parentViewId = `task-${task.id}-parent`;
		const relationTypeViewId = `task-${task.id}-relation-type`;
		const relationBlockingViewId = `task-${task.id}-relation-blocking`;
		const relationRelatedViewId = `task-${task.id}-relation-related`;
		const relationDuplicateViewId = `task-${task.id}-relation-duplicate`;

		// --- Build sub-view items from action definitions ---
		const statusItems = buildSingleSelectItems(
			getStatusOptions(),
			task.status,
			task.id,
			"status",
			(value) => getStatusUpdatePayload(task, value as string),
			execute,
		);

		const priorityItems = buildSingleSelectItems(
			getPriorityOptions(),
			task.priority ?? null,
			task.id,
			"priority",
			(value) => getPriorityUpdatePayload(task, value),
			execute,
		);

		const categoryItems = buildSingleSelectItems(
			getCategoryOptions(categories),
			task.category ?? null,
			task.id,
			"category",
			(value) => getCategoryUpdatePayload(task, value, categories),
			execute,
		);

		const releaseItems = buildSingleSelectItems(
			getReleaseOptions(releases),
			task.releaseId ?? null,
			task.id,
			"release",
			(value) => getReleaseUpdatePayload(task, value, releases),
			execute,
		);

		const visibilityItems = buildSingleSelectItems(
			getVisibilityOptions(),
			task.visible || "public",
			task.id,
			"visibility",
			(value) => getVisibilityUpdatePayload(task, value as string),
			execute,
		);

		const assigneeItems = buildMultiSelectItems(
			getAssigneeOptions(members),
			new Set((task.assignees || []).map((a) => a.id)),
			task.id,
			"assignee",
			(userId) => getAssigneeUpdatePayload(task, userId, members, sseClientId),
			execute,
		);

		const labelItems = buildMultiSelectItems(
			getLabelOptions(orgLabels),
			new Set((task.labels || []).map((l) => l.id)),
			task.id,
			"label",
			(labelId) => getLabelUpdatePayload(task, labelId, orgLabels, sseClientId),
			execute,
		);

		// --- Parent items (conditionally empty if task has subtasks) ---
		const parentItems: CommandItem[] = hasSubtasks
			? []
			: buildSingleSelectItems(
				getParentOptions(task, tasks),
				task.parentId ?? null,
				task.id,
				"parent",
				(value) => getParentUpdatePayload(task, value, tasks, sseClientId),
				execute,
			);

		// --- Relation type items (drill into sub-views) ---
		const relationTypes = getRelationTypeOptions();
		const relationViewMap: Record<string, string> = {
			blocking: relationBlockingViewId,
			related: relationRelatedViewId,
			duplicate: relationDuplicateViewId,
		};
		const relationTypeItems: CommandItem[] = relationTypes.map((opt) => ({
			id: `task-relation-type-${task.id}-${opt.id}`,
			label: opt.label,
			icon: opt.icon,
			subId: relationViewMap[opt.value],
			keywords: opt.keywords,
		}));

		// --- Relation target items (per type) ---
		const buildRelationTargetItems = (type: "related" | "blocking" | "duplicate"): CommandItem[] => {
			const targetOptions = getRelationTargetOptions(task, tasks);
			return targetOptions.map((opt) => ({
				id: `task-relation-${task.id}-${type}-${opt.id}`,
				label: opt.label,
				icon: opt.icon,
				action: () => execute(getRelationUpdatePayload(task, opt.value, type, tasks, sseClientId)),
				closeOnSelect: true,
				keywords: opt.keywords,
			}));
		};

		// --- Current value displays for root items ---
		const statusDisplay = getStatusDisplay(task);
		const priorityDisplay = getPriorityDisplay(task);
		const categoryDisplay = getCategoryDisplay(task, categories);
		const releaseDisplay = getReleaseDisplay(task, releases);
		const visibilityDisplay = getVisibilityDisplay(task);
		const assigneeDisplay = getAssigneeDisplay(task);
		const labelDisplay = getLabelDisplay(task);
		const parentDisplay = getParentDisplay(task);

		return {
			root: [
				{
					heading: `Task #${task.shortId}`,
					priority: 1,
					items: [
						{
							id: `task-change-status-${task.id}`,
							label: "Change status",
							icon: statusDisplay.icon,
							subId: statusViewId,
							metadata: <span className="text-xs text-muted-foreground">{statusDisplay.label}</span>,
							keywords: "status change update workflow",
						},
						{
							id: `task-change-priority-${task.id}`,
							label: "Change priority",
							icon: priorityDisplay.icon,
							subId: priorityViewId,
							metadata: <span className="text-xs text-muted-foreground">{priorityDisplay.label}</span>,
							keywords: "priority change update level",
						},
						{
							id: `task-change-category-${task.id}`,
							label: "Change category",
							icon: categoryDisplay.icon,
							subId: categoryViewId,
							metadata: <span className="text-xs text-muted-foreground">{categoryDisplay.label}</span>,
							keywords: "category change update type",
						},
						{
							id: `task-change-release-${task.id}`,
							label: "Change release",
							icon: releaseDisplay.icon,
							subId: releaseViewId,
							metadata: <span className="text-xs text-muted-foreground">{releaseDisplay.label}</span>,
							keywords: "release change update milestone version",
						},
						{
							id: `task-change-visibility-${task.id}`,
							label: "Change visibility",
							icon: visibilityDisplay.icon,
							subId: visibilityViewId,
							metadata: <span className="text-xs text-muted-foreground">{visibilityDisplay.label}</span>,
							keywords: "visibility change public private",
						},
						{
							id: `task-change-assignees-${task.id}`,
							label: "Change assignees",
							icon: assigneeDisplay.icon,
							subId: assigneesViewId,
							metadata: <span className="text-xs text-muted-foreground">{assigneeDisplay.label}</span>,
							keywords: "assignees change add remove people members",
						},
						{
							id: `task-change-labels-${task.id}`,
							label: "Change labels",
							icon: labelDisplay.icon,
							subId: labelsViewId,
							metadata: <span className="text-xs text-muted-foreground">{labelDisplay.label}</span>,
							keywords: "labels change add remove tags",
						},
						{
							id: `task-set-parent-${task.id}`,
							label: "Set parent task",
							icon: parentDisplay.icon,
							subId: parentViewId,
							show: !hasSubtasks,
							metadata: <span className="text-xs text-muted-foreground">{parentDisplay.label}</span>,
							keywords: "parent hierarchy subtask nest",
						},
						{
							id: `task-add-relation-${task.id}`,
							label: "Add relation",
							icon: <IconLink className="h-4 w-4 opacity-60" />,
							subId: relationTypeViewId,
							keywords: "relation link blocking related duplicate",
						},
						{
							id: `task-copy-link-${task.id}`,
							label: "Copy task link",
							icon: <IconLink size={16} className="opacity-60" aria-hidden="true" />,
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
							icon: <IconCopy size={16} className="opacity-60" aria-hidden="true" />,
							action: () => {
								navigator.clipboard.writeText(`#${task.shortId}`);
							},
							closeOnSelect: true,
							keywords: "identifier number",
						},
						{
							id: `task-go-back-${task.id}`,
							label: "Go back to tasks list",
							icon: <IconArrowLeft size={16} className="opacity-60" aria-hidden="true" />,
							action: () => navigate({ to: "/$orgId/tasks", params: { orgId } }),
							keywords: "return list overview",
						},
					],
				},
			],
			[statusViewId]: [{ heading: "Status", priority: 1, items: statusItems }],
			[priorityViewId]: [{ heading: "Priority", priority: 1, items: priorityItems }],
			[categoryViewId]: [{ heading: "Category", priority: 1, items: categoryItems }],
			[releaseViewId]: [{ heading: "Release", priority: 1, items: releaseItems }],
			[visibilityViewId]: [{ heading: "Visibility", priority: 1, items: visibilityItems }],
			[assigneesViewId]: [{ heading: "Assignees", priority: 1, items: assigneeItems }],
			[labelsViewId]: [{ heading: "Labels", priority: 1, items: labelItems }],
			[parentViewId]: [{ heading: "Parent Task", priority: 1, items: parentItems }],
			[relationTypeViewId]: [{ heading: "Relation Type", priority: 1, items: relationTypeItems }],
			[relationBlockingViewId]: [{ heading: "Blocking", priority: 1, items: buildRelationTargetItems("blocking") }],
			[relationRelatedViewId]: [{ heading: "Related to", priority: 1, items: buildRelationTargetItems("related") }],
			[relationDuplicateViewId]: [{ heading: "Duplicate of", priority: 1, items: buildRelationTargetItems("duplicate") }],
		};
	}, [
		navigate,
		organization.id,
		organization.members,
		task,
		tasks,
		categories,
		releases,
		orgLabels,
		execute,
		sseClientId,
	]);

	useRegisterCommands("task-commands", commands);
}
