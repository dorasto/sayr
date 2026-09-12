import { db, getOrganization, getTaskSummaryMeta, resolveOrgAiStatus, schema } from "@repo/database";
import { isAiAllowedForOrg } from "@repo/edition";
import { getRedis } from "@repo/queue";
import { and, eq, sql } from "drizzle-orm";
import { traceOrgPermissionCheck } from "@/util";

export interface TaskAiSummaryResult {
	hasCachedSummary: boolean;
	isStale: boolean;
	summary: string | null;
	generatedAt: string | null;
}

export type TaskSummaryAccessResult =
	| { ok: true; org: NonNullable<Awaited<ReturnType<typeof getOrganization>>> }
	| { ok: false; status: 403 | 404; error: string };

/**
 * The permission → org lookup → plan → org-setting sequence shared by every
 * route that reads back a task's AI summary (session-authed internal route,
 * API-key-authed `/me/*` route). Doesn't check instance-level `isAiEnabled()`
 * or per-key API scopes — those differ per auth model, so callers check those
 * themselves before or after calling this.
 */
export async function checkTaskSummaryAccess(orgId: string, userId: string): Promise<TaskSummaryAccessResult> {
	const isAuthorized = await traceOrgPermissionCheck(userId, orgId, "members");
	if (!isAuthorized) {
		return { ok: false, status: 403, error: "Permission denied" };
	}

	const org = await getOrganization(orgId, userId);
	if (!org) {
		return { ok: false, status: 404, error: "Organization not found" };
	}

	// On cloud, AI is a Pro plan feature. Self-hosted instances are unrestricted.
	if (!isAiAllowedForOrg(org.plan ?? null)) {
		return {
			ok: false,
			status: 403,
			error: "AI features are only available on the Pro plan. Please upgrade to access this feature.",
		};
	}

	const aiStatus = resolveOrgAiStatus(org.settings ?? null);
	if (aiStatus.aiDisabled || !aiStatus.taskSummaryEnabled) {
		return { ok: false, status: 403, error: "AI task summary is disabled for this organization" };
	}

	return { ok: true, org };
}

/**
 * Reads back the AI-generated summary for a task, if one is already cached —
 * never triggers generation itself. Shared by the internal `task-summary-status`
 * route (session auth) and the public `/me/tasks/:taskId` route (API key auth);
 * both gate on AI availability/plan/settings themselves before calling this,
 * since their auth models differ.
 *
 * The task's `aiSummaryHash`/`aiSummaryGeneratedAt` columns are only a cache
 * fingerprint — the summary text itself lives in Redis with a 7-day TTL, keyed
 * by `ai:summary:<taskId>:<hash>`. A summary is stale if any task-timeline
 * activity (including comments) is newer than the last generation, or if the
 * Redis entry has expired.
 */
export async function getTaskAiSummary(orgId: string, taskId: string): Promise<TaskAiSummaryResult> {
	const meta = await getTaskSummaryMeta(orgId, taskId);
	if (!meta?.aiSummaryHash || !meta.aiSummaryGeneratedAt) {
		return { hasCachedSummary: false, isStale: false, summary: null, generatedAt: null };
	}

	const { aiSummaryHash, aiSummaryGeneratedAt } = meta;

	// Check if any timeline activity (including comments) is newer than the
	// last generation. If so the summary is stale.
	let isStale = false;
	try {
		const [row] = await db
			.select({ latestActivity: sql<string | null>`MAX(${schema.taskTimeline.createdAt})` })
			.from(schema.taskTimeline)
			.where(and(eq(schema.taskTimeline.organizationId, orgId), eq(schema.taskTimeline.taskId, taskId)));

		const latestActivity = row?.latestActivity ? new Date(row.latestActivity) : null;
		if (latestActivity && latestActivity > aiSummaryGeneratedAt) {
			isStale = true;
		}
	} catch {
		// DB error checking staleness — treat as non-stale to avoid unnecessary
		// regeneration on every load if the DB is momentarily slow.
	}

	// Check Redis — if the key has expired the cache is stale.
	let summary: string | null = null;
	if (!isStale) {
		try {
			const redis = getRedis();
			summary = await redis.get(`ai:summary:${taskId}:${aiSummaryHash}`);
			if (!summary) {
				isStale = true;
			}
		} catch {
			// Redis unavailable — treat as stale so the caller regenerates.
			isStale = true;
		}
	}

	return {
		hasCachedSummary: true,
		isStale,
		summary: summary ?? null,
		generatedAt: aiSummaryGeneratedAt.toISOString(),
	};
}
