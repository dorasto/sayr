"use client";
import type { schema } from "@repo/database";
import { TaskList } from "./table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
}

export default function ListProjectIssues({ tasks, setTasks, ws, labels }: Props) {
	return (
		<div className="">
			<TaskList tasks={tasks} setTasks={setTasks} ws={ws} labels={labels} />
		</div>
	);
}
