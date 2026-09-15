import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { getInitials } from "@repo/util";
import type { ReactNode } from "react";
import type { TaskGroupingId } from "../filter/types";
import type { PriorityValue, StatusValue } from "./field-config";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./field-config";

export const UNASSIGNED_GROUP_ID = "__unassigned__";
export const UNCATEGORIZED_GROUP_ID = "__uncategorized__";
export const NO_RELEASE_GROUP_ID = "__no_release__";
export const NO_ORG_GROUP_ID = "__no_org__";

export interface BoardTaskGroup {
	id: string;
	label: string;
	icon?: ReactNode;
	/**
	 * Semantic header tint for status/priority groups — a Tailwind class
	 * (e.g. "bg-primary/5") tied to the app's theme tokens, not a raw color,
	 * so it stays correct across themes. See STATUS_TONE_CLASSES/
	 * PRIORITY_TONE_CLASSES below.
	 */
	toneClassName?: string;
	/** Raw hex tint for category/release groups — these are user-picked colors with no theme-token equivalent. */
	color?: string;
	tasks: schema.TaskWithLabels[];
	subGroups?: BoardTaskGroup[];
}

export interface BoardGroupingOptions {
	categories?: schema.categoryType[];
	releases?: schema.releaseType[];
}

function createGroup(
	id: string,
	label: string,
	tasks: schema.TaskWithLabels[],
	icon?: ReactNode,
	tone?: { toneClassName?: string; color?: string }
): BoardTaskGroup {
	return { id, label, icon, tasks, ...tone };
}

// Same theme-token classes the app's existing group-header styling already
// uses elsewhere (bg-muted/bg-primary/bg-success/bg-destructive) — these are
// generic Tailwind/theme utility classes, not code imported from the old
// system. Backlog/todo both read as neutral "not started yet" grays; todo is
// deliberately a shade more present than backlog.
const STATUS_TONE_CLASSES: Record<StatusValue, string | undefined> = {
	backlog: "bg-muted/50",
	todo: "bg-muted",
	"in-progress": "bg-primary/5",
	done: "bg-success/5",
	canceled: "bg-destructive/5",
};

const PRIORITY_TONE_CLASSES: Record<PriorityValue, string | undefined> = {
	urgent: "bg-destructive/10",
	high: "bg-orange-800/15",
	medium: "bg-primary/5",
	low: "bg-card/5",
	none: undefined,
};

function groupByAssignee(tasks: schema.TaskWithLabels[]): BoardTaskGroup[] {
	const assignees = new Map<string, schema.UserSummary>();
	for (const task of tasks) {
		for (const assignee of task.assignees) {
			assignees.set(assignee.id, assignee);
		}
	}

	return [
		...Array.from(assignees.values()).map((assignee) =>
			createGroup(
				assignee.id,
				assignee.name ?? "Unknown user",
				tasks.filter((task) => task.assignees.some((taskAssignee) => taskAssignee.id === assignee.id))
			)
		),
		createGroup(
			UNASSIGNED_GROUP_ID,
			"Unassigned",
			tasks.filter((task) => task.assignees.length === 0)
		),
	];
}

function groupByCategory(tasks: schema.TaskWithLabels[], categories: schema.categoryType[]): BoardTaskGroup[] {
	const categoriesById = new Map(categories.map((category) => [category.id, category]));
	const knownCategoryGroups = categories.map((category) =>
		createGroup(
			category.id,
			category.name,
			tasks.filter((task) => task.category === category.id),
			undefined,
			{ color: category.color ?? undefined }
		)
	);
	const uncategorizedTasks = tasks.filter((task) => !task.category || !categoriesById.has(task.category));

	return [...knownCategoryGroups, createGroup(UNCATEGORIZED_GROUP_ID, "Uncategorized", uncategorizedTasks)];
}

function groupByRelease(tasks: schema.TaskWithLabels[], releases: schema.releaseType[]): BoardTaskGroup[] {
	const releasesById = new Map(releases.map((release) => [release.id, release]));
	const knownReleaseGroups = releases.map((release) =>
		createGroup(
			release.id,
			release.name,
			tasks.filter((task) => task.releaseId === release.id),
			undefined,
			{ color: release.color ?? undefined }
		)
	);
	const noReleaseTasks = tasks.filter((task) => !task.releaseId || !releasesById.has(task.releaseId));

	return [...knownReleaseGroups, createGroup(NO_RELEASE_GROUP_ID, "No release", noReleaseTasks)];
}

/**
 * Groups tasks by their organization — the whole point of this cross-org
 * lander. task.organization is attached manually per task when the /home
 * route aggregates tasks across orgs (getTasksByOrganizationId doesn't embed
 * it); a task somehow missing it falls into "No organization" rather than
 * being dropped.
 */
function groupByOrg(tasks: schema.TaskWithLabels[]): BoardTaskGroup[] {
	const orgs = new Map<string, NonNullable<schema.TaskWithLabels["organization"]>>();
	for (const task of tasks) {
		if (task.organization) orgs.set(task.organization.id, task.organization);
	}

	const knownOrgGroups = Array.from(orgs.values()).map((org) =>
		createGroup(
			org.id,
			org.name,
			tasks.filter((task) => task.organizationId === org.id),
			<Avatar className="size-3.5 rounded-sm">
				<AvatarImage src={org.logo ?? undefined} alt={org.name} />
				<AvatarFallback className="rounded-sm text-[7px]">{getInitials(org.name)}</AvatarFallback>
			</Avatar>
		)
	);
	const noOrgTasks = tasks.filter((task) => !task.organization);

	return noOrgTasks.length > 0
		? [...knownOrgGroups, createGroup(NO_ORG_GROUP_ID, "No organization", noOrgTasks)]
		: knownOrgGroups;
}

/** Groups board tasks without importing the retired task-view system. */
export function groupTasks(
	tasks: schema.TaskWithLabels[],
	groupBy: TaskGroupingId,
	{ categories = [], releases = [] }: BoardGroupingOptions = {}
): BoardTaskGroup[] {
	switch (groupBy) {
		case "status":
			return (Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => {
				const config = STATUS_CONFIG[status];
				return createGroup(
					status,
					config.label,
					tasks.filter((task) => task.status === status),
					// h-3.5 w-3.5 — matches the glyph size FieldStatus/FieldPriority render
					// on the rows below (field-status.tsx/field-priority.tsx both call
					// icon("h-3.5 w-3.5")), so the header's icon isn't visibly larger.
					config.icon("h-3.5 w-3.5"),
					{ toneClassName: STATUS_TONE_CLASSES[status] }
				);
			});
		case "priority":
			return (Object.keys(PRIORITY_CONFIG) as PriorityValue[]).map((priority) => {
				const config = PRIORITY_CONFIG[priority];
				return createGroup(
					priority,
					config.label,
					tasks.filter((task) => task.priority === priority),
					// h-3.5 w-3.5 — matches the glyph size FieldStatus/FieldPriority render
					// on the rows below (field-status.tsx/field-priority.tsx both call
					// icon("h-3.5 w-3.5")), so the header's icon isn't visibly larger.
					config.icon("h-3.5 w-3.5"),
					{ toneClassName: PRIORITY_TONE_CLASSES[priority] }
				);
			});
		case "assignee":
			return groupByAssignee(tasks);
		case "category":
			return groupByCategory(tasks, categories);
		case "release":
			return groupByRelease(tasks, releases);
		case "org":
			return groupByOrg(tasks);
	}
}

/** Applies one optional subgrouping level for the list and kanban board views. */
export function applyNestedGrouping(
	tasks: schema.TaskWithLabels[],
	groupBy: TaskGroupingId,
	subGroupBy: TaskGroupingId | "none",
	options: BoardGroupingOptions = {}
): BoardTaskGroup[] {
	return groupTasks(tasks, groupBy, options).map((group) => ({
		...group,
		subGroups: subGroupBy === "none" ? undefined : groupTasks(group.tasks, subGroupBy, options),
	}));
}

// Same order the status grouping itself uses (backlog → canceled) — reused
// so "not done/canceled first" subtask ordering matches how the board
// already orders things everywhere else.
const STATUS_ORDER = Object.keys(STATUS_CONFIG) as StatusValue[];

/**
 * List-view-only: tasks whose parent is also in the same task list are
 * subtasks, and don't get their own top-level group membership — they
 * always render nested under their parent's row instead, in whichever
 * group the parent lands in, regardless of the subtask's own status. Call
 * this on the full task list before grouping (list view only — kanban is
 * untouched, subtasks still render as their own cards there for now).
 *
 * A subtask whose parent isn't in the list (different org, filtered out,
 * etc.) has nowhere to nest under, so it's treated as top-level.
 */
export function getTopLevelTasks(tasks: schema.TaskWithLabels[]): schema.TaskWithLabels[] {
	const ids = new Set(tasks.map((task) => task.id));
	return tasks.filter((task) => !task.parentId || !ids.has(task.parentId));
}

/**
 * parentId -> its subtasks (the full TaskWithLabels, not the lightweight
 * schema.SubtaskSummary relation — getTasksByOrganizationId already
 * returns every task in the org as flat rows, subtasks included, so no
 * extra fetch is needed). Sorted with anything not done/canceled first.
 */
export function buildSubtaskMap(tasks: schema.TaskWithLabels[]): Map<string, schema.TaskWithLabels[]> {
	const ids = new Set(tasks.map((task) => task.id));
	const map = new Map<string, schema.TaskWithLabels[]>();

	for (const task of tasks) {
		if (!task.parentId || !ids.has(task.parentId)) continue;
		const siblings = map.get(task.parentId) ?? [];
		siblings.push(task);
		map.set(task.parentId, siblings);
	}

	for (const siblings of map.values()) {
		siblings.sort(
			(a, b) => STATUS_ORDER.indexOf(a.status as StatusValue) - STATUS_ORDER.indexOf(b.status as StatusValue)
		);
	}

	return map;
}
