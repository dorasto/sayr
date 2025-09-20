"use client";
import type { schema } from "@repo/database";
import { useMemo } from "react";
import { DataTable } from "./table";
import { columns } from "./table/columns";
import { Search } from "./table/search";

interface Props {
	tasks: schema.TaskWithLabels[];
}
export type TaskType = {
	id: string;
	title: string | null;
	status: "backlog" | "todo" | "in-progress" | "done" | "canceled" | null;
	priority: "low" | "medium" | "high" | "none" | "urgent" | null;
	label: string;
};

export default function ListProjectIssues({ tasks }: Props) {
	const items = useMemo(
		() =>
			tasks.map((task) => ({
				id: `TASK-${task.shortId}`,
				title: task.title,
				status: task.status,
				priority: task.priority,
				label: "",
			})),
		[tasks]
	);
	return (
		<div>
			<Search />
			<DataTable columns={columns} data={items} />
		</div>
	);
}
