"use client";
import type { schema } from "@repo/database";
import { TaskList } from "./task/views/table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
	availableUsers?: schema.userType[];
	organization: schema.OrganizationWithMembers;
}

export default function ListTasks({ tasks, setTasks, ws, labels, availableUsers, organization }: Props) {
	return (
		<div className="">
			<TaskList
				tasks={tasks}
				setTasks={setTasks}
				ws={ws}
				labels={labels}
				availableUsers={availableUsers}
				organization={organization}
			/>
		</div>
	);
}
