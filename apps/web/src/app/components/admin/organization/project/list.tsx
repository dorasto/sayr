"use client";
import type { schema } from "@repo/database";
import { useMemo } from "react";
import { Search } from "./table/search";
import { TaskList } from "./table/task-list";

interface Props {
	tasks: schema.TaskWithLabels[];
}

export default function ListProjectIssues({ tasks }: Props) {
	const items = useMemo(
		() =>
			tasks.map((task) => ({
				...task,
				id: `#${task.shortId}`,
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
