import { Octokit } from "@octokit/rest";
import { db } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { getInstallationToken } from "./auth";

// common shape for handlers
export interface KeywordContext {
	taskKey: number;
	owner: string;
	repoId: number;
	repo: string;
	number: number;
	installationId: number;
	merged?: boolean;
	orgId: string;
}

// --- Handlers called by worker ---
export async function handleCloseKeyword(ctx: KeywordContext) {
	const task = await db.query.task.findFirst({
		where: (t) => and(eq(t.organizationId, ctx.orgId), eq(t.shortId, ctx.taskKey)),
	});
	if (task) {
		const data = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
			},
			body: JSON.stringify({
				org_id: ctx.orgId,
				task_id: task.id,
				status: "done",
			}),
		});
		if (!data.ok) {
			console.error(`❌ [Sayr] Failed to close issue ${ctx.taskKey}: ${data.statusText}`);
			return `❌ Failed to close task ${ctx.taskKey}: ${data.statusText}`;
		}
		console.log(`✅ [Sayr] Closed issue ${ctx.taskKey}.`);
		return `✅ Closed task ${ctx.taskKey}.`;
	} else {
		console.error(`❌ [Sayr] Issue ${ctx.taskKey} not found in database.`);
		return `❌ task ${ctx.taskKey} not found.`;
	}
}

export async function handleLinkKeyword(ctx: KeywordContext) {
	console.log("🚀 ~ handleLinkKeyword ~ ctx:", ctx);
}

export async function handleBlockKeyword(ctx: KeywordContext) {
	console.log("🚀 ~ handleBlockKeyword ~ ctx:", ctx);
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
