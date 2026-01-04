import { db } from "@repo/database";
import { and, eq } from "drizzle-orm";

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
	categoryId: string;
}

// --- Handlers called by worker ---
export async function handleCloseKeyword(ctx: KeywordContext) {
	const task = await db.query.task.findFirst({
		where: (t) =>
			and(
				eq(t.organizationId, ctx.orgId),
				eq(t.shortId, ctx.taskKey),
				eq(t.category, ctx.categoryId),
			),
	});
	if (task) {
		const data = await fetch(
			`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
					"user-agent": "Sayr-Worker/1.0",
					"x-internal-secret": process.env.INTERNAL_SECRET!,
					"x-internal-service": "sayr-worker",
					"x-internal-timestamp": new Date().toISOString(),
				},
				body: JSON.stringify({
					org_id: ctx.orgId,
					task_id: task.id,
					status: "done",
				}),
			},
		);
		if (!data.ok) {
			console.error(
				`❌ [Sayr] Failed to close issue ${ctx.taskKey}: ${data.statusText}`,
			);
			return `❌ Failed to close task ${ctx.taskKey}: ${data.statusText}`;
		}
		console.log(`✅ [Sayr] Closed issue ${ctx.taskKey}.`);
		return `✅ Closed task ${ctx.taskKey}.`;
	} else {
		console.error(
			`❌ [Sayr] Issue ${ctx.taskKey} not found within org ${ctx.orgId} and category ${ctx.categoryId}.`,
		);
		return `❌ task ${ctx.taskKey} not found within this organization or category.`;
	}
}

export async function handleLinkKeyword(ctx: KeywordContext) {
	// Find the task in the org
	const foundTask = await db.query.task.findFirst({
		where: (t) =>
			and(eq(t.organizationId, ctx.orgId), eq(t.shortId, ctx.taskKey)),
	});

	// Case 1: Task not in org
	if (!foundTask) {
		const msg = `❌ Task ${ctx.taskKey} not found within this organization (${ctx.orgId}).`;
		console.error(`[Sayr] ${msg}`);
		return msg;
	}

	// Case 2: Task already linked to a GitHub issue
	const existingIssue = await db.query.githubIssue.findFirst({
		where: (gi) =>
			and(
				eq(gi.organizationId, foundTask.organizationId),
				eq(gi.taskId, foundTask.id),
			),
	});

	if (existingIssue) {
		const msg = `⚠️ Task ${ctx.taskKey} is already linked to a GitHub issue (#${existingIssue.issueNumber}).`;
		console.error(`[Sayr] ${msg}`);
		return msg;
	}

	// --- Perform the link call (similar pattern to handleCloseKeyword) ---
	const data = await fetch(
		`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/github-link`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
				"user-agent": "Sayr-Worker/1.0",
				"x-internal-secret": process.env.INTERNAL_SECRET!,
				"x-internal-service": "sayr-worker",
				"x-internal-timestamp": new Date().toISOString(),
			},
			body: JSON.stringify({
				org_id: ctx.orgId,
				task_id: foundTask.id,
				repo_id: ctx.repoId,
				issue_number: ctx.number,
				issue_url: `https://github.com/${ctx.owner}/${ctx.repo}/issues/${ctx.number}`,
			}),
		},
	);

	if (!data.ok) {
		console.error(
			`❌ [Sayr] Failed to link task ${ctx.taskKey}: ${data.statusText}`,
		);
		return `❌ Failed to link task ${ctx.taskKey}: ${data.statusText}`;
	}

	console.log(
		`✅ [Sayr] Linked task ${ctx.taskKey} to GitHub issue #${ctx.number}.`,
	);
	return `✅ Linked task ${ctx.taskKey} to GitHub issue #${ctx.number}.`;
}

export async function handleBlockKeyword(ctx: KeywordContext) {
	console.log("🚀 ~ handleBlockKeyword ~ ctx:", ctx);
}
