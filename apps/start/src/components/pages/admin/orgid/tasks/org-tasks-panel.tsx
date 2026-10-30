import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { IconSettings, IconStack2, IconUser } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useBoardData } from "@/components/board/core/board-data";
import { CountTile, TaskOverviewSections, usePresetTiles } from "@/components/board/layout/task-overview";
import { buildAssigneePresetFilters } from "@/components/board/layout/task-overview-model";
import { QuickFilterPanel } from "@/components/board/quick-filters/quick-filter-panel";
import type { BoardViewPreset } from "@/components/board/saved-views/saved-views-source";
import RenderIcon from "@/components/generic/RenderIcon";
import { buildCategoryPresetFilters, countOrgTasks } from "./org-task-presets";

interface CategoryPreset {
	category: schema.categoryType;
	preset: BoardViewPreset;
}

/**
 * The org tasks page's fixed filters, from the board's data (viewer + the org's categories): "Your tasks"
 * and one per category. The view switcher lists them as presets and the side panel's tiles toggle them, so
 * both read the same filter objects.
 */
export function useOrgTaskPresets(): {
	yourTasks: BoardViewPreset | undefined;
	categories: CategoryPreset[];
	all: BoardViewPreset[];
} {
	const { viewerId, categories } = useBoardData();
	return useMemo(() => {
		const yourTasks: BoardViewPreset | undefined = viewerId
			? {
					id: "your-tasks",
					label: "Your tasks",
					icon: <IconUser className="size-4 text-muted-foreground" />,
					filters: buildAssigneePresetFilters(viewerId),
				}
			: undefined;
		const categoryPresets = categories.map((category) => ({
			category,
			preset: {
				id: `category-${category.id}`,
				label: category.name,
				icon: (
					<RenderIcon
						iconName={category.icon || "IconCircleFilled"}
						color={category.color || undefined}
						className="size-4! [&_svg]:size-3! border-0"
						button
					/>
				),
				filters: buildCategoryPresetFilters(category.id),
			},
		}));
		return {
			yourTasks,
			categories: categoryPresets,
			all: [...(yourTasks ? [yourTasks] : []), ...categoryPresets.map(({ preset }) => preset)],
		};
	}, [viewerId, categories]);
}

/**
 * The org tasks page's right-panel body: compact count tiles ("Open tasks" clears the view; "Your tasks" and each
 * category toggle their preset filter — active while the live filters equal it), then the shared overview sections
 * (board/layout/task-overview.tsx — open work, needs attention, most voted) and the board's quick filters underneath.
 * /home's panel (board-side-panel.tsx) is the cross-org counterpart.
 */
export function OrgTasksPanelContent() {
	const { items, viewerId } = useBoardData();
	const { isAllActive, isPresetActive: isFiltersActive, togglePreset: toggleFilters, clearView } = usePresetTiles();
	const presets = useOrgTaskPresets();
	const counts = useMemo(() => countOrgTasks(items, viewerId), [items, viewerId]);

	const isPresetActive = (preset: BoardViewPreset) => isFiltersActive(preset.filters);
	const togglePreset = (preset: BoardViewPreset) => toggleFilters(preset.filters);

	const yourTasks = presets.yourTasks;

	return (
		<div className="relative flex w-full flex-col gap-4">
			<div className="grid grid-cols-2 gap-1.5">
				<CountTile
					active={isAllActive}
					onClick={() => clearView()}
					icon={<IconStack2 className="size-3.5" />}
					title="Open tasks"
					count={counts.open}
				/>
				{yourTasks && (
					<CountTile
						active={isPresetActive(yourTasks)}
						onClick={() => togglePreset(yourTasks)}
						icon={<IconUser className="size-3.5" />}
						title="Your tasks"
						count={counts.openAssignedToViewer}
					/>
				)}
				{presets.categories.map(({ category, preset }) => {
					const active = isPresetActive(preset);
					return (
						<CountTile
							key={category.id}
							active={active}
							onClick={() => togglePreset(preset)}
							icon={
								<RenderIcon
									iconName={category.icon || "IconCircleFilled"}
									color={category.color || undefined}
									button
									focus={active}
									className="size-3.5! [&_svg]:size-3! rounded-sm border-0"
								/>
							}
							title={category.name}
							count={counts.byCategory.get(category.id) ?? 0}
						/>
					);
				})}
			</div>

			<TaskOverviewSections />

			<div className="mx-1.5 h-px bg-border" />
			<QuickFilterPanel />
		</div>
	);
}

/**
 * A panel header's right-hand action linking to the org's settings — used by the releases page. (The tasks page's
 * panel header has the active view's actions instead: `ActiveViewPanelActions`.)
 */
export function OrgSettingsLink({ organizationId }: { organizationId: string }) {
	return (
		<Link to="/settings/org/$orgId" params={{ orgId: organizationId }} title="Organization settings">
			<Button variant="ghost" size="icon" className="p-0 h-6 w-6">
				<IconSettings className="size-3.5!" />
			</Button>
		</Link>
	);
}
