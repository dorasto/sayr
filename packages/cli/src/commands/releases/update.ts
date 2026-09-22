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
	printTip,
	type TipFlag,
} from "../../lib/interactive";
import { formatIsoDate, printError, printJson, releaseStatusBadge } from "../../lib/output";
import { orgTipFlag, resolveOrgChoice } from "../../lib/require-org";
import { assertDate, assertOneOf } from "../../lib/validate";
import type { Release, UpdateReleaseInput } from "../../types";
import { askReleaseColor, dateProblem, fetchReleaseDetail, RELEASE_STATUSES, releasePath } from "./shared";

/** Passed to `--target-date`, `--released-at` and `--lead` to clear them — sent to the API as `null`. */
const CLEAR = "none";

interface UpdateOptions {
	org?: string;
	name?: string;
	slug?: string;
	description?: string;
	status?: string;
	targetDate?: string;
	releasedAt?: string;
	color?: string;
	icon?: string;
	lead?: string;
	json?: boolean;
}

type ReleaseUpdates = Omit<UpdateReleaseInput, "orgId">;

const GUIDED_HELP =
	"\nGuided mode: in a terminal, run it with no field flags to pick what to change and be asked for each new value\n(--lead and --icon are flag-only). Set SAYR_NO_INTERACTIVE=1 to turn the prompts off.";

/** The fields guided mode can change, in the order they're asked. */
const FIELDS = [
	{ key: "name", label: "Name" },
	{ key: "slug", label: "Slug" },
	{ key: "description", label: "Description" },
	{ key: "status", label: "Status" },
	{ key: "targetDate", label: "Target date" },
	{ key: "releasedAt", label: "Released at" },
	{ key: "color", label: "Colour" },
] as const;

/** Validates the flags and maps them to the request body — the same for typed flags and guided answers. */
function buildUpdates(opts: UpdateOptions): ReleaseUpdates {
	const status = assertOneOf(opts.status, RELEASE_STATUSES, "--status");

	return {
		name: opts.name,
		slug: opts.slug,
		description: opts.description,
		status,
		targetDate: opts.targetDate === CLEAR ? null : assertDate(opts.targetDate, "--target-date"),
		releasedAt: opts.releasedAt === CLEAR ? null : assertDate(opts.releasedAt, "--released-at"),
		color: opts.color,
		icon: opts.icon,
		leadId: opts.lead === CLEAR ? null : opts.lead,
	};
}

/** `null` is a value here (it clears the field), so only `undefined` means "flag not passed". */
function isEmpty(updates: ReleaseUpdates): boolean {
	return Object.values(updates).every((v) => v === undefined);
}

/** The one place a release gets updated: the flag path and the guided path both end here, so they send the same request. */
async function sendUpdate(release: string, orgId: string, updates: ReleaseUpdates, json?: boolean): Promise<void> {
	const body: UpdateReleaseInput = { orgId, ...updates };
	const updated = await apiRequest<Release>(releasePath(release), { method: "PATCH", body });

	if (json) {
		printJson(updated);
		return;
	}
	console.log(`${pc.green("✓")} Updated ${pc.bold(updated.name)}`);
}

/** Shortens a value for a multi-select hint. */
function preview(text: string, max = 40): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Shows the release, asks which fields to change, then asks for a new value for each — starting from the current
 * one. Returns the answers as the flags they stand for. (`--lead` and `--icon` stay flag-only.)
 */
async function promptForUpdates(release: string, orgId: string, opts: UpdateOptions): Promise<UpdateOptions> {
	const detail = await fetchReleaseDetail(orgId, release);
	console.log(`${pc.bold(detail.name)}  ${releaseStatusBadge(detail.status)}  ${pc.dim(detail.slug)}`);

	const description = detail.descriptionMarkdown ?? "";
	const targetDate = detail.targetDate ? formatIsoDate(detail.targetDate) : "";
	const releasedAt = detail.releasedAt ? formatIsoDate(detail.releasedAt) : "";
	const current: Record<(typeof FIELDS)[number]["key"], string | undefined> = {
		name: preview(detail.name),
		slug: detail.slug,
		description: description ? preview(description.split("\n")[0] ?? "") : "none",
		status: detail.status,
		targetDate: targetDate || "none",
		releasedAt: releasedAt || "none",
		color: undefined,
	};
	const choices: Choice[] = FIELDS.map(({ key, label }) => ({
		value: key,
		label,
		hint: current[key] === undefined ? undefined : `now ${current[key]}`,
	}));
	const picked = await askMultiSelect({ message: "What do you want to change?", choices, required: true });

	const guided: UpdateOptions = { ...opts };
	for (const { key } of FIELDS) {
		if (!picked.includes(key)) continue;
		switch (key) {
			case "name":
				guided.name = await askText({ message: "New name", initialValue: detail.name, required: true });
				break;
			case "slug":
				guided.slug = await askText({ message: "New slug", initialValue: detail.slug, required: true });
				break;
			case "description": {
				// A single-line prompt can't hold a multi-line description, so it isn't offered as the starting text.
				const multiline = description.includes("\n");
				guided.description = await askText({
					message: multiline
						? "New description (Markdown, one line — replaces the current one; empty clears it)"
						: "New description (Markdown; empty clears it)",
					initialValue: multiline ? undefined : description,
				});
				break;
			}
			case "status":
				guided.status = await askSelect({
					message: "New status",
					choices: choicesFrom(RELEASE_STATUSES),
					initialValue: detail.status,
				});
				break;
			case "targetDate":
				guided.targetDate = await askText({
					message: `New target date (e.g. 2026-10-31, or "${CLEAR}" to clear it)`,
					initialValue: targetDate,
					required: true,
					validate: (value) => (value === CLEAR ? undefined : dateProblem(value)),
				});
				break;
			case "releasedAt":
				guided.releasedAt = await askText({
					message: `New released date (e.g. 2026-10-31, or "${CLEAR}" to clear it)`,
					initialValue: releasedAt,
					required: true,
					validate: (value) => (value === CLEAR ? undefined : dateProblem(value)),
				});
				break;
			case "color":
				guided.color = await askReleaseColor();
				break;
		}
	}
	return guided;
}

/** The flags that reproduce `opts` — the equivalent command printed after a guided run. */
function tipFlags(org: string | undefined, opts: UpdateOptions): TipFlag[] {
	return [
		["--org", org],
		["--name", opts.name],
		["--slug", opts.slug],
		["--description", opts.description],
		["--status", opts.status],
		["--target-date", opts.targetDate],
		["--released-at", opts.releasedAt],
		["--color", opts.color],
		["--icon", opts.icon],
		["--lead", opts.lead],
	];
}

export function registerUpdateCommand(releases: Command): void {
	releases
		.command("update <release>")
		.summary("Update a release's name, slug, description, status, dates, color, icon, or lead")
		.description(
			"Update one or more fields of a release (slug or id) — only the flags you pass are changed. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--name <name>", "New name")
		.option("--slug <slug>", "New URL slug")
		.option("--description <markdown>", "New description (Markdown supported)")
		.option("--status <status>", `New status (${RELEASE_STATUSES.join(", ")})`)
		.option("--target-date <date>", `New planned ship date, e.g. 2026-10-31 (or "${CLEAR}" to clear it)`)
		.option("--released-at <date>", `Actual release date (or "${CLEAR}" to clear it)`)
		.option("--color <color>", "New badge color as #RRGGBB or hsla(h, s%, l%, 1)")
		.option("--icon <icon>", "New Tabler icon name, e.g. IconRocket")
		.option("--lead <userId>", `New release lead — a member's user id (or "${CLEAR}" to clear it)`)
		.option("--json", "Output raw JSON")
		.addHelpText(
			"after",
			"\nNote: `--status released` only sets the status (and stamps the released date). It does not close the release's\nopen tasks — use `sayr releases publish` for that."
		)
		.addHelpText("after", GUIDED_HELP)
		.action(async (release: string, opts: UpdateOptions) => {
			try {
				const resolved = await resolveOrgChoice(opts.org, opts);
				let flags = opts;
				let updates = buildUpdates(flags);

				// No field flags is where a terminal takes over: ask what to change instead of giving up.
				const guided = isEmpty(updates) && canPrompt(opts);
				if (guided) {
					flags = await promptForUpdates(release, resolved.org, opts);
					updates = buildUpdates(flags);
				}

				if (isEmpty(updates)) {
					console.log(pc.dim(guided ? "Nothing to update." : "Nothing to update — pass at least one field flag."));
					return;
				}

				await sendUpdate(release, resolved.org, updates, opts.json);
				if (guided) printTip(["releases", "update", release], tipFlags(orgTipFlag(resolved), flags));
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
