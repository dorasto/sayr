import type { schema } from "@repo/database";
import { FieldAssignee } from "./field-assignee";
import { FieldCategory } from "./field-category";
import { FieldLabel } from "./field-label";
import { FieldPriority } from "./field-priority";
import { FieldRelease } from "./field-release";
import { FieldStatus } from "./field-status";
import { FieldVisibility } from "./field-visibility";

const DEFAULT_FIELDS = ["status", "priority", "visibility", "assignee", "label", "category", "release"] as const;

type BoardField = (typeof DEFAULT_FIELDS)[number];

interface FieldToolbarProps {
	task: schema.TaskWithLabels;
	fields?: BoardField[];
}

export function FieldToolbar({ task, fields = [...DEFAULT_FIELDS] }: FieldToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{fields.includes("status") && <FieldStatus task={task} />}
			{fields.includes("priority") && <FieldPriority task={task} />}
			{fields.includes("visibility") && <FieldVisibility task={task} />}
			{fields.includes("assignee") && <FieldAssignee task={task} />}
			{fields.includes("label") && <FieldLabel task={task} />}
			{fields.includes("category") && <FieldCategory task={task} />}
			{fields.includes("release") && <FieldRelease task={task} />}
		</div>
	);
}
