import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { assertCanConfirm, confirmDestructive } from "../../lib/confirm";
import { printError, printJson } from "../../lib/output";
import { resolveOrg } from "../../lib/require-org";
import { fetchReleaseDetail, formatTaskCount, releasePath } from "./shared";

interface DeleteOptions {
	org?: string;
	yes?: boolean;
	json?: boolean;
}

export function registerDeleteCommand(releases: Command): void {
	releases
		.command("delete <release>")
		.summary("Delete a release (its tasks are unlinked, not deleted)")
		.description(
			"Delete a release (slug or id). Its tasks are unlinked, not deleted. Can't be undone. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--yes", "Skip the confirmation prompt (required with --json, or when there's no interactive terminal)")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: DeleteOptions) => {
			try {
				// First thing, before any network call: a refused command must never touch the API.
				assertCanConfirm(opts);

				const orgId = await resolveOrg(opts.org, opts);
				const detail = await fetchReleaseDetail(orgId, release);

				const { total } = detail.taskCounts;
				const consequence =
					total === 0
						? "It has no tasks."
						: `Its ${formatTaskCount(total)} ${total === 1 ? "is" : "are"} unlinked, not deleted.`;
				const confirmed = await confirmDestructive(
					`Delete ${detail.name}? ${consequence} This can't be undone.`,
					opts
				);
				if (!confirmed) {
					console.log(pc.dim("Cancelled."));
					process.exitCode = 1;
					return;
				}

				const result = await apiRequest<{ id: string }>(releasePath(release), {
					method: "DELETE",
					query: { orgId },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Deleted ${pc.bold(detail.name)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
