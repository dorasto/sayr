import { db, schema } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import type { JobGroups } from "@repo/queue";
import { and, eq } from "drizzle-orm";
import { markdownToProsekitJSON } from "./markdownToProsekit";

const API_URL =
	process.env.APP_ENV === "development" ? "http://localhost:5468/api/internal" : "http://backend:5468/api/internal";

/**
 * Inbound sync: a GitHub issue body/title was edited, push the change into
 * the linked Sayr task's title/description — but only when that task is
 * public (private tasks/repos are never touched by this pipeline).
 *
 * Uses `skipGithubSync: true` on the internal update call so this
 * inbound-triggered save doesn't immediately queue a redundant outbound
 * push back to GitHub from the description-sync cron sweep.
 */
export async function handleIssueEdited(job: JobGroups["github"] & { type: "issue_edited" }) {
	const traceAsync = createTraceAsync();
	const { organizationId, repoId, repo_private, number, title, body } = job.payload;

	if (!organizationId) return;
	// Repo-level privacy is already known from the webhook payload — but the
	// authoritative check happens live via the GitHub API in the cron sweep;
	// here we can fast-skip on the payload's own flag to avoid unnecessary work.
	if (repo_private) return;

	await traceAsync(
		"github.issue_edited.process",
		async () => {
			const repository = await db.query.githubRepository.findFirst({
				where: eq(schema.githubRepository.repoId, repoId),
			});

			if (!repository) return;

			const issue = await db.query.githubIssue.findFirst({
				where: (t) =>
					and(eq(t.organizationId, organizationId), eq(t.repositoryId, repository.id), eq(t.issueNumber, number)),
				with: { task: true },
			});

			if (!issue?.task) return;
			if (issue.task.visible !== "public") return;

			const description = markdownToProsekitJSON(body);

			const res = await fetch(`${API_URL}/v1/admin/organization/task/update`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
					"user-agent": "Sayr-Worker/1.0",
					"x-internal-secret": process.env.INTERNAL_SECRET!,
					"x-internal-service": "sayr-worker",
					"x-internal-timestamp": new Date().toISOString(),
				},
				body: JSON.stringify({
					org_id: organizationId,
					task_id: issue.task.id,
					title,
					description,
					skipGithubSync: true,
				}),
			});

			if (!res.ok) {
				console.error(
					`❌ Failed to sync edited GitHub issue #${number} into task ${issue.task.id}: ${res.statusText}`
				);
				return;
			}

			// Bump `updatedAt` so the description-sync cron sweep (which compares
			// `task.updatedAt > githubIssue.updatedAt`) doesn't treat this
			// inbound-applied change as "task changed since last GitHub sync"
			// and immediately push the same content straight back out.
			await db.update(schema.githubIssue).set({ updatedAt: new Date() }).where(eq(schema.githubIssue.id, issue.id));

			console.log(`✅ Synced edited GitHub issue #${number} into task ${issue.task.id}.`);
		},
		{
			description: "Syncing edited GitHub issue title/body into the linked Sayr task",
			data: { organizationId, repoId, number },
		}
	);
}
