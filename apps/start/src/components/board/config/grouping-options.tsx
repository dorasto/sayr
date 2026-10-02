import type { ReactNode } from "react";
import type { TaskGroupingId } from "../filter/types";
import { DEFAULT_GROUPING_REGISTRY } from "./groupings";
import { resolveGroupingDefinition } from "./grouping-registry";

// Board's own "group by" menu options — one entry per TaskGroupingId, a
// single representative icon per grouping (not per value, unlike
// STATUS_CONFIG/PRIORITY_CONFIG). Derived from the built-in grouping registry
// (config/groupings.tsx, which owns each grouping's label and icon — they match
// the glyph the equivalent field picker uses elsewhere, field-category.tsx/
// field-release.tsx, so the menu stays visually consistent with the fields it
// groups by). The "none" built-in is a page-local grouping and is not offered here.

// The registry's ids are plain strings; this is the admin menu's persisted vocabulary, in menu order.
const MENU_GROUPING_IDS: readonly TaskGroupingId[] = ["status", "org", "priority", "assignee", "category", "release"];

export const TASK_GROUPING_OPTIONS: Array<{ id: TaskGroupingId; label: string; icon: ReactNode }> =
	MENU_GROUPING_IDS.map((id) => {
		const { label, icon } = resolveGroupingDefinition(DEFAULT_GROUPING_REGISTRY, id);
		return { id, label, icon };
	});

export const TASK_GROUPINGS: Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]> = Object.fromEntries(
	TASK_GROUPING_OPTIONS.map((option) => [option.id, option])
) as Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]>;
