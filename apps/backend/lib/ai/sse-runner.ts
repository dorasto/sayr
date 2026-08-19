import { streamText, type RequestyMetadata, type RequestyModelId } from "@repo/ai";
import type { PromptConfig } from "@repo/ai-prompts";
import { createTraceAsync, getTraceContext } from "@repo/opentelemetry/trace";
import { getRedis } from "@repo/queue";
import { emitEvent } from "../../clickhouse";

export interface RunAiSseFeatureOptions {
	promptConfig: PromptConfig;
	systemPrompt: string;
	userPrompt: string;
	model: RequestyModelId;
	session: { userId: string };
	orgId: string;
	targetId?: string;
	tags?: string[];
	requestyExtra?: RequestyMetadata["extra"];
	/** When provided, enables a Redis cache check before generating and a cache write on success. */
	cacheKey?: string;
	cacheTtlSeconds?: number;
	forceRefresh?: boolean;
	/** Extra fields to persist on the ClickHouse `ai.request_completed` event, given the final output text. */
	buildClickhouseMetadata?: (outputText: string) => Record<string, unknown>;
	/** Called once with the final output text after a successful (non-cached) generation — e.g. to persist it. */
	onSuccess?: (outputText: string) => Promise<void> | void;
	/**
	 * Optional — build one extra SSE event sent right before `[DONE]`, given
	 * the final joined output text. Useful when the client needs a
	 * server-derived transform of the raw text (e.g. release-notes converting
	 * streamed markdown into ProseKit `NodeJSON` via `markdownToProsekitJSON`
	 * before handing it to the editor) rather than the raw text itself.
	 */
	buildFinalEvent?: (outputText: string) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

const CACHE_CHUNK_SIZE = 80;

/**
 * Runs a streaming AI feature and returns an SSE `Response`.
 *
 * Wire protocol (matches `summarize-task.ts`'s existing client parser in
 * `apps/start/src/lib/fetches/ai.ts`, generalised as `streamAiSse`):
 *   - `data: {"type":"prompt", systemPrompt, userPrompt}` — sent once, for debug display
 *   - `data: {"chunk": "..."}` — repeated for each streamed token
 *   - `data: {"error": "..."}` — sent on failure, terminates the stream
 *   - `data: [DONE]` — terminal sentinel
 *
 * Encapsulates the pieces shared by every streaming AI feature: optional
 * Redis cache replay, `traceAsync` + Requesty request metadata, the
 * `streamText()` consumption loop, and the ClickHouse `ai.request_completed`
 * analytics event. Feature-specific concerns (fetching source data, building
 * the prompt, persisting the result) stay in the calling route via
 * `onSuccess`.
 */
export function runAiSseFeature(opts: RunAiSseFeatureOptions): Response {
	const {
		promptConfig,
		systemPrompt,
		userPrompt,
		model,
		session,
		orgId,
		targetId,
		tags,
		requestyExtra,
		cacheKey,
		cacheTtlSeconds = 60 * 60 * 24 * 7,
		forceRefresh,
		buildClickhouseMetadata,
		onSuccess,
		buildFinalEvent,
	} = opts;

	const traceAsync = createTraceAsync();

	const responseBody = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			const sendDone = () => controller.enqueue(encoder.encode("data: [DONE]\n\n"));

			send({ type: "prompt", systemPrompt, userPrompt });

			// Optional cache replay — no Requesty call, no billing/analytics event.
			if (cacheKey && !forceRefresh) {
				try {
					const redis = getRedis();
					const cached = await redis.get(cacheKey);
					if (cached) {
						for (let i = 0; i < cached.length; i += CACHE_CHUNK_SIZE) {
							send({ chunk: cached.slice(i, i + CACHE_CHUNK_SIZE) });
						}
						if (buildFinalEvent) {
							send(await buildFinalEvent(cached));
						}
						sendDone();
						controller.close();
						return;
					}
				} catch {
					// Redis unavailable — fall through to a live generation.
				}
			}

			let outputText = "";
			let streamError = false;
			let promptTokens = 0;
			let completionTokens = 0;
			let totalTokens = 0;
			let costUsd = 0;

			try {
				await traceAsync(
					`ai.${promptConfig.id}.generate`,
					async () => {
						const requestyMetadata: RequestyMetadata = {
							tags: tags ?? [promptConfig.id],
							user_id: session.userId,
							trace_id: getTraceContext()?.traceId,
							extra: { org_id: orgId, ...(targetId ? { target_id: targetId } : {}), ...requestyExtra },
						};

						const tokenStream = streamText({ model, systemPrompt, userPrompt, requestyMetadata });

						for await (const item of tokenStream) {
							if (item.type === "chunk") {
								outputText += item.text;
								send({ chunk: item.text });
							} else if (item.type === "done") {
								promptTokens = item.usage.promptTokens;
								completionTokens = item.usage.completionTokens;
								totalTokens = item.usage.totalTokens;
								costUsd = item.usage.cost ?? 0;
							}
						}
					},
					{
						description: `Stream AI output for ${promptConfig.id}`,
						data: { orgId, targetId, model },
						onSuccess: () => ({ data: { totalTokens, costUsd } }),
					}
				);

				if (buildFinalEvent && outputText) {
					send(await buildFinalEvent(outputText));
				}
				sendDone();
			} catch (err) {
				streamError = true;
				send({ error: err instanceof Error ? err.message : "Stream failed" });
			} finally {
				if (!streamError && outputText) {
					if (cacheKey) {
						try {
							const redis = getRedis();
							await redis.set(cacheKey, outputText, "EX", cacheTtlSeconds);
						} catch {
							// Cache write failure is non-fatal — the content was already streamed.
						}
					}
					try {
						await onSuccess?.(outputText);
					} catch {
						// A post-success side effect failing should not surface as a stream error —
						// the content already reached the client successfully.
					}
				}

				const costCents = costUsd * 100;
				await new Promise<void>((resolve) => {
					try {
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
								success: !streamError,
								output_text_length: outputText.length,
								...(buildClickhouseMetadata ? buildClickhouseMetadata(outputText) : {}),
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
}
