import { IconUser, IconUserCheck, IconUserOff } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { FilterCondition } from "../filter/types";

export interface QuickFilterDefinition {
	id: string;
	label: string;
	icon: ReactNode;
	/** True for filters that need the signed-in user's id ("me" filters) — hidden until a session is available. */
	requiresUser?: boolean;
	/** Builds the single condition this chip applies. userId is empty for filters that don't need one. */
	buildCondition: (userId: string) => Omit<FilterCondition, "id">;
}

// Only a handful of presets for now — the ones actually meaningful once the
// lander shows every task the user has access to (not just tasks assigned
// to them, which is what made "Assigned to me" a no-op in an earlier draft
// of this system). More can be added here without touching quick-filter-chips.tsx.
export const QUICK_FILTERS: QuickFilterDefinition[] = [
	{
		id: "assigned-to-me",
		label: "Assigned to me",
		icon: <IconUserCheck className="size-3.5" />,
		requiresUser: true,
		buildCondition: (userId) => ({ field: "assignee", operator: "any", value: [userId] }),
	},
	{
		id: "created-by-me",
		label: "Created by me",
		icon: <IconUser className="size-3.5" />,
		requiresUser: true,
		buildCondition: (userId) => ({ field: "creator", operator: "any", value: [userId] }),
	},
	{
		id: "unassigned",
		label: "Unassigned",
		icon: <IconUserOff className="size-3.5" />,
		buildCondition: () => ({ field: "assignee", operator: "empty", value: null }),
	},
];
