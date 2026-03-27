import { getTaskById, getMergedTaskActivity } from "@repo/database";
import { streamText, MISTRAL_MODELS } from "@repo/ai-mistral";
import { isCloud } from "@repo/edition";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { errorResponse } from "../../../../../responses";
import { extractPlainText } from "../../../../../lib/ai/extract-plain-text";
import { buildTimelineLine } from "../../../../../lib/ai/format-timeline";

export const summarizeTaskRoute = new Hono<AppEnv>();

const requestSchema = z.object({
  taskId: z.string().min(1),
  orgId: z.string().min(1),
});

const SYSTEM_PROMPT = `You are a project management assistant embedded in a task view. Write a 3-4 sentence plain-English summary of what this task is and where it currently stands.

Rules:
- Lead with what the task is trying to achieve, not how it's being implemented
- Only mention status, blockers, or key decisions if they materially change what a reader needs to know
- Ignore Git commits, branch events, PR numbers, and label/assignee changes — these are noise un less deemed highly relevant with context
- Do not list steps taken or implementation details
- Do not use bullet points, headers, or markdown formatting other than bold for critical terms
- Write as if leaving a few-line sticky note for a colleague who has never seen this task`;

/** Maximum number of timeline items to include in the prompt. */
const MAX_TIMELINE_ITEMS = 50;

summarizeTaskRoute.post("/", async (c) => {
  const session = c.get("session");
  if (!session?.userId) {
    return c.json(errorResponse("Unauthorized"), 401);
  }

  if (!isCloud()) {
    return c.json(
      errorResponse("AI features are only available on Sayr Cloud"),
      403,
    );
  }

  const recordWideError = c.get("recordWideError");

  let body: z.infer<typeof requestSchema>;
  try {
    const raw = await c.req.json();
    body = requestSchema.parse(raw);
  } catch {
    return c.json(errorResponse("Invalid request body"), 400);
  }

  const { taskId, orgId } = body;

  const isAuthorized = await traceOrgPermissionCheck(
    session.userId,
    orgId,
    "members",
  );
  if (!isAuthorized) {
    return c.json(errorResponse("Permission denied"), 403);
  }

  let task: Awaited<ReturnType<typeof getTaskById>>;
  let activity: Awaited<ReturnType<typeof getMergedTaskActivity>>;

  try {
    [task, activity] = await Promise.all([
      getTaskById(orgId, taskId),
      getMergedTaskActivity(orgId, taskId, false),
    ]);
  } catch (err) {
    await recordWideError({
      name: "ai.summarize-task.fetch-failed",
      error: err,
      code: "AI_SUMMARIZE_TASK_FETCH_FAILED",
      message: "Failed to fetch task data for AI summary",
      contextData: { taskId, orgId },
    });
    return c.json(errorResponse("Failed to load task data"), 500);
  }

  if (!task) {
    return c.json(errorResponse("Task not found"), 404);
  }

  const descriptionText = task.description
    ? extractPlainText(task.description)
    : "No description provided.";

  // Build lookup maps from data already on the task — no extra DB queries.
  const labelMap = new Map<string, string>(
    (task.labels ?? []).map((l) => [l.id, l.name]),
  );
  const assigneeMap = new Map<string, string>(
    (task.assignees ?? []).map((a) => [
      a.id,
      a.displayName ?? a.name ?? "Unknown",
    ]),
  );

  const timelineText =
    activity
      ?.slice(0, MAX_TIMELINE_ITEMS)
      .map((item) => buildTimelineLine(item, labelMap, assigneeMap))
      .filter(Boolean)
      .join("\n") ?? "";

  const userPrompt = buildUserPrompt(task, descriptionText, timelineText);
  const tokenStream = streamText({
    model: MISTRAL_MODELS.MEDIUM,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  });

  const responseBody = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        // Emit the exact prompts first so clients can display/debug what was sent.
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "prompt", systemPrompt: SYSTEM_PROMPT, userPrompt })}\n\n`,
          ),
        );

        for await (const chunk of tokenStream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        await recordWideError({
          name: "ai.summarize-task.stream-failed",
          error: err,
          code: "AI_SUMMARIZE_TASK_STREAM_FAILED",
          message: "Error during AI summary stream",
          contextData: { taskId, orgId },
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`,
          ),
        );
      } finally {
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
});

function buildUserPrompt(
  task: NonNullable<Awaited<ReturnType<typeof getTaskById>>>,
  descriptionText: string,
  timelineText: string,
): string {
  const lines = [
    `Title: ${task.title}`,
    `Status: ${task.status ?? "unknown"}`,
    `Priority: ${task.priority ?? "none"}`,
    `Description:\n${descriptionText}`,
  ];

  if (timelineText.trim()) {
    lines.push(`Timeline:\n${timelineText}`);
  }

  return lines.join("\n\n");
}
