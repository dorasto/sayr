"use client";

import type { schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { formatDateTime } from "@repo/util";

interface GlobalTaskCreatedAtProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTaskCreatedAt({ task }: GlobalTaskCreatedAtProps) {
	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Created at {formatDateTime(task.createdAt as Date)}</Label>
			{(task.createdAt as Date) < (task.updatedAt as Date) && (
				<Label variant={"description"}>Last updated at {formatDateTime(task.updatedAt as Date)}</Label>
			)}
		</div>
	);
}
