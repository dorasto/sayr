// src/github/keywordActions.ts
import { Octokit } from "@octokit/rest";
import { db } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { getInstallationToken } from "./auth";

// common shape for handlers
export interface KeywordContext {
	issueKey: number;
	owner: string;
	repo: string;
	number: number;
	installationId: number;
	merged?: boolean;
}

// --- Example Sayr action stubs ---
// (replace these with your actual Sayr API calls later)
async function markSayrClosed(issueKey: number) {
	const orgId = "45205CEF-184A-4D32-BE02-81341B7C15F9";
	const task = await db.query.task.findFirst({
		where: (t) => and(eq(t.organizationId, orgId), eq(t.shortId, issueKey)),
	});
	if (task) {
		const data = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
			},
			body: JSON.stringify({
				org_id: orgId,
				task_id: task.id,
				status: "done",
			}),
		});
		if (!data.ok) {
			console.error(`❌ [Sayr] Failed to close issue ${issueKey}: ${data.statusText}`);
			return;
		}
		console.log(`✅ [Sayr] Closed issue ${issueKey}.`);
	} else {
		console.error(`❌ [Sayr] Issue ${issueKey} not found in database.`);
	}
}

async function linkSayrReference(issueKey: number) {
	console.log(`🔗 [Sayr] Linked reference ${issueKey}.`);
}

async function markSayrBlocked(issueKey: number) {
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
