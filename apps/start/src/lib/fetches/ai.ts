const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

export interface AiPromptDebugInfo {
	systemPrompt: string;
	userPrompt: string;
	urlFetchEnabled?: boolean;
	urlCount?: number;
}

export interface CitationItem {
	title: string;
	url: string | null;
	favicon: string | null;
}

export type TaskSummaryStatus =
	| { hasCachedSummary: false }
	| {
			hasCachedSummary: true;
			isStale: boolean;
			summary: string | null;
			generatedAt: string;
	  };

/**
 * Fetches the cached AI summary status for a task without triggering generation.
 * Returns whether a cached summary exists, whether it is stale, and the text if fresh.
 */
export async function fetchTaskSummaryStatus(taskId: string, orgId: string): Promise<TaskSummaryStatus> {
	const params = new URLSearchParams({ taskId, orgId });
	try {
		const res = await fetch(`${API_URL}/v1/ai/task-summary-status?${params}`, {
			credentials: "include",
		});
		if (!res.ok) {
			return { hasCachedSummary: false };
		}
		return res.json() as Promise<TaskSummaryStatus>;
	} catch {
		return { hasCachedSummary: false };
	}
}

/** One parsed SSE `data:` line from any of this file's AI streaming endpoints. */
export interface AiSseEvent {
	type?: string;
	systemPrompt?: string;
	userPrompt?: string;
	urlFetchEnabled?: boolean;
	urlCount?: number;
	chunk?: string;
	items?: CitationItem[];
	error?: string;
	[key: string]: unknown;
}

/**
 * Streams an SSE response from one of this file's `/v1/ai/*` endpoints and
 * dispatches each parsed event to `onEvent`. Shared by every streaming AI
 * feature route built on the backend's `runAiSseFeature` (see
 * `apps/backend/lib/ai/sse-runner.ts`) — they all share the same wire
 * protocol (`{type:"prompt",...}`, `{chunk}`, `{error}`, `[DONE]`), so this
 * is the one place that protocol is parsed.
 */
export async function streamAiSse(
	url: string,
	body: Record<string, unknown>,
	onEvent: (event: AiSseEvent) => void,
	onDone: () => void,
	onError: (error: string) => void
): Promise<void> {
	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
	} catch {
		onError("Network error — could not reach the server.");
		return;
	}

	// Non-streaming error responses (401, 403, 404, 500) return JSON
	if (!res.ok) {
		try {
			const json = (await res.json()) as { error?: string };
			onError(json.error ?? "Request failed.");
		} catch {
			onError(`Request failed with status ${res.status}.`);
		}
		return;
	}

	if (!res.body) {
		onError("No response body received.");
		return;
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			let done: boolean;
			let value: Uint8Array | undefined;
			try {
				({ done, value } = await reader.read());
			} catch (readErr) {
				onError(readErr instanceof Error ? readErr.message : "Stream read error");
				return;
			}
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// SSE lines are separated by \n\n
			const lines = buffer.split("\n\n");
			// Keep the last (potentially incomplete) segment in the buffer
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data: ")) continue;

				const data = trimmed.slice(6); // strip "data: "
				if (data === "[DONE]") {
					onDone();
					return;
				}

				try {
					const parsed = JSON.parse(data) as AiSseEvent;
					if (parsed.error) {
						onError(parsed.error);
						return;
					}
					onEvent(parsed);
				} catch {
					// Malformed SSE line — skip it
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	// Stream ended without [DONE] — still call onDone
	onDone();
}

/**
 * Streams an AI-generated summary for a task.
 *
 * Callbacks:
 * - `onPrompt`     — called once with the exact prompts sent to Mistral (for debugging)
 * - `onChunk`      — called for each streamed token
 * - `onCitations`  — called once with the list of web search citations (may be empty)
 * - `onDone`       — called when the stream completes
 * - `onError`      — called on any failure
 */
export async function streamSummarizeTask(
	taskId: string,
	orgId: string,
	onPrompt: (info: AiPromptDebugInfo) => void,
	onChunk: (chunk: string) => void,
	onCitations: (items: CitationItem[]) => void,
	onDone: () => void,
	onError: (error: string) => void,
	forceRefresh = false
): Promise<void> {
	return streamAiSse(
		`${API_URL}/v1/ai/summarize-task`,
		{ taskId, orgId, forceRefresh },
		(event) => {
			if (event.type === "prompt" && event.systemPrompt && event.userPrompt) {
				onPrompt({
					systemPrompt: event.systemPrompt,
					userPrompt: event.userPrompt,
					urlFetchEnabled: event.urlFetchEnabled,
					urlCount: event.urlCount,
				});
				return;
			}
			if (event.type === "citations" && Array.isArray(event.items)) {
				onCitations(event.items);
				return;
			}
			if (event.chunk) {
				onChunk(event.chunk);
			}
		},
		onDone,
		onError
	);
}

export interface RecommendedRelation {
	taskId: string;
	type: "related" | "blocking" | "duplicate";
	title: string;
	shortId: number | null;
}

/**
 * A suggested status change, derived from linked GitHub activity rather than
 * the model — see `computeStatusSuggestion` in the backend route. `reason`
 * is a ready-to-display timeline-style sentence (e.g. "Jane linked branch
 * feature/foo" or "Linked PR #42 was merged").
 */
export interface RecommendedStatus {
	value: "in-progress" | "done";
	reason: string;
}

export interface RecommendationsResult {
	labelIds: string[];
	assigneeIds: string[];
	priority: "low" | "medium" | "high" | "urgent" | null;
	categoryId: string | null;
	releaseId: string | null;
	relations: RecommendedRelation[];
	status: RecommendedStatus | null;
	reasoning?: string;
	/** Echoed back for the admin-only "View prompt" debug affordance — omitted when no AI call was made (e.g. every enabled kind had nothing to offer). */
	systemPrompt?: string;
	userPrompt?: string;
}

/**
 * Requests AI recommendations for a task — labels, assignees, priority,
 * category, release, and task relations, each only ever drawn from this
 * organisation's existing data (the model never invents new labels/etc.),
 * and each independently toggleable in org settings. Results are cached
 * server-side (Redis, content-keyed) so calling this on every task view is
 * cheap — pass `forceRefresh` only for an explicit admin regenerate.
 */
export async function getTaskRecommendations(
	taskId: string,
	orgId: string,
	forceRefresh = false
): Promise<{ success: true; data: RecommendationsResult } | { success: false; error: string }> {
	try {
		const res = await fetch(`${API_URL}/v1/ai/recommendations`, {
			method: "POST",
			body: JSON.stringify({ taskId, orgId, forceRefresh }),
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		const json = (await res.json()) as
			| { success: true; data: RecommendationsResult }
			| { success: false; error: string };
		if (!res.ok || !json.success) {
			return { success: false, error: "error" in json ? json.error : "Request failed." };
		}
		return json;
	} catch {
		return { success: false, error: "Network error — could not reach the server." };
	}
}

/**
 * Streams AI-generated release notes (markdown) for a release. The final
 * event before `[DONE]` carries `{type: "content", content: NodeJSON}` —
 * the streamed markdown already converted server-side into ProseKit
 * `NodeJSON`, ready to drop into the release description editor.
 *
 * Callbacks:
 * - `onChunk`   — called for each streamed markdown token (for live display)
 * - `onContent` — called once with the final NodeJSON document
 * - `onDone`    — called when the stream completes
 * - `onError`   — called on any failure
 */
export async function streamGenerateReleaseNotes(
	releaseId: string,
	orgId: string,
	onChunk: (chunk: string) => void,
	onContent: (content: unknown) => void,
	onDone: () => void,
	onError: (error: string) => void
): Promise<void> {
	return streamAiSse(
		`${API_URL}/v1/ai/release-notes`,
		{ releaseId, orgId },
		(event) => {
			if (event.type === "content" && "content" in event) {
				onContent(event.content);
				return;
			}
			if (event.chunk) {
				onChunk(event.chunk);
			}
		},
		onDone,
		onError
	);
}
