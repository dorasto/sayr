import { randomUUID } from "node:crypto";
import {
	createRelease,
	db,
	deleteRelease,
	getReleaseBySlug,
	isOrganizationMember,
	markReleaseAsReleased,
	schema,
	updateRelease,
} from "@repo/database";
import { canCreateResource, getLimitReachedMessage } from "@repo/edition";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, count, eq, notInArray } from "drizzle-orm";
import { broadcastReleaseChanged, broadcastReleaseDeleted, broadcastReleaseTasksClosed } from "./broadcast";
import { isUniqueViolation, ReleaseServiceError } from "./errors";
import type { CreateReleaseInput, UpdateReleaseInput } from "./input";
import { deriveReleasedAt, FINISHED_TASK_STATUSES, planPublish } from "./rules";

/**
 * Release create / update / delete / publish, as services the `/v1/me` routes
 * call. The logic is ported from the web app's release router
 * (`routes/api/internal/v1/release.ts`: `/create`, `/update`, `/delete`,
 * `/mark-released`) so both surfaces have the same side effects — slug and
 * plan-limit checks, task auto-closing with timeline entries, SSE broadcasts.
 *
 * KEEP IN SYNC with that router until it adopts these services (deliberately
 * not done yet — it stays as-is so the two can be reviewed separately). One
 * intentional difference: the router's `/mark-released` always re-stamps the
 * release date and has no "already released" short-circuit; publishing here
 * keeps an existing date and is a no-op when there is nothing left to close.
 *
 * Permission checks are NOT here: they stay in each caller's route handler (an
 * API-key scope + team permission for `/v1/me`, a session for the web router).
 * The instance-level `enforceLimit` also stays in the route — it returns a
 * Hono `Response` bound to the request context, which a service can't produce.
 * By the time these run, the caller has authorised the request and resolved the
 * release row (already verified to belong to `orgId`).
 */

function slugTakenError(slug: string) {
	return new ReleaseServiceError(
		"SLUG_TAKEN",
		`A release with the slug "${slug}" already exists in this organization.`
	);
}

export async function createReleaseService(params: {
	orgId: string;
	actorUserId: string;
	input: CreateReleaseInput;
}): Promise<schema.releaseType> {
	const { orgId, actorUserId, input } = params;
	const traceAsync = createTraceAsync();

	const existing = await traceAsync("release.create.check_slug", () => getReleaseBySlug(orgId, input.slug), {
		description: "Checking if slug is taken",
		data: { slug: input.slug, orgId },
	});
	if (existing) throw slugTakenError(input.slug);

	// Plan-level release limit (cloud free = none; self-hosted limits are enforced by the route).
	const [organization, [releaseCount]] = await Promise.all([
		db.query.organization.findFirst({ where: eq(schema.organization.id, orgId), columns: { plan: true } }),
		db.select({ value: count() }).from(schema.release).where(eq(schema.release.organizationId, orgId)),
	]);
	if (!canCreateResource("releases", releaseCount?.value ?? 0, organization?.plan)) {
		throw new ReleaseServiceError("PLAN_LIMIT_REACHED", getLimitReachedMessage("releases", organization?.plan));
	}

	const releasedAt = deriveReleasedAt({
		currentStatus: null,
		currentReleasedAt: null,
		nextStatus: input.status,
		explicitReleasedAt: input.releasedAt,
	});

	let release: schema.releaseType;
	try {
		release = await traceAsync(
			"release.create.insert",
			() =>
				createRelease({
					id: randomUUID(),
					organizationId: orgId,
					name: input.name,
					slug: input.slug,
					description: input.description,
					status: input.status,
					targetDate: input.targetDate,
					releasedAt: releasedAt ?? undefined,
					color: input.color,
					icon: input.icon,
					createdBy: actorUserId,
				}),
			{
				description: "Creating release record",
				data: { orgId, name: input.name, slug: input.slug, status: input.status },
			}
		);
	} catch (err) {
		// Two creates racing on the same slug both pass the check above; the unique index decides.
		if (isUniqueViolation(err)) throw slugTakenError(input.slug);
		throw err;
	}

	broadcastReleaseChanged(orgId, release);
	return release;
}

export async function updateReleaseService(params: {
	orgId: string;
	release: schema.releaseType;
	input: UpdateReleaseInput;
}): Promise<schema.releaseType> {
	const { orgId, release, input } = params;
	const traceAsync = createTraceAsync();

	const newSlug = input.slug;
	if (newSlug !== undefined && newSlug !== release.slug) {
		const taken = await traceAsync("release.update.check_slug", () => getReleaseBySlug(orgId, newSlug), {
			description: "Checking if new slug is taken",
			data: { slug: newSlug, orgId },
		});
		if (taken) throw slugTakenError(newSlug);
	}

	const leadId = input.leadId;
	if (leadId && !(await isOrganizationMember(orgId, leadId))) {
		throw new ReleaseServiceError("INVALID_LEAD", "The release lead must be a member of this organization.");
	}

	const releasedAt = deriveReleasedAt({
		currentStatus: release.status,
		currentReleasedAt: release.releasedAt,
		nextStatus: input.status,
		explicitReleasedAt: input.releasedAt,
	});

	let updated: schema.releaseType;
	try {
		updated = await traceAsync(
			"release.update.save",
			() => updateRelease(release.id, { ...input, ...(releasedAt !== undefined ? { releasedAt } : {}) }),
			{
				description: "Updating release record",
				data: { releaseId: release.id, updates: Object.keys(input) },
			}
		);
	} catch (err) {
		if (newSlug !== undefined && isUniqueViolation(err)) throw slugTakenError(newSlug);
		throw err;
	}

	broadcastReleaseChanged(orgId, updated);
	return updated;
}

/** Deletes the release. Its tasks are unlinked (`releaseId` cleared), not deleted. */
export async function deleteReleaseService(params: { orgId: string; release: schema.releaseType }): Promise<void> {
	const { orgId, release } = params;
	const traceAsync = createTraceAsync();

	await traceAsync("release.delete.remove", () => deleteRelease(release.id), {
		description: "Deleting release and nullifying task associations",
		data: { releaseId: release.id },
	});

	broadcastReleaseDeleted(orgId, release.id);
}

/** How many tasks in the release publishing would close: not done, not canceled, in the release's org. */
async function countOpenTasks(orgId: string, releaseId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(schema.task)
		.where(
			and(
				eq(schema.task.organizationId, orgId),
				eq(schema.task.releaseId, releaseId),
				notInArray(schema.task.status, [...FINISHED_TASK_STATUSES])
			)
		);
	return row?.value ?? 0;
}

/**
 * Publishes a release: marks it released and closes every task in it that
 * isn't already done or canceled, logging a `status_change` timeline entry on
 * each closed task.
 *
 * Safe to repeat, and usable after a status-only change. A release can already
 * be `released` without its tasks having been closed (a status change alone, as
 * from the web board or `PATCH status`, doesn't close them), so publishing
 * still closes any open tasks it finds and keeps the release date it already
 * has. `alreadyReleased: true` means nothing needed writing: the release is
 * released and has no open tasks, so no writes and no broadcasts happen — a
 * repeated publish never re-stamps the date or re-closes anything. See
 * `planPublish` for the three cases.
 */
export async function markReleasedService(params: {
	orgId: string;
	release: schema.releaseType;
	actorUserId: string;
}): Promise<{ release: schema.releaseType; updatedTaskCount: number; alreadyReleased: boolean }> {
	const { orgId, release, actorUserId } = params;
	const traceAsync = createTraceAsync();

	// Whether an already-released release has anything left to do depends on its
	// open tasks; a release that isn't released yet always gets published.
	const openTaskCount =
		release.status === "released"
			? await traceAsync("release.mark_released.count_open", () => countOpenTasks(orgId, release.id), {
					description: "Counting open tasks in an already-released release",
					data: { releaseId: release.id },
				})
			: 0;

	const plan = planPublish({ status: release.status, releasedAt: release.releasedAt, openTaskCount });
	if (plan.alreadyReleased) {
		return { release, updatedTaskCount: 0, alreadyReleased: true };
	}

	const result = await traceAsync(
		"release.mark_released.execute",
		() => markReleaseAsReleased(release.id, actorUserId, { releasedAt: plan.releasedAt }),
		{
			description: "Marking release as released and closing incomplete tasks",
			data: { releaseId: release.id, actorId: actorUserId },
		}
	);

	if (result.updatedTaskIds.length > 0) {
		const content: schema.NodeJSON = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: `Task auto-closed when release "${release.name}" was marked as released`,
						},
					],
				},
			],
		};

		await traceAsync(
			"release.mark_released.timeline",
			() =>
				db.insert(schema.taskTimeline).values(
					result.updatedTaskIds.map((taskId) => ({
						taskId,
						organizationId: orgId,
						eventType: "status_change" as const,
						actorId: actorUserId,
						fromValue: null, // Previous status varies per task
						toValue: "done",
						content,
					}))
				),
			{
				description: "Creating timeline entries for auto-closed tasks",
				data: { taskCount: result.updatedTaskIds.length },
			}
		);
	}

	broadcastReleaseChanged(orgId, result.release);
	broadcastReleaseTasksClosed(orgId, result.updatedTaskIds);

	return { release: result.release, updatedTaskCount: result.updatedTaskIds.length, alreadyReleased: false };
}
