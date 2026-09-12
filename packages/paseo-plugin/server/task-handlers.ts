import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { getTaskRpc, listCommentsRpc, listRepliesRpc, listTasksRpc, Task } from "../shared/task";
import { sayrJson } from "./sayr-cli";

/** Hard cap on pages aggregated for the board — 30/page, so 10 pages is 300 tasks. */
const MAX_LIST_PAGES = 10;

export async function listTasks(_input: RpcInput<typeof listTasksRpc>): Promise<RpcOutput<typeof listTasksRpc>> {
	const tasks: Task[] = [];
	for (let page = 1; page <= MAX_LIST_PAGES; page++) {
		const result = await sayrJson<{
			tasks: Task[];
			pagination: { hasMore: boolean };
		}>(["task", "list", "--include-closed", "--sort", "newest", "--limit", "30", "--page", String(page)]);
		tasks.push(...result.tasks);
		if (!result.pagination.hasMore) break;
	}
	return { tasks };
}

export async function getTask(input: RpcInput<typeof getTaskRpc>): Promise<RpcOutput<typeof getTaskRpc>> {
	return sayrJson(["task", "view", input.taskId]);
}

export async function listComments(
	input: RpcInput<typeof listCommentsRpc>
): Promise<RpcOutput<typeof listCommentsRpc>> {
	const args = ["comment", "list", input.taskId];
	if (input.page) args.push("--page", String(input.page));
	return sayrJson(args);
}

export async function listReplies(input: RpcInput<typeof listRepliesRpc>): Promise<RpcOutput<typeof listRepliesRpc>> {
	const args = ["comment", "replies", input.commentId];
	if (input.page) args.push("--page", String(input.page));
	return sayrJson(args);
}
