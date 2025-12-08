export type TaskStatus = "backlog" | "todo" | "in-progress" | "done" | "canceled";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	priority: TaskPriority;
	label: string;
}
