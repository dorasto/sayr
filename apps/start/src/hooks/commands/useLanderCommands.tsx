"use client";

import { authClient } from "@repo/auth/client";
import { IconBookmark, IconDeviceFloppy, IconFilter, IconStack2 } from "@tabler/icons-react";
import { useMemo } from "react";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { QUICK_FILTERS } from "@/components/board/quick-filters/quick-filter-config";
import { useActiveView } from "@/components/board/saved-views/use-active-view";
import { usePersonalViews } from "@/components/board/saved-views/use-personal-views";
import { commandActions } from "@/lib/command-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * The "open X" commands act by clicking a real trigger button found via its
 * data-command-target — the palette closes first, then a short setTimeout covers its close
 * animation. Same close-palette-then-act pattern useTasksCommands.tsx already uses for
 * "Filter tasks".
 */
function clickCommandTarget(selector: string) {
	document.querySelector<HTMLButtonElement>(`[data-command-target="${selector}"]`)?.click();
}

function handleOpenFilterBuilder() {
	commandActions.close();
	setTimeout(() => clickCommandTarget("filter-builder-trigger"), 200);
}

// The Save row only exists inside ActiveViewSwitcher's dropdown, so open that first and give
// its menu a moment to mount before clicking through.
function handleSaveCurrentView() {
	commandActions.close();
	setTimeout(() => clickCommandTarget("active-view-switcher-trigger"), 200);
	setTimeout(() => clickCommandTarget("save-view-trigger"), 450);
}

/**
 * Registers /home-specific commands: open the filter builder, quick filters, switch personal
 * views, save the current view. Registered via LanderCommandRegistrar in
 * routes/(admin)/home/route.tsx, not globally — these only make sense on the lander.
 */
export function useLanderCommands() {
	const { data: session } = authClient.useSession();
	const { personalViews } = usePersonalViews();
	const { selectView, applyFilter } = useBoardViewState();
	const { isDirty } = useActiveView();
	const userId = session?.user?.id;

	const commands: CommandMap = useMemo(() => {
		const quickFilterItems = QUICK_FILTERS.map((definition) => ({
			id: `lander-quick-filter-${definition.id}`,
			label: definition.label,
			icon: definition.icon,
			show: !definition.requiresUser || !!userId,
			action: () =>
				applyFilter({
					groups: [
						{
							id: "quick",
							operator: "AND" as const,
							conditions: [{ ...definition.buildCondition(userId ?? ""), id: `quick-${definition.id}` }],
						},
					],
					operator: "AND" as const,
				}),
			keywords: "quick filter",
		}));

		const viewItems = personalViews.map((view) => ({
			id: `lander-select-view-${view.id}`,
			label: view.name,
			icon: <IconStack2 size={16} className="opacity-60" aria-hidden="true" />,
			action: () => selectView(view),
		}));

		return {
			root: [
				{
					heading: "Home",
					priority: 10,
					items: [
						{
							id: "lander-open-filter-builder",
							label: "Open filter builder",
							icon: <IconFilter size={16} className="opacity-60" aria-hidden="true" />,
							action: handleOpenFilterBuilder,
							keywords: "filters search narrow",
						},
						{
							id: "lander-switch-view",
							label: "Switch view",
							icon: <IconBookmark size={16} className="opacity-60" aria-hidden="true" />,
							subId: "lander-views",
							keywords: "saved views presets",
							show: personalViews.length > 0,
						},
						{
							id: "lander-save-current-view",
							label: "Save current view",
							icon: <IconDeviceFloppy size={16} className="opacity-60" aria-hidden="true" />,
							action: handleSaveCurrentView,
							keywords: "bookmark preset",
							// Nothing to save until the live state differs from the active view / the blank default.
							show: isDirty,
						},
					],
				},
				{
					heading: "Quick filters",
					priority: 10,
					items: quickFilterItems,
				},
			],
			"lander-views": [
				{
					heading: "Views",
					priority: 10,
					items: viewItems,
				},
			],
		};
	}, [applyFilter, isDirty, personalViews, selectView, userId]);

	useRegisterCommands("lander-commands", commands);
}
