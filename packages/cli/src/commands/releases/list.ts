import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { formatIsoDate, printError, printJson, releaseStatusBadge } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { Release } from "../../types";
import { RELEASE_STATUSES } from "./shared";

export function registerListCommand(releases: Command): void {
	releases
		.command("list")
		.description("List an organization's releases")
		.option("--org <org>", "Organization slug or id")
		.option("--status <status>", `Only releases with this status (${RELEASE_STATUSES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.action(async (opts: { org?: string; status?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const status = assertOneOf(opts.status, RELEASE_STATUSES, "--status");
				const result = await apiRequest<Release[]>("/releases", { query: { orgId, status } });

				if (opts.json) {
					printJson(result);
					return;
				}
				if (result.length === 0) {
					console.log(pc.dim("No releases found."));
					return;
				}
				for (const release of result) {
					const target = release.targetDate ? `  target ${formatIsoDate(release.targetDate)}` : "";
					console.log(
						`${pc.bold(release.name)}  ${releaseStatusBadge(release.status)}  ${pc.dim(release.slug)}${pc.dim(target)}  ${pc.dim(release.id)}`
					);
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
