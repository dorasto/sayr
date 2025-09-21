"use client";
import type { schema } from "@repo/database";
import { TaskList } from "./table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
}

export default function ListProjectIssues({ tasks, setTasks, ws }: Props) {
	return (
		<div className="">
			<TaskList tasks={tasks} setTasks={setTasks} ws={ws} />
		</div>
	);
}
