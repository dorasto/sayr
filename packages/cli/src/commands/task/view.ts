import { formatTaskKey } from "@repo/util";
import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { resolveOrgShortId } from "../../lib/orgs";
import { printError, printJson, priorityBadge, statusBadge } from "../../lib/output";
import { renderProsekitPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import type { Task } from "../../types";

export function registerViewCommand(task: Command): void {
	task
		.command("view <taskId>")
		.description("Show a single task (short id or id)")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (taskId: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { query: { orgId } });

				if (opts.json) {
					printJson(t);
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
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
