import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconChevronDown, IconRotate2, IconStack2 } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { serializeFilters } from "../filter/serialization";
import {
	areStatesEqual,
	getViewCombinedState,
	mapStateToViewConfig,
	useBoardViewState,
} from "../filter/use-board-view-state";
import { usePersonalViews } from "./use-personal-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON } from "./view-icon-color-trigger";

// Nested Save/Reset buttons live inside a clickable DropdownMenuItem row (the row's own
// onClick selects the view) — stop the event before it bubbles, same pattern
// preset-switcher.tsx's pin/delete buttons already use for the identical reason.
const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

// size-5 + the [&_svg]:size-3 override is the same "tinted background swatch" shape
// view-icon-color-trigger.tsx's own trigger uses (RenderIcon's `button` mode, just smaller) —
// reused here instead of `raw` so an item's color shows as a filled swatch, not just an icon
// tint, matching the assignee/label picker's own colored-row treatment.
const ICON_SWATCH_CLASS = "size-5 rounded-md [&_svg]:size-3 shrink-0";

/**
 * Breadcrumb-style saved-view switcher for /home's PageHeader.Identity zone, mirroring
 * /:orgId/tasks' own view dropdown there. Distinct from PresetSwitcher (board/layout's
 * top-bar/panel view switcher) — that component still owns pin/edit/delete/reorder; this
 * one is select + dirty-aware reset/update only, so there isn't a second place those
 * actions can drift out of sync from.
 */
export function ActiveViewSwitcher() {
	const [updating, setUpdating] = useState(false);
	const { personalViews, updateView } = usePersonalViews();
	const { viewSlug, filters, viewConfig, selectView, resetToSavedView, clearView } = useBoardViewState();

	const activeView = personalViews.find((view) => (view.slug || view.id) === viewSlug);
	const isDirty = !!activeView && !areStatesEqual({ filters, viewConfig }, getViewCombinedState(activeView));

	const handleUpdate = async (event: React.SyntheticEvent) => {
		stopRowSelect(event);
		if (!activeView || updating) return;
		setUpdating(true);
		try {
			await updateView(activeView.id, {
				filterParams: serializeFilters(filters),
				viewConfig: mapStateToViewConfig(viewConfig, {
					icon: activeView.viewConfig?.icon || DEFAULT_VIEW_ICON,
					color: activeView.viewConfig?.color || DEFAULT_VIEW_COLOR,
				}),
			});
			headlessToast.success({ title: "View updated" });
		} catch {
			headlessToast.error({ title: "Failed to update view" });
		} finally {
			setUpdating(false);
		}
	};

	const handleReset = (event: React.SyntheticEvent) => {
		stopRowSelect(event);
		if (activeView) resetToSavedView(activeView);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="primary"
						className="w-fit text-xs p-1 h-auto bg-transparent gap-1 max-w-40"
						size="sm"
					/>
				}
			>
				{activeView ? (
					<RenderIcon
						iconName={activeView.viewConfig?.icon || DEFAULT_VIEW_ICON}
						color={activeView.viewConfig?.color || DEFAULT_VIEW_COLOR}
						button
						className={ICON_SWATCH_CLASS}
					/>
				) : (
					<IconStack2 className="size-3.5 text-muted-foreground" />
				)}
				<span className="truncate">{activeView ? activeView.name : "All tasks"}</span>
				{isDirty && <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Unsaved changes" />}
				<IconChevronDown className="size-3 text-muted-foreground shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				<DropdownMenuItem onClick={() => clearView()} className={cn(!activeView && "bg-accent")}>
					<IconStack2 className="size-4 text-muted-foreground" />
					All tasks
					{!activeView && <IconCheck className="ml-auto size-4 shrink-0" />}
				</DropdownMenuItem>
				{personalViews.length > 0 && <DropdownMenuSeparator />}
				{personalViews.map((view) => {
					const isActive = activeView?.id === view.id;
					const showActions = isActive && isDirty;
					return (
						<DropdownMenuItem
							key={view.id}
							onClick={() => selectView(view)}
							className={cn(isActive && "bg-accent")}
						>
							<RenderIcon
								iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
								color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
								button
								className={ICON_SWATCH_CLASS}
							/>
							<span className="truncate">{view.name}</span>
							{showActions ? (
								<span className="ml-auto flex items-center gap-0.5 shrink-0">
									<button
										type="button"
										onPointerDown={stopRowSelect}
										onClick={handleReset}
										title="Reset changes"
										className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-background"
									>
										<IconRotate2 className="size-3.5" />
									</button>
									<button
										type="button"
										disabled={updating}
										onPointerDown={stopRowSelect}
										onClick={handleUpdate}
										title="Save changes"
										className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-50"
									>
										<IconCheck className="size-3.5" />
									</button>
								</span>
							) : (
								isActive && <IconCheck className="ml-auto size-4 shrink-0" />
							)}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
