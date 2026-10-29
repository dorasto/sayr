"use client";

import type { schema } from "@repo/database";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Label } from "@repo/ui/components/label";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { Switch } from "@repo/ui/components/switch";
import OptionField from "@repo/ui/components/tomui/option-field";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey } from "@repo/util";
import {
	IconArrowsSort,
	IconCheck,
	IconLayoutKanban,
	IconLayoutRows,
	IconList,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ORG_KEY_SLOT_CLASS, STATUS_CONFIG } from "../config/field-config";
import { useBoardGroupingOptions } from "../config/grouping-options";
import { resolveGroupingDefinition } from "../config/grouping-registry";
import { useBoardData, useBoardEntity, useBoardGroupings, useBoardOrganizationScope } from "../core/board-data";
import { formatEntityCount } from "../core/entity";
import { type BoardScope, BoardScopeProvider } from "../core/scope";
import { TASK_ENTITY, TASK_ENTITY_ID } from "../core/task-entity";
import { coerceToLegacyViewMode, DEFAULT_COMBINED_STATE, DEFAULT_FILTER_STATE } from "../core/view-config";
import { FilterBuilderContent } from "../filter/filter-builder";
import { deserializeFilters, serializeFilters } from "../filter/serialization";
import { TASK_SORT_FIELDS } from "../filter/sort-config";
import type { FilterState, TaskViewCombinedState } from "../filter/types";
import { useBoardViewState } from "../filter/use-board-view-state";
import { GroupingMenu, SortMenu, SubGroupingMenu } from "../layout/view-option-menus";
import type { SavedViewConfig } from "./saved-views-source";
import { useActiveView } from "./use-active-view";
import { useBoardSavedViews } from "./use-board-saved-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON, ViewIconColorTrigger } from "./view-icon-color-trigger";
import {
	buildViewPreview,
	isViewDraftChanged,
	isViewSlugTaken,
	normalizeViewSlugInput,
	resolveSlugUpdate,
} from "./view-settings-model";
import { viewSettingsActions, viewSettingsStore } from "./view-settings-store";

type ViewConfig = NonNullable<SavedViewConfig>;

// Admin boards offer List and Kanban only: a "card" (or unknown) mode is shown, and saved, as "list".
function toFormConfig(config: SavedViewConfig): ViewConfig {
	const base = config ?? { mode: "list", groupBy: "status", showCompletedTasks: true };
	return {
		...base,
		mode: coerceToLegacyViewMode(base.mode),
		icon: base.icon || DEFAULT_VIEW_ICON,
		color: base.color || DEFAULT_VIEW_COLOR,
	};
}

/**
 * The one editor for a saved view (personal on /home, the org's on an org tasks page): name + icon/colour, slug,
 * a live preview, filter, layout, grouping, sort and show-completed, in a right-side sheet. Mount it once per page
 * inside the board's provider; open it with `viewSettingsActions.open(viewId)` (the switcher row's pencil, the
 * panel header's gear). Saves go through the board's saved-views source (`useBoardSavedViews()`).
 */
export function ViewSettingsSheet() {
	const { viewId, open } = useStore(viewSettingsStore, (state) => state);
	const { views } = useBoardSavedViews();
	const view = viewId ? views.find((candidate) => candidate.id === viewId) : undefined;

	// The store outlives the page: don't let a sheet left open reappear on the next board page.
	useEffect(() => () => viewSettingsActions.reset(), []);

	return (
		<Sheet
			open={open && view !== undefined}
			onOpenChange={(next) => {
				if (!next) viewSettingsActions.close();
			}}
			onOpenChangeComplete={(next) => {
				if (!next) viewSettingsActions.reset();
			}}
		>
			<SheetContent showClose={false} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
				<div className="flex h-11 shrink-0 items-center border-b px-3">
					<SheetTitle render={<span />} className="text-xs font-medium text-muted-foreground">
						View settings
					</SheetTitle>
					<SheetClose
						render={
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="ml-auto h-6 w-6 gap-2 p-1"
								aria-label="Close"
							/>
						}
					>
						<IconX />
					</SheetClose>
				</div>
				{view && <ViewSettingsForm key={view.id} view={view} />}
			</SheetContent>
		</Sheet>
	);
}

function ViewSettingsForm({ view }: { view: schema.savedViewType }) {
	const { kind, views, update, remove } = useBoardSavedViews();
	const { activeView } = useActiveView();
	const { resetToSavedView, clearView } = useBoardViewState();
	const groupingOptions = useBoardGroupingOptions();
	const isTaskBoard = useBoardEntity().id === TASK_ENTITY_ID;

	const [name, setName] = useState(view.name);
	const [slug, setSlug] = useState(view.slug ?? "");
	const [filterParams, setFilterParams] = useState(view.filterParams);
	const [viewConfig, setViewConfig] = useState<ViewConfig>(() => toFormConfig(view.viewConfig));
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const slugUpdate = resolveSlugUpdate(slug, view.slug);
	const slugTaken = slugUpdate !== undefined && isViewSlugTaken(slugUpdate, views, view.id);
	const changed = isViewDraftChanged(
		{
			name: view.name,
			slug: view.slug ?? "",
			filterParams: view.filterParams,
			viewConfig: toFormConfig(view.viewConfig),
		},
		{ name, slug, filterParams, viewConfig }
	);
	const canSave = changed && !saving && !slugTaken && name.trim() !== "";

	const handleSave = async () => {
		const trimmedName = name.trim();
		if (!trimmedName || slugTaken || saving) return;
		setSaving(true);
		const updates = {
			name: trimmedName,
			filterParams,
			viewConfig,
			...(slugUpdate !== undefined && { slug: slugUpdate }),
		};
		try {
			await update(view.id, updates);
			// Editing the view the board is showing: apply what was saved, and move `?view` to the new slug so the
			// view doesn't drop out of the URL.
			if (activeView?.id === view.id) resetToSavedView({ ...view, ...updates });
			headlessToast.success({ title: "View updated" });
		} catch (error) {
			headlessToast.error({
				title: "Failed to update view",
				description: kind === "org" && error instanceof Error ? error.message : undefined,
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		const wasActive = activeView?.id === view.id;
		try {
			await remove(view.id);
			viewSettingsActions.close();
			if (wasActive) clearView();
			headlessToast.success({ title: "View deleted" });
		} catch (error) {
			headlessToast.error({
				title: "Failed to delete view",
				description: kind === "org" && error instanceof Error ? error.message : undefined,
			});
		}
	};

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
				<div className="flex items-start gap-2">
					<ViewIconColorTrigger
						value={{
							icon: viewConfig.icon || DEFAULT_VIEW_ICON,
							color: viewConfig.color || DEFAULT_VIEW_COLOR,
						}}
						onChange={({ icon, color }) => setViewConfig((prev) => ({ ...prev, icon, color }))}
						className="size-7 rounded-lg [&_svg]:size-4"
					/>
					<div className="flex min-w-0 flex-1 flex-col">
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="View name"
							aria-label="View name"
							className="w-full min-w-0 truncate rounded-md bg-transparent px-1 text-[15px] font-semibold outline-none hover:bg-accent focus:bg-accent"
						/>
						<label className="flex min-w-0 cursor-text items-center rounded-md px-1 font-mono text-xs text-muted-foreground hover:bg-accent focus-within:bg-accent">
							<span className="shrink-0">?view=</span>
							<input
								value={slug}
								onChange={(event) => setSlug(normalizeViewSlugInput(event.target.value))}
								placeholder="my-view"
								aria-label="View slug"
								className="min-w-0 flex-1 bg-transparent outline-none"
							/>
						</label>
						{slugTaken && (
							<span className="px-1 pt-0.5 text-xs text-destructive/80">
								Another view already uses this slug.
							</span>
						)}
					</div>
				</div>

				{isTaskBoard && <ViewPreviewBlock filterParams={filterParams} viewConfig={viewConfig} />}

				<div className="flex flex-col gap-1">
					<Label variant="description" className="px-1">
						Filters
					</Label>
					<ViewFilterField filterParams={filterParams} onChange={setFilterParams} />
				</div>

				<div className="flex flex-col">
					<Label variant="description" className="px-1 pb-1">
						Display
					</Label>
					<DisplayRow title="Layout" icon={<IconList className="size-3" />}>
						<div className="flex items-center gap-0.5 rounded-xl bg-accent p-0.5">
							{(
								[
									{ id: "list", label: "List", icon: <IconList /> },
									{ id: "kanban", label: "Kanban", icon: <IconLayoutKanban /> },
								] as const
							).map((option) => (
								<Button
									key={option.id}
									type="button"
									variant={viewConfig.mode === option.id ? "secondary" : "ghost"}
									size="sm"
									aria-pressed={viewConfig.mode === option.id}
									onClick={() => setViewConfig((prev) => ({ ...prev, mode: option.id }))}
									className={cn(
										"h-6 gap-1 rounded-lg px-2 text-xs [&_svg]:size-3.5",
										viewConfig.mode !== option.id && "text-muted-foreground"
									)}
								>
									{option.icon}
									{option.label}
								</Button>
							))}
						</div>
					</DisplayRow>
					<DisplayRow title="Group by" icon={<IconLayoutRows className="size-3" />}>
						<GroupingMenu
							value={viewConfig.groupBy}
							options={groupingOptions}
							onChange={(groupBy) => setViewConfig((prev) => ({ ...prev, groupBy }))}
						/>
					</DisplayRow>
					<DisplayRow title="Sub-group by" icon={<IconLayoutRows className="size-3" />}>
						<SubGroupingMenu
							value={viewConfig.subGroupBy}
							grouping={viewConfig.groupBy}
							options={groupingOptions}
							onChange={(subGroupBy) =>
								setViewConfig((prev) => ({
									...prev,
									subGroupBy: subGroupBy === "none" ? undefined : subGroupBy,
								}))
							}
						/>
					</DisplayRow>
					<DisplayRow title="Sort by" icon={<IconArrowsSort className="size-3" />}>
						<SortMenu
							sortBy={viewConfig.sortBy}
							sortDirection={viewConfig.sortDirection}
							fields={TASK_SORT_FIELDS}
							onSortByChange={(sortBy) => setViewConfig((prev) => ({ ...prev, sortBy }))}
							onSortDirectionChange={(sortDirection) => setViewConfig((prev) => ({ ...prev, sortDirection }))}
						/>
					</DisplayRow>
					<DisplayRow title="Show completed" icon={<IconCheck className="size-3" />}>
						<Switch
							checked={viewConfig.showCompletedTasks}
							onCheckedChange={(checked) => setViewConfig((prev) => ({ ...prev, showCompletedTasks: checked }))}
						/>
					</DisplayRow>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1 border-t px-3 py-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="gap-1 text-xs text-muted-foreground hover:text-destructive"
					onClick={() => setDeleteOpen(true)}
				>
					<IconTrash className="size-3.5" />
					Delete
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="ml-auto text-xs text-muted-foreground"
					onClick={() => viewSettingsActions.close()}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant="default"
					size="sm"
					className="text-xs"
					onClick={handleSave}
					disabled={!canSave}
				>
					Save
				</Button>
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle render={<Label variant="heading" />}>Delete view?</AlertDialogTitle>
						<AlertDialogDescription>
							"{view.name}" will be deleted{kind === "org" ? " for everyone in this organization" : ""}. This
							can't be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

/** One "Display" row: muted label + small icon on the left, the control on the right (as in the view-options popover). */
function DisplayRow({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
	return (
		<div className="px-1 py-1">
			<OptionField
				title={title}
				titleClassName="text-xs text-muted-foreground"
				titleWrapper="gap-1 text-muted-foreground"
				icon={icon}
				customSide={children}
			/>
		</div>
	);
}

/**
 * What the draft would show on this (task) board: the board's own filter / completed / sort pipeline over its
 * items (`buildViewPreview`), the count and the first few rows. Updates as the draft changes.
 */
function ViewPreviewBlock({ filterParams, viewConfig }: { filterParams: string; viewConfig: ViewConfig }) {
	const { items } = useBoardData();
	const organizationScope = useBoardOrganizationScope();
	const groupings = useBoardGroupings();
	const ownsMembership = resolveGroupingDefinition(groupings, viewConfig.groupBy).ownsMembership === true;
	const preview = useMemo(
		() => buildViewPreview(TASK_ENTITY, items, { filterParams, viewConfig }, { ownsMembership }),
		[items, filterParams, viewConfig, ownsMembership]
	);

	return (
		<div className="flex flex-col gap-0.5 rounded-xl bg-card p-1.5">
			<span className="px-1.5 pb-0.5 pt-0.5 text-xs text-muted-foreground">
				{preview.total === 0 ? "No tasks match" : `Shows ${formatEntityCount(TASK_ENTITY.noun, preview.total)}`}
			</span>
			{preview.items.map((task) => {
				const orgShortId = organizationScope?.shortId ?? task.organization?.shortId;
				return (
					<div key={task.id} className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-xs">
						{STATUS_CONFIG[task.status].icon("size-3.5 shrink-0")}
						{orgShortId && (
							<span className={cn("shrink-0 truncate text-muted-foreground", ORG_KEY_SLOT_CLASS)}>
								{formatTaskKey(orgShortId, task.shortId)}
							</span>
						)}
						<span className="min-w-0 truncate">{task.title || "Untitled"}</span>
					</div>
				);
			})}
			{preview.more > 0 && <span className="px-1.5 py-1 text-xs text-muted-foreground">+ {preview.more} more</span>}
		</div>
	);
}

/**
 * The view's filter, edited with the board's own `FilterBuilderContent` — the sheet renders inside the page's
 * board provider, so the builder already has the board's fields and option data. Only the view state is swapped:
 * a nested "controlled" scope keeps the builder's changes in this form instead of the live board / URL.
 */
function ViewFilterField({ filterParams, onChange }: { filterParams: string; onChange: (params: string) => void }) {
	// Held locally (not re-derived from the params each render): deserialising mints fresh condition ids.
	const [filters, setFilters] = useState<FilterState>(() => deserializeFilters(filterParams) ?? DEFAULT_FILTER_STATE);

	const scope = useMemo<BoardScope>(
		() => ({
			key: "view-settings-filter",
			persistence: "controlled",
			controlled: {
				state: { ...DEFAULT_COMBINED_STATE, filters },
				onChange: (next: TaskViewCombinedState) => {
					setFilters(next.filters);
					onChange(serializeFilters(next.filters));
				},
			},
		}),
		[filters, onChange]
	);

	return (
		<div className="flex flex-col px-1">
			<BoardScopeProvider scope={scope}>
				<FilterBuilderContent />
			</BoardScopeProvider>
		</div>
	);
}
