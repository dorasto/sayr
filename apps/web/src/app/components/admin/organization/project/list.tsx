"use client";
import type { schema } from "@repo/database";
import { useMemo } from "react";
import { Search } from "./table/search";
import { TaskList } from "./table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
}
export type TaskType = {
	id: string;
	title: string | null;
	status: "backlog" | "todo" | "in-progress" | "done" | "canceled" | null;
	priority: "low" | "medium" | "high" | "none" | "urgent" | null;
	labels: Array<{
		id: string;
		name: string;
		color: string | null;
	}>;
};

export default function ListProjectIssues({ tasks }: Props) {
	const items = useMemo(
		() =>
			tasks.map((task) => ({
				id: `#${task.shortId}`,
				title: task.title,
				status: task.status,
				priority: task.priority,
				labels: task.labels || [],
			})),
		[tasks]
	);
	return (
		<div className="">
			{/* <Search /> */}
			<TaskList tasks={items} />
		</div>
	);
}
