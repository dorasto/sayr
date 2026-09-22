import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { parseIdList } from "../../lib/parse-id-list";
import { resolveOrg } from "../../lib/require-org";
import { resolveLabels } from "../../lib/resolve-names";
import type { Label } from "../../types";
import { releasePath } from "./shared";

interface LabelOptions {
	org?: string;
	add?: string;
	remove?: string;
	json?: boolean;
}

export function registerLabelCommand(releases: Command): void {
	releases
		.command("label <release>")
		.summary("Add or remove labels on a release")
		.description(
			"Add and/or remove labels on a release (slug or id). Each label is its own request and re-applying one is harmless, so a failed run is safe to repeat. Needs the manageReleases permission."
		)
		.option("--add <labels>", "Comma-separated label names or ids to add")
		.option("--remove <labels>", "Comma-separated label names or ids to remove")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: LabelOptions) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				// Names or ids in, ids out. (UUIDs are sent untouched, with no lookup.)
				const added = await resolveLabels(orgId, parseIdList(opts.add ?? ""), "--add");
				const removed = await resolveLabels(orgId, parseIdList(opts.remove ?? ""), "--remove");

				if (added.length === 0 && removed.length === 0) {
					console.log(pc.dim("Nothing to do — pass --add and/or --remove with at least one label id."));
					return;
				}

				// One request per label; each response is the release's label set as it stands after that
				// call, so the last one is the final state.
				let labels: Label[] = [];
				for (const labelId of added) {
					labels = await apiRequest<Label[]>(`${releasePath(release)}/labels`, {
						method: "POST",
						body: { orgId, labelId },
					});
				}
				for (const labelId of removed) {
					labels = await apiRequest<Label[]>(`${releasePath(release)}/labels/${encodeURIComponent(labelId)}`, {
						method: "DELETE",
						query: { orgId },
					});
				}

				if (opts.json) {
					printJson(labels);
					return;
				}
				const names = labels.map((l) => l.name).join(", ") || pc.dim("(none)");
				console.log(`${pc.green("✓")} Labels on ${pc.bold(release)}: ${names}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
