"use client";

import type { schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { formatDateTime } from "@repo/util";

interface GlobalTaskCreatedAtProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTaskCreatedAt({ task }: GlobalTaskCreatedAtProps) {
	const createdAt = new Date(task.createdAt as Date);
	const updatedAt = new Date(task.updatedAt as Date);

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Created at {formatDateTime(createdAt)}</Label>
			{createdAt.getTime() < updatedAt.getTime() && (
				<Label variant={"description"}>Last updated at {formatDateTime(updatedAt)}</Label>
			)}
		</div>
	);
}
