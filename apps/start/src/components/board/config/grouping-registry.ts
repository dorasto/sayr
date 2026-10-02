import type { schema } from "@repo/database";
import type { ReactNode } from "react";
import type { BoardDataSource } from "../core/board-data";
import type { BoardItem, TaskItem } from "../core/board-item";
import type { PriorityValue, StatusValue } from "./field-config";

// The pluggable grouping/column-provider contract plus the PURE helpers the
// built-in groupings are made of. Deliberately a `.ts` file with type-only
// imports (no JSX, no icon components) so vitest can exercise it directly —
// `config/groupings.tsx` layers the icons/tones on top and registers the built-ins.
//
// Only the task entity is rendered by the board today, so the registry is
// homogeneous in `TaskItem` (`GroupingRegistry<T = TaskItem>`); the generic exists so
// the contract can be reused for another BoardItem later without a rewrite, not
// because heterogeneous registries are supported yet.

export const UNASSIGNED_GROUP_ID = "__unassigned__";
export const UNCATEGORIZED_GROUP_ID = "__uncategorized__";
export const NO_RELEASE_GROUP_ID = "__no_release__";
export const NO_ORG_GROUP_ID = "__no_org__";
/** The id of the one column the "none" grouping produces. */
export const NONE_COLUMN_ID = "__all__";
/** Registry id of the grouping that puts every item in a single, header-less column. */
// Typed `string` (not the literal) so it can be compared against TaskGroupingId/sub-grouping ids without TS2367.
export const NONE_GROUPING_ID: string = "none";
/** Unknown grouping ids resolve to this one (it must always be registered). */
export const FALLBACK_GROUPING_ID = "status";

/** One column (kanban) / section (list) a grouping produces. */
export interface BoardColumn<T extends BoardItem = TaskItem> {
	id: string;
	label: string;
	icon?: ReactNode;
	/**
	 * Semantic header tint for status/priority columns — a Tailwind class (e.g. "bg-primary/5") tied to the
	 * app's theme tokens, not a raw color, so it stays correct across themes.
	 */
	toneClassName?: string;
	/** Raw hex tint for category/release columns — user-picked colors with no theme-token equivalent. */
	color?: string;
	items: T[];
	/** Replaces the default label/icon in the column header (kanban), e.g. a status chip or a link. */
	header?: ReactNode;
	description?: ReactNode;
	/** Shown in an empty column (only meaningful together with `keepEmptyColumns`). */
	emptyMessage?: string;
	subGroups?: BoardColumn<T>[];
}

export interface BoardGroupingContext<T extends BoardItem = TaskItem> {
	data: BoardDataSource<T>;
	/** When false, a grouping that models "completed" buckets (status) drops them. */
	showCompletedTasks: boolean;
	/** The data source has more pages than are loaded, so column counts are lower bounds. */
	partial: boolean;
	/** Injected so a grouping that depends on "today" stays testable. */
	now: Date;
}

export interface BoardGroupingDefinition<T extends BoardItem = TaskItem> {
	id: string;
	label: string;
	/** The icon in the "Group by" menu (one per grouping, not per value). */
	icon: ReactNode;
	group(items: readonly T[], ctx: BoardGroupingContext<T>): BoardColumn<T>[];
	/**
	 * The field patch dropping `item` onto column `columnId` should write, or `null` for "nothing to do".
	 * Absent = drag-to-regroup is a no-op for this grouping (assignee: a task can sit in several columns and a
	 * drop can't say which assignee to keep; org: not a mutable field).
	 */
	getDropPatch?(item: T, columnId: string, ctx: BoardGroupingContext<T>): Record<string, unknown> | null;
	/** May the grouping id be stored in a saved view's config. False for page-local groupings. */
	persistable: boolean;
	/**
	 * The grouping decides which items exist and in what order (e.g. a roadmap): `Board` then skips its own
	 * `showCompletedTasks` filter and sort and hands the items through.
	 */
	ownsMembership?: boolean;
	/** Keep columns with no items (kanban otherwise drops them). */
	keepEmptyColumns?: boolean;
	/** One item can appear in several columns at once (assignee) — grid ids must then be cell-qualified. */
	multiMembership?: boolean;
	/** May be the primary grouping of a sub-grouped board. Default true. */
	canSubGroup?: boolean;
}

/** id -> definition. Heterogeneity is not supported (see the file header). */
export type GroupingRegistry<T extends BoardItem = TaskItem> = ReadonlyMap<string, BoardGroupingDefinition<T>>;

/** Builds a registry from definition lists; a later list's definition replaces an earlier one with the same id. */
export function createGroupingRegistry<T extends BoardItem = TaskItem>(
	...lists: ReadonlyArray<readonly BoardGroupingDefinition<T>[] | undefined>
): GroupingRegistry<T> {
	const registry = new Map<string, BoardGroupingDefinition<T>>();
	for (const list of lists) {
		for (const definition of list ?? []) registry.set(definition.id, definition);
	}
	return registry;
}

/** The definition for `id`; an unknown id (e.g. a stale persisted value) falls back to status. */
export function resolveGroupingDefinition<T extends BoardItem = TaskItem>(
	registry: GroupingRegistry<T>,
	id: string | null | undefined
): BoardGroupingDefinition<T> {
	const definition = registry.get(id ?? FALLBACK_GROUPING_ID) ?? registry.get(FALLBACK_GROUPING_ID);
	if (!definition) throw new Error(`Grouping registry has no "${FALLBACK_GROUPING_ID}" fallback definition`);
	return definition;
}

/**
 * The sub-grouping that actually applies: "none" when none was asked for, or when the primary grouping
 * can't be sub-grouped (`canSubGroup: false`).
 */
export function resolveEffectiveSubGrouping<T extends BoardItem = TaskItem>(
	registry: GroupingRegistry<T>,
	grouping: string,
	subGrouping: string | null | undefined
): string {
	if (!subGrouping || subGrouping === NONE_GROUPING_ID) return NONE_GROUPING_ID;
	return resolveGroupingDefinition(registry, grouping).canSubGroup === false ? NONE_GROUPING_ID : subGrouping;
}

/** Whether a (sub-)grouping puts one item in several cells, so grid ids need the column/row. */
export function hasMultiMembership<T extends BoardItem = TaskItem>(
	registry: GroupingRegistry<T>,
	grouping: string,
	subGrouping: string
): boolean {
	const effectiveSub = resolveEffectiveSubGrouping(registry, grouping, subGrouping);
	return (
		resolveGroupingDefinition(registry, grouping).multiMembership === true ||
		(effectiveSub !== NONE_GROUPING_ID && resolveGroupingDefinition(registry, effectiveSub).multiMembership === true)
	);
}

// ---------------------------------------------------------------------------
// Pure bucketing helpers the built-in groupings are made of.
// ---------------------------------------------------------------------------

const COMPLETED_STATUSES: ReadonlySet<string> = new Set<StatusValue>(["done", "canceled"]);

/** Drops the Done/Canceled keys unless completed tasks are shown. */
export function omitCompletedStatuses<K extends string>(keys: readonly K[], showCompletedTasks: boolean): K[] {
	return keys.filter((key) => showCompletedTasks || !COMPLETED_STATUSES.has(key));
}

/** One bucket per key, in `keys` order (every key present even when empty); items keep their input order. */
export function bucketByValue<T, K extends string>(
	items: readonly T[],
	keys: readonly K[],
	getValue: (item: T) => string | null | undefined
): Array<{ id: K; items: T[] }> {
	const buckets = new Map<string, T[]>(keys.map((key) => [key, []]));
	for (const item of items) {
		const value = getValue(item);
		if (value != null) buckets.get(value)?.push(item);
	}
	return keys.map((key) => ({ id: key, items: buckets.get(key) ?? [] }));
}

export interface LabelledBucket<T> {
	id: string;
	label: string;
	items: T[];
}

/**
 * One bucket per distinct assignee, in first-seen order, plus a trailing "Unassigned" bucket (always present).
 * A task with several assignees is in several buckets.
 */
export function bucketByAssignee<T extends { assignees: readonly Pick<schema.UserSummary, "id" | "name">[] }>(
	items: readonly T[]
): LabelledBucket<T>[] {
	const assignees = new Map<string, Pick<schema.UserSummary, "id" | "name">>();
	for (const item of items) {
		for (const assignee of item.assignees) assignees.set(assignee.id, assignee);
	}

	return [
		...Array.from(assignees.values()).map((assignee) => ({
			id: assignee.id,
			label: assignee.name ?? "Unknown user",
			items: items.filter((item) => item.assignees.some((itemAssignee) => itemAssignee.id === assignee.id)),
		})),
		{ id: UNASSIGNED_GROUP_ID, label: "Unassigned", items: items.filter((item) => item.assignees.length === 0) },
	];
}

export interface ColoredBucket<T> extends LabelledBucket<T> {
	color?: string;
}

/**
 * One bucket per category (in `categories` order), plus a trailing "Uncategorized" bucket (always present) for
 * items with no category or one that isn't in `categories`.
 */
export function bucketByCategory<T extends { category?: string | null }>(
	items: readonly T[],
	categories: readonly Pick<schema.categoryType, "id" | "name" | "color">[]
): ColoredBucket<T>[] {
	const knownIds = new Set(categories.map((category) => category.id));
	return [
		...categories.map((category) => ({
			id: category.id,
			label: category.name,
			items: items.filter((item) => item.category === category.id),
			color: category.color ?? undefined,
		})),
		{
			id: UNCATEGORIZED_GROUP_ID,
			label: "Uncategorized",
			items: items.filter((item) => !item.category || !knownIds.has(item.category)),
		},
	];
}

/** Like `bucketByCategory`, for releases ("No release" trails). */
export function bucketByRelease<T extends { releaseId?: string | null }>(
	items: readonly T[],
	releases: readonly Pick<schema.releaseType, "id" | "name" | "color">[]
): ColoredBucket<T>[] {
	const knownIds = new Set(releases.map((release) => release.id));
	return [
		...releases.map((release) => ({
			id: release.id,
			label: release.name,
			items: items.filter((item) => item.releaseId === release.id),
			color: release.color ?? undefined,
		})),
		{
			id: NO_RELEASE_GROUP_ID,
			label: "No release",
			items: items.filter((item) => !item.releaseId || !knownIds.has(item.releaseId)),
		},
	];
}

type OrgSnapshot = Pick<NonNullable<schema.TaskWithLabels["organization"]>, "id" | "name" | "logo">;

export interface OrgBucket<T> extends LabelledBucket<T> {
	/** The org's logo URL; undefined for the "No organization" bucket (which also gets no icon). */
	logo?: string | null;
	isKnownOrg: boolean;
}

/**
 * One bucket per organization present on the items (first-seen order). Items missing their `organization`
 * snapshot land in a trailing "No organization" bucket, which exists only when it has items.
 */
export function bucketByOrg<T extends { organizationId: string; organization?: OrgSnapshot | null }>(
	items: readonly T[]
): OrgBucket<T>[] {
	const orgs = new Map<string, OrgSnapshot>();
	for (const item of items) {
		if (item.organization) orgs.set(item.organization.id, item.organization);
	}

	const known: OrgBucket<T>[] = Array.from(orgs.values()).map((org) => ({
		id: org.id,
		label: org.name,
		items: items.filter((item) => item.organizationId === org.id),
		logo: org.logo,
		isKnownOrg: true,
	}));
	const noOrgItems = items.filter((item) => !item.organization);

	return noOrgItems.length > 0
		? [...known, { id: NO_ORG_GROUP_ID, label: "No organization", items: noOrgItems, isKnownOrg: false }]
		: known;
}

// ---------------------------------------------------------------------------
// Pure drop-patch helpers (each returns null when the drop changes nothing).
// ---------------------------------------------------------------------------

export function getStatusDropPatch(item: Pick<TaskItem, "status">, columnId: string): Record<string, unknown> | null {
	return item.status === columnId ? null : { status: columnId as StatusValue };
}

export function getPriorityDropPatch(
	item: Pick<TaskItem, "priority">,
	columnId: string
): Record<string, unknown> | null {
	return item.priority === columnId ? null : { priority: columnId as PriorityValue };
}

/** Categories are per-org rows, so a task only accepts a category of its own organization. */
export function getCategoryDropPatch(
	item: Pick<TaskItem, "category" | "organizationId">,
	columnId: string,
	categories: readonly Pick<schema.categoryType, "id" | "organizationId">[]
): Record<string, unknown> | null {
	if (columnId === UNCATEGORIZED_GROUP_ID) {
		return item.category ? { category: null } : null;
	}
	const category = categories.find((candidate) => candidate.id === columnId);
	return category && category.organizationId === item.organizationId && item.category !== category.id
		? { category: category.id }
		: null;
}

/** Releases are per-org rows, so a task only accepts a release of its own organization. */
export function getReleaseDropPatch(
	item: Pick<TaskItem, "releaseId" | "organizationId">,
	columnId: string,
	releases: readonly Pick<schema.releaseType, "id" | "organizationId">[]
): Record<string, unknown> | null {
	if (columnId === NO_RELEASE_GROUP_ID) {
		return item.releaseId ? { releaseId: null } : null;
	}
	const release = releases.find((candidate) => candidate.id === columnId);
	return release && release.organizationId === item.organizationId && item.releaseId !== release.id
		? { releaseId: release.id }
		: null;
}
