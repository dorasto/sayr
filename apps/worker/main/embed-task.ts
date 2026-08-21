import { embedText } from "@repo/ai";
import { getTaskById, updateTaskEmbedding } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import type { JobGroups } from "@repo/queue";
import { extractPlainText } from "@repo/util";

/**
 * Generates and persists a task's semantic-search embedding. Enqueued from
 * the task create/update routes (apps/backend/routes/api/internal/v1/task.ts)
 * whenever title/description actually changed — see the same diffing logic
 * already used there for the ClickHouse task.updated event.
 *
 * No-ops quietly if the task no longer exists (e.g. deleted between enqueue
 * and processing), has no meaningful text to embed, or if this edition
 * doesn't have semantic search enabled (defense-in-depth — the enqueue call
 * sites already gate on this; this covers stale queued jobs left over from
 * before an edition change, or a future enqueue site that forgets to check).
 */
export async function embedTaskWorker(job: JobGroups["main"] & { type: "embed_task" }) {
	if (!getEditionCapabilities().semanticSearchEnabled) return;

	const { orgId, taskId } = job.payload;
	const traceAsync = createTraceAsync();

	const task = await getTaskById(orgId, taskId);
	if (!task) return;

	const descriptionText = task.description ? extractPlainText(task.description) : "";
	const text = [task.title, descriptionText].filter(Boolean).join("\n\n").trim();
	if (!text) return;

	const embedding = await traceAsync("embed_task.generate", () => embedText(text), {
		description: "Generate a task's semantic-search embedding",
		data: { orgId, taskId },
	});

	await updateTaskEmbedding(orgId, taskId, embedding);
}
