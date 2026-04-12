const API_URL =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

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
export async function fetchTaskSummaryStatus(
  taskId: string,
  orgId: string,
): Promise<TaskSummaryStatus> {
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
  forceRefresh = false,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/ai/summarize-task`, {
      method: "POST",
      body: JSON.stringify({ taskId, orgId, forceRefresh }),
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
      const { done, value } = await reader.read();
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
          const parsed = JSON.parse(data) as {
            type?: string;
            systemPrompt?: string;
            userPrompt?: string;
            urlFetchEnabled?: boolean;
            urlCount?: number;
            chunk?: string;
            items?: CitationItem[];
            error?: string;
          };

          if (
            parsed.type === "prompt" &&
            parsed.systemPrompt &&
            parsed.userPrompt
          ) {
            onPrompt({
              systemPrompt: parsed.systemPrompt,
              userPrompt: parsed.userPrompt,
              urlFetchEnabled: parsed.urlFetchEnabled,
              urlCount: parsed.urlCount,
            });
            continue;
          }
          if (parsed.type === "citations" && Array.isArray(parsed.items)) {
            onCitations(parsed.items);
            continue;
          }
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.chunk) {
            onChunk(parsed.chunk);
          }
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
