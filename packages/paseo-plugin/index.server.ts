import type { PluginServerContext } from "@getpaseo/plugin/server";
import { getSettings, setAgentInstructions, setCliBin } from "./server/settings-handlers";
import {
	createComment,
	createLabel,
	getMe,
	getTask,
	listCategories,
	listComments,
	listLabels,
	listOrgs,
	listReleases,
	listReplies,
	listTasks,
	setAssignees,
	setLabels,
	updateTaskPriority,
	updateTaskStatus,
} from "./server/task-handlers";
import { getSettingsRpc, setAgentInstructionsRpc, setCliBinRpc } from "./shared/settings";
import {
	createCommentRpc,
	createLabelRpc,
	getMeRpc,
	getTaskRpc,
	listCategoriesRpc,
	listCommentsRpc,
	listLabelsRpc,
	listOrgsRpc,
	listReleasesRpc,
	listRepliesRpc,
	listTasksRpc,
	setAssigneesRpc,
	setLabelsRpc,
	updateTaskPriorityRpc,
	updateTaskStatusRpc,
} from "./shared/task";

export default function contribute(server: PluginServerContext) {
	server.handle(listOrgsRpc, listOrgs);
	server.handle(listCategoriesRpc, listCategories);
	server.handle(listReleasesRpc, listReleases);
	server.handle(listLabelsRpc, listLabels);
	server.handle(createLabelRpc, createLabel);
	server.handle(getMeRpc, getMe);
	server.handle(listTasksRpc, listTasks);
	server.handle(getTaskRpc, getTask);
	server.handle(listCommentsRpc, listComments);
	server.handle(listRepliesRpc, listReplies);
	server.handle(updateTaskStatusRpc, updateTaskStatus);
	server.handle(updateTaskPriorityRpc, updateTaskPriority);
	server.handle(setAssigneesRpc, setAssignees);
	server.handle(setLabelsRpc, setLabels);
	server.handle(createCommentRpc, createComment);
	server.handle(getSettingsRpc, getSettings);
	server.handle(setCliBinRpc, setCliBin);
	server.handle(setAgentInstructionsRpc, setAgentInstructions);
	return () => {};
}
