import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { assertCanConfirm, confirmDestructive } from "../../lib/confirm";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import type { PublishReleaseResult } from "../../types";
import { fetchReleaseDetail, formatTaskCount, releasePath } from "./shared";

interface PublishOptions {
	org?: string;
	yes?: boolean;
	json?: boolean;
}

export function registerPublishCommand(releases: Command): void {
	releases
		.command("publish <release>")
		.alias("mark-released")
		.summary("Mark a release released and close its open tasks as done")
		.description(
			"Publish a release (slug or id): mark it released and close its open tasks as done. Can't be undone. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--yes", "Skip the confirmation prompt (required with --json, or when there's no interactive terminal)")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: PublishOptions) => {
			try {
				// First thing, before any network call: a refused command must never touch the API.
				assertCanConfirm(opts);

				const orgId = await resolveOrg(opts.org, opts);
				const detail = await fetchReleaseDetail(orgId, release);

				const wasReleased = detail.status === "released";
				const { open } = detail.taskCounts;

				// Released with nothing left to close: nothing to confirm. Human output stops here; --json falls
				// through to the (idempotent) endpoint so scripts get the server's own `alreadyReleased` result, not
				// a shape the CLI made up. A release that was only *marked* released (a status change, or a drag in
				// the web app) can still have open tasks, and publishing is what closes them.
				if (wasReleased && open === 0 && !opts.json) {
					console.log(pc.dim(`${detail.name} is already released — nothing to do.`));
					return;
				}

				const consequence =
					open === 0 ? "It has no open tasks." : `${formatTaskCount(open)} will be closed as done.`;
				const question = wasReleased
					? `${detail.name} is already released. Close its open tasks?`
					: `Publish ${detail.name}?`;
				const confirmed = await confirmDestructive(`${question} ${consequence}`, opts);
				if (!confirmed) {
					console.log(pc.dim("Cancelled."));
					process.exitCode = 1;
					return;
				}

				const result = await apiRequest<PublishReleaseResult>(`${releasePath(release)}/publish`, {
					method: "POST",
					body: { orgId },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				if (result.alreadyReleased) {
					console.log(pc.dim(`${result.release.name} is already released — nothing to do.`));
					return;
				}
				const verb = wasReleased ? "Closed open tasks in" : "Published";
				console.log(`${pc.green("✓")} ${verb} ${pc.bold(result.release.name)}`);
				if (result.updatedTaskCount > 0) {
					console.log(pc.dim(`${formatTaskCount(result.updatedTaskCount)} closed as done.`));
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
