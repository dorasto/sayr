import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest } from "../../lib/client";
import { healthBadge, printError, printJson } from "../../lib/output";
import { renderMarkdownOrPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { ReleaseStatusUpdate, ReleaseStatusUpdateInput } from "../../types";
import { RELEASE_HEALTHS, releasePath, VISIBILITIES } from "./shared";

interface FieldOptions {
	org?: string;
	health?: string;
	visibility?: string;
	json?: boolean;
}

const statusUpdatePath = (release: string, updateId?: string): string =>
	`${releasePath(release)}/status-updates${updateId === undefined ? "" : `/${encodeURIComponent(updateId)}`}`;

export function registerReleaseStatusUpdateCommand(releases: Command): void {
	const statusUpdate = releases
		.command("status-update")
		.description("List, post, edit, and delete a release's status updates");

	statusUpdate
		.command("list <release>")
		.description("List a release's status updates (slug or id), newest first")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const updates = await apiRequest<ReleaseStatusUpdate[]>(statusUpdatePath(release), { query: { orgId } });

				if (opts.json) {
					printJson(updates);
					return;
				}
				if (updates.length === 0) {
					console.log(pc.dim("No status updates."));
					return;
				}
				for (const update of updates) {
					const author = update.author?.name ?? pc.dim("(unknown)");
					const visibility = update.visibility === "internal" ? pc.yellow(" [internal]") : "";
					console.log(
						`${healthBadge(update.health)}${visibility}  ${pc.bold(author)}  ${pc.dim(update.createdAt)}  ${pc.dim(update.id)}`
					);
					const text = renderMarkdownOrPlainText(update.contentMarkdown, update.content);
					if (text) console.log(text);
					if (update.commentCount > 0) {
						console.log(
							pc.dim(
								`  ${update.commentCount} comment${update.commentCount === 1 ? "" : "s"} — see \`sayr releases comment list ${release} --status-update ${update.id}\``
							)
						);
					}
					console.log("");
				}
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	statusUpdate
		.command("create <release> [content]")
		.summary("Post a status update on a release")
		.description(
			"Post a status update on a release (slug or id) — Markdown supported. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--health <health>", `Release health (${RELEASE_HEALTHS.join(", ")}, default: on_track)`)
		.option("--visibility <visibility>", `Who can see it (${VISIBILITIES.join(", ")}, default: public)`)
		.option("--json", "Output raw JSON")
		.action(async (release: string, content: string | undefined, opts: FieldOptions) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const health = assertOneOf(opts.health, RELEASE_HEALTHS, "--health");
				const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

				const body: ReleaseStatusUpdateInput = { orgId, content, health, visibility };
				const created = await apiRequest<Pick<ReleaseStatusUpdate, "id" | "health">>(statusUpdatePath(release), {
					method: "POST",
					body,
				});

				if (opts.json) {
					printJson(created);
					return;
				}
				console.log(`${pc.green("✓")} Status update posted (${healthBadge(created.health)}) ${pc.dim(created.id)}`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	statusUpdate
		.command("update <release> <updateId> [content]")
		.summary("Edit a status update's content, health, or visibility")
		.description(
			"Edit a status update — only the fields you pass are changed; content is Markdown. Needs the manageReleases permission."
		)
		.option("--org <org>", "Organization slug or id")
		.option("--health <health>", `New release health (${RELEASE_HEALTHS.join(", ")})`)
		.option("--visibility <visibility>", `New visibility (${VISIBILITIES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.action(async (release: string, updateId: string, content: string | undefined, opts: FieldOptions) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const health = assertOneOf(opts.health, RELEASE_HEALTHS, "--health");
				const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

				if (content === undefined && health === undefined && visibility === undefined) {
					console.log(pc.dim("Nothing to update — pass content, --health, or --visibility."));
					return;
				}

				const body: ReleaseStatusUpdateInput = { orgId, content, health, visibility };
				const updated = await apiRequest<{ id: string }>(statusUpdatePath(release, updateId), {
					method: "PATCH",
					body,
				});

				if (opts.json) {
					printJson(updated);
					return;
				}
				console.log(`${pc.green("✓")} Status update updated.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	statusUpdate
		.command("delete <release> <updateId>")
		.summary("Delete a status update")
		.description("Delete a status update and its comments. Needs the manageReleases permission.")
		.option("--org <org>", "Organization slug or id")
		.option("--json", "Output raw JSON")
		.action(async (release: string, updateId: string, opts: { org?: string; json?: boolean }) => {
			try {
				const orgId = await resolveOrg(opts.org, opts);
				const result = await apiRequest<{ id: string }>(statusUpdatePath(release, updateId), {
					method: "DELETE",
					query: { orgId },
				});

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Status update deleted.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
