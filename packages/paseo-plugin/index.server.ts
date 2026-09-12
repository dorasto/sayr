import type { PluginServerContext } from "@getpaseo/plugin/server";
import { getSettings, setCliBin } from "./server/settings-handlers";
import { getTask, listComments, listReplies, listTasks } from "./server/task-handlers";
import { getSettingsRpc, setCliBinRpc } from "./shared/settings";
import { getTaskRpc, listCommentsRpc, listRepliesRpc, listTasksRpc } from "./shared/task";

export default function contribute(server: PluginServerContext) {
	server.handle(listTasksRpc, listTasks);
	server.handle(getTaskRpc, getTask);
	server.handle(listCommentsRpc, listComments);
	server.handle(listRepliesRpc, listReplies);
	server.handle(getSettingsRpc, getSettings);
	server.handle(setCliBinRpc, setCliBin);
	return () => {};
}
