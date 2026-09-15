import {
	IconAlertSquareFilled,
	IconBuilding,
	IconCategory,
	IconListDetails,
	IconRocket,
	IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { TaskGroupingId } from "../filter/types";

// Board's own "group by" menu options — one entry per TaskGroupingId, a
// single representative icon per grouping (not per value, unlike
// STATUS_CONFIG/PRIORITY_CONFIG). Icons match the glyph the equivalent field
// picker already uses elsewhere (field-category.tsx/field-release.tsx) so
// the "Group by" menu stays visually consistent with the fields it groups by.

export const TASK_GROUPING_OPTIONS: Array<{ id: TaskGroupingId; label: string; icon: ReactNode }> = [
	{ id: "status", label: "Status", icon: <IconListDetails className="h-4 w-4" /> },
	{ id: "org", label: "Organization", icon: <IconBuilding className="h-4 w-4" /> },
	{ id: "priority", label: "Priority", icon: <IconAlertSquareFilled className="h-4 w-4" /> },
	{ id: "assignee", label: "Assignee", icon: <IconUser className="h-4 w-4" /> },
	{ id: "category", label: "Category", icon: <IconCategory className="h-4 w-4" /> },
	{ id: "release", label: "Release", icon: <IconRocket className="h-4 w-4" /> },
];

export const TASK_GROUPINGS: Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]> = Object.fromEntries(
	TASK_GROUPING_OPTIONS.map((option) => [option.id, option])
) as Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]>;
