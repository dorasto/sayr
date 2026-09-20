import type { Command } from "commander";
import pc from "picocolors";
import { apiRequest, apiRequestPaginated } from "../../lib/client";
import { printError, printJson } from "../../lib/output";
import { renderMarkdownOrPlainText } from "../../lib/prosekit";
import { resolveOrg } from "../../lib/require-org";
import { assertOneOf } from "../../lib/validate";
import type { CreateReleaseCommentInput, ReleaseComment, UpdateReleaseCommentInput } from "../../types";
import { releasePath, VISIBILITIES } from "./shared";

/** Comments addressed by their own id — the server derives the org from the comment, so there's no `--org`. */
const commentPath = (commentId: string): string => `/release-comments/${encodeURIComponent(commentId)}`;

function printComments(comments: ReleaseComment[]): void {
	for (const c of comments) {
		const author = c.createdBy?.name ?? pc.dim("(unknown)");
		const visibility = c.visibility === "internal" ? pc.yellow(" [internal]") : "";
		console.log(`${pc.bold(author)}${visibility}  ${pc.dim(c.createdAt)}  ${pc.dim(c.id)}`);
		if (c.statusUpdateId) console.log(pc.dim(`  on status update ${c.statusUpdateId}`));
		const text = renderMarkdownOrPlainText(c.contentMarkdown, c.content);
		if (text) console.log(text);
		const replyCount = c.replyCount ?? 0;
		if (replyCount > 0) {
			console.log(
				pc.dim(
					`  ${replyCount} repl${replyCount === 1 ? "y" : "ies"} — see \`sayr releases comment replies ${c.id}\``
				)
			);
		}
		console.log("");
	}
}

export function registerReleaseCommentCommand(releases: Command): void {
	const comment = releases.command("comment").description("List, post, edit, and delete comments on a release");

	comment
		.command("list <release>")
		.description("List a release's top-level comments (slug or id), oldest first")
		.option("--org <org>", "Organization slug or id")
		.option(
			"--status-update <updateId>",
			'Only comments on this status update ("null" for comments on the release itself)'
		)
		.option("--page <page>", "Page number")
		.option("--limit <limit>", "Results per page (default 10, max 50)")
		.option("--json", "Output raw JSON")
		.action(
			async (
				release: string,
				opts: { org?: string; statusUpdate?: string; page?: string; limit?: string; json?: boolean }
			) => {
				try {
					const orgId = await resolveOrg(opts.org);

					const { data: comments, pagination } = await apiRequestPaginated<ReleaseComment[]>(
						`${releasePath(release)}/comments`,
						{ query: { orgId, statusUpdateId: opts.statusUpdate, page: opts.page, limit: opts.limit } }
					);

					if (opts.json) {
						printJson({ comments, pagination });
						return;
					}
					if (comments.length === 0) {
						console.log(pc.dim("No comments."));
						return;
					}
					printComments(comments);
					console.log(
						pc.dim(`Page ${pagination.page} of ${pagination.totalPages} — ${pagination.totalItems} total`)
					);
				} catch (err) {
					printError(err);
					process.exitCode = 1;
				}
			}
		);

	comment
		.command("replies <commentId>")
		.description("List replies to a top-level release comment, oldest first")
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, opts: { json?: boolean }) => {
			try {
				// Unlike top-level comments, a thread's replies come back in one unpaginated array.
				const replies = await apiRequest<ReleaseComment[]>(`${commentPath(commentId)}/replies`);

				if (opts.json) {
					printJson(replies);
					return;
				}
				if (replies.length === 0) {
					console.log(pc.dim("No replies."));
					return;
				}
				printComments(replies);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	comment
		.command("create <release> <content>")
		.description("Post a comment on a release (slug or id) — Markdown supported")
		.option("--org <org>", "Organization slug or id")
		.option("--reply-to <commentId>", "Reply to this top-level comment")
		.option("--status-update <updateId>", "Attach the comment to this status update (a reply joins its parent's)")
		.option("--visibility <visibility>", `Comment visibility (${VISIBILITIES.join(", ")}, default: public)`)
		.option("--json", "Output raw JSON")
		.action(
			async (
				release: string,
				content: string,
				opts: { org?: string; replyTo?: string; statusUpdate?: string; visibility?: string; json?: boolean }
			) => {
				try {
					const orgId = await resolveOrg(opts.org);
					const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

					const body: CreateReleaseCommentInput = {
						orgId,
						content,
						visibility,
						parentId: opts.replyTo,
						statusUpdateId: opts.statusUpdate,
					};
					const result = await apiRequest<{ id: string }>(`${releasePath(release)}/comments`, {
						method: "POST",
						body,
					});

					if (opts.json) {
						printJson(result);
						return;
					}
					console.log(`${pc.green("✓")} Comment posted. ${pc.dim(result.id)}`);
				} catch (err) {
					printError(err);
					process.exitCode = 1;
				}
			}
		);

	comment
		.command("update <commentId> <content>")
		.summary("Edit a release comment's content and/or visibility")
		.description(
			"Edit a release comment's content (Markdown supported) and/or visibility. Your own needs tasks.comment; someone else's needs comment moderation."
		)
		.option("--visibility <visibility>", `New visibility (${VISIBILITIES.join(", ")})`)
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, content: string, opts: { visibility?: string; json?: boolean }) => {
			try {
				const visibility = assertOneOf(opts.visibility, VISIBILITIES, "--visibility");

				const body: UpdateReleaseCommentInput = { content, visibility };
				const result = await apiRequest<{ id: string }>(commentPath(commentId), { method: "PATCH", body });

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Comment updated.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});

	comment
		.command("delete <commentId>")
		.summary("Delete a release comment")
		.description("Delete a release comment. Your own needs tasks.comment; someone else's needs comment moderation.")
		.option("--json", "Output raw JSON")
		.action(async (commentId: string, opts: { json?: boolean }) => {
			try {
				const result = await apiRequest<{ id: string }>(commentPath(commentId), { method: "DELETE" });

				if (opts.json) {
					printJson(result);
					return;
				}
				console.log(`${pc.green("✓")} Comment deleted.`);
			} catch (err) {
				printError(err);
				process.exitCode = 1;
			}
		});
}
