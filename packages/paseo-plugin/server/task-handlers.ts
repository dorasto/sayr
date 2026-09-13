import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type {
	CategoryInfo,
	createCommentRpc,
	getTaskRpc,
	listCategoriesRpc,
	listCommentsRpc,
	listOrgsRpc,
	listRepliesRpc,
	listTasksRpc,
	Org,
	setAssigneesRpc,
	Task,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "../shared/task";
import { sayrJson } from "./sayr-cli";

/** Hard cap on pages aggregated per org — 30/page, so 10 pages is 300 tasks/org. */
const MAX_LIST_PAGES = 10;

export async function listOrgs(_input: RpcInput<typeof listOrgsRpc>): Promise<RpcOutput<typeof listOrgsRpc>> {
	const orgs = await sayrJson<Org[]>(["orgs", "list"]);
	return { orgs };
}

export async function listCategories(
	input: RpcInput<typeof listCategoriesRpc>
): Promise<RpcOutput<typeof listCategoriesRpc>> {
	const categories = await sayrJson<CategoryInfo[]>(["categories", "list", "--org", input.orgSlug]);
	return { categories };
}

async function findOrg(orgSlug: string): Promise<Org> {
	const orgs = await sayrJson<Org[]>(["orgs", "list"]);
	const org = orgs.find((candidate) => candidate.slug === orgSlug);
	if (!org) {
		throw new Error(`Organization "${orgSlug}" not found (or not visible to this CLI login).`);
	}
	return org;
}

async function listTasksForOrg(org: Org): Promise<Task[]> {
	const tasks: Task[] = [];
	for (let page = 1; page <= MAX_LIST_PAGES; page++) {
		// No --include-closed: done/canceled tasks aren't shown on the board at
		// all (see BOARD_STATUSES in client/board.tsx), so fetching them here
		// would just be wasted CLI/API round-trips.
		const result = await sayrJson<{ tasks: Task[]; pagination: { hasMore: boolean } }>([
			"task",
			"list",
			"--org",
			org.slug,
			"--sort",
			"newest",
			"--limit",
			"30",
			"--page",
			String(page),
		]);
		for (const task of result.tasks) {
			tasks.push({ ...task, orgId: org.id, orgSlug: org.slug, orgShortId: org.shortId });
		}
		if (!result.pagination.hasMore) break;
	}
	return tasks;
}

export async function listTasks(_input: RpcInput<typeof listTasksRpc>): Promise<RpcOutput<typeof listTasksRpc>> {
	const orgs = await sayrJson<Org[]>(["orgs", "list"]);
	const perOrg = await Promise.all(orgs.map((org) => listTasksForOrg(org)));
	return { tasks: perOrg.flat(), orgs };
}

export async function getTask(input: RpcInput<typeof getTaskRpc>): Promise<RpcOutput<typeof getTaskRpc>> {
	const [task, org] = await Promise.all([
		sayrJson<Record<string, unknown>>(["task", "view", input.taskId, "--org", input.orgSlug]),
		findOrg(input.orgSlug),
	]);
	return { ...task, orgId: org.id, orgSlug: org.slug, orgShortId: org.shortId } as RpcOutput<typeof getTaskRpc>;
}

export async function listComments(
	input: RpcInput<typeof listCommentsRpc>
): Promise<RpcOutput<typeof listCommentsRpc>> {
	const args = ["comment", "list", input.taskId, "--org", input.orgSlug];
	if (input.page) args.push("--page", String(input.page));
	return sayrJson(args);
}

export async function listReplies(input: RpcInput<typeof listRepliesRpc>): Promise<RpcOutput<typeof listRepliesRpc>> {
	const args = ["comment", "replies", input.commentId];
	if (input.page) args.push("--page", String(input.page));
	return sayrJson(args);
}

export async function updateTaskStatus(
	input: RpcInput<typeof updateTaskStatusRpc>
): Promise<RpcOutput<typeof updateTaskStatusRpc>> {
	await sayrJson(["task", "update", input.taskId, "--org", input.orgSlug, "--status", input.status]);
	return { ok: true };
}

export async function updateTaskPriority(
	input: RpcInput<typeof updateTaskPriorityRpc>
): Promise<RpcOutput<typeof updateTaskPriorityRpc>> {
	await sayrJson(["task", "update", input.taskId, "--org", input.orgSlug, "--priority", input.priority]);
	return { ok: true };
}

export async function setAssignees(
	input: RpcInput<typeof setAssigneesRpc>
): Promise<RpcOutput<typeof setAssigneesRpc>> {
	await sayrJson(["task", "assign", input.taskId, "--org", input.orgSlug, "--set", input.userIds.join(",")]);
	return { ok: true };
}

export async function createComment(
	input: RpcInput<typeof createCommentRpc>
): Promise<RpcOutput<typeof createCommentRpc>> {
	await sayrJson(["comment", "create", input.taskId, input.content, "--org", input.orgSlug]);
	return { ok: true };
}
