import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertDate, assertOneOf } from "../../lib/validate";
import type { Release, UpdateReleaseInput } from "../../types";
import { RELEASE_STATUSES, releasePath } from "./shared";

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
		.action(async (release: string, opts: UpdateOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const status = assertOneOf(opts.status, RELEASE_STATUSES, "--status");

				const updates: Omit<UpdateReleaseInput, "orgId"> = {
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

				// `null` is a value here (it clears the field), so only `undefined` means "flag not passed".
				if (Object.values(updates).every((v) => v === undefined)) {
					console.log(pc.dim("Nothing to update — pass at least one field flag."));
					return;
				}

				const body: UpdateReleaseInput = { orgId, ...updates };
				const updated = await apiRequest<Release>(releasePath(release), { method: "PATCH", body });

				if (opts.json) {
					printJson(updated);
					return;
				}
				console.log(`${pc.green("✓")} Updated ${pc.bold(updated.name)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
