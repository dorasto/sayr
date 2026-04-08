import { MISTRAL_MODELS } from "@repo/ai-mistral";
import type { PromptConfig } from "../types.js";

/**
 * Prompt configuration for the AI task summary feature.
 *
 * Generates a concise plain-English summary of a task for display in the
 * task detail view sidebar. Uses mistral-small for cost efficiency, with
 * mistral-medium available when web search is enabled.
 */
export const taskSummaryPrompt: PromptConfig = {
  id: "task-summary",
  description:
    "Generates a concise plain-English summary of a task for display in the task detail view.",
  model: MISTRAL_MODELS.SMALL,
  webSearchModel: MISTRAL_MODELS.SMALL,
  systemPrompt: `You are a project management assistant embedded in a task view. Write a 3-4 sentence plain-English summary of what this task is and where it currently stands.

Rules:
- Lead with what the task is trying to achieve, not how it's being implemented
- Only mention status, blockers, or key decisions if they materially change what a reader needs to know
- Ignore Git commits, branch events, PR numbers, and label/assignee changes — these are noise unless deemed highly relevant with context
- Do not list steps taken or implementation details
- Do not use bullet points, headers, or markdown formatting other than bold for critical terms
- Write as if leaving a few-line sticky note for a colleague who has never seen this task`,
  maxTimelineItems: 50,
  maxCustomPromptLength: 500,
  capabilities: {
    webSearch: true,
  },
};
