import { createHash } from "node:crypto";
import { getTaskById, getLabels } from "@repo/database";
import { suggestLabelsPrompt } from "@repo/ai-prompts";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { errorResponse } from "../../../../../responses";
import { extractPlainText } from "../../../../../lib/ai/extract-plain-text";
import { checkAiFeatureAccess } from "../../../../../lib/ai/gate";
import { resolveActiveModel } from "../../../../../lib/ai/model";
import { runAiStructuredFeature } from "../../../../../lib/ai/structured-runner";

export const suggestLabelsRoute = new Hono<AppEnv>();

/** How long a suggestion result is cached before naturally expiring even if the task never changes. */
const CACHE_TTL_SECONDS = 60 * 60 * 24;

const requestSchema = z.object({
	taskId: z.string().min(1),
	orgId: z.string().min(1),
	/** Bypasses the cache — reserved for the admin-only "Regenerate" action. */
	forceRefresh: z.boolean().optional(),
});

const resultSchema = z.object({
	labelIds: z.array(z.string()),
	reasoning: z.string().optional(),
});

suggestLabelsRoute.post("/", async (c) => {
	const session = c.get("session");
	const recordWideError = c.get("recordWideError");

	if (!session?.userId) {
		return c.json(errorResponse("Unauthorized"), 401);
	}

	let body: z.infer<typeof requestSchema>;
	try {
		body = requestSchema.parse(await c.req.json());
	} catch {
		return c.json(errorResponse("Invalid request body"), 400);
	}
	const { taskId, orgId, forceRefresh } = body;

	const access = await checkAiFeatureAccess({ c, session, orgId, promptConfig: suggestLabelsPrompt });
	if (!access.ok) return access.response;

	let task: Awaited<ReturnType<typeof getTaskById>>;
	try {
		task = await getTaskById(orgId, taskId);
	} catch (err) {
		await recordWideError({
			name: "ai.suggest-labels.fetch-failed",
			error: err,
			code: "AI_SUGGEST_LABELS_FETCH_FAILED",
			message: "Failed to fetch task data for label suggestions",
			contextData: { taskId, orgId },
		});
		return c.json(errorResponse("Failed to load task data"), 500);
	}
	if (!task) {
		return c.json(errorResponse("Task not found"), 404);
	}

	const availableLabels = await getLabels(orgId);
	if (availableLabels.length === 0) {
		return c.json({ success: true, data: { labelIds: [], reasoning: "This organization has no labels yet." } });
	}

	const descriptionText = task.description ? extractPlainText(task.description) : "No description provided.";
	const existingLabelIds = new Set((task.labels ?? []).map((l) => l.id));
	const candidateLabels = availableLabels.filter((l) => !existingLabelIds.has(l.id));

	if (candidateLabels.length === 0) {
		return c.json({ success: true, data: { labelIds: [], reasoning: "All available labels are already applied." } });
	}

	const labelListText = candidateLabels.map((l, i) => `${i + 1}. id="${l.id}" name="${l.name}"`).join("\n");
	const userPrompt = `Title: ${task.title}\nDescription:\n${descriptionText}\n\nAvailable labels:\n${labelListText}`;

	const model = resolveActiveModel(suggestLabelsPrompt, access.org.settings);

	// Content-keyed — the task's title/description and the candidate label
	// list are both folded into the hash (via userPrompt), so any change to
	// either naturally misses this cache entry rather than needing explicit
	// invalidation. TTL is a backstop for content that never changes.
	const contentHash = createHash("sha256").update(userPrompt).digest("hex");
	const cacheKey = `ai:suggest-labels:${taskId}:${contentHash}`;

	const result = await runAiStructuredFeature({
		promptConfig: suggestLabelsPrompt,
		systemPrompt: suggestLabelsPrompt.systemPrompt,
		responseFormatHint: '{"labelIds": string[], "reasoning": string}',
		userPrompt,
		model,
		schema: resultSchema,
		session: { userId: session.userId },
		orgId,
		targetId: taskId,
		cacheKey,
		cacheTtlSeconds: CACHE_TTL_SECONDS,
		forceRefresh,
	});

	if (!result.ok) {
		return c.json(errorResponse("Failed to generate label suggestions", result.error), 502);
	}

	// Defensive: only ever return ids that were actually offered as candidates —
	// the schema check already constrains shape, not that ids are real.
	const candidateIds = new Set(candidateLabels.map((l) => l.id));
	const labelIds = result.data.labelIds.filter((id) => candidateIds.has(id));

	return c.json({
		success: true,
		data: { labelIds, reasoning: result.data.reasoning, systemPrompt: suggestLabelsPrompt.systemPrompt, userPrompt },
	});
});
