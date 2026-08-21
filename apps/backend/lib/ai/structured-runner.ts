import { type RequestyMetadata, type RequestyModelId, streamText } from "@repo/ai";
import type { PromptConfig } from "@repo/ai-prompts";
import { createTraceAsync, getTraceContext } from "@repo/opentelemetry/trace";
import { getRedis } from "@repo/queue";
import type { z } from "zod";
import { emitEvent } from "../../clickhouse";

export interface RunAiStructuredFeatureOptions<TSchema extends z.ZodTypeAny> {
	promptConfig: PromptConfig;
	systemPrompt: string;
	/**
	 * A human-readable example of the exact JSON shape the model must return
	 * (e.g. `'{"labelIds": string[], "reasoning"?: string}'`). Appended to the
	 * system prompt as a strict output contract — keeps individual prompt
	 * configs from having to repeat this boilerplate themselves.
	 */
	responseFormatHint: string;
	userPrompt: string;
	model: RequestyModelId;
	schema: TSchema;
	session: { userId: string };
	orgId: string;
	targetId?: string;
	tags?: string[];
	requestyExtra?: RequestyMetadata["extra"];
	/** Extra fields to persist on the ClickHouse `ai.request_completed` event, given the parsed result. */
	buildClickhouseMetadata?: (result: z.infer<TSchema>) => Record<string, unknown>;
	/**
	 * When provided, enables a Redis cache check before generating and a cache
	 * write on success — content-keyed (callers should fold whatever the
	 * result depends on, e.g. task title/description, into the key) so a
	 * changed input naturally misses the old cache rather than needing
	 * explicit invalidation. Mirrors `runAiSseFeature`'s cache support.
	 */
	cacheKey?: string;
	cacheTtlSeconds?: number;
	/** Bypasses the cache check (but still writes a fresh entry on success) — for an explicit admin "regenerate" action. */
	forceRefresh?: boolean;
}

export type RunAiStructuredFeatureResult<TSchema extends z.ZodTypeAny> =
	| { ok: true; data: z.infer<TSchema> }
	| { ok: false; error: string };

function stripCodeFences(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenceMatch?.[1] ?? trimmed;
}

/**
 * Runs an AI feature that returns a single structured JSON object rather
 * than streamed prose — e.g. suggested label ids, a matched template id.
 *
 * Shares the same tracing/Requesty-metadata/ClickHouse-analytics shape as
 * `runAiSseFeature`, but consumes `streamText()` fully server-side (rather
 * than piping chunks to the client) so a real token-usage-derived cost is
 * still available for the ClickHouse event, then parses the joined text as
 * JSON against `schema`. Retries once with a corrective instruction if the
 * first response isn't valid JSON matching the schema — models occasionally
 * wrap JSON in prose or code fences despite instructions not to.
 */
export async function runAiStructuredFeature<TSchema extends z.ZodTypeAny>(
	opts: RunAiStructuredFeatureOptions<TSchema>
): Promise<RunAiStructuredFeatureResult<TSchema>> {
	const {
		promptConfig,
		systemPrompt,
		responseFormatHint,
		userPrompt,
		model,
		schema,
		session,
		orgId,
		targetId,
		tags,
		requestyExtra,
		buildClickhouseMetadata,
		cacheKey,
		cacheTtlSeconds = 60 * 60 * 24,
		forceRefresh,
	} = opts;

	const baseSystemPrompt = `${systemPrompt}\n\n---\nRespond with ONLY a single valid JSON object matching this exact shape — no markdown code fences, no commentary, no extra keys:\n${responseFormatHint}`;

	const traceAsync = createTraceAsync();

	let promptTokens = 0;
	let completionTokens = 0;
	let totalTokens = 0;
	let costUsd = 0;
	let success = false;
	let cacheHit = false;
	let parsed: z.infer<TSchema> | null = null;
	let lastError: string | null = null;

	// Cache check — self-healing: an invalid/stale-shaped cached entry (e.g.
	// after a schema change) just falls through to a live generation rather
	// than surfacing as an error.
	if (cacheKey && !forceRefresh) {
		try {
			const redis = getRedis();
			const cached = await redis.get(cacheKey);
			if (cached) {
				const result = schema.safeParse(JSON.parse(cached));
				if (result.success) {
					parsed = result.data;
					success = true;
					cacheHit = true;
				}
			}
		} catch {
			// Redis unavailable or cached value unparseable — fall through to a live generation.
		}
	}

	try {
		if (!cacheHit) {
			await traceAsync(
				`ai.${promptConfig.id}.generate`,
				async () => {
					const requestyMetadata: RequestyMetadata = {
						tags: tags ?? [promptConfig.id],
						user_id: session.userId,
						trace_id: getTraceContext()?.traceId,
						extra: { org_id: orgId, ...(targetId ? { target_id: targetId } : {}), ...requestyExtra },
					};

					for (let attempt = 0; attempt < 2; attempt++) {
						const attemptSystemPrompt =
							attempt === 0
								? baseSystemPrompt
								: `${baseSystemPrompt}\n\nYour previous response was not valid JSON matching the required shape. Output ONLY the JSON object this time.`;

						let outputText = "";
						const tokenStream = streamText({
							model,
							systemPrompt: attemptSystemPrompt,
							userPrompt,
							requestyMetadata,
						});

						for await (const item of tokenStream) {
							if (item.type === "chunk") {
								outputText += item.text;
							} else if (item.type === "done") {
								// Both attempts are billed by the provider, so accumulate rather
								// than overwrite — otherwise a retry under-reports usage/cost.
								promptTokens += item.usage.promptTokens;
								completionTokens += item.usage.completionTokens;
								totalTokens += item.usage.totalTokens;
								costUsd += item.usage.cost ?? 0;
							}
						}

						try {
							const json = JSON.parse(stripCodeFences(outputText));
							const result = schema.safeParse(json);
							if (result.success) {
								parsed = result.data;
								success = true;
								return;
							}
							lastError = result.error.message;
						} catch (err) {
							lastError = err instanceof Error ? err.message : "AI response was not valid JSON";
						}
					}
				},
				{
					description: `Generate structured AI output for ${promptConfig.id}`,
					data: { orgId, targetId, model },
					onSuccess: () => ({ data: { totalTokens, costUsd } }),
				}
			);
		}

		if (success && parsed && cacheKey && !cacheHit) {
			try {
				const redis = getRedis();
				await redis.set(cacheKey, JSON.stringify(parsed), "EX", cacheTtlSeconds);
			} catch {
				// Cache write failure is non-fatal — the result is still returned below.
			}
		}
	} finally {
		const costCents = costUsd * 100;
		emitEvent({
			event_type: "ai.request_completed",
			actor_id: session.userId,
			target_id: targetId ?? "",
			org_id: orgId,
			metadata: {
				feature: promptConfig.id,
				model,
				input_tokens: promptTokens,
				output_tokens: completionTokens,
				total_tokens: totalTokens,
				cost_cents: costCents,
				success,
				cache_hit: cacheHit,
				...(parsed && buildClickhouseMetadata ? buildClickhouseMetadata(parsed) : {}),
			},
		});
	}

	if (!success || !parsed) {
		return { ok: false, error: lastError ?? "AI did not return a valid response" };
	}
	return { ok: true, data: parsed };
}
