import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { canPrompt, pickLabels, printTip } from "../../lib/interactive";
import { printError, printJson } from "../../lib/output";
import { parseIdList } from "../../lib/parse-id-list";
import { orgTipFlag, resolveOrgChoice } from "../../lib/require-org";
import { labelsForTip, resolveLabels } from "../../lib/resolve-names";
import type { Task } from "../../types";
import { fetchTask, taskKey } from "./shared";

interface LabelOptions {
	set?: string;
	org?: string;
	json?: boolean;
}

const GUIDED_HELP =
	"\nGuided mode: in a terminal, run it without --set to tick the labels the task should have (its current ones start\nticked). Set SAYR_NO_INTERACTIVE=1 to turn the prompts off.";

/**
 * Shows the task and lets the person tick its labels, starting from the current ones. Returns the ticked label ids
 * (none when they untick everything), or undefined when the organization has no labels at all.
 */
async function promptForLabels(taskId: string, orgId: string): Promise<string[] | undefined> {
	const task = await fetchTask(orgId, taskId);
	console.log(`${pc.bold(await taskKey(orgId, task))}  ${task.title ?? pc.dim("(untitled)")}`);

	return pickLabels(orgId, {
		message: "Labels on this task",
		initialValues: task.labels.map((label) => label.id),
	});
}

/** The one place a task's labels get replaced: the flag path and the guided path both end here. */
async function setLabels(taskId: string, orgId: string, set: string, json?: boolean): Promise<void> {
	// `--set` takes names or ids; the API only knows ids. (UUIDs are sent untouched, with no lookup.)
	const labelIds = await resolveLabels(orgId, parseIdList(set), "--set");

	const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}/labels`, {
		method: "POST",
		body: { orgId, labelIds },
	});

	if (json) {
		printJson(t);
		return;
	}
	const labels = t.labels.map((l) => l.name).join(", ") || pc.dim("(none)");
	console.log(`${pc.green("✓")} Labels set on ${pc.bold(t.title ?? taskId)}: ${labels}`);
}

export function registerLabelCommand(task: Command): void {
	task
		.command("label <taskId>")
		.description("Replace a task's full set of labels")
		.option(
			"--set <ids>",
			"Comma-separated label names or ids — replaces the full set. Pass an empty string to clear all labels."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.addHelpText("after", GUIDED_HELP)
		.action(async (taskId: string, opts: LabelOptions, command: Command) => {
			// --set is only optional so a terminal can be asked for it. Everywhere else a missing one must fail exactly as
			// it did when Commander enforced it as a required option. (`--set ""` is a value: it clears every label.)
			if (opts.set === undefined && !canPrompt(opts)) {
				command.error("error: required option '--set <ids>' not specified", {
					code: "commander.missingMandatoryOptionValue",
				});
			}

			try {
				const resolved = await resolveOrgChoice(opts.org, opts);
				if (opts.set !== undefined) {
					await setLabels(taskId, resolved.org, opts.set, opts.json);
					return;
				}

				const ids = await promptForLabels(taskId, resolved.org);
				if (ids === undefined) return;
				await setLabels(taskId, resolved.org, ids.join(","), opts.json);
				printTip(
					["task", "label", taskId],
					[
						["--org", orgTipFlag(resolved)],
						["--set", await labelsForTip(resolved.org, ids)],
					]
				);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
