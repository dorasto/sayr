import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { CreateTaskInput, TaskCreated, TaskPriority, TaskStatus } from "../../types";

const STATUSES: TaskStatus[] = ["backlog", "todo", "in-progress", "done", "canceled"];
const PRIORITIES: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];

interface CreateOptions {
	org?: string;
	description?: string;
	status?: string;
	priority?: string;
	category?: string;
	json?: boolean;
}

export function registerCreateCommand(task: Command): void {
	task
		.command("create <title>")
		.description("Create a new task")
		.option("--org <org>", "Organization slug or id")
		.option("--description <text>", "Task description (Markdown supported)")
		.option("--status <status>", `Task status (${STATUSES.join(", ")})`)
		.option("--priority <priority>", `Task priority (${PRIORITIES.join(", ")})`)
		.option("--category <categoryId>", "Category id")
		.option("--json", "Output raw JSON")
		.action(async (title: string, opts: CreateOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const status = assertOneOf(opts.status, STATUSES, "--status");
				const priority = assertOneOf(opts.priority, PRIORITIES, "--priority");

				const body: CreateTaskInput = {
					title,
					orgId,
					description: opts.description,
					status,
					priority,
					category: opts.category,
				};

				const created = await apiRequest<TaskCreated>("/task", { method: "POST", body });

				if (opts.json) {
					printJson(created);
					return;
				}
				console.log(`${pc.green("✓")} Created ${pc.bold(created.title)}`);
				console.log(pc.dim(created.publicPortalUrl));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
