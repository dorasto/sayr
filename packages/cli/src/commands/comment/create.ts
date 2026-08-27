import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { CommentVisibility } from "../../types";

const VISIBILITIES: CommentVisibility[] = ["public", "internal"];

export function registerCreateCommand(comment: Command): void {
	comment
		.command("create <taskId> <content>")
		.description("Post a comment on a task (Markdown supported)")
		.option("--org <org>", "Organization slug or id")
		.option("--visibility <visibility>", `Comment visibility (${VISIBILITIES.join(", ")}, default: public)`)
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, content: string, opts: { org?: string; visibility?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

				const result = await apiRequest<{ id: string }>("/create_comment", {
					method: "POST",
					body: { taskId, orgId, content, visibility },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Comment posted.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
