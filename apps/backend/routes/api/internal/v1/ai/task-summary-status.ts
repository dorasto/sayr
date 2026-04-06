import { getTaskSummaryMeta, resolveOrgAiStatus, getOrganization, schema, db } from "@repo/database";
import { isCloud } from "@repo/edition";
import { getRedis } from "@repo/queue";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { errorResponse } from "../../../../../responses";

export const taskSummaryStatusRoute = new Hono<AppEnv>();

const querySchema = z.object({
	taskId: z.string().min(1),
	orgId: z.string().min(1),
});

taskSummaryStatusRoute.get("/", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json(errorResponse("Unauthorized"), 401);
	}

	if (!isCloud()) {
		return c.json(errorResponse("AI features are only available on Sayr Cloud"), 403);
	}

	const parsed = querySchema.safeParse({
		taskId: c.req.query("taskId"),
		orgId: c.req.query("orgId"),
	});
	if (!parsed.success) {
		return c.json(errorResponse("Missing or invalid query parameters"), 400);
	}

	const { taskId, orgId } = parsed.data;

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "members");
	if (!isAuthorized) {
		return c.json(errorResponse("Permission denied"), 403);
	}

	// Check org-level AI settings
	const org = await getOrganization(orgId, session.userId);
	const aiStatus = resolveOrgAiStatus(org?.settings ?? null);
	if (aiStatus.aiDisabled || !aiStatus.taskSummaryEnabled) {
		return c.json(errorResponse("AI task summary is disabled for this organization"), 403);
	}

	// Fetch only the cache metadata columns — no full task load needed.
	const meta = await getTaskSummaryMeta(orgId, taskId);
	if (!meta?.aiSummaryHash || !meta.aiSummaryGeneratedAt) {
		return c.json({ hasCachedSummary: false });
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
			// Redis unavailable — treat as stale so the frontend regenerates.
			isStale = true;
		}
	}

	return c.json({
		hasCachedSummary: true,
		isStale,
		summary: summary ?? null,
		generatedAt: aiSummaryGeneratedAt.toISOString(),
	});
});
