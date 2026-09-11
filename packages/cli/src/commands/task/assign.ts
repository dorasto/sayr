import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { parseIdList } from "../../lib/parse-id-list";
import { resolveOrg } from "../../lib/require-org";
import type { Task } from "../../types";

export function registerAssignCommand(task: Command): void {
	task
		.command("assign <taskId>")
		.description("Replace a task's full set of assignees")
		.requiredOption(
			"--set <ids>",
			"Comma-separated user ids — replaces the full set. Pass an empty string to unassign everyone."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, opts: { set: string; org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const assigneeIds = parseIdList(opts.set);

				const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}/assignees`, {
					method: "POST",
					body: { orgId, assigneeIds },
				});

				if (opts.json) {
					printJson(t);
					return;
				}
				const assignees = (t.assignees ?? []).map((a) => a.name ?? a.id).join(", ") || pc.dim("(none)");
				console.log(`${pc.green("✓")} Assignees set on ${pc.bold(t.title ?? taskId)}: ${assignees}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
