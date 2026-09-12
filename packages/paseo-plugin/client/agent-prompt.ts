import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import { PRIORITY_LABELS, STATUS_LABELS, type Task, type TaskComment } from "../shared/task";

/** Builds the seed prompt for "Send to agent" — title, status/priority, description, and the 5 most recent comments. */
export function buildAgentPrompt(task: Task & { comments: TaskComment[] }): string {
	const key = task.shortId != null ? `#${task.shortId}` : task.id;
	const description = task.description ? extractPlainText(task.description as ProsekitNode) : "";
	const lines = [
		`Sayr task ${key}: ${task.title ?? "(untitled)"}`,
		`Status: ${STATUS_LABELS[task.status]} | Priority: ${PRIORITY_LABELS[task.priority]}`,
	];
	if (description) lines.push("", description);
	if (task.comments.length > 0) {
		lines.push("", "Recent comments:");
		for (const comment of task.comments.slice(0, 5)) {
			const author = comment.createdBy?.name ?? "someone";
			const text = comment.content ? extractPlainText(comment.content as ProsekitNode) : "";
			if (text) lines.push(`- ${author}: ${text}`);
		}
	}
	return lines.join("\n");
}
