import type { Command } from "commander";
import pc from "picocolors";
import { apiRequestPaginated } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { renderProsekitPlainText } from "../../lib/prosekit";
import type { Comment } from "../../types";

interface RepliesOptions {
	page?: string;
	limit?: string;
	json?: boolean;
}

export function registerRepliesCommand(comment: Command): void {
	comment
		.command("replies <commentId>")
		.description("List replies to a top-level comment")
		.option("--page <page>", "Page number")
		.option("--limit <limit>", "Results per page (max 50)")
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, opts: RepliesOptions) => {
			try {
				// No --org here: a comment id is already org-scoped server-side, so
				// unlike every other command this one needs no org context at all.
				const { data: replies, pagination } = await apiRequestPaginated<Comment[]>(
					`/comments/${encodeURIComponent(commentId)}/replies`,
					{ query: { page: opts.page, limit: opts.limit } }
				);

				if (opts.json) {
					printJson({ replies, pagination });
					return;
				}

				if (replies.length === 0) {
					console.log(pc.dim("No replies."));
					return;
				}

				for (const r of replies) {
					const author = r.createdBy?.name ?? pc.dim("(unknown)");
					const visibility = r.visibility === "internal" ? pc.yellow(" [internal]") : "";
					console.log(`${pc.bold(author)}${visibility}  ${pc.dim(r.createdAt)}`);
					const text = r.content ? renderProsekitPlainText(r.content) : "";
					if (text) console.log(text);
					console.log("");
				}
				console.log(pc.dim(`Page ${pagination.page} of ${pagination.totalPages} — ${pagination.totalItems} total`));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
