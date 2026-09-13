import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { printError, printJson } from "../lib/output";
import { resolveOrg } from "../lib/require-org";
import type { Release } from "../types";

export function registerReleasesCommand(program: Command): void {
	const releases = program.command("releases").description("Inspect an organization's releases");

	releases
		.command("list")
		.description("List an organization's releases")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org);
				const result = await apiRequest<Release[]>("/releases", { query: { orgId } });

				if (opts.json) {
					printJson(result);
					return;
				}
				if (result.length === 0) {
					console.log(pc.dim("No releases found."));
					return;
				}
				for (const release of result) {
					console.log(`${pc.bold(release.name)} ${pc.dim(`(${release.status})`)} ${pc.dim(release.id)}`);
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
