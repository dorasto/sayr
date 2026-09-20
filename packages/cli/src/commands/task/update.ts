import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import {
	askMultiSelect,
	askSelect,
	askText,
	type Choice,
	canPrompt,
	choicesFrom,
	pickCategory,
	pickRelease,
	printTip,
	type TipFlag,
} from "../../lib/interactive";
import { listReleases } from "../../lib/lookups";
import { printError, printJson } from "../../lib/output";
import { toPlainProsekitDoc } from "../../lib/prosekit";
import { orgTipFlag, resolveOrgChoice } from "../../lib/require-org";
import { categoryForTip, resolveCategory } from "../../lib/resolve-names";
import { assertOneOf } from "../../lib/validate";
import type { Task, UpdateTaskInput } from "../../types";
import { fetchTask, PRIORITIES, STATUSES, taskKey, VISIBILITIES } from "./shared";

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

type TaskUpdates = Omit<UpdateTaskInput, "orgId">;

const GUIDED_HELP =
	"\nGuided mode: in a terminal, run it with no field flags to pick what to change and be asked for each new value.\nSet SAYR_NO_INTERACTIVE=1 to turn the prompts off.";

/** The fields guided mode can change, in the order they're asked — the same ones the flags cover, minus the description. */
const FIELDS = [
	{ key: "title", label: "Title" },
	{ key: "status", label: "Status" },
	{ key: "priority", label: "Priority" },
	{ key: "category", label: "Category" },
	{ key: "release", label: "Release" },
	{ key: "visible", label: "Visibility" },
] as const;

/** Validates the flags and maps them to the request body — the same for typed flags and guided answers. */
function buildUpdates(opts: UpdateOptions): TaskUpdates {
	const status = assertOneOf(opts.status, STATUSES, "--status");
	const priority = assertOneOf(opts.priority, PRIORITIES, "--priority");
	const visible = assertOneOf(opts.visible, VISIBILITIES, "--visible");

	return {
		title: opts.title,
		description: opts.description !== undefined ? toPlainProsekitDoc(opts.description) : undefined,
		status,
		priority,
		category: opts.category,
		// `--no-release` becomes `null` (unassign) — a value to send, unlike `undefined` (flag not passed).
		releaseId: opts.release === false ? null : opts.release,
		visible,
	};
}

/** Only `undefined` counts as "not passed" — `null` (from `--no-release`) is a real update. */
function isEmpty(updates: TaskUpdates): boolean {
	return Object.values(updates).every((v) => v === undefined);
}

/** The one place a task gets updated: the flag path and the guided path both end here, so they send the same request. */
async function sendUpdate(taskId: string, orgId: string, updates: TaskUpdates, json?: boolean): Promise<void> {
	// `--category` takes a name or an id; the API only knows ids. (A UUID is sent untouched, with no lookup.)
	const category =
		updates.category === undefined ? undefined : await resolveCategory(orgId, updates.category, "--category");
	const body: UpdateTaskInput = { orgId, ...updates, category };
	const t = await apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body });

	if (json) {
		printJson(t);
		return;
	}
	console.log(`${pc.green("✓")} Updated ${pc.bold(t.title ?? taskId)}`);
}

/** Shortens a value for a multi-select hint. */
function preview(text: string, max = 40): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Shows the task, asks which fields to change, then asks for a new value for each — starting from the current
 * one. Returns the answers as the flags they stand for (a release of `false` is `--no-release`).
 */
async function promptForUpdates(taskId: string, orgId: string, opts: UpdateOptions): Promise<UpdateOptions> {
	const task = await fetchTask(orgId, taskId);
	console.log(`${pc.bold(await taskKey(orgId, task))}  ${task.title ?? pc.dim("(untitled)")}`);

	// The task only carries its release's id; the release list (also what the picker uses) has the name.
	// Best-effort: a failed lookup costs the name, not the whole prompt.
	const release = task.releaseId
		? await listReleases(orgId)
				.then((all) => all.find((r) => r.id === task.releaseId))
				.catch(() => undefined)
		: undefined;

	const current: Record<(typeof FIELDS)[number]["key"], string> = {
		title: preview(task.title ?? "(untitled)"),
		status: task.status,
		priority: task.priority,
		category: task.category?.name ?? "none",
		release: release?.name ?? (task.releaseId ? "in a release" : "none"),
		visible: task.visible,
	};
	const choices: Choice[] = FIELDS.map(({ key, label }) => ({ value: key, label, hint: `now ${current[key]}` }));
	const picked = await askMultiSelect({ message: "What do you want to change?", choices, required: true });

	const guided: UpdateOptions = { ...opts };
	for (const { key } of FIELDS) {
		if (!picked.includes(key)) continue;
		switch (key) {
			case "title":
				guided.title = await askText({ message: "New title", initialValue: task.title ?? "", required: true });
				break;
			case "status":
				guided.status = await askSelect({
					message: "New status",
					choices: choicesFrom(STATUSES),
					initialValue: task.status,
				});
				break;
			case "priority":
				guided.priority = await askSelect({
					message: "New priority",
					choices: choicesFrom(PRIORITIES),
					initialValue: task.priority,
				});
				break;
			case "category":
				guided.category = await pickCategory(orgId, { message: "New category", initialValue: task.category?.id });
				break;
			case "release": {
				const chosen = await pickRelease(orgId, {
					message: "New release",
					allowNone: true,
					initialValue: release?.slug,
				});
				if (chosen !== undefined) guided.release = chosen;
				break;
			}
			case "visible":
				guided.visible = await askSelect({
					message: "New visibility",
					choices: choicesFrom(VISIBILITIES),
					initialValue: task.visible,
				});
				break;
		}
	}
	return guided;
}

/** The flags that reproduce `opts` — the equivalent command printed after a guided run. */
function tipFlags(org: string | undefined, opts: UpdateOptions): TipFlag[] {
	return [
		["--org", org],
		["--title", opts.title],
		["--status", opts.status],
		["--priority", opts.priority],
		["--category", opts.category],
		["--release", typeof opts.release === "string" ? opts.release : undefined],
		["--no-release", opts.release === false],
		["--visible", opts.visible],
	];
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
		.option("--category <category>", "New category (name or id)")
		.option("--release <release>", "Assign to a release (slug or id)")
		.option("--no-release", "Remove the task from its release")
		.option("--visible <visibility>", `New visibility (${VISIBILITIES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.addHelpText(
			"after",
			"\nNote: --description is plain text only. Unlike `task create`, this endpoint expects an already-parsed\ndocument rather than Markdown, and the CLI doesn't carry a Markdown parser — see lib/prosekit.ts."
		)
		.addHelpText("after", GUIDED_HELP)
		.action(async (taskId: string, opts: UpdateOptions) => {
			try {
				const resolved = await resolveOrgChoice(opts.org, opts);
				let flags = opts;
				let updates = buildUpdates(flags);

				// No field flags is where a terminal takes over: ask what to change instead of giving up.
				const guided = isEmpty(updates) && canPrompt(opts);
				if (guided) {
					flags = await promptForUpdates(taskId, resolved.org, opts);
					updates = buildUpdates(flags);
				}

				if (isEmpty(updates)) {
					console.log(pc.dim(guided ? "Nothing to update." : "Nothing to update — pass at least one field flag."));
					return;
				}

				await sendUpdate(taskId, resolved.org, updates, opts.json);
				if (guided) {
					const category = await categoryForTip(resolved.org, flags.category);
					printTip(["task", "update", taskId], tipFlags(orgTipFlag(resolved), { ...flags, category }));
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
