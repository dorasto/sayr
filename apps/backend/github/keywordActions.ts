// src/github/keywordActions.ts
import { Octokit } from "@octokit/rest";
import { getInstallationToken } from "./auth";

// common shape for handlers
export interface KeywordContext {
	issueKey: string;
	owner: string;
	repo: string;
	number: number;
	installationId: number;
	merged?: boolean;
}

// --- Example Sayr action stubs ---
// (replace these with your actual Sayr API calls later)
async function markSayrClosed(issueKey: string) {
	await fetch(`${process.env.NEXT_PUBLIC_API_SERVER}/internal/github-close-task`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			shortId: issueKey,
			orgId: "45205CEF-184A-4D32-BE02-81341B7C15F9",
		}),
	});
	console.log(`🧩 [Sayr] Marked issue ${issueKey} as closed.`);
}

async function linkSayrReference(issueKey: string) {
	console.log(`🔗 [Sayr] Linked reference ${issueKey}.`);
}

async function markSayrBlocked(issueKey: string) {
	console.log(`🚧 [Sayr] Marked ${issueKey} as blocked.`);
}

// --- Handlers called by worker ---
export async function handleCloseKeyword(ctx: KeywordContext) {
	await markSayrClosed(ctx.issueKey);
}

export async function handleLinkKeyword(ctx: KeywordContext) {
	await linkSayrReference(ctx.issueKey);
}

export async function handleBlockKeyword(ctx: KeywordContext) {
	await markSayrBlocked(ctx.issueKey);
}

// --- GitHub comment summary (optional) ---
export async function postGithubComment(ctx: KeywordContext, body: string) {
	const token = await getInstallationToken(ctx.installationId);
	const octokit = new Octokit({ auth: token });

	await octokit.issues.createComment({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: ctx.number,
		body,
	});
}
