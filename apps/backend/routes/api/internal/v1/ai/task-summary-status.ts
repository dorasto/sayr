import { isAiEnabled } from "@repo/edition";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { checkTaskSummaryAccess, getTaskAiSummary } from "../../../../../lib/ai/task-summary";
import { errorResponse } from "../../../../../responses";

export const taskSummaryStatusRoute = new Hono<AppEnv>();

const querySchema = z.object({
	taskId: z.string().min(1),
	orgId: z.string().min(1),
});

taskSummaryStatusRoute.get("/", async (c) => {
	const session = c.get("session");
	const recordWideError = c.get("recordWideError");

	if (!session?.userId) {
		return c.json(errorResponse("Unauthorized"), 401);
	}

	if (!isAiEnabled()) {
		return c.json(
			errorResponse(
				"AI features are not available on this instance. Set REQUESTY_API_KEY to enable AI on self-hosted editions."
			),
			403
		);
	}

	const parsed = querySchema.safeParse({
		taskId: c.req.query("taskId"),
		orgId: c.req.query("orgId"),
	});
	if (!parsed.success) {
		return c.json(errorResponse("Missing or invalid query parameters"), 400);
	}

	const { taskId, orgId } = parsed.data;

	try {
		const access = await checkTaskSummaryAccess(orgId, session.userId);
		if (!access.ok) {
			return c.json(errorResponse(access.error), access.status);
		}

		const result = await getTaskAiSummary(orgId, taskId);
		if (!result.hasCachedSummary) {
			return c.json({ hasCachedSummary: false });
		}

		return c.json(result);
	} catch (err) {
		await recordWideError({
			name: "ai.taskSummaryStatus.handler",
			error: err,
			code: "AI_TASK_SUMMARY_STATUS_FAILED",
			message: "Failed to retrieve AI task summary status",
			contextData: { userId: session.userId, orgId, taskId: parsed.data.taskId },
		});
		return c.json(errorResponse("Internal server error"), 500);
	}
});
