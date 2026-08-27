import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { parseIdList } from "../../lib/parse-id-list";
import { resolveOrg } from "../../lib/require-org";
import type { Task } from "../../types";

export function registerLabelCommand(task: Command): void {
	task
		.command("label <taskId>")
		.description("Replace a task's full set of labels")
		.requiredOption(
			"--set <ids>",
			"Comma-separated label ids — replaces the full set. Pass an empty string to clear all labels."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, opts: { set: string; org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const labelIds = parseIdList(opts.set);

				const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}/labels`, {
					method: "POST",
					body: { orgId, labelIds },
				});

				if (opts.json) {
					printJson(t);
					return;
				}
				const labels = t.labels.map((l) => l.name).join(", ") || pc.dim("(none)");
				console.log(`${pc.green("✓")} Labels set on ${pc.bold(t.title ?? taskId)}: ${labels}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
