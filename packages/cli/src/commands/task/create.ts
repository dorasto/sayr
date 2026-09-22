import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import {
	askMultiSelect,
	askSelect,
	askText,
	canPrompt,
	choicesFrom,
	pickCategory,
	pickRelease,
	printTip,
	type TipFlag,
} from "../../lib/interactive";
import { printError, printJson } from "../../lib/output";
import { orgTipFlag, resolveOrgChoice } from "../../lib/require-org";
import { categoryForTip, resolveCategory } from "../../lib/resolve-names";
import { assertOneOf } from "../../lib/validate";
import type { CreateTaskInput, TaskCreated } from "../../types";
import { PRIORITIES, STATUSES } from "./shared";

interface CreateOptions {
	org?: string;
	description?: string;
	status?: string;
	priority?: string;
	category?: string;
	release?: string;
	json?: boolean;
}

/** What guided mode offers after the title, in the order it's asked. */
const DETAILS = [
	{ key: "description", label: "Description" },
	{ key: "status", label: "Status" },
	{ key: "priority", label: "Priority" },
	{ key: "category", label: "Category" },
	{ key: "release", label: "Release" },
] as const;

const GUIDED_HELP =
	"\nGuided mode: in a terminal, run it without a title to be asked for one (then, optionally, a description, status,\npriority, category and release). Set SAYR_NO_INTERACTIVE=1 to turn the prompts off.";

/**
 * Asks for the title, then for whichever details the person wants to add. Flags already on the command line are
 * kept and not asked about again, so `sayr task create --priority high` only asks for the rest.
 */
async function promptForTask(orgId: string, opts: CreateOptions): Promise<{ title: string; opts: CreateOptions }> {
	const title = await askText({ message: "Title", required: true });
	const guided: CreateOptions = { ...opts };

	const offered = DETAILS.filter((detail) => opts[detail.key] === undefined);
	if (offered.length === 0) return { title, opts: guided };

	// Nothing ticked by default: pressing Enter creates the task with just its title.
	const picked = await askMultiSelect({
		message: "Add more details?",
		choices: offered.map((detail) => ({ value: detail.key, label: detail.label })),
	});

	for (const { key } of offered) {
		if (!picked.includes(key)) continue;
		switch (key) {
			case "description": {
				const description = await askText({ message: "Description (Markdown)" });
				if (description) guided.description = description;
				break;
			}
			case "status":
				guided.status = await askSelect({ message: "Status", choices: choicesFrom(STATUSES) });
				break;
			case "priority":
				guided.priority = await askSelect({ message: "Priority", choices: choicesFrom(PRIORITIES) });
				break;
			case "category":
				guided.category = await pickCategory(orgId);
				break;
			case "release": {
				const release = await pickRelease(orgId);
				if (release) guided.release = release;
				break;
			}
		}
	}
	return { title, opts: guided };
}

/** The flags that reproduce `opts` — the equivalent command printed after a guided run. */
function tipFlags(org: string | undefined, opts: CreateOptions): TipFlag[] {
	return [
		["--org", org],
		["--description", opts.description],
		["--status", opts.status],
		["--priority", opts.priority],
		["--category", opts.category],
		["--release", opts.release],
	];
}

/** The one place a task gets created: the flag path and the guided path both end here, so they send the same request. */
async function createTask(title: string, orgId: string, opts: CreateOptions): Promise<void> {
	const status = assertOneOf(opts.status, STATUSES, "--status");
	const priority = assertOneOf(opts.priority, PRIORITIES, "--priority");
	// `--category` takes a name or an id; the API only knows ids. (A UUID is sent untouched, with no lookup.)
	const category = opts.category === undefined ? undefined : await resolveCategory(orgId, opts.category, "--category");

	const body: CreateTaskInput = {
		title,
		orgId,
		description: opts.description,
		status,
		priority,
		category,
		releaseId: opts.release,
	};

	const created = await apiRequest<TaskCreated>("/task", { method: "POST", body });

	if (opts.json) {
		printJson(created);
		return;
	}
	console.log(`${pc.green("✓")} Created ${pc.bold(created.title)}`);
	console.log(pc.dim(created.publicPortalUrl));
}

export function registerCreateCommand(task: Command): void {
	task
		.command("create [title]")
		// Still `<title>` in --help: scripts and agents must pass one. `[title]` is only so a terminal can be asked.
		.usage("[options] <title>")
		.description("Create a new task")
		.option("--org <org>", "Organization slug or id")
		.option("--description <text>", "Task description (Markdown supported)")
		.option("--status <status>", `Task status (${STATUSES.join(", ")})`)
		.option("--priority <priority>", `Task priority (${PRIORITIES.join(", ")})`)
		.option("--category <category>", "Category name or id")
		.option("--release <release>", "Release slug or id")
		.option("--json", "Output raw JSON")
		.addHelpText("after", GUIDED_HELP)
		.action(async (title: string | undefined, opts: CreateOptions, command: Command) => {
			// The title is only optional so a terminal can be asked for it. Everywhere else a missing one must fail
			// exactly as it did when Commander enforced `<title>` itself.
			if (title === undefined && !canPrompt(opts)) {
				command.error("error: missing required argument 'title'", { code: "commander.missingArgument" });
			}

			try {
				const resolved = await resolveOrgChoice(opts.org, opts);
				if (title !== undefined) {
					await createTask(title, resolved.org, opts);
					return;
				}

				const guided = await promptForTask(resolved.org, opts);
				await createTask(guided.title, resolved.org, guided.opts);
				const category = await categoryForTip(resolved.org, guided.opts.category);
				printTip(["task", "create", guided.title], tipFlags(orgTipFlag(resolved), { ...guided.opts, category }));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
