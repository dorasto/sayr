import { formatTaskKey } from "@repo/util";
import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { resolveOrgShortId } from "../../lib/orgs";
import {
	formatIsoDate,
	healthBadge,
	printError,
	printJson,
	priorityBadge,
	pullRequestBadge,
	releaseStatusBadge,
	statusBadge,
} from "../../lib/output";
import { renderMarkdownOrPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import type { ReleaseStatusUpdate } from "../../types";
import { fetchReleaseDetail, releasePath } from "./shared";

export function registerViewCommand(releases: Command): void {
	releases
		.command("view <release>")
		.summary("Show a release — progress, labels, pull requests, tasks, latest status update")
		.description("Show a release (slug or id) — progress, labels, pull requests, tasks, and its latest status update")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const detail = await fetchReleaseDetail(orgId, release);

				// Best-effort: a status-updates fetch failure shouldn't hide the release itself.
				let latestUpdate: ReleaseStatusUpdate | null = null;
				try {
					const updates = await apiRequest<ReleaseStatusUpdate[]>(`${releasePath(release)}/status-updates`, {
						query: { orgId },
					});
					latestUpdate = updates.reduce<ReleaseStatusUpdate | null>(
						(latest, update) => (!latest || update.createdAt > latest.createdAt ? update : latest),
						null
					);
				} catch {
					// Leave it out — the release above is still useful on its own.
				}

				if (opts.json) {
					printJson({ ...detail, latestStatusUpdate: latestUpdate });
					return;
				}

				console.log(`${pc.bold(detail.name)}  ${releaseStatusBadge(detail.status)}  ${pc.dim(detail.slug)}`);
				const dates: string[] = [];
				if (detail.targetDate) dates.push(`target: ${formatIsoDate(detail.targetDate)}`);
				if (detail.releasedAt) dates.push(`released: ${formatIsoDate(detail.releasedAt)}`);
				if (dates.length > 0) console.log(dates.join("   "));
				if (detail.lead) console.log(`lead: ${detail.lead.name ?? detail.lead.id}`);
				if (detail.labels.length > 0) console.log(`labels: ${detail.labels.map((l) => l.name).join(", ")}`);
				const { total, done, open, canceled } = detail.taskCounts;
				const progress = [`${done}/${total} done`];
				if (open > 0) progress.push(`${open} open`);
				if (canceled > 0) progress.push(`${canceled} canceled`);
				console.log(`progress: ${progress.join(", ")}`);
				if (detail.createdBy) console.log(pc.dim(`created by: ${detail.createdBy.name ?? detail.createdBy.id}`));

				if (detail.githubPullRequests.length > 0) {
					console.log("");
					console.log(pc.bold(`Pull requests (${detail.githubPullRequests.length}):`));
					for (const pr of detail.githubPullRequests) {
						console.log(`  #${pr.prNumber}  ${pullRequestBadge(pr)}  ${pr.title}  ${pc.dim(pr.prUrl)}`);
					}
				}

				const description = renderMarkdownOrPlainText(detail.descriptionMarkdown, detail.description);
				if (description) {
					console.log("");
					console.log(description);
				}

				if (detail.tasks.length > 0) {
					const orgShortId = await resolveOrgShortId(orgId);
					console.log("");
					console.log(pc.bold(`Tasks (${detail.tasks.length}):`));
					for (const t of detail.tasks) {
						const key = orgShortId ? formatTaskKey(orgShortId, t.shortId) : `#${t.shortId ?? "?"}`;
						console.log(
							`  ${pc.bold(key)}  ${statusBadge(t.status)}  ${priorityBadge(t.priority)}  ${t.title ?? pc.dim("(untitled)")}`
						);
					}
				}

				if (latestUpdate) {
					const visibility = latestUpdate.visibility === "internal" ? pc.yellow(" [internal]") : "";
					const author = latestUpdate.author?.name ?? pc.dim("(unknown)");
					console.log("");
					console.log(pc.bold("Latest status update:"));
					console.log(
						`${healthBadge(latestUpdate.health)}${visibility}  ${author}  ${pc.dim(latestUpdate.createdAt)}`
					);
					const text = renderMarkdownOrPlainText(latestUpdate.contentMarkdown, latestUpdate.content);
					if (text) console.log(text);
					console.log(pc.dim(`  see \`sayr releases status-update list ${release}\` for the full history`));
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
