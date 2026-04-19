import type { getMergedTaskActivity } from "@repo/database";
import { extractPlainText } from "./extract-plain-text";

type ActivityItem = Awaited<ReturnType<typeof getMergedTaskActivity>>[number];

/**
 * Format a Date as "Mon DD" (e.g. "Mar 7").
 */
export function formatDate(date: Date | null): string {
	if (!date) return "?";
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a single merged activity item into a human-readable timeline line
 * suitable for inclusion in an AI prompt.
 *
 * @param item       - One item from getMergedTaskActivity()
 * @param labelMap   - Map of label ID → label name (build from task.labels)
 * @param assigneeMap - Map of user ID → display name (build from task.assignees)
 */
export function buildTimelineLine(
	item: ActivityItem,
	labelMap: Map<string, string>,
	assigneeMap: Map<string, string>,
): string {
	const date = formatDate(item.createdAt);
	const actor = item.actor?.displayName ?? item.actor?.name ?? "Unknown";
	const prefix = `[${date}] ${actor}`;

	switch (item.eventType) {
		case "created":
			return `${prefix} created this task`;

		case "status_change": {
			const from = String(item.fromValue ?? "?");
			const to = String(item.toValue ?? "?");
			return `${prefix} changed status: ${from} → ${to}`;
		}

		case "priority_change": {
			const from = String(item.fromValue ?? "?");
			const to = String(item.toValue ?? "?");
			return `${prefix} changed priority: ${from} → ${to}`;
		}

		case "label_added": {
			const labelId = String(item.toValue ?? "");
			const name = labelMap.get(labelId) ?? labelId;
			return `${prefix} added label: ${name}`;
		}

		case "label_removed": {
			const labelId = String(item.fromValue ?? "");
			const name = labelMap.get(labelId) ?? labelId;
			return `${prefix} removed label: ${name}`;
		}

		case "assignee_added": {
			const userId = String(item.toValue ?? "");
			const name = assigneeMap.get(userId) ?? userId;
			return `${prefix} added assignee: ${name}`;
		}

		case "assignee_removed": {
			const userId = String(item.fromValue ?? "");
			const name = assigneeMap.get(userId) ?? userId;
			return `${prefix} removed assignee: ${name}`;
		}

		case "updated": {
			const to = item.toValue as { field?: string; value?: unknown } | null;
			if (to?.field === "title") return `${prefix} updated title to: "${String(to.value ?? "")}"`;
			if (to?.field === "visible") return `${prefix} changed visibility to: ${String(to.value ?? "")}`;
			if (to?.field === "description") return `${prefix} updated the description`;
			return `${prefix} updated the task`;
		}

		case "category_change":
			return `${prefix} changed category`;

		case "release_change":
			return `${prefix} changed release`;

		case "comment": {
			const text = item.content ? extractPlainText(item.content) : "";
			const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
			return `${prefix} commented: "${preview}"`;
		}

		case "github_commit_ref": {
			const d = item.toValue as { message?: string; commitSha?: string; commitUrl?: string; repo?: string } | null;
			const msg = d?.message ?? "";
			const sha = d?.commitSha ? d.commitSha.slice(0, 7) : "";
			const repo = d?.repo ?? "";
			const url = d?.commitUrl ?? "";
			return `${prefix} committed: "${msg}"${sha ? ` (${sha})` : ""}${repo ? ` in ${repo}` : ""}${url ? ` — ${url}` : ""}`;
		}

		case "github_branch_linked": {
			const d = item.toValue as {
				branch?: { name?: string; deleted?: boolean };
				repository?: { owner?: string; name?: string };
			} | null;
			const branchName = d?.branch?.name ?? "";
			const repo = d?.repository ? `${d.repository.owner}/${d.repository.name}` : "";
			const action = d?.branch?.deleted ? "unlinked branch" : "linked branch";
			return `${prefix} ${action}: ${branchName}${repo ? ` in ${repo}` : ""}`;
		}

		case "github_pr_linked": {
			const d = item.toValue as {
				pullRequest?: { number?: number; title?: string };
				repository?: { owner?: string; name?: string };
			} | null;
			const num = d?.pullRequest?.number;
			const title = d?.pullRequest?.title ?? "";
			const repo = d?.repository ? `${d.repository.owner}/${d.repository.name}` : "";
			return `${prefix} opened PR${num ? ` #${num}` : ""}: "${title}"${repo ? ` in ${repo}` : ""}`;
		}

		case "github_pr_merged": {
			const d = item.toValue as {
				pullRequest?: { number?: number; merged?: boolean };
				repository?: { owner?: string; name?: string };
			} | null;
			const num = d?.pullRequest?.number;
			const repo = d?.repository ? `${d.repository.owner}/${d.repository.name}` : "";
			const action = d?.pullRequest?.merged !== false ? "merged PR" : "closed PR";
			return `${prefix} ${action}${num ? ` #${num}` : ""}${repo ? ` in ${repo}` : ""}`;
		}

		case "github_pr_commit": {
			const d = item.toValue as { message?: string; commitSha?: string } | null;
			const msg = d?.message ?? "";
			const sha = d?.commitSha ? d.commitSha.slice(0, 7) : "";
			return `${prefix} pushed commit to PR: "${msg}"${sha ? ` (${sha})` : ""}`;
		}

		case "task_mentioned":
			return `${prefix} mentioned this task`;

		case "parent_added":
			return `${prefix} added a parent task`;

		case "parent_removed":
			return `${prefix} removed the parent task`;

		case "subtask_added":
			return `${prefix} added a subtask`;

		case "subtask_removed":
			return `${prefix} removed a subtask`;

		case "relation_added": {
			const d = item.toValue as { type?: string } | null;
			return `${prefix} added relation: ${d?.type ?? "related"}`;
		}

		case "relation_removed":
			return `${prefix} removed a relation`;

		default:
			return `${prefix} performed an action`;
	}
}
