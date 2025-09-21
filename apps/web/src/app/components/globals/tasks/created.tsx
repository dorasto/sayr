"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { formatDate, formatDateCompact, formatDateTime } from "@repo/util";
import { priorityConfig } from "../../admin/organization/project/table/task-list-item";

interface GlobalTaskCreatedAtProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTaskCreatedAt({ task }: GlobalTaskCreatedAtProps) {
	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Created</Label>
			<Label variant={"description"}>{formatDateTime(task.createdAt as Date)}</Label>
		</div>
	);
}
