"use client";
import type { schema } from "@repo/database";
import { TaskList } from "./table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
	availableUsers?: schema.userType[];
	organization: schema.OrganizationWithMembers;
	project: schema.projectType;
}

export default function ListProjectIssues({
	tasks,
	setTasks,
	ws,
	labels,
	availableUsers,
	organization,
	project,
}: Props) {
	return (
		<div className="">
			<TaskList
				tasks={tasks}
				setTasks={setTasks}
				ws={ws}
				labels={labels}
				availableUsers={availableUsers}
				organization={organization}
				project={project}
			/>
		</div>
	);
}
