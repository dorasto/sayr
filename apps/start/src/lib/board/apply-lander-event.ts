import type { schema } from "@repo/database";
import type { ServerEventMessage } from "@/lib/serverEvents";
// Relative, not `@/…`: a pure module's RUNTIME imports must resolve under vitest, which has no `@/` alias.
import { isTaskRecord, readTaskCreatedMessage } from "../task-created-message";

/**
 * Pure event -> state logic for the cross-org board (/home).
 *
 * `RootProviderLander` holds the board's data as one `LanderData` value and the
 * SSE subscription (hooks/useLanderServerEventsSubscription.ts) feeds every
 * server event through `applyLanderEvent` as a *functional* update, so two events
 * landing before a re-render (a bulk action, several tasks changing at once)
 * compose instead of overwriting each other. Nothing in here touches React, the
 * network or the clock, which is what makes it unit-testable (see the test file).
 *
 * Every function returns the SAME reference it was given when nothing changed, so
 * a no-op event (unknown type, malformed payload, vote count already applied)
 * never triggers a re-render.
 *
 * What the board's SSE subscription (`orgIds` mode, channels `tasks` + `releases` —
 * see apps/backend/routes/events/index.ts) actually receives, and therefore what is
 * handled here. Note that room broadcasts (`sseBroadcastToRoom`) carry NO `scope` on
 * the wire — only the public and per-user broadcasts set one:
 *  - CREATE_TASK / UPDATE_TASK / UPDATE_TASK_VOTE — each org's `tasks` room.
 *  - UPDATE_LABELS / UPDATE_CATEGORIES — sent to every one of the user's
 *    connections via sseBroadcastByUserId (`scope: "INDIVIDUAL"`, `meta.orgId`),
 *    each carrying ONE org's complete list.
 *  - UPDATE_RELEASES / DELETE_RELEASE — each org's `releases` room. Creating,
 *    updating or publishing a release sends the release ROW itself as `data` (the web
 *    router and the /me lifecycle helpers alike) — applied. Labels / pull-request
 *    changes send `{ releaseId }` and moving a task between releases sends
 *    `{ taskId, releaseId }` — ignored, neither changes anything the board shows.
 *    DELETE_RELEASE `{ releaseId }` removes the release and clears it from its tasks.
 *  - Two UPDATE_TASK payloads that aren't task records (no `id`): `{ taskIds, status:
 *    "done" }` (publishing a release auto-closed its tasks — applied) and a bare
 *    `{ releaseId: null }` sent when a release is deleted — ignored, DELETE_RELEASE
 *    above already carries everything the board needs.
 *
 * Also applied here, though it isn't an SSE event: the "task-created" window message
 * (`applyLanderWindowMessage`), because the creating client is excluded from the
 * CREATE_TASK broadcast.
 *
 * NOT handled, on purpose: UPDATE_RELEASE_STATUS_UPDATES / UPDATE_RELEASE_COMMENTS
 * (ids only, and the comments include internal ones — the board shows neither),
 * UPDATE_TASK_COMMENTS (the per-task room), UPDATE_VIEWS (org-level saved views, which
 * the board doesn't show) and the task-dialog timeline messages.
 */

export type LanderTask = schema.TaskWithLabels;
export type LanderTaskOrganization = NonNullable<LanderTask["organization"]>;

/** Everything the board renders and live-updates; per-org permissions ride along separately (they never change over SSE). */
export interface LanderData {
	tasks: LanderTask[];
	labels: schema.labelType[];
	categories: schema.categoryType[];
	releases: schema.releaseType[];
}

export interface LanderEventContext {
	/**
	 * The `task.organization` badge snapshot for every org the board is subscribed
	 * to, keyed by org id — the same shape getLanderData attaches to each task at
	 * load time. A broadcast task comes straight from the DB with no `.organization`.
	 */
	organizations: ReadonlyMap<string, LanderTaskOrganization>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isSameRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const aKeys = Object.keys(a);
	if (aKeys.length !== Object.keys(b).length) return false;
	return aKeys.every((key) => Object.is(a[key], b[key]));
}

/** Prefers the live org snapshot, then whatever the payload already carried, then the entry being replaced. */
function withOrganization(
	task: LanderTask,
	organizations: ReadonlyMap<string, LanderTaskOrganization>,
	previous?: LanderTask
): LanderTask {
	const organization = organizations.get(task.organizationId) ?? task.organization ?? previous?.organization;
	return organization && organization !== task.organization ? { ...task, organization } : task;
}

/** Replaces the task with the same id (idempotent for a duplicate event), or appends it when it isn't in the list yet. */
export function upsertTask(
	tasks: LanderTask[],
	incoming: LanderTask,
	organizations: ReadonlyMap<string, LanderTaskOrganization>
): LanderTask[] {
	const index = tasks.findIndex((task) => task.id === incoming.id);
	const existing = tasks[index];
	if (!existing) return [...tasks, withOrganization(incoming, organizations)];

	const next = tasks.slice();
	next[index] = withOrganization(incoming, organizations, existing);
	return next;
}

/**
 * Swaps in already-fetched records (an API response reconciling an optimistic
 * edit) for the tasks with the same ids. Unlike `upsertTask` it never adds
 * anything, and it keeps the replaced task's `organization` because the update
 * endpoints return the raw record without the board's cross-org enrichment.
 */
export function replaceTasks(tasks: LanderTask[], updatedById: ReadonlyMap<string, LanderTask>): LanderTask[] {
	let changed = false;
	const next = tasks.map((task) => {
		const updated = updatedById.get(task.id);
		if (!updated) return task;
		changed = true;
		return updated.organization || !task.organization ? updated : { ...updated, organization: task.organization };
	});
	return changed ? next : tasks;
}

/** Same as `replaceTasks` for a single record. */
export function replaceTask(tasks: LanderTask[], updated: LanderTask): LanderTask[] {
	return replaceTasks(tasks, new Map([[updated.id, updated]]));
}

/**
 * Swaps one org's slice of a cross-org list for its fresh copy, leaving every
 * other org's entries untouched. The fresh entries take the place of the org's
 * first old entry so the relative order of orgs doesn't jump around; an org with
 * no old entries is appended.
 */
function replaceOrgSlice<T extends { organizationId: string }>(items: T[], organizationId: string, fresh: T[]): T[] {
	const result: T[] = [];
	let inserted = false;
	for (const item of items) {
		if (item.organizationId !== organizationId) {
			result.push(item);
		} else if (!inserted) {
			result.push(...fresh);
			inserted = true;
		}
	}
	if (!inserted) result.push(...fresh);
	return result;
}

/**
 * Tasks carry their own copies of their labels (`task.labels`, which is what the
 * row/card chips render), so a renamed/recolored label has to be pushed into
 * them too, and a deleted one dropped. Tasks whose labels didn't change keep
 * their identity.
 */
function refreshTaskLabels(tasks: LanderTask[], organizationId: string, fresh: schema.labelType[]): LanderTask[] {
	const freshById = new Map(fresh.map((label) => [label.id, label]));
	let changed = false;
	const next = tasks.map((task) => {
		if (task.organizationId !== organizationId || task.labels.length === 0) return task;

		const labels = task.labels.flatMap((label) => {
			const current = freshById.get(label.id);
			return current ? [current] : [];
		});
		const unchanged =
			labels.length === task.labels.length &&
			labels.every((label, index) => {
				const previous = task.labels[index];
				return previous !== undefined && isSameRecord(label, previous);
			});
		if (unchanged) return task;

		changed = true;
		return { ...task, labels };
	});
	return changed ? next : tasks;
}

/** Bulk-sets a status, e.g. the tasks a release auto-closed when it was published. */
function setTasksStatus(tasks: LanderTask[], taskIds: readonly string[], status: LanderTask["status"]): LanderTask[] {
	const ids = new Set(taskIds);
	let changed = false;
	const next = tasks.map((task) => {
		if (!ids.has(task.id) || task.status === status) return task;
		changed = true;
		return { ...task, status };
	});
	return changed ? next : tasks;
}

/** The `{ taskIds, status: "done" }` UPDATE_TASK the release routes send when publishing a release auto-closes its tasks. */
function readClosedTasksPayload(payload: unknown): { taskIds: string[]; status: "done" } | null {
	if (!isRecord(payload) || payload.status !== "done" || !Array.isArray(payload.taskIds)) return null;
	return { taskIds: payload.taskIds.filter((id): id is string => typeof id === "string"), status: "done" };
}

function applyTaskPayload(prev: LanderData, payload: unknown, context: LanderEventContext): LanderData {
	if (isTaskRecord(payload)) {
		return { ...prev, tasks: upsertTask(prev.tasks, payload, context.organizations) };
	}

	const closed = readClosedTasksPayload(payload);
	if (closed) {
		const tasks = setTasksStatus(prev.tasks, closed.taskIds, closed.status);
		return tasks === prev.tasks ? prev : { ...prev, tasks };
	}

	return prev;
}

function applyVote(prev: LanderData, payload: unknown): LanderData {
	if (!isRecord(payload)) return prev;

	const { id, voteCount } = payload;
	if (typeof id !== "string" || typeof voteCount !== "number") return prev;

	const index = prev.tasks.findIndex((task) => task.id === id);
	const existing = prev.tasks[index];
	if (!existing || existing.voteCount === voteCount) return prev;

	const tasks = prev.tasks.slice();
	tasks[index] = { ...existing, voteCount };
	return { ...prev, tasks };
}

/**
 * The org an UPDATE_LABELS / UPDATE_CATEGORIES list belongs to, or null when the
 * event isn't one the board should apply. Mirrors the org page's own check:
 * only the INDIVIDUAL-scoped broadcast carries the org's COMPLETE list (the
 * PUBLIC one is filtered down to public labels and would clobber private ones),
 * and an org the board isn't showing is ignored rather than leaking its labels
 * into the filter pickers.
 */
function readOrgSliceOrgId(
	message: { scope: ServerEventMessage["scope"]; meta?: ServerEventMessage["meta"] },
	context: LanderEventContext
): string | null {
	const orgId = message.meta?.orgId;
	if (message.scope !== "INDIVIDUAL" || typeof orgId !== "string") return null;
	return context.organizations.has(orgId) ? orgId : null;
}

function applyLabels(
	prev: LanderData,
	message: Extract<ServerEventMessage, { type: "UPDATE_LABELS" }>,
	context: LanderEventContext
): LanderData {
	const orgId = readOrgSliceOrgId(message, context);
	if (orgId === null || !Array.isArray(message.data)) return prev;

	const fresh = message.data.filter((label) => label.organizationId === orgId);
	return {
		...prev,
		labels: replaceOrgSlice(prev.labels, orgId, fresh),
		tasks: refreshTaskLabels(prev.tasks, orgId, fresh),
	};
}

function applyCategories(
	prev: LanderData,
	message: Extract<ServerEventMessage, { type: "UPDATE_CATEGORIES" }>,
	context: LanderEventContext
): LanderData {
	const orgId = readOrgSliceOrgId(message, context);
	if (orgId === null || !Array.isArray(message.data)) return prev;

	// Tasks only hold a category id, and the board already renders an id that isn't
	// in the list (a deleted category) as "uncategorized", so the slice is all there is to update.
	const fresh = message.data.filter((category) => category.organizationId === orgId);
	return { ...prev, categories: replaceOrgSlice(prev.categories, orgId, fresh) };
}

/**
 * A release ROW, as create / update / publish broadcast it. The `{ releaseId }` and
 * `{ taskId, releaseId }` payloads the same event type also carries have no `id`, so
 * they never pass.
 */
function isReleaseRow(value: unknown): value is schema.releaseType {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.organizationId === "string" &&
		typeof value.name === "string" &&
		typeof value.slug === "string" &&
		typeof value.status === "string"
	);
}

/**
 * Keeps exactly the `release` table's columns — what getReleases (the loader's catalog) returns
 * and nothing else, so an event can never smuggle extra fields into the board's memory. Typed
 * against `schema.releaseType`, so adding a column to the table fails to compile here until it is
 * consciously added to the catalog.
 */
function toCatalogRelease(row: schema.releaseType): schema.releaseType {
	return {
		id: row.id,
		organizationId: row.organizationId,
		name: row.name,
		slug: row.slug,
		description: row.description,
		status: row.status,
		targetDate: row.targetDate,
		releasedAt: row.releasedAt,
		color: row.color,
		icon: row.icon,
		leadId: row.leadId,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/** Structural equality by serialisation: a loader row's Date and the same instant arriving over SSE as an ISO string compare equal. */
function isSameJson(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Replaces the release with the same id in place, or adds it after the last release of its own
 * org (the loader's list is grouped per org, and the display order within an org is refreshed on
 * the next load). Returns the same list when the incoming row changes nothing.
 */
function upsertRelease(releases: schema.releaseType[], incoming: schema.releaseType): schema.releaseType[] {
	const index = releases.findIndex((release) => release.id === incoming.id);
	const existing = releases[index];
	if (existing) {
		if (isSameJson(toCatalogRelease(existing), incoming)) return releases;
		const next = releases.slice();
		next[index] = incoming;
		return next;
	}

	const next = releases.slice();
	const lastOfOrg = releases.map((release) => release.organizationId).lastIndexOf(incoming.organizationId);
	next.splice(lastOfOrg === -1 ? next.length : lastOfOrg + 1, 0, incoming);
	return next;
}

/** Sets `releaseId` back to null on every task of the org that pointed at the (now deleted) release. */
function clearTasksRelease(tasks: LanderTask[], organizationId: string, releaseId: string): LanderTask[] {
	let changed = false;
	const next = tasks.map((task) => {
		if (task.organizationId !== organizationId || task.releaseId !== releaseId) return task;
		changed = true;
		return { ...task, releaseId: null };
	});
	return changed ? next : tasks;
}

function applyReleaseChanged(
	prev: LanderData,
	message: Extract<ServerEventMessage, { type: "UPDATE_RELEASES" }>,
	context: LanderEventContext
): LanderData {
	// The board only joins the org rooms; a PUBLIC-scoped copy (the public portal's broadcast) is never for it.
	if (message.scope === "PUBLIC") return prev;

	const payload: unknown = message.data;
	if (!isReleaseRow(payload) || !context.organizations.has(payload.organizationId)) return prev;

	const releases = upsertRelease(prev.releases, toCatalogRelease(payload));
	return releases === prev.releases ? prev : { ...prev, releases };
}

function applyReleaseDeleted(
	prev: LanderData,
	message: Extract<ServerEventMessage, { type: "DELETE_RELEASE" }>,
	context: LanderEventContext
): LanderData {
	if (message.scope === "PUBLIC") return prev;

	// The payload is just `{ releaseId }`; the org is `meta.orgId`, which the broadcaster always adds.
	const orgId = message.meta?.orgId;
	const payload: unknown = message.data;
	if (typeof orgId !== "string" || !context.organizations.has(orgId)) return prev;
	if (!isRecord(payload) || typeof payload.releaseId !== "string") return prev;

	const { releaseId } = payload;
	const inList = prev.releases.some((release) => release.id === releaseId && release.organizationId === orgId);
	const releases = inList
		? prev.releases.filter((release) => !(release.id === releaseId && release.organizationId === orgId))
		: prev.releases;
	const tasks = clearTasksRelease(prev.tasks, orgId, releaseId);

	return releases === prev.releases && tasks === prev.tasks ? prev : { ...prev, releases, tasks };
}

/**
 * Applies one server event to the board's data. Returns `prev` untouched for
 * anything the board doesn't handle.
 */
export function applyLanderEvent(
	prev: LanderData,
	message: ServerEventMessage,
	context: LanderEventContext
): LanderData {
	switch (message.type) {
		case "CREATE_TASK":
		case "UPDATE_TASK":
			return applyTaskPayload(prev, message.data, context);
		case "UPDATE_TASK_VOTE":
			return applyVote(prev, message.data);
		case "UPDATE_LABELS":
			return applyLabels(prev, message, context);
		case "UPDATE_CATEGORIES":
			return applyCategories(prev, message, context);
		case "UPDATE_RELEASES":
			return applyReleaseChanged(prev, message, context);
		case "DELETE_RELEASE":
			return applyReleaseDeleted(prev, message, context);
		default:
			return prev;
	}
}

/**
 * Applies a same-window message (anything `onWindowMessage` hands over, so `unknown`). Today that is
 * "task-created": the create-task dialog posts the record its API call returned, since the server
 * doesn't echo a task back to the client that created it. It goes through the same path as an SSE
 * CREATE_TASK — org badge attached, a duplicate delivery harmless — with one extra rule: the task's
 * org must be one the board shows, because unlike a room-scoped SSE event this message carries no
 * server-side proof of where it came from.
 */
export function applyLanderWindowMessage(prev: LanderData, message: unknown, context: LanderEventContext): LanderData {
	const task = readTaskCreatedMessage(message);
	if (!task || !context.organizations.has(task.organizationId)) return prev;
	return applyTaskPayload(prev, task, context);
}

/** The window message lib/serverEvents.ts posts ~2s after the SSE stream reconnects following a drop. */
export function isSseReconnectedMessage(message: unknown): boolean {
	return isRecord(message) && message.type === "SSE_RECONNECTED";
}
