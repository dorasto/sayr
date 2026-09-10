import { Octokit } from "@octokit/rest";
import { db, schema } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import type { JobGroups } from "@repo/queue";
import { formatTaskKey } from "@repo/util";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, eq } from "drizzle-orm";
import { findLinkedSayrUser } from "./comment";
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

/**
 * Inbound sync: a brand-new GitHub issue was opened with no Sayr keyword
 * referencing an existing task (that case is handled separately by
 * `sayr_keyword_parse` / `handleLinkKeyword`) — create a new task for it and
 * link the two, mirroring the outbound task→issue creation this pipeline
 * already does in reverse.
 *
 * Uses `skipGithubSync: true` on the internal create call, same reasoning as
 * `handleIssueEdited`: without it, creating the task would immediately try
 * to open a *second*, duplicate GitHub issue for it.
 */
export async function handleIssueOpened(job: JobGroups["github"] & { type: "issue_opened" }) {
	const traceAsync = createTraceAsync();
	const { organizationId, categoryId, repoId, repo_private, owner, repo, number, title, body, userId } = job.payload;

	if (!organizationId) return;
	if (repo_private) return;

	await traceAsync(
		"github.issue_opened.process",
		async () => {
			// Attribute the task to the issue's author if they've linked their
			// GitHub account to Sayr; otherwise fall back to a text note, the
			// same shape as the comment-sync bot fallback — `task` has no
			// `externalAuthorLogin`-style columns the way `taskComment` does.
			const linkedUserId = await findLinkedSayrUser(userId);
			const markdown = linkedUserId ? body : `_Originally opened by @${job.payload.user} on GitHub_\n\n${body}`;
			const description = markdownToProsekitJSON(markdown);

			const res = await fetch(`${API_URL}/v1/admin/organization/task/create`, {
				method: "POST",
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
					title,
					description,
					category: categoryId ?? undefined,
					visible: "public",
					status: "backlog",
					skipGithubSync: true,
					createdBy: linkedUserId,
				}),
			});

			if (!res.ok) {
				console.error(`❌ Failed to create Sayr task for GitHub issue #${number}: ${res.statusText}`);
				return;
			}

			const created = (await res.json()) as { success: boolean; data?: { id: string; shortId: number } };
			if (!created.success || !created.data?.id) {
				console.error(`❌ Task creation for GitHub issue #${number} returned no task id.`);
				return;
			}

			const linkRes = await fetch(`${API_URL}/v1/admin/organization/task/github-link`, {
				method: "POST",
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
					task_id: created.data.id,
					repo_id: repoId,
					issue_number: number,
					issue_url: `https://github.com/${owner}/${repo}/issues/${number}`,
				}),
			});

			if (!linkRes.ok) {
				console.error(
					`❌ Created task ${created.data.id} for GitHub issue #${number} but failed to link it: ${linkRes.statusText}`
				);
				return;
			}

			console.log(`✅ Created Sayr task ${created.data.id} from GitHub issue #${number}.`);

			// Announce the new task back on the issue, mirroring the ack comment
			// keyword-triggered actions already post (postGithubComment). Never
			// fatal — the task's already created and linked either way.
			try {
				const org = await db.query.organization.findFirst({
					where: eq(schema.organization.id, organizationId),
				});
				if (org) {
					const sayrTaskUrl = `https://${org.slug}.${process.env.VITE_ROOT_DOMAIN}/${created.data.shortId}`;
					const taskKey = formatTaskKey(org.shortId, created.data.shortId);
					const token = await getInstallationToken(job.payload.installationId);
					const octokit = new Octokit({ auth: token });

					await octokit.issues.createComment({
						owner,
						repo,
						issue_number: number,
						body: `✅ Created Sayr task **${taskKey}**: ${sayrTaskUrl}`,
					});
				}
			} catch (err) {
				console.error(`❌ Failed to post task-created acknowledgment on GitHub issue #${number}:`, err);
			}
		},
		{
			description: "Creating a Sayr task from a newly opened GitHub issue",
			data: { organizationId, repoId, number },
		}
	);
}
