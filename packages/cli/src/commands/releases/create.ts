import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import {
	askMultiSelect,
	askSelect,
	askText,
	canPrompt,
	choicesFrom,
	printTip,
	type TipFlag,
} from "../../lib/interactive";
import { printError, printJson } from "../../lib/output";
import { orgTipFlag, resolveOrgChoice } from "../../lib/require-org";
import { assertDate, assertOneOf } from "../../lib/validate";
import type { CreateReleaseInput, Release } from "../../types";
import { askReleaseColor, dateProblem, RELEASE_STATUSES } from "./shared";

interface CreateOptions {
	org?: string;
	slug?: string;
	description?: string;
	status?: string;
	targetDate?: string;
	color?: string;
	icon?: string;
	json?: boolean;
}

/** What the API does when no status is sent — guided mode leaves it out of the request rather than restate it. */
const DEFAULT_STATUS = "planned";

/** What guided mode offers after the name, target date and status, in the order it's asked. */
const DETAILS = [
	{ key: "slug", label: "Slug" },
	{ key: "description", label: "Description" },
	{ key: "color", label: "Colour" },
] as const;

const GUIDED_HELP =
	"\nGuided mode: in a terminal, run it without a name to be asked for one (then a status, a target date and, optionally,\na slug, description and colour). Set SAYR_NO_INTERACTIVE=1 to turn the prompts off.";

/**
 * Asks for the name, status and target date, then for whichever extra details the person wants to add. Flags
 * already on the command line are kept and not asked about again.
 */
async function promptForRelease(opts: CreateOptions): Promise<{ name: string; opts: CreateOptions }> {
	const name = await askText({ message: "Release name", required: true });
	const guided: CreateOptions = { ...opts };

	if (opts.status === undefined) {
		const status = await askSelect({
			message: "Status",
			choices: choicesFrom(RELEASE_STATUSES),
			initialValue: DEFAULT_STATUS,
		});
		if (status !== DEFAULT_STATUS) guided.status = status;
	}

	if (opts.targetDate === undefined) {
		const targetDate = await askText({ message: "Target date (optional, e.g. 2026-10-31)", validate: dateProblem });
		if (targetDate) guided.targetDate = targetDate;
	}

	const offered = DETAILS.filter((detail) => opts[detail.key] === undefined);
	if (offered.length === 0) return { name, opts: guided };

	// Nothing ticked by default: pressing Enter creates the release with what it has so far.
	const picked = await askMultiSelect({
		message: "Add more details?",
		choices: offered.map((detail) => ({ value: detail.key, label: detail.label })),
	});

	for (const { key } of offered) {
		if (!picked.includes(key)) continue;
		switch (key) {
			case "slug": {
				const slug = await askText({ message: "Slug (empty: generated from the name)" });
				if (slug) guided.slug = slug;
				break;
			}
			case "description": {
				const description = await askText({ message: "Description (Markdown, one line)" });
				if (description) guided.description = description;
				break;
			}
			case "color":
				guided.color = await askReleaseColor();
				break;
		}
	}
	return { name, opts: guided };
}

/** The flags that reproduce `opts` — the equivalent command printed after a guided run. */
function tipFlags(org: string | undefined, opts: CreateOptions): TipFlag[] {
	return [
		["--org", org],
		["--slug", opts.slug],
		["--description", opts.description],
		["--status", opts.status],
		["--target-date", opts.targetDate],
		["--color", opts.color],
		["--icon", opts.icon],
	];
}

/** The one place a release gets created: the flag path and the guided path both end here, so they send the same request. */
async function createRelease(name: string, orgId: string, opts: CreateOptions): Promise<void> {
	const status = assertOneOf(opts.status, RELEASE_STATUSES, "--status");
	const targetDate = assertDate(opts.targetDate, "--target-date");

	const body: CreateReleaseInput = {
		orgId,
		name,
		slug: opts.slug,
		description: opts.description,
		status,
		targetDate,
		color: opts.color,
		icon: opts.icon,
	};

	const created = await apiRequest<Release>("/releases", { method: "POST", body });

	if (opts.json) {
		printJson(created);
		return;
	}
	console.log(`${pc.green("✓")} Created ${pc.bold(created.name)} ${pc.dim(created.slug)}`);
}

export function registerCreateCommand(releases: Command): void {
	releases
		.command("create [name]")
		// Still `<name>` in --help: scripts and agents must pass one. `[name]` is only so a terminal can be asked.
		.usage("[options] <name>")
		.summary("Create a release")
		.description("Create a release. Needs the manageReleases permission.")
		.option("--org <org>", "Organization slug or id")
		.option("--slug <slug>", "URL slug (default: generated from the name)")
		.option("--description <markdown>", "Release description (Markdown supported)")
		.option("--status <status>", `Release status (${RELEASE_STATUSES.join(", ")}, default: planned)`)
		.option("--target-date <date>", "Planned ship date, e.g. 2026-10-31")
		.option("--color <color>", "Badge color as #RRGGBB or hsla(h, s%, l%, 1)")
		.option("--icon <icon>", "Tabler icon name, e.g. IconRocket")
		.option("--json", "Output raw JSON")
		.addHelpText("after", GUIDED_HELP)
		.action(async (name: string | undefined, opts: CreateOptions, command: Command) => {
			// The name is only optional so a terminal can be asked for it. Everywhere else a missing one must fail
			// exactly as it did when Commander enforced `<name>` itself.
			if (name === undefined && !canPrompt(opts)) {
				command.error("error: missing required argument 'name'", { code: "commander.missingArgument" });
			}

			try {
				const resolved = await resolveOrgChoice(opts.org, opts);
				if (name !== undefined) {
					await createRelease(name, resolved.org, opts);
					return;
				}

				const guided = await promptForRelease(opts);
				await createRelease(guided.name, resolved.org, guided.opts);
				printTip(["releases", "create", guided.name], tipFlags(orgTipFlag(resolved), guided.opts));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
