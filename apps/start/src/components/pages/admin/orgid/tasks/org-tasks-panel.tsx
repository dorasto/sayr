import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import { IconSettings, IconStack2, IconUser } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, useMemo } from "react";
import { useBoardData } from "@/components/board/core/board-data";
import { areFiltersEqual } from "@/components/board/core/view-config";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { QuickFilterPanel } from "@/components/board/quick-filters/quick-filter-panel";
import type { BoardViewPreset } from "@/components/board/saved-views/saved-views-source";
import RenderIcon from "@/components/generic/RenderIcon";
import { buildAssigneePresetFilters, buildCategoryPresetFilters, countOrgTasks } from "./org-task-presets";

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

function taskCount(count: number): string {
	return `${count} ${count === 1 ? "task" : "tasks"}`;
}

interface CountTileProps {
	active: boolean;
	onClick: () => void;
	icon: ReactNode;
	iconClassName?: string;
	iconStyle?: CSSProperties;
	title: string;
	count: number;
}

/** One of the panel's count tiles — the old tasks panel's tile styling. */
function CountTile({ active, onClick, icon, iconClassName, iconStyle, title, count }: CountTileProps) {
	return (
		<Tile
			className={cn(
				"bg-card md:w-full cursor-pointer select-none",
				active ? "bg-accent" : "bg-card hover:bg-accent"
			)}
			onClick={onClick}
		>
			<TileHeader>
				<TileTitle className="flex items-center gap-2">
					<TileIcon className={iconClassName} style={iconStyle}>
						{icon}
					</TileIcon>
					{title}
				</TileTitle>
				<TileDescription>{taskCount(count)}</TileDescription>
			</TileHeader>
		</Tile>
	);
}

/**
 * The org tasks page's right-panel body: the count tiles from the old tasks panel on top ("Open tasks"
 * clears the view; "Your tasks" and each category toggle their preset filter — active while the live
 * filters equal it), and the board's quick filters underneath. Reads everything from the board's provider
 * and view state, so it's handed to the panel once.
 */
export function OrgTasksPanelContent() {
	const { items, viewerId } = useBoardData();
	const { filters, viewSlug, clearView, applyFilter } = useBoardViewState();
	const presets = useOrgTaskPresets();
	const counts = useMemo(() => countOrgTasks(items, viewerId), [items, viewerId]);

	const isAllActive = !viewSlug && filters.groups.length === 0;
	const isPresetActive = (preset: BoardViewPreset) => !viewSlug && areFiltersEqual(filters, preset.filters);
	const togglePreset = (preset: BoardViewPreset) => {
		if (isPresetActive(preset)) clearView();
		else applyFilter(preset.filters);
	};

	const yourTasks = presets.yourTasks;
	const yourTasksActive = yourTasks ? isPresetActive(yourTasks) : false;

	return (
		<div className="flex flex-col gap-3 w-full relative">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
				<CountTile
					active={isAllActive}
					onClick={() => clearView()}
					icon={<IconStack2 />}
					iconClassName={isAllActive ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"}
					title="Open tasks"
					count={counts.open}
				/>
				{yourTasks && (
					<CountTile
						active={yourTasksActive}
						onClick={() => togglePreset(yourTasks)}
						icon={<IconUser />}
						iconClassName={yourTasksActive ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"}
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
							iconStyle={{
								background: active ? `hsla(${extractHslValues(category.color || "#cccccc")}, 0.1)` : undefined,
							}}
							icon={
								<RenderIcon
									iconName={category.icon || "IconCircleFilled"}
									color={category.color || undefined}
									button
									focus={active}
									className={cn("size-4! [&_svg]:size-3! border-0 ", !active && "text-muted-foreground")}
								/>
							}
							title={category.name}
							count={counts.byCategory.get(category.id) ?? 0}
						/>
					);
				})}
			</div>
			<QuickFilterPanel />
		</div>
	);
}

/** The panel header's right-hand action: the org's settings (the old tasks panel header's link). */
export function OrgSettingsLink({ organizationId }: { organizationId: string }) {
	return (
		<Link to="/settings/org/$orgId" params={{ orgId: organizationId }} title="Organization settings">
			<Button variant="ghost" size="icon" className="p-0 h-6 w-6">
				<IconSettings className="size-3.5!" />
			</Button>
		</Link>
	);
}
