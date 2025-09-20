"use client";
import { columns } from "@repo/ui/components/tasks/columns";
import { DataTable } from "@repo/ui/components/tasks/data-table";
import { Search } from "@repo/ui/components/tasks/search";
import { tasks } from "@repo/ui/lib/data";

export default function ListProjectIssues() {
	return (
		<div>
			<Search />
			<DataTable columns={columns} data={tasks} />
		</div>
	);
}
