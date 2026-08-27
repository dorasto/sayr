import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../lib/client";
import { printError, printJson } from "../lib/output";
import type { Organization } from "../types";

export function registerOrgsCommand(program: Command): void {
	const orgs = program.command("orgs").description("Inspect organizations you belong to");

	orgs
		.command("list")
		.description("List your organizations")
		.option("--json", "Output raw JSON")
		.action(async (opts: { json?: boolean }) => {
			try {
				const organizations = await apiRequest<Organization[]>("/organizations");
				if (opts.json) {
					printJson(organizations);
					return;
				}
				if (organizations.length === 0) {
					console.log(pc.dim("No organizations found."));
					return;
				}
				for (const org of organizations) {
					console.log(`${pc.bold(org.shortId)}  ${org.name} ${pc.dim(`(${org.slug})`)}`);
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
