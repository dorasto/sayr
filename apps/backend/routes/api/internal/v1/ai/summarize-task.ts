import { getTaskById, getMergedTaskActivity, getOrganization, getUserById, resolveOrgAiStatus, updateTaskAiSummaryMeta, type OrganizationSettings } from "@repo/database";
import { streamText, MISTRAL_MODEL_PRICING } from "@repo/ai-mistral";
import { taskSummaryPrompt } from "@repo/ai-prompts";
import { isAiEnabled, isAiAllowedForOrg } from "@repo/edition";
import { polarClient } from "@repo/auth";
import { getRedis } from "@repo/queue";
import { Hono } from "hono";
import { z } from "zod";
import { createHash } from "node:crypto";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { errorResponse } from "../../../../../responses";
import { extractPlainText } from "../../../../../lib/ai/extract-plain-text";
import { buildTimelineLine } from "../../../../../lib/ai/format-timeline";
import { emitEvent } from "../../../../../clickhouse";

export const summarizeTaskRoute = new Hono<AppEnv>();

const requestSchema = z.object({
	taskId: z.string().min(1),
	orgId: z.string().min(1),
	forceRefresh: z.boolean().optional(),
});

/**
 * Sanitises org-supplied custom prompt instructions before appending them to
 * the base system prompt.
 *
 * - Strips null bytes and ASCII control characters (preserves \n, \r, \t)
 * - Trims surrounding whitespace
 * - Enforces the per-prompt character cap defined in the prompt config
 * - Returns null for empty or whitespace-only input
 */
function sanitizeCustomPrompt(input: string | null | undefined, maxLength: number): string | null {
	if (!input) return null;
	// Strip null bytes and control chars except newline (\x0A), carriage return (\x0D), tab (\x09)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping control chars for prompt safety
	const stripped = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
	if (!stripped) return null;
	return stripped.slice(0, maxLength);
}

/**
 * Extracts unique http/https URLs from a block of plain text.
 * Matches URLs ending at whitespace, quotes, angle brackets, or common
 * punctuation that would not be part of the URL itself.
 */
function extractUrls(text: string): string[] {
	const urlRegex = /https?:\/\/[^\s"'<>)]+/g;
	const matches = text.match(urlRegex) ?? [];
	// Deduplicate while preserving order
	return [...new Set(matches)];
}

/**
 * Selects the best URLs to embed as DocumentURLChunks for the AI summary.
 *
 * Priority order:
 *   1. URLs found in the task description (in order of appearance — most
 *      intentional, placed by the task author).
 *   2. URLs found in user-written comments, sorted newest-first (most recent
 *      activity is most relevant).
 *
 * Structured GitHub timeline events (commits, PRs, branches) are intentionally
 * excluded: they are already represented as concise formatted text lines in the
 * timeline, so fetching their full pages would duplicate context and waste tokens.
 *
 * The result is deduplicated across both sources and capped at `maxCount`.
 */
function selectUrlsForFetch(
	descriptionText: string,
	activity: Awaited<ReturnType<typeof getMergedTaskActivity>>,
	maxCount: number,
): string[] {
	const seen = new Set<string>();
	const selected: string[] = [];

	const add = (url: string) => {
		if (selected.length >= maxCount) return;
		if (seen.has(url)) return;
		seen.add(url);
		selected.push(url);
	};

	// 1. Description URLs — highest priority
	for (const url of extractUrls(descriptionText)) {
		add(url);
	}

	// 2. Comment URLs — newest-first (comments only; GitHub structured events excluded)
	const comments = activity
		.filter((item) => item.eventType === "comment" && item.content)
		.slice() // avoid mutating the original array
		.sort((a, b) => {
			const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return bt - at;
		});

	for (const comment of comments) {
		if (selected.length >= maxCount) break;
		const text = comment.content ? extractPlainText(comment.content) : "";
		for (const url of extractUrls(text)) {
			add(url);
		}
	}

	return selected;
}

summarizeTaskRoute.post("/", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json(errorResponse("Unauthorized"), 401);
	}

	if (!isAiEnabled()) {
		return c.json(
			errorResponse("AI features are not available on this instance. Set MISTRAL_API_KEY to enable AI on self-hosted editions."),
			403,
		);
	}

	const recordWideError = c.get("recordWideError");

	let body: z.infer<typeof requestSchema>;
	try {
		const raw = await c.req.json();
		body = requestSchema.parse(raw);
	} catch {
		return c.json(errorResponse("Invalid request body"), 400);
	}

	const { taskId, orgId, forceRefresh } = body;

	const isAuthorized = await traceOrgPermissionCheck(
		session.userId,
		orgId,
		"members",
	);
	if (!isAuthorized) {
		return c.json(errorResponse("Permission denied"), 403);
	}

	let task: Awaited<ReturnType<typeof getTaskById>>;
	let activity: Awaited<ReturnType<typeof getMergedTaskActivity>>;
	let polarCustomerId: string | null = null;
	let orgSlug: string = "";
	let triggeredBy: string = "";
	let orgSettings: OrganizationSettings | null = null;
	let orgPlan: string | null = null;

	try {
		const [taskResult, activityResult, org, user] = await Promise.all([
			getTaskById(orgId, taskId),
			getMergedTaskActivity(orgId, taskId, false),
			getOrganization(orgId, session.userId),
			getUserById(session.userId),
		]);
		task = taskResult;
		activity = activityResult;
		polarCustomerId = org?.polarCustomerId ?? null;
		orgSlug = org?.slug ?? "";
		orgSettings = org?.settings ?? null;
		orgPlan = org?.plan ?? null;
		triggeredBy = user?.displayName ?? user?.name ?? session.userId;
	} catch (err) {
		await recordWideError({
			name: "ai.summarize-task.fetch-failed",
			error: err,
			code: "AI_SUMMARIZE_TASK_FETCH_FAILED",
			message: "Failed to fetch task data for AI summary",
			contextData: { taskId, orgId },
		});
		return c.json(errorResponse("Failed to load task data"), 500);
	}

	if (!task) {
		return c.json(errorResponse("Task not found"), 404);
	}

	// On cloud, AI is a Pro plan feature. Self-hosted instances are unrestricted
	// (availability is already controlled by MISTRAL_API_KEY via isAiEnabled()).
	if (!isAiAllowedForOrg(orgPlan)) {
		return c.json(
			errorResponse("AI features are only available on the Pro plan. Please upgrade to access this feature."),
			403,
		);
	}

	// Check org-level AI settings
	const aiStatus = resolveOrgAiStatus(orgSettings);
	if (aiStatus.aiDisabled) {
		return c.json(errorResponse("AI features are disabled for this organization"), 403);
	}
	if (aiStatus.aiRateLimited) {
		return c.json(
			{ success: false, error: "AI features are temporarily rate limited for this organization", until: aiStatus.rateLimitUntil?.toISOString() },
			429,
		);
	}
	if (!aiStatus.taskSummaryEnabled) {
		return c.json(errorResponse("AI task summary is disabled for this organization"), 403);
	}

	const descriptionText = task.description
		? extractPlainText(task.description)
		: "No description provided.";

	// Build lookup maps from data already on the task — no extra DB queries.
	const labelMap = new Map<string, string>(
		(task.labels ?? []).map((l) => [l.id, l.name]),
	);
	const assigneeMap = new Map<string, string>(
		(task.assignees ?? []).map((a) => [
			a.id,
			a.displayName ?? a.name ?? "Unknown",
		]),
	);

	const timelineText =
		activity
			?.slice(0, taskSummaryPrompt.maxTimelineItems)
			.map((item) => buildTimelineLine(item, labelMap, assigneeMap))
			.filter(Boolean)
			.join("\n") ?? "";

	const userPrompt = buildUserPrompt(task, descriptionText, timelineText);

	// ---------------------------------------------------------------------------
	// Build the effective system prompt.
	// Custom org instructions are appended after the immutable base prompt with
	// an explicit separator so they can only add tone/style guidance — they
	// cannot overwrite, precede, or reference the base instructions.
	// ---------------------------------------------------------------------------
	const customInstructions = sanitizeCustomPrompt(
		orgSettings?.ai?.taskSummaryCustomPrompt,
		taskSummaryPrompt.maxCustomPromptLength,
	);
	const effectiveSystemPrompt = customInstructions
		? `${taskSummaryPrompt.systemPrompt}\n\n---\nAdditional tone instructions from organization settings:\n${customInstructions}`
		: taskSummaryPrompt.systemPrompt;

	// ---------------------------------------------------------------------------
	// URL fetch capability gate.
	// Active when: prompt declares the capability and org has enabled it.
	// URLs are selected via selectUrlsForFetch, which sources from the task
	// description (highest priority) and user-written comments (newest-first),
	// capped at maxUrlFetchCount. Structured GitHub timeline events are excluded
	// since they are already represented as formatted text in the timeline.
	// ---------------------------------------------------------------------------
	const useUrlFetch =
		taskSummaryPrompt.capabilities.urlFetch &&
		aiStatus.urlFetchEnabled;

	const maxUrlFetchCount = taskSummaryPrompt.maxUrlFetchCount ?? 3;
	const urls: string[] = useUrlFetch
		? selectUrlsForFetch(descriptionText, activity ?? [], maxUrlFetchCount)
		: [];

	const totalUrlsFound = useUrlFetch
		? (() => {
				const seen = new Set<string>();
				for (const u of extractUrls(descriptionText)) seen.add(u);
				for (const item of (activity ?? []).filter((i) => i.eventType === "comment" && i.content)) {
					const text = item.content ? extractPlainText(item.content) : "";
					for (const u of extractUrls(text)) seen.add(u);
				}
				return seen.size;
			})()
		: 0;

	console.log(
		`[ai:summarize-task] taskId=${taskId} orgId=${orgId} model=${taskSummaryPrompt.model} urlFetch=${useUrlFetch} (orgEnabled=${aiStatus.urlFetchEnabled}) urlsFound=${totalUrlsFound} urlsSelected=${urls.length}/${maxUrlFetchCount}`,
	);

	// Only upgrade to the URL-fetch model when there are actually URLs to embed.
	// useUrlFetch may be true even when extractUrls returns nothing, so base the
	// model choice on urls.length to avoid paying for an alternate model
	// on plain-text prompts.
	const activeModel = (useUrlFetch && urls.length > 0)
		? (taskSummaryPrompt.urlFetchModel ?? taskSummaryPrompt.model)
		: taskSummaryPrompt.model;

	if (useUrlFetch && urls.length > 0) {
		console.log(`[ai:summarize-task] url-fetch path — model=${activeModel} embedding ${urls.length}/${maxUrlFetchCount} url(s): ${urls.join(", ")}`);
	}

	// ---------------------------------------------------------------------------
	// Redis cache check.
	// The hash covers both the system prompt (which includes any custom
	// instructions) and the user prompt so that changing org instructions
	// correctly invalidates cached summaries.
	// ---------------------------------------------------------------------------
	const contentHash = createHash("sha256")
		.update(effectiveSystemPrompt + userPrompt + (useUrlFetch ? `:uf:${urls.join(",")}` : ""))
		.digest("hex");
	const cacheKey = `ai:summary:${taskId}:${contentHash}`;

	try {
		const redis = getRedis();
		const cached = forceRefresh ? null : await redis.get(cacheKey);
		if (cached) {
			console.log(`[ai:summarize-task] cache hit for taskId=${taskId} (forceRefresh=${forceRefresh})`);
			// Stream the cached text back in chunks so the client behaves identically
			// to a live generation. No Mistral call, no Polar billing event.
			const CHUNK_SIZE = 80;
			const cacheStream = new ReadableStream({
				async start(controller) {
					const encoder = new TextEncoder();
					// Emit a sentinel prompt event (empty) so the client parser doesn't choke.
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: "prompt", systemPrompt: effectiveSystemPrompt, userPrompt, cached: true })}\n\n`,
						),
					);
					for (let i = 0; i < cached.length; i += CHUNK_SIZE) {
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({ chunk: cached.slice(i, i + CHUNK_SIZE) })}\n\n`,
							),
						);
					}
					controller.enqueue(encoder.encode("data: [DONE]\n\n"));

					emitEvent({
						event_type: "ai.summary_requested",
						actor_id: session.userId,
						target_id: taskId,
						org_id: orgId,
						metadata: {
							model: activeModel,
							cache_hit: true,
							success: true,
						},
					});

					controller.close();
				},
			});

			return new Response(cacheStream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache, no-transform",
					Connection: "keep-alive",
				},
			});
		}
	} catch {
		// Redis unavailable — fall through to Mistral as normal.
		console.warn(`[ai:summarize-task] Redis unavailable for taskId=${taskId} — falling through to Mistral`);
	}

	console.log(`[ai:summarize-task] starting Mistral call — path=${useUrlFetch && urls.length > 0 ? "streamText (chat + DocumentURLChunks)" : "streamText (chat)"} taskId=${taskId}`);

	const tokenStream = streamText({
		model: activeModel,
		systemPrompt: effectiveSystemPrompt,
		userPrompt,
		urls: useUrlFetch ? urls : undefined,
	});

	const responseBody = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			let outputText = "";
			let streamError = false;
			let promptTokens = 0;
			let completionTokens = 0;
			let totalTokens = 0;
			let urlFetchUsed = false;
			try {
				// Emit the exact prompts first so clients can display/debug what was sent.
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({ type: "prompt", systemPrompt: effectiveSystemPrompt, userPrompt, urlFetchEnabled: useUrlFetch, urlCount: urls.length })}\n\n`,
					),
				);

				for await (const item of tokenStream) {
					if (item.type === "chunk") {
						outputText += item.text;
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ chunk: item.text })}\n\n`),
						);
					} else if (item.type === "done") {
						promptTokens = item.usage.promptTokens;
						completionTokens = item.usage.completionTokens;
						totalTokens = item.usage.totalTokens;
						urlFetchUsed = item.urlFetchUsed;
						console.log(`[ai:summarize-task] stream done — tokens=${totalTokens} (${promptTokens}in/${completionTokens}out) urlFetchUsed=${urlFetchUsed}`);
					}
				}

				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			} catch (err) {
				streamError = true;
				await recordWideError({
					name: "ai.summarize-task.stream-failed",
					error: err,
					code: "AI_SUMMARIZE_TASK_STREAM_FAILED",
					message: "Error during AI summary stream",
					contextData: { taskId, orgId },
				});
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`,
					),
				);
			} finally {
				// Write to Redis cache and persist metadata on successful generation.
				if (!streamError && outputText) {
					try {
						const redis = getRedis();
						await redis.set(cacheKey, outputText, "EX", 60 * 60 * 24 * 7); // 7 days
						await updateTaskAiSummaryMeta(orgId, taskId, contentHash, new Date());
					} catch {
						// Cache write failure is non-fatal — the summary was already streamed.
					}
				}

				// Calculate cost in USD cents using per-model pricing constants.
				const pricing = MISTRAL_MODEL_PRICING[activeModel];
				const costCents =
					promptTokens * pricing.inputCentsPerToken +
					completionTokens * pricing.outputCentsPerToken;

				// Emit cost event to Polar for paid orgs that have a Polar customer.
				// Free orgs (no polarCustomerId) are silently skipped — they still appear in ClickHouse.
				if (polarCustomerId && polarClient && !streamError) {
					await polarClient.events
						.ingest({
							events: [
								{
									name: "ai.task_summary",
									customerId: polarCustomerId,
									metadata: {
										_cost: { amount: costCents, currency: "usd" } as any,
										_llm: {
											vendor: "mistral",
											model: activeModel,
											input_tokens: promptTokens,
											output_tokens: completionTokens,
											total_tokens: totalTokens,
										} as any,
										org_id: orgId,
										task_id: taskId,
										task_url: `https://${orgSlug}.${process.env.VITE_ROOT_DOMAIN}/${task.shortId}`,
										triggered_by: triggeredBy,
										timeline_items: activity?.length ?? 0,
									},
								},
							],
						})
						.catch((err: unknown) => {
							console.error("[polar] Failed to ingest AI cost event:", err);
						});
				}

				// Await the ClickHouse emit so it completes before the stream closes.
				await new Promise<void>((resolve) => {
					try {
						emitEvent({
							event_type: "ai.summary_requested",
							actor_id: session.userId,
							target_id: taskId,
							org_id: orgId,
					metadata: {
							model: activeModel,
							input_tokens: promptTokens,
							output_tokens: completionTokens,
							total_tokens: totalTokens,
							cost_cents: costCents,
							timeline_items: activity?.length ?? 0,
							cache_hit: false,
							output_text_length: outputText?.length ?? 0,
							success: !streamError,
							url_fetch_used: urlFetchUsed,
							url_count: urls.length,
						},
						});
					} catch {
						// Never block the stream for analytics failures.
					}
					setTimeout(resolve, 50);
				});

				controller.close();
			}
		},
	});

	return new Response(responseBody, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
});

function buildUserPrompt(
	task: NonNullable<Awaited<ReturnType<typeof getTaskById>>>,
	descriptionText: string,
	timelineText: string,
): string {
	const lines = [
		`Title: ${task.title}`,
		`Status: ${task.status ?? "unknown"}`,
		`Priority: ${task.priority ?? "none"}`,
		`Description:\n${descriptionText}`,
	];

	if (timelineText.trim()) {
		lines.push(`Timeline:\n${timelineText}`);
	}

	return lines.join("\n\n");
}
