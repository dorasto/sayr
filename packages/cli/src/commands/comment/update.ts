import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { toPlainProsekitDoc } from "../../lib/prosekit";
import { assertOneOf } from "../../lib/validate";
import type { CommentVisibility } from "../../types";

const VISIBILITIES: CommentVisibility[] = ["public", "internal"];

export function registerUpdateCommand(comment: Command): void {
	comment
		.command("update <commentId> <content>")
		.description(
			"Edit a comment's content (plain text only) and/or visibility. Requires org membership, not just authorship."
		)
		.option("--visibility <visibility>", `New visibility (${VISIBILITIES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, content: string, opts: { visibility?: string; json?: boolean }) => {
			try {
				const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

				const result = await apiRequest<{ id: string }>(`/comments/${encodeURIComponent(commentId)}`, {
					method: "PATCH",
					body: { content: toPlainProsekitDoc(content), visibility },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Comment updated.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
