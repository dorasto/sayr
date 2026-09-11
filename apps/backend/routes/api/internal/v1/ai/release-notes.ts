import { releaseNotesPrompt } from "@repo/ai-prompts";
import { db, getReleaseWithTasks } from "@repo/database";
import { extractPlainText, formatTaskKey } from "@repo/util";
import { and, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import { fetchUrlAsText } from "../../../../../lib/ai/fetch-url-text";
import { checkAiFeatureAccess } from "../../../../../lib/ai/gate";
import { buildEffectiveSystemPrompt, resolveActiveModel } from "../../../../../lib/ai/model";
import { runAiSseFeature } from "../../../../../lib/ai/sse-runner";
import { errorResponse } from "../../../../../responses";

export const releaseNotesRoute = new Hono<AppEnv>();

const requestSchema = z.object({
	releaseId: z.string().min(1),
	orgId: z.string().min(1),
});

/**
 * Max chars of a task's description folded into the prompt per task — high
 * enough that the vast majority of real descriptions are included in full
 * ("actually read the task"), while still bounding the pathological case of
 * a release bundling many tasks with very long descriptions.
 */
const MAX_TASK_DESCRIPTION_LENGTH = 2_000;

function buildUserPrompt(
	release: NonNullable<Awaited<ReturnType<typeof getReleaseWithTasks>>>,
	orgShortId: string,
	categoryNamesById: Map<string, string>
): string {
	const taskLines = release.tasks.map((t) => {
		const parts = [formatTaskKey(orgShortId, t.shortId), `[${t.status ?? "unknown"}]`, t.title];
		if (t.priority && t.priority !== "none") parts.push(`(priority: ${t.priority})`);
		const categoryName = t.category ? categoryNamesById.get(t.category) : undefined;
		if (categoryName) parts.push(`(category: ${categoryName})`);
		const descriptionText = t.description
			? extractPlainText(t.description).slice(0, MAX_TASK_DESCRIPTION_LENGTH)
			: "";
		const line = `- ${parts.join(" ")}`;
		return descriptionText ? `${line}\n  ${descriptionText}` : line;
	});

	return [
		`Release: ${release.name}`,
		taskLines.length > 0 ? `Tasks:\n${taskLines.join("\n")}` : "This release has no linked tasks.",
	].join("\n\n");
}

/**
 * Selects the GitHub issue URLs to fetch and fold into the prompt as extra
 * context — one per task, in task order, capped at `maxCount`. Mirrors
 * `selectUrlsForFetch` in `summarize-task.ts`, but the source here is each
 * task's linked `githubIssue` row rather than URLs found in free text.
 *
 * `excludeTaskIds` skips tasks already covered by `getLocalPullRequestContext`
 * below — a task with a linked PR already has richer, free (no-fetch) local
 * content, so there's no reason to also spend fetch budget on its issue link.
 */
async function selectGithubUrlsForFetch(
	orgId: string,
	tasks: NonNullable<Awaited<ReturnType<typeof getReleaseWithTasks>>>["tasks"],
	maxCount: number,
	excludeTaskIds: Set<string>
): Promise<{ taskId: string; url: string }[]> {
	const candidates = tasks.filter((t) => !excludeTaskIds.has(t.id));
	if (candidates.length === 0 || maxCount <= 0) return [];

	const links = await db.query.githubIssue.findMany({
		where: (gi) =>
			and(
				eq(gi.organizationId, orgId),
				inArray(
					gi.taskId,
					candidates.map((t) => t.id)
				)
			),
		columns: { taskId: true, issueUrl: true },
	});
	const urlByTaskId = new Map(links.map((l) => [l.taskId, l.issueUrl]));

	const selected: { taskId: string; url: string }[] = [];
	for (const task of candidates) {
		if (selected.length >= maxCount) break;
		const url = urlByTaskId.get(task.id);
		if (url) selected.push({ taskId: task.id, url });
	}
	return selected;
}

/** Max chars of a PR body folded into the prompt — same bound as task descriptions. */
const MAX_PR_BODY_LENGTH = MAX_TASK_DESCRIPTION_LENGTH;

/**
 * Gathers GitHub pull request content that's already stored locally in
 * `githubPullRequest` — both PRs linked directly to this release via its
 * `releaseId` column (the schema's purpose-built release<->PR link; see the
 * PR-linking endpoints in `release.ts`) and PRs linked to one of the
 * release's tasks. Unlike `selectGithubUrlsForFetch`, this needs no network
 * request: title/body/state/merged are already columns on the row, so it's
 * included regardless of the org's "Enable URL fetching" setting — there's
 * no external fetch, cost, or SSRF surface here to gate.
 */
async function getLocalPullRequestContext(
	orgId: string,
	releaseId: string,
	taskIds: string[],
	orgShortId: string,
	taskById: Map<string, NonNullable<Awaited<ReturnType<typeof getReleaseWithTasks>>>["tasks"][number]>,
	maxCount: number
): Promise<{ taskId: string | null; text: string }[]> {
	if (maxCount <= 0) return [];

	const prs = await db.query.githubPullRequest.findMany({
		where: (pr) => and(eq(pr.organizationId, orgId), or(eq(pr.releaseId, releaseId), inArray(pr.taskId, taskIds))),
		columns: { taskId: true, prNumber: true, prUrl: true, title: true, body: true, state: true, merged: true },
		limit: maxCount,
	});

	return prs.map((pr) => {
		const task = pr.taskId ? taskById.get(pr.taskId) : undefined;
		const label = task ? formatTaskKey(orgShortId, task.shortId) : `PR #${pr.prNumber}`;
		const status = pr.merged ? "merged" : pr.state;
		const bodyText = pr.body ? pr.body.slice(0, MAX_PR_BODY_LENGTH) : "";
		const header = `[${label}] ${pr.prUrl} (${status}) ${pr.title}`;
		return { taskId: pr.taskId, text: bodyText ? `${header}\n${bodyText}` : header };
	});
}

releaseNotesRoute.post("/", async (c) => {
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
	const { releaseId, orgId } = body;

	const access = await checkAiFeatureAccess({ c, session, orgId, promptConfig: releaseNotesPrompt });
	if (!access.ok) return access.response;

	let release: Awaited<ReturnType<typeof getReleaseWithTasks>>;
	try {
		release = await getReleaseWithTasks(releaseId);
	} catch (err) {
		await recordWideError({
			name: "ai.release-notes.fetch-failed",
			error: err,
			code: "AI_RELEASE_NOTES_FETCH_FAILED",
			message: "Failed to fetch release data for AI release notes",
			contextData: { releaseId, orgId },
		});
		return c.json(errorResponse("Failed to load release data"), 500);
	}
	if (!release || release.organizationId !== orgId) {
		return c.json(errorResponse("Release not found"), 404);
	}

	// `release.tasks[].category` is only the raw category id (getReleaseWithTasks
	// doesn't join it) — resolve names separately here rather than widening that
	// shared function's return shape for every other caller.
	const categories = await db.query.category.findMany({
		where: (category) => eq(category.organizationId, orgId),
		columns: { id: true, name: true },
	});
	const categoryNamesById = new Map(categories.map((cat) => [cat.id, cat.name]));

	const userPrompt = buildUserPrompt(release, access.org.shortId, categoryNamesById);
	const systemPrompt = buildEffectiveSystemPrompt(releaseNotesPrompt, access.org.settings);

	const taskById = new Map(release.tasks.map((t) => [t.id, t]));
	const taskIds = release.tasks.map((t) => t.id);
	const maxContextItems = releaseNotesPrompt.maxUrlFetchCount ?? 3;

	// Local PR content first — no network fetch, so not gated behind the org's
	// URL fetch setting (see getLocalPullRequestContext's doc comment). This is
	// the richer source: it covers PRs linked directly to the release, not just
	// ones reachable via a task's githubIssue mirror.
	const localPullRequests = await getLocalPullRequestContext(
		orgId,
		releaseId,
		taskIds,
		access.org.shortId,
		taskById,
		maxContextItems
	);
	const coveredTaskIds = new Set(localPullRequests.map((pr) => pr.taskId).filter((id): id is string => id !== null));

	// ---------------------------------------------------------------------------
	// URL fetch capability gate — same pattern as summarize-task.ts. Active when
	// the prompt declares the capability and the org has the global "Enable URL
	// fetching" setting on. Source here is each task's linked GitHub issue
	// (rather than URLs found in free text) so release notes can read what
	// shipped even for tasks without a directly-linked PR row above.
	// ---------------------------------------------------------------------------
	const useUrlFetch = releaseNotesPrompt.capabilities.urlFetch && access.aiStatus.urlFetchEnabled;
	const remainingBudget = Math.max(0, maxContextItems - localPullRequests.length);

	const githubLinks =
		useUrlFetch && remainingBudget > 0
			? await selectGithubUrlsForFetch(orgId, release.tasks, remainingBudget, coveredTaskIds)
			: [];

	const fetchedSections =
		githubLinks.length > 0
			? (
					await Promise.all(
						githubLinks.map(async (link) => {
							const text = await fetchUrlAsText(link.url);
							if (!text) return null;
							const task = taskById.get(link.taskId);
							const label = task ? formatTaskKey(access.org.shortId, task.shortId) : link.url;
							return `[${label}] ${link.url}\n${text}`;
						})
					)
				).filter((s): s is string => s !== null)
			: [];

	const allSections = [...localPullRequests.map((pr) => pr.text), ...fetchedSections];
	const extraContext = allSections.length > 0 ? allSections.join("\n\n") : undefined;

	const model = resolveActiveModel(releaseNotesPrompt, access.org.settings, {
		preferUrlFetchModel: Boolean(extraContext),
	});

	return runAiSseFeature({
		promptConfig: releaseNotesPrompt,
		systemPrompt,
		userPrompt,
		model,
		session: { userId: session.userId },
		orgId,
		targetId: releaseId,
		extraContext,
		buildClickhouseMetadata: () => ({
			task_count: release.tasks.length,
			url_fetch_used: fetchedSections.length > 0,
			url_count: githubLinks.length,
			local_pr_count: localPullRequests.length,
		}),
		// Convert the streamed markdown into ProseKit NodeJSON server-side so
		// the client can drop it straight into the release description editor
		// without needing its own markdown parser.
		buildFinalEvent: (outputText) => ({ type: "content", content: markdownToProsekitJSON(outputText) }),
	});
});
