import { extractPlainText, type ProsekitNode } from "../shared/prosekit";
import {
	type CategoryInfo,
	formatTaskKey,
	PRIORITY_LABELS,
	resolveCategoryName,
	STATUS_LABELS,
	type TaskDetail,
} from "../shared/task";

/**
 * Builds the seed prompt for "Send to agent" — title, status/priority,
 * category, labels, assignees, description, the cached AI summary (if any),
 * the 5 most recent comments, and any additional instructions (prefilled
 * from the plugin's settings, editable further in `SendToAgentModal` before
 * sending) — the "whole shebang" a person would actually want an agent to
 * see, not just title/description/comments.
 */
export function buildAgentPrompt(
	task: TaskDetail,
	{ categories, additionalInstructions }: { categories?: CategoryInfo[]; additionalInstructions?: string } = {}
): string {
	const key = formatTaskKey(task.orgShortId, task.shortId);
	const description = task.description ? extractPlainText(task.description as ProsekitNode) : "";
	const categoryName = resolveCategoryName(task.category, categories);

	const lines = [
		`Sayr task ${key}: ${task.title ?? "(untitled)"}`,
		`Status: ${STATUS_LABELS[task.status]} | Priority: ${PRIORITY_LABELS[task.priority]}${categoryName ? ` | Category: ${categoryName}` : ""}`,
	];

	if (task.labels.length > 0) {
		lines.push(`Labels: ${task.labels.map((l) => l.name).join(", ")}`);
	}

	const assignees = (task.assignees ?? []).filter((a): a is NonNullable<typeof a> => Boolean(a));
	if (assignees.length > 0) {
		lines.push(`Assignees: ${assignees.map((a) => a.name ?? a.id).join(", ")}`);
	}

	if (description) lines.push("", description);

	if (task.aiSummary?.summary) {
		lines.push("", "AI summary:", task.aiSummary.summary);
	}

	if (task.comments.length > 0) {
		lines.push("", "Recent comments:");
		for (const comment of task.comments.slice(0, 5)) {
			const author = comment.createdBy?.name ?? "someone";
			const text = comment.content ? extractPlainText(comment.content as ProsekitNode) : "";
			if (text) lines.push(`- ${author}: ${text}`);
		}
	}

	if (additionalInstructions?.trim()) {
		lines.push("", "Additional instructions:", additionalInstructions.trim());
	}

	return lines.join("\n");
}
