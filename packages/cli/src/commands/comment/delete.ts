import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";

export function registerDeleteCommand(comment: Command): void {
	comment
		.command("delete <commentId>")
		.description(
			"Delete a comment. Deleting your own needs membership; deleting someone else's needs comment moderation."
		)
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, opts: { json?: boolean }) => {
			try {
				const result = await apiRequest<{ id: string }>(`/comments/${encodeURIComponent(commentId)}`, {
					method: "DELETE",
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Comment deleted.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
