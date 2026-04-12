export type { PromptCapabilities, PromptConfig } from "./types.js";
export { taskSummaryPrompt } from "./prompts/task-summary.js";
// suggestLabelsPrompt and releaseNotesPrompt are not yet exported because their
// systemPrompt is still empty (TODO stubs). Re-add these exports once the
// prompts are implemented and their respective routes are wired up.
