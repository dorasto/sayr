"use client";

import { authClient } from "@repo/auth/client";
import { IconBookmark, IconDeviceFloppy, IconFilter, IconLayoutSidebarRight, IconStack2 } from "@tabler/icons-react";
import { useMemo } from "react";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { QUICK_FILTERS } from "@/components/board/quick-filters/quick-filter-config";
import { LANDER_PANEL_ID } from "@/components/pages/admin/home";
import { useLanderData } from "@/contexts/ContextLander";
import { commandActions } from "@/lib/command-store";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { userPreferencesActions, userPreferencesStore } from "@/lib/stores/user-preferences-store";
import type { CommandMap } from "@/types/command";
import { useRegisterCommands } from "../useRegisterCommands";

/**
 * Whichever of {FilterBuilder, PresetSwitcher} the landerLayout preference
 * put in the top bar is a real popover trigger button there (findable via
 * data-command-target); whichever it put in the side panel instead has no
 * trigger of its own — it's rendered inline — so reaching it means opening
 * the panel first. Same close-palette-then-act pattern useTasksCommands.tsx
 * already uses for "Filter tasks". Reads landerLayout fresh at call time
 * (not captured when commands were built), so it's still correct even if
 * the user toggled layout since the palette last registered its commands.
 */
function clickCommandTarget(selector: string) {
	document.querySelector<HTMLButtonElement>(`[data-command-target="${selector}"]`)?.click();
}

function handleOpenFilterBuilder() {
	commandActions.close();
	if (userPreferencesStore.state.landerLayout === "presetSide") {
		setTimeout(() => clickCommandTarget("filter-builder-trigger"), 200);
	} else {
		sidebarActions.setOpen(LANDER_PANEL_ID, true);
	}
}

function handleSaveCurrentView() {
	commandActions.close();
	if (userPreferencesStore.state.landerLayout === "presetTop") {
		setTimeout(() => clickCommandTarget("save-view-trigger"), 200);
	} else {
		sidebarActions.setOpen(LANDER_PANEL_ID, true);
		setTimeout(() => clickCommandTarget("save-view-trigger"), 250);
	}
}

function handleToggleLayout() {
	const current = userPreferencesStore.state.landerLayout;
	userPreferencesActions.setLanderLayout(current === "presetTop" ? "presetSide" : "presetTop");
}

/**
 * Registers /home-specific commands: open the filter builder, switch
 * layout, quick filters, switch personal views, save the current view.
 * Registered via LanderCommandRegistrar in routes/(admin)/home/route.tsx,
 * not globally — these only make sense on the lander.
 */
export function useLanderCommands() {
	const { data: session } = authClient.useSession();
	const { personalViews } = useLanderData();
	const { selectView, applyFilter } = useBoardViewState();
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
							id: "lander-toggle-layout",
							label: "Move views/filters to the other side",
							icon: <IconLayoutSidebarRight size={16} className="opacity-60" aria-hidden="true" />,
							action: handleToggleLayout,
							keywords: "layout panel toolbar swap",
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
	}, [applyFilter, personalViews, selectView, userId]);

	useRegisterCommands("lander-commands", commands);
}
