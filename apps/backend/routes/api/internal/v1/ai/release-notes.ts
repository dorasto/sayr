import { releaseNotesPrompt } from "@repo/ai-prompts";
import { getReleaseWithTasks } from "@repo/database";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import { checkAiFeatureAccess } from "../../../../../lib/ai/gate";
import { buildEffectiveSystemPrompt, resolveActiveModel } from "../../../../../lib/ai/model";
import { runAiSseFeature } from "../../../../../lib/ai/sse-runner";
import { errorResponse } from "../../../../../responses";

export const releaseNotesRoute = new Hono<AppEnv>();

const requestSchema = z.object({
	releaseId: z.string().min(1),
	orgId: z.string().min(1),
});

function buildUserPrompt(release: NonNullable<Awaited<ReturnType<typeof getReleaseWithTasks>>>): string {
	const taskLines = release.tasks.map((t) => `- [${t.status ?? "unknown"}] ${t.title}`);

	return [
		`Release: ${release.name}`,
		taskLines.length > 0 ? `Tasks:\n${taskLines.join("\n")}` : "This release has no linked tasks.",
	].join("\n\n");
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

	const userPrompt = buildUserPrompt(release);
	const model = resolveActiveModel(releaseNotesPrompt, access.org.settings);
	const systemPrompt = buildEffectiveSystemPrompt(releaseNotesPrompt, access.org.settings);

	return runAiSseFeature({
		promptConfig: releaseNotesPrompt,
		systemPrompt,
		userPrompt,
		model,
		session: { userId: session.userId },
		orgId,
		targetId: releaseId,
		buildClickhouseMetadata: () => ({ task_count: release.tasks.length }),
		// Convert the streamed markdown into ProseKit NodeJSON server-side so
		// the client can drop it straight into the release description editor
		// without needing its own markdown parser.
		buildFinalEvent: (outputText) => ({ type: "content", content: markdownToProsekitJSON(outputText) }),
	});
});
