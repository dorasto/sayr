import { createHash } from "node:crypto";
import type { RequestyModelId } from "@repo/ai";
import { recommendationsPrompt } from "@repo/ai-prompts";
import {
	db,
	findSimilarTasks,
	getLabels,
	getReleases,
	getTaskById,
	getTaskLabelCategorySummaries,
	type schema,
	searchTasksByOrganization,
} from "@repo/database";
import { extractPlainText, isAiFeatureEnabled } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { checkAiFeatureAccess } from "../../../../../lib/ai/gate";
import { runAiStructuredFeature } from "../../../../../lib/ai/structured-runner";
import { errorResponse } from "../../../../../responses";

export const recommendationsRoute = new Hono<AppEnv>();

/**
 * Always a small, cheap model — this feature only ever classifies against
 * closed candidate lists, never generates or writes prose, so it doesn't
 * need a larger model's context/reasoning budget. Deliberately not exposed
 * via the per-feature model picker (`selectedModels`) — orgs cannot
 * override this.
 */
const RECOMMENDATIONS_MODEL: RequestyModelId = "mistral/mistral-small-latest";
const CACHE_TTL_SECONDS = 60 * 60 * 24;
/**
 * How many nearest-neighbor tasks to consider — both as relation
 * (duplicate/blocking/related) candidates and as the evidence base for
 * label/category suggestions ("N of these used label X"). Ranked by real
 * semantic similarity (task.embedding, pgvector) when the current task has
 * one; falls back to a local word-overlap prefilter over a recent-tasks
 * window when it doesn't (not yet processed by the embed_task background
 * job, or self-hosted without the pgvector extension available).
 */
const NEIGHBOR_COUNT = 12;
/** How many recent org tasks to pull for the word-overlap fallback path. */
const RELATION_CANDIDATE_POOL_SIZE = 50;

const RELATION_TYPES = ["related", "blocking", "duplicate"] as const;

const requestSchema = z.object({
	taskId: z.string().min(1),
	orgId: z.string().min(1),
	forceRefresh: z.boolean().optional(),
});

interface RecommendationsResult {
	labelIds: string[];
	assigneeIds: string[];
	priority: string | null;
	categoryId: string | null;
	releaseId: string | null;
	relations: { taskId: string; type: string; title: string; shortId: number | null }[];
	reasoning?: string;
	systemPrompt?: string;
	userPrompt?: string;
}

function emptyResult(): RecommendationsResult {
	return { labelIds: [], assigneeIds: [], priority: null, categoryId: null, releaseId: null, relations: [] };
}

const STOPWORDS = new Set([
	"the",
	"a",
	"an",
	"and",
	"or",
	"to",
	"of",
	"in",
	"on",
	"for",
	"is",
	"are",
	"this",
	"that",
	"with",
	"as",
	"at",
	"by",
	"from",
	"it",
	"be",
	"was",
	"were",
]);

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length > 2 && !STOPWORDS.has(w))
	);
}

/**
 * Cheap local relevance score between the current task and a relation
 * candidate — normalised word overlap over their titles, no embeddings (see
 * the AI-epic plan's duplicate-detection note: stay realistic/cheap at this
 * scale, an embeddings + vector column setup is a bigger lift than the
 * candidate pool here warrants).
 */
function scoreOverlap(sourceWords: Set<string>, candidateTitle: string): number {
	const candidateWords = tokenize(candidateTitle);
	if (candidateWords.size === 0 || sourceWords.size === 0) return 0;
	let overlap = 0;
	for (const w of candidateWords) if (sourceWords.has(w)) overlap++;
	return overlap / Math.sqrt(sourceWords.size * candidateWords.size);
}

type Neighbor = { id: string; title: string; shortId: number | null; labelIds: string[]; categoryId: string | null };

/**
 * Turns nearest-neighbor co-occurrence into explicit facts for the prompt —
 * "N of the M most similar tasks used X" — instead of asking the model to
 * infer relevance from raw text alone. This is what grounds label/category
 * suggestions in actual historical data (the user's own example: "9 other
 * tasks that were semi related to this task used this label").
 */
function buildFrequencyEvidence<T extends { id: string; name: string }>(
	neighbors: Neighbor[],
	getIds: (n: Neighbor) => string[],
	candidates: T[]
): string | null {
	if (neighbors.length === 0) return null;
	const freq = new Map<string, number>();
	for (const n of neighbors) {
		for (const id of getIds(n)) freq.set(id, (freq.get(id) ?? 0) + 1);
	}
	const lines = candidates
		.map((c) => ({ c, count: freq.get(c.id) ?? 0 }))
		.filter((e) => e.count > 0)
		.sort((a, b) => b.count - a.count)
		.map((e) => `- "${e.c.name}" appears on ${e.count}/${neighbors.length} similar tasks`);
	if (lines.length === 0) return null;
	return `Evidence from the ${neighbors.length} most similar tasks in this organisation:\n${lines.join("\n")}`;
}

recommendationsRoute.post("/", async (c) => {
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

	const access = await checkAiFeatureAccess({ c, session, orgId, promptConfig: recommendationsPrompt });
	if (!access.ok) return access.response;

	// Per-kind toggles — there's no single "recommendations" master switch
	// beyond the org-wide AI disable/rate-limit checks already applied above;
	// each kind is independently opt-out (missing = enabled).
	const enabled = {
		labels: isAiFeatureEnabled(access.org.settings, "recommend-labels"),
		assignees: isAiFeatureEnabled(access.org.settings, "recommend-assignees"),
		priority: isAiFeatureEnabled(access.org.settings, "recommend-priority"),
		category: isAiFeatureEnabled(access.org.settings, "recommend-category"),
		release: isAiFeatureEnabled(access.org.settings, "recommend-release"),
		relations: isAiFeatureEnabled(access.org.settings, "recommend-relations"),
	};

	if (!Object.values(enabled).some(Boolean)) {
		return c.json({ success: true, data: emptyResult() });
	}

	let task: Awaited<ReturnType<typeof getTaskById>>;
	try {
		task = await getTaskById(orgId, taskId);
	} catch (err) {
		await recordWideError({
			name: "ai.recommendations.fetch-failed",
			error: err,
			code: "AI_RECOMMENDATIONS_FETCH_FAILED",
			message: "Failed to fetch task data for recommendations",
			contextData: { taskId, orgId },
		});
		return c.json(errorResponse("Failed to load task data"), 500);
	}
	if (!task) {
		return c.json(errorResponse("Task not found"), 404);
	}

	const descriptionText = task.description ? extractPlainText(task.description) : "No description provided.";

	// ---- Nearest-neighbor tasks: relation candidates + label/category evidence ----
	// Computed once, up front — both the relations kind and the evidence lines
	// appended to the labels/category sections below read from this same set.
	let neighbors: Neighbor[] = [];
	if (enabled.relations || enabled.labels || enabled.category) {
		const alreadyRelatedIds = new Set((task.relations ?? []).map((r) => r.task?.id).filter(Boolean));
		let candidates: { id: string; title: string; shortId: number | null }[] = [];

		if (task.embedding) {
			// Real semantic nearest-neighbors across every task in the org, via
			// pgvector — pull a few extra to absorb any that turn out to already
			// be related, then trim back down to NEIGHBOR_COUNT.
			const similar = await findSimilarTasks(orgId, task.embedding, {
				excludeTaskId: taskId,
				limit: NEIGHBOR_COUNT + alreadyRelatedIds.size,
			});
			candidates = similar
				.filter((t) => !alreadyRelatedIds.has(t.id))
				.slice(0, NEIGHBOR_COUNT)
				.map((t) => ({ id: t.id, title: t.title ?? "", shortId: t.shortId }));
		} else {
			// Fallback: this task has no embedding yet (not yet processed by the
			// embed_task background job, or self-hosted without pgvector) — cheap
			// local word-overlap prefilter over a recent-tasks window instead of
			// going silent.
			const pool = await searchTasksByOrganization(orgId, undefined, RELATION_CANDIDATE_POOL_SIZE);
			const sourceWords = tokenize(`${task.title ?? ""} ${descriptionText}`);
			candidates = pool
				.filter((t) => t.id !== taskId && t.title && !alreadyRelatedIds.has(t.id))
				.map((t) => ({
					id: t.id,
					title: t.title ?? "",
					shortId: t.shortId,
					score: scoreOverlap(sourceWords, t.title ?? ""),
				}))
				.filter((t) => t.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, NEIGHBOR_COUNT)
				.map(({ id, title, shortId }) => ({ id, title, shortId }));
		}

		if (candidates.length > 0) {
			const meta = await getTaskLabelCategorySummaries(
				orgId,
				candidates.map((t) => t.id)
			);
			neighbors = candidates.map((t) => ({
				...t,
				labelIds: meta.get(t.id)?.labelIds ?? [],
				categoryId: meta.get(t.id)?.categoryId ?? null,
			}));
		}
	}

	// ---- Assemble candidate data + prompt sections, only for enabled kinds ----
	const sections: string[] = [`Title: ${task.title}`, `Description:\n${descriptionText}`];
	const shape: Record<string, z.ZodTypeAny> = {};
	const hintParts: string[] = [];

	let candidateLabels: schema.labelType[] = [];
	if (enabled.labels) {
		const allLabels = await getLabels(orgId);
		const existingIds = new Set((task.labels ?? []).map((l) => l.id));
		candidateLabels = allLabels.filter((l) => !existingIds.has(l.id));
		if (candidateLabels.length > 0) {
			let labelSection = `Available labels (pick zero or more):\n${candidateLabels.map((l, i) => `${i + 1}. id="${l.id}" name="${l.name}"`).join("\n")}`;
			const evidence = buildFrequencyEvidence(
				neighbors,
				(n) => n.labelIds,
				candidateLabels.map((l) => ({ id: l.id, name: l.name }))
			);
			if (evidence) labelSection += `\n\n${evidence}`;
			sections.push(labelSection);
			shape.labelIds = z.array(z.string()).default([]);
			hintParts.push('"labelIds": string[]');
		}
	}

	let candidateAssignees: { id: string; name: string }[] = [];
	if (enabled.assignees) {
		const existingIds = new Set((task.assignees ?? []).map((a) => a.id));
		candidateAssignees = (access.org.members ?? [])
			.filter((m) => !existingIds.has(m.user.id))
			.map((m) => ({ id: m.user.id, name: m.user.displayName || m.user.name || "Unknown" }));
		if (candidateAssignees.length > 0) {
			sections.push(
				`Available assignees (pick zero or more, only with a concrete signal):\n${candidateAssignees.map((a, i) => `${i + 1}. id="${a.id}" name="${a.name}"`).join("\n")}`
			);
			shape.assigneeIds = z.array(z.string()).default([]);
			hintParts.push('"assigneeIds": string[]');
		}
	}

	if (enabled.priority) {
		sections.push(`Current priority: ${task.priority}`);
		shape.priority = z.enum(["low", "medium", "high", "urgent"]).nullable().default(null);
		hintParts.push('"priority": "low"|"medium"|"high"|"urgent"|null');
	}

	let candidateCategories: schema.categoryType[] = [];
	if (enabled.category) {
		candidateCategories = await db.query.category.findMany({ where: (cat) => eq(cat.organizationId, orgId) });
		if (candidateCategories.length > 0) {
			let categorySection = `Current category: ${task.category ?? "none"}\nAvailable categories:\n${candidateCategories.map((cat, i) => `${i + 1}. id="${cat.id}" name="${cat.name}"`).join("\n")}`;
			const evidence = buildFrequencyEvidence(
				neighbors,
				(n) => (n.categoryId ? [n.categoryId] : []),
				candidateCategories.map((cat) => ({ id: cat.id, name: cat.name }))
			);
			if (evidence) categorySection += `\n\n${evidence}`;
			sections.push(categorySection);
			shape.categoryId = z.string().nullable().default(null);
			hintParts.push('"categoryId": string|null');
		}
	}

	let candidateReleases: schema.releaseType[] = [];
	if (enabled.release) {
		candidateReleases = await getReleases(orgId);
		if (candidateReleases.length > 0) {
			sections.push(
				`Current release: ${task.releaseId ?? "none"}\nAvailable releases:\n${candidateReleases.map((r, i) => `${i + 1}. id="${r.id}" name="${r.name}"`).join("\n")}`
			);
			shape.releaseId = z.string().nullable().default(null);
			hintParts.push('"releaseId": string|null');
		}
	}

	let candidateRelationTasks: { id: string; title: string; shortId: number | null }[] = [];
	if (enabled.relations) {
		// Already computed above — real semantic nearest-neighbors when this
		// task has an embedding, word-overlap fallback otherwise.
		candidateRelationTasks = neighbors.map((n) => ({ id: n.id, title: n.title, shortId: n.shortId }));

		if (candidateRelationTasks.length > 0) {
			sections.push(
				`Other tasks in this organisation (classify zero or more as related/blocking/duplicate):\n${candidateRelationTasks.map((t, i) => `${i + 1}. id="${t.id}" title="${t.title}"`).join("\n")}`
			);
			shape.relations = z.array(z.object({ taskId: z.string(), type: z.enum(RELATION_TYPES) })).default([]);
			hintParts.push('"relations": {"taskId": string, "type": "related"|"blocking"|"duplicate"}[]');
		}
	}

	if (hintParts.length === 0) {
		// Every enabled kind had nothing to offer (no labels/other members/releases/etc. in this org) —
		// nothing to ask the model, skip the call entirely.
		return c.json({ success: true, data: emptyResult() });
	}

	shape.reasoning = z.string().optional();
	const resultSchema = z.object(shape);
	const userPrompt = sections.join("\n\n");
	const responseFormatHint = `{${hintParts.join(", ")}, "reasoning": string}`;

	// Content-keyed on the assembled prompt, which already reflects the task's
	// content AND every enabled kind's candidate set — a changed toggle, a
	// new label/member/release, or an edited task all naturally produce a
	// different key rather than needing explicit invalidation.
	const contentHash = createHash("sha256").update(userPrompt).digest("hex");
	const cacheKey = `ai:recommendations:${taskId}:${contentHash}`;

	const result = await runAiStructuredFeature({
		promptConfig: recommendationsPrompt,
		systemPrompt: recommendationsPrompt.systemPrompt,
		responseFormatHint,
		userPrompt,
		model: RECOMMENDATIONS_MODEL,
		schema: resultSchema,
		session: { userId: session.userId },
		orgId,
		targetId: taskId,
		cacheKey,
		cacheTtlSeconds: CACHE_TTL_SECONDS,
		forceRefresh,
		buildClickhouseMetadata: (r) => {
			const parsed = r as Record<string, unknown>;
			return {
				label_count: (parsed.labelIds as string[] | undefined)?.length ?? 0,
				assignee_count: (parsed.assigneeIds as string[] | undefined)?.length ?? 0,
				relation_count: (parsed.relations as unknown[] | undefined)?.length ?? 0,
			};
		},
	});

	if (!result.ok) {
		return c.json(errorResponse("Failed to generate recommendations", result.error), 502);
	}

	// The schema is built dynamically per-call, so its inferred type can't
	// carry specific keys statically — cast to a loose record and validate
	// every id-bearing field back against the real candidate sets below
	// (the schema only constrained shape, not that ids/types are genuine).
	const data = result.data as Record<string, unknown>;

	const candidateLabelIds = new Set(candidateLabels.map((l) => l.id));
	const candidateAssigneeIds = new Set(candidateAssignees.map((a) => a.id));
	const candidateCategoryIds = new Set(candidateCategories.map((cat) => cat.id));
	const candidateReleaseIds = new Set(candidateReleases.map((r) => r.id));
	const candidateRelationById = new Map(candidateRelationTasks.map((t) => [t.id, t]));

	const labelIds = ((data.labelIds as string[] | undefined) ?? []).filter((id) => candidateLabelIds.has(id));
	const assigneeIds = ((data.assigneeIds as string[] | undefined) ?? []).filter((id) => candidateAssigneeIds.has(id));
	const categoryId =
		typeof data.categoryId === "string" && candidateCategoryIds.has(data.categoryId) ? data.categoryId : null;
	const releaseId =
		typeof data.releaseId === "string" && candidateReleaseIds.has(data.releaseId) ? data.releaseId : null;
	const relations = ((data.relations as { taskId: string; type: string }[] | undefined) ?? [])
		.filter((r) => candidateRelationById.has(r.taskId) && (RELATION_TYPES as readonly string[]).includes(r.type))
		.map((r) => {
			const candidate = candidateRelationById.get(r.taskId);
			return { taskId: r.taskId, type: r.type, title: candidate?.title ?? "", shortId: candidate?.shortId ?? null };
		});

	const response: RecommendationsResult = {
		labelIds,
		assigneeIds,
		priority: (data.priority as string | null | undefined) ?? null,
		categoryId,
		releaseId,
		relations,
		reasoning: data.reasoning as string | undefined,
		systemPrompt: recommendationsPrompt.systemPrompt,
		userPrompt,
	};

	return c.json({ success: true, data: response });
});
