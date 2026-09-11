import { releaseNotesPrompt } from "@repo/ai-prompts";
import { db, getReleaseWithTasks } from "@repo/database";
import { extractPlainText, formatTaskKey } from "@repo/util";
import { and, eq, inArray } from "drizzle-orm";
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
 * Selects the GitHub PR/issue URLs to fetch and fold into the prompt as
 * extra context — one per task, in task order, capped at `maxCount`.
 * Mirrors `selectUrlsForFetch` in `summarize-task.ts`, but the source here is
 * each task's linked `githubIssue` row rather than URLs found in free text.
 */
async function selectGithubUrlsForFetch(
	orgId: string,
	tasks: NonNullable<Awaited<ReturnType<typeof getReleaseWithTasks>>>["tasks"],
	maxCount: number
): Promise<{ taskId: string; url: string }[]> {
	if (tasks.length === 0) return [];

	const links = await db.query.githubIssue.findMany({
		where: (gi) =>
			and(
				eq(gi.organizationId, orgId),
				inArray(
					gi.taskId,
					tasks.map((t) => t.id)
				)
			),
		columns: { taskId: true, issueUrl: true },
	});
	const urlByTaskId = new Map(links.map((l) => [l.taskId, l.issueUrl]));

	const selected: { taskId: string; url: string }[] = [];
	for (const task of tasks) {
		if (selected.length >= maxCount) break;
		const url = urlByTaskId.get(task.id);
		if (url) selected.push({ taskId: task.id, url });
	}
	return selected;
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

	// ---------------------------------------------------------------------------
	// URL fetch capability gate — same pattern as summarize-task.ts. Active when
	// the prompt declares the capability and the org has the global "Enable URL
	// fetching" setting on. Source here is each task's linked GitHub PR/issue
	// (rather than URLs found in free text) so release notes can actually read
	// what shipped, not just the task title.
	// ---------------------------------------------------------------------------
	const useUrlFetch = releaseNotesPrompt.capabilities.urlFetch && access.aiStatus.urlFetchEnabled;
	const maxUrlFetchCount = releaseNotesPrompt.maxUrlFetchCount ?? 3;

	const githubLinks = useUrlFetch ? await selectGithubUrlsForFetch(orgId, release.tasks, maxUrlFetchCount) : [];

	const taskById = new Map(release.tasks.map((t) => [t.id, t]));
	let extraContext: string | undefined;
	if (githubLinks.length > 0) {
		const fetched = await Promise.all(githubLinks.map((link) => fetchUrlAsText(link.url)));
		const sections = fetched
			.map((text, i) => {
				if (!text) return null;
				const link = githubLinks[i];
				if (!link) return null;
				const task = taskById.get(link.taskId);
				const label = task ? formatTaskKey(access.org.shortId, task.shortId) : link.url;
				return `[${label}] ${link.url}\n${text}`;
			})
			.filter((s): s is string => s !== null);
		if (sections.length > 0) {
			extraContext = sections.join("\n\n");
		}
	}

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
			url_fetch_used: Boolean(extraContext),
			url_count: githubLinks.length,
		}),
		// Convert the streamed markdown into ProseKit NodeJSON server-side so
		// the client can drop it straight into the release description editor
		// without needing its own markdown parser.
		buildFinalEvent: (outputText) => ({ type: "content", content: markdownToProsekitJSON(outputText) }),
	});
});
