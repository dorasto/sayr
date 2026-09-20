import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertDate, assertOneOf } from "../../lib/validate";
import type { CreateReleaseInput, Release } from "../../types";
import { RELEASE_STATUSES } from "./shared";

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

export function registerCreateCommand(releases: Command): void {
	releases
		.command("create <name>")
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
		.action(async (name: string, opts: CreateOptions) => {
			try {
				const orgId = await resolveOrg(opts.org);
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
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
