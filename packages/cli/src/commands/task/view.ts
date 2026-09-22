import { formatTaskKey } from "@repo/util";
import type { Command } from "commander";
import pc from "picocolors";
import { apiRequestPaginated } from "../../lib/client";
import { resolveOrgShortId } from "../../lib/orgs";
import { printError, printJson, priorityBadge, statusBadge } from "../../lib/output";
import { renderProsekitPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import type { Comment } from "../../types";
import { fetchTask } from "./shared";

/** Preview count for `task view` — `comment list <taskId>` covers pagination beyond this. */
const COMMENTS_PREVIEW_LIMIT = 5;

export function registerViewCommand(task: Command): void {
	task
		.command("view <taskId>")
		.description("Show a single task (short id or id), with its AI summary and recent comments")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const t = await fetchTask(orgId, taskId);

				// Best-effort: a comments-fetch failure shouldn't hide the task itself.
				let comments: Comment[] = [];
				let commentsTotal = 0;
				try {
					const result = await apiRequestPaginated<Comment[]>(`/tasks/${encodeURIComponent(taskId)}/comments`, {
						query: { orgId, limit: COMMENTS_PREVIEW_LIMIT },
					});
					comments = result.data;
					commentsTotal = result.pagination.totalItems;
				} catch {
					// Leave comments empty — the task view above is still useful on its own.
				}

				if (opts.json) {
					printJson({ ...t, comments, commentsTotal });
					return;
				}

				const orgShortId = await resolveOrgShortId(orgId);
				const key = orgShortId ? formatTaskKey(orgShortId, t.shortId) : `#${t.shortId ?? "?"}`;

				console.log(`${pc.bold(key)}  ${t.title ?? pc.dim("(untitled)")}`);
				console.log(`status: ${statusBadge(t.status)}   priority: ${priorityBadge(t.priority)}`);
				if (t.category) console.log(`category: ${t.category.name}`);
				if (t.labels.length > 0) console.log(`labels: ${t.labels.map((l) => l.name).join(", ")}`);
				if (t.assignees && t.assignees.length > 0)
					console.log(`assignees: ${t.assignees.map((a) => a.name ?? a.id).join(", ")}`);
				if (t.createdBy) console.log(pc.dim(`created by: ${t.createdBy.name ?? t.createdBy.id}`));
				const description = t.description ? renderProsekitPlainText(t.description) : "";
				if (description) {
					console.log("");
					console.log(description);
				}

				if (t.aiSummary?.summary) {
					console.log("");
					console.log(pc.bold(`AI summary${t.aiSummary.isStale ? pc.dim(" (stale)") : ""}:`));
					console.log(t.aiSummary.summary);
				}

				if (comments.length > 0) {
					console.log("");
					console.log(pc.bold(`Comments (${commentsTotal} total):`));
					for (const c of comments) {
						const author = c.createdBy?.name ?? pc.dim("(unknown)");
						const visibility = c.visibility === "internal" ? pc.yellow(" [internal]") : "";
						console.log(`${pc.dim("—")} ${author}${visibility}  ${pc.dim(c.createdAt)}`);
						const text = c.content ? renderProsekitPlainText(c.content) : "";
						if (text) console.log(`  ${text.replaceAll("\n", "\n  ")}`);
						if (c.replyCount > 0) {
							console.log(
								pc.dim(
									`  ${c.replyCount} repl${c.replyCount === 1 ? "y" : "ies"} — see \`sayr comment replies ${c.id}\``
								)
							);
						}
					}
					if (commentsTotal > comments.length) {
						console.log(
							pc.dim(`  … ${commentsTotal - comments.length} more — see \`sayr comment list ${taskId}\``)
						);
					}
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
