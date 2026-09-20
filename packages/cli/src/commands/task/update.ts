import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { toPlainProsekitDoc } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { Task, TaskPriority, TaskStatus, TaskVisibility, UpdateTaskInput } from "../../types";

const STATUSES: TaskStatus[] = ["backlog", "todo", "in-progress", "done", "canceled"];
const PRIORITIES: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];
const VISIBILITIES: TaskVisibility[] = ["public", "private"];

interface UpdateOptions {
	org?: string;
	title?: string;
	description?: string;
	status?: string;
	priority?: string;
	category?: string;
	/** `--release <r>` gives a string; `--no-release` gives `false`; neither leaves it `undefined`. */
	release?: string | false;
	visible?: string;
	json?: boolean;
}

export function registerUpdateCommand(task: Command): void {
	task
		.command("update <taskId>")
		.description("Update one or more fields of a task — only the flags you pass are changed")
		.option("--org <org>", "Organization slug or id")
		.option("--title <title>", "New title")
		.option(
			"--description <text>",
			"New description — plain text only, no Markdown/rich formatting (see --help notes below)"
		)
		.option("--status <status>", `New status (${STATUSES.join(", ")})`)
		.option("--priority <priority>", `New priority (${PRIORITIES.join(", ")})`)
		.option("--category <categoryId>", "New category id")
		.option("--release <release>", "Assign to a release (slug or id)")
		.option("--no-release", "Remove the task from its release")
		.option("--visible <visibility>", `New visibility (${VISIBILITIES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.addHelpText(
			"after",
			"\nNote: --description is plain text only. Unlike `task create`, this endpoint expects an already-parsed\ndocument rather than Markdown, and the CLI doesn't carry a Markdown parser — see lib/prosekit.ts."
		)
		.action(async (taskId: string, opts: UpdateOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const status = assertOneOf(opts.status, STATUSES, "--status");
				const priority = assertOneOf(opts.priority, PRIORITIES, "--priority");
				const visible = assertOneOf(opts.visible, VISIBILITIES, "--visible");

				const updates: Omit<UpdateTaskInput, "orgId"> = {
					title: opts.title,
					description: opts.description !== undefined ? toPlainProsekitDoc(opts.description) : undefined,
					status,
					priority,
					category: opts.category,
					// `--no-release` becomes `null` (unassign) — a value to send, unlike `undefined` (flag not passed).
					releaseId: opts.release === false ? null : opts.release,
					visible,
				};

				// Only `undefined` counts as "not passed" — `null` (from `--no-release`) is a real update.
				if (Object.values(updates).every((v) => v === undefined)) {
					console.log(pc.dim("Nothing to update — pass at least one field flag."));
					return;
				}

				const body: UpdateTaskInput = { orgId, ...updates };
				const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body });

				if (opts.json) {
					printJson(t);
					return;
				}
				console.log(`${pc.green("✓")} Updated ${pc.bold(t.title ?? taskId)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
