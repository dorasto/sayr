import type { Command } from "commander";
import pc from "picocolors";
import { apiRequestPaginated } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { renderProsekitPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import type { Comment } from "../../types";

interface ListOptions {
	org?: string;
	page?: string;
	limit?: string;
	json?: boolean;
}

export function registerListCommand(comment: Command): void {
	comment
		.command("list <taskId>")
		.description("List top-level comments on a task (short id or id)")
		.option("--org <org>", "Organization slug or id")
		.option("--page <page>", "Page number")
		.option("--limit <limit>", "Results per page (max 30)")
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, opts: ListOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);

				const { data: comments, pagination } = await apiRequestPaginated<Comment[]>(
					`/tasks/${encodeURIComponent(taskId)}/comments`,
					{ query: { orgId, page: opts.page, limit: opts.limit } }
				);

				if (opts.json) {
					printJson({ comments, pagination });
					return;
				}

				if (comments.length === 0) {
					console.log(pc.dim("No comments."));
					return;
				}

				for (const c of comments) {
					const author = c.createdBy?.name ?? pc.dim("(unknown)");
					const visibility = c.visibility === "internal" ? pc.yellow(" [internal]") : "";
					console.log(`${pc.bold(author)}${visibility}  ${pc.dim(c.createdAt)}`);
					const text = c.content ? renderProsekitPlainText(c.content) : "";
					if (text) console.log(text);
					if (c.replyCount > 0) {
						console.log(
							pc.dim(
								`  ${c.replyCount} repl${c.replyCount === 1 ? "y" : "ies"} — see \`sayr comment replies ${c.id}\``
							)
						);
					}
					console.log("");
				}
				console.log(pc.dim(`Page ${pagination.page} of ${pagination.totalPages} — ${pagination.totalItems} total`));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
