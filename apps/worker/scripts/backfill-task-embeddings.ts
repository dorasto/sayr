/**
 * One-off backfill: enqueues an `embed_task` job for every existing task
 * that doesn't have an embedding yet, so semantic search/recommendations
 * work on pre-existing tasks, not just ones created/edited after this
 * feature shipped.
 *
 * Not part of the deploy path — run manually once after the
 * `task.embedding` migration lands:
 *
 *   bun run apps/worker/scripts/backfill-task-embeddings.ts
 *
 * Deliberately just enqueues jobs rather than calling embedText() directly —
 * the already-running "main" worker processes them one at a time via its
 * normal dequeue loop, so this script doesn't need its own rate-limiting or
 * concurrency handling.
 */
import { db, schema } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { enqueue } from "@repo/queue";
import { isNull } from "drizzle-orm";

async function main() {
	if (!getEditionCapabilities().semanticSearchEnabled) {
		console.log("Semantic search isn't enabled on this edition — nothing to backfill.");
		process.exit(0);
	}

	const tasks = await db
		.select({ id: schema.task.id, organizationId: schema.task.organizationId })
		.from(schema.task)
		.where(isNull(schema.task.embedding));

	console.log(`Found ${tasks.length} task(s) without an embedding. Enqueuing...`);

	let enqueued = 0;
	for (const task of tasks) {
		await enqueue("main", { type: "embed_task", payload: { orgId: task.organizationId, taskId: task.id } });
		enqueued++;
		if (enqueued % 100 === 0) {
			console.log(`Enqueued ${enqueued}/${tasks.length}...`);
		}
	}

	console.log(`Done — enqueued ${enqueued} embed_task job(s). The "main" worker will process them in the background.`);
	process.exit(0);
}

main().catch((err) => {
	console.error("Backfill script failed:", err);
	process.exit(1);
});
