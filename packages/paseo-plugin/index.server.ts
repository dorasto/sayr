import type { PluginServerContext } from "@getpaseo/plugin/server";
import { getSettings, setCliBin } from "./server/settings-handlers";
import {
	createComment,
	getTask,
	listCategories,
	listComments,
	listOrgs,
	listReplies,
	listTasks,
	setAssignees,
	updateTaskPriority,
	updateTaskStatus,
} from "./server/task-handlers";
import { getSettingsRpc, setCliBinRpc } from "./shared/settings";
import {
	createCommentRpc,
	getTaskRpc,
	listCategoriesRpc,
	listCommentsRpc,
	listOrgsRpc,
	listRepliesRpc,
	listTasksRpc,
	setAssigneesRpc,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "./shared/task";

export default function contribute(server: PluginServerContext) {
	server.handle(listOrgsRpc, listOrgs);
	server.handle(listCategoriesRpc, listCategories);
	server.handle(listTasksRpc, listTasks);
	server.handle(getTaskRpc, getTask);
	server.handle(listCommentsRpc, listComments);
	server.handle(listRepliesRpc, listReplies);
	server.handle(updateTaskStatusRpc, updateTaskStatus);
	server.handle(updateTaskPriorityRpc, updateTaskPriority);
	server.handle(setAssigneesRpc, setAssignees);
	server.handle(createCommentRpc, createComment);
	server.handle(getSettingsRpc, getSettings);
	server.handle(setCliBinRpc, setCliBin);
	return () => {};
}
