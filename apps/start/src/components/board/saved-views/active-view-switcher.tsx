"use client";

import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { IconCheck, IconChevronDown, IconStack2 } from "@tabler/icons-react";
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

	const handleUpdate = async () => {
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="primary"
						className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1 max-w-40"
						size="sm"
					/>
				}
			>
				{activeView ? (
					<RenderIcon
						iconName={activeView.viewConfig?.icon || DEFAULT_VIEW_ICON}
						color={activeView.viewConfig?.color || DEFAULT_VIEW_COLOR}
						size={14}
						raw
					/>
				) : (
					<IconStack2 className="size-3.5 text-muted-foreground" />
				)}
				<span className="truncate">{activeView ? activeView.name : "All tasks"}</span>
				{isDirty && <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Unsaved changes" />}
				<IconChevronDown className="size-3 text-muted-foreground shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuItem onClick={() => clearView()}>
					<IconStack2 className="size-4 text-muted-foreground" />
					All tasks
					{!activeView && <IconCheck className="ml-auto size-4" />}
				</DropdownMenuItem>
				{personalViews.length > 0 && <DropdownMenuSeparator />}
				{personalViews.map((view) => (
					<DropdownMenuItem key={view.id} onClick={() => selectView(view)}>
						<RenderIcon
							iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
							color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
							size={14}
							raw
						/>
						<span className="truncate">{view.name}</span>
						{activeView?.id === view.id && <IconCheck className="ml-auto size-4 shrink-0" />}
					</DropdownMenuItem>
				))}
				{isDirty && activeView && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => resetToSavedView(activeView)}>Reset changes</DropdownMenuItem>
						<DropdownMenuItem disabled={updating} onClick={handleUpdate}>
							{updating ? "Updating..." : "Update view"}
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
