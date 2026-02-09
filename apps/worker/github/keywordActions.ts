import { db } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
const API_URL =
	process.env.APP_ENV === "development" ? "http://localhost:5468/api/internal" : "http://backend:5468/api/internal";

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

/* -------------------------------------------------------------- */
/*  handleCloseKeyword                                             */
/* -------------------------------------------------------------- */
export async function handleCloseKeyword(ctx: KeywordContext) {
	const traceAsync = createTraceAsync();
	return traceAsync(
		"sayr.keyword.close",
		async () => {
			const task = await db.query.task.findFirst({
				where: (t) =>
					and(eq(t.organizationId, ctx.orgId), eq(t.shortId, ctx.taskKey), eq(t.category, ctx.categoryId)),
			});

			if (!task) {
				const msg = `❌ task ${ctx.taskKey} not found within org ${ctx.orgId} and category ${ctx.categoryId}.`;
				console.error(msg);
				return msg;
			}

			const res = await fetch(`${API_URL}/v1/admin/organization/task/update`, {
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
			});

			if (!res.ok) {
				const msg = `❌ Failed to close ${ctx.taskKey}: ${res.statusText}`;
				console.error(msg);
				return msg;
			}

			console.log(`✅ Closed task ${ctx.taskKey}.`);
			return `✅ Closed task ${ctx.taskKey}.`;
		},
		{
			description: "Close Sayr task from keyword",
			data: {
				orgId: ctx.orgId,
				categoryId: ctx.categoryId,
				taskKey: ctx.taskKey,
				repo: ctx.repo,
				number: ctx.number,
			},
		}
	);
}

/* -------------------------------------------------------------- */
/*  handleLinkKeyword                                              */
/* -------------------------------------------------------------- */
export async function handleLinkKeyword(ctx: KeywordContext) {
	const traceAsync = createTraceAsync();

	return traceAsync(
		"sayr.keyword.link",
		async () => {
			// --------------------
			// Find Sayr task
			// --------------------
			const foundTask = await db.query.task.findFirst({
				where: (t) =>
					and(
						eq(t.organizationId, ctx.orgId),
						eq(t.shortId, ctx.taskKey)
					),
			});

			if (!foundTask) {
				const msg = `❌ Task ${ctx.taskKey} not found within this organization (${ctx.orgId}).`;
				console.error(msg);
				return msg;
			}

			// --------------------
			// Check: issue already linked?
			// --------------------
			const issueAlreadyLinked = await db.query.githubIssue.findFirst({
				where: (gi) =>
					and(
						eq(gi.organizationId, foundTask.organizationId),
						eq(gi.issueNumber, ctx.number)
					),
			});

			if (issueAlreadyLinked) {
				const msg = `⚠️ GitHub issue #${ctx.number} is already linked to task ${issueAlreadyLinked.taskId}.`;
				console.warn(msg);
				return msg;
			}

			// --------------------
			// Check: task already linked?
			// --------------------
			const taskAlreadyLinked = await db.query.githubIssue.findFirst({
				where: (gi) =>
					and(
						eq(gi.organizationId, foundTask.organizationId),
						eq(gi.taskId, foundTask.id)
					),
			});

			if (taskAlreadyLinked) {
				const msg = `⚠️ Task ${ctx.taskKey} is already linked to GitHub issue #${taskAlreadyLinked.issueNumber}.`;
				console.warn(msg);
				return msg;
			}

			// --------------------
			// Create link
			// --------------------
			const res = await fetch(
				`${API_URL}/v1/admin/organization/task/github-link`,
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
				}
			);

			if (!res.ok) {
				const msg = `❌ Failed to link task ${ctx.taskKey}: ${res.statusText}`;
				console.error(msg);
				return msg;
			}

			console.log(`✅ Linked task ${ctx.taskKey} to #${ctx.number}.`);
			return `✅ Linked task ${ctx.taskKey} to #${ctx.number}.`;
		},
		{
			description: "Link Sayr task to GitHub issue (1:1 enforced)",
			data: {
				orgId: ctx.orgId,
				taskKey: ctx.taskKey,
				repo: ctx.repo,
				number: ctx.number,
			},
		}
	);
}

/* -------------------------------------------------------------- */
/*  handleBlockKeyword – placeholder                               */
/* -------------------------------------------------------------- */
export async function handleBlockKeyword(ctx: KeywordContext) {
	const traceAsync = createTraceAsync();
	await traceAsync(
		"sayr.keyword.block",
		async () => {
			console.log("🚧  Blocked‑by keyword:", ctx);
		},
		{
			description: "Handle 'blocked by' keyword",
			data: {
				orgId: ctx.orgId,
				categoryId: ctx.categoryId,
				taskKey: ctx.taskKey,
			},
		}
	);
}
