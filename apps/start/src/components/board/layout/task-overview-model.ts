import type { schema } from "@repo/database";
import type { FilterField, FilterState } from "../filter/types";

// The task side panels' pure half (an org's tasks page and /home): the overview sections (open work / needs
// attention / most voted, see task-overview.tsx) and the tiles' preset filters and counts. Relative / type-only
// imports only, so vitest can cover it. See release-overview.ts for the releases panel's counterpart.

/**
 * A preset filter: one `any`-match condition on `field`. The ids are stable so a preset is the same object shape
 * every render (and `areFiltersEqual` ignores them, so it still matches the same filter built by quick filters).
 */
export function buildPresetFilters(presetId: string, field: FilterField, value: string): FilterState {
	return {
		operator: "AND",
		groups: [
			{
				id: `preset-${presetId}`,
				operator: "AND",
				conditions: [{ id: `preset-${presetId}-${field}`, field, operator: "any", value: [value] }],
			},
		],
	};
}

/** "Your tasks": assigned to `userId`. */
export function buildAssigneePresetFilters(userId: string): FilterState {
	return buildPresetFilters("assignee", "assignee", userId);
}

/** One org's tasks, on a cross-org board. */
export function buildOrgPresetFilters(organizationId: string): FilterState {
	return buildPresetFilters(`org-${organizationId}`, "org", organizationId);
}

type CrossOrgCountableTask = Pick<schema.TaskWithLabels, "status" | "organizationId" | "organization"> & {
	assignees: readonly Pick<schema.UserSummary, "id">[];
};

export interface BoardOrgSummary {
	id: string;
	name: string;
	logo: string | null;
	/** Open tasks in this org. */
	open: number;
}

/**
 * A cross-org board's tile counts: open tasks, open tasks assigned to the viewer, and every org with tasks on the
 * board (by name) with its open-task count.
 */
export function countCrossOrgTasks(
	tasks: readonly CrossOrgCountableTask[],
	viewerId: string | undefined
): { open: number; openAssignedToViewer: number; orgs: BoardOrgSummary[] } {
	let open = 0;
	let openAssignedToViewer = 0;
	const orgs = new Map<string, BoardOrgSummary>();
	for (const task of tasks) {
		const taskOpen = isOpen(task);
		if (taskOpen) {
			open += 1;
			if (viewerId && task.assignees.some((assignee) => assignee.id === viewerId)) openAssignedToViewer += 1;
		}
		if (!task.organization) continue;
		let org = orgs.get(task.organizationId);
		if (!org) {
			org = { id: task.organizationId, name: task.organization.name, logo: task.organization.logo, open: 0 };
			orgs.set(task.organizationId, org);
		}
		if (taskOpen) org.open += 1;
	}
	return {
		open,
		openAssignedToViewer,
		orgs: [...orgs.values()].sort((a, b) => a.name.localeCompare(b.name)),
	};
}

/** How long an urgent/high open task may go without an update before it's flagged. */
export const STALE_TASK_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The statuses that count as open work, in the bar's order. */
export const OPEN_TASK_STATUSES = ["backlog", "todo", "in-progress"] as const;
export type OpenTaskStatus = (typeof OPEN_TASK_STATUSES)[number];

type OverviewTask = Pick<schema.TaskWithLabels, "status" | "priority" | "updatedAt" | "createdAt" | "voteCount"> & {
	assignees: readonly unknown[];
};

function isOpen(task: Pick<schema.TaskWithLabels, "status">): boolean {
	return task.status !== "done" && task.status !== "canceled";
}

function time(date: Date | string | null | undefined): number | null {
	if (!date) return null;
	const value = new Date(date).getTime();
	return Number.isNaN(value) ? null : value;
}

/** When the task last changed: its update time, else its creation time. */
function lastTouched(task: OverviewTask): number | null {
	return time(task.updatedAt) ?? time(task.createdAt);
}

/** Open tasks per status (backlog / todo / in progress). */
export function countOpenTasksByStatus(tasks: readonly OverviewTask[]): Record<OpenTaskStatus, number> {
	const counts: Record<OpenTaskStatus, number> = { backlog: 0, todo: 0, "in-progress": 0 };
	for (const task of tasks) {
		if (task.status === "backlog" || task.status === "todo" || task.status === "in-progress") {
			counts[task.status] += 1;
		}
	}
	return counts;
}

export type TaskAttentionReason =
	| { priority: "urgent" | "high"; kind: "unassigned" }
	| { priority: "urgent" | "high"; kind: "stale"; weeks: number };

export interface TaskAttentionItem<T> {
	task: T;
	reason: TaskAttentionReason;
}

/**
 * Open urgent/high tasks that nobody has picked up: unassigned, or not updated for STALE_TASK_DAYS. Urgent before
 * high, then unassigned before stale, then the longest untouched first.
 */
export function selectTasksNeedingAttention<T extends OverviewTask>(
	tasks: readonly T[],
	now: Date,
	limit = 5
): TaskAttentionItem<T>[] {
	const items: { item: TaskAttentionItem<T>; touched: number }[] = [];
	for (const task of tasks) {
		if (!isOpen(task)) continue;
		if (task.priority !== "urgent" && task.priority !== "high") continue;
		const touched = lastTouched(task);
		if (task.assignees.length === 0) {
			items.push({ item: { task, reason: { priority: task.priority, kind: "unassigned" } }, touched: touched ?? 0 });
			continue;
		}
		if (touched === null) continue;
		const age = now.getTime() - touched;
		if (age >= STALE_TASK_DAYS * DAY_MS) {
			items.push({
				item: { task, reason: { priority: task.priority, kind: "stale", weeks: Math.floor(age / (7 * DAY_MS)) } },
				touched,
			});
		}
	}
	const priorityRank = (reason: TaskAttentionReason) => (reason.priority === "urgent" ? 0 : 1);
	const kindRank = (reason: TaskAttentionReason) => (reason.kind === "unassigned" ? 0 : 1);
	return items
		.sort(
			(a, b) =>
				priorityRank(a.item.reason) - priorityRank(b.item.reason) ||
				kindRank(a.item.reason) - kindRank(b.item.reason) ||
				a.touched - b.touched
		)
		.slice(0, limit)
		.map(({ item }) => item);
}

/** The muted label beside a flagged task: "Urgent · unassigned", "High · no update 3w". */
export function formatTaskAttentionReason(reason: TaskAttentionReason): string {
	const priority = reason.priority === "urgent" ? "Urgent" : "High";
	return reason.kind === "unassigned" ? `${priority} · unassigned` : `${priority} · no update ${reason.weeks}w`;
}

/** Open tasks with votes, most voted first (ties: most recently updated). */
export function selectMostVotedTasks<T extends OverviewTask>(tasks: readonly T[], limit = 3): T[] {
	return tasks
		.filter((task) => isOpen(task) && task.voteCount > 0)
		.slice()
		.sort((a, b) => b.voteCount - a.voteCount || (lastTouched(b) ?? 0) - (lastTouched(a) ?? 0))
		.slice(0, limit);
}
