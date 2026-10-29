"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { Switch } from "@repo/ui/components/switch";
import { cn } from "@repo/ui/lib/utils";
import {
	IconArrowsSort,
	IconDeviceFloppy,
	IconEyeOff,
	IconLayoutKanban,
	IconLayoutRows,
	IconList,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { useBoardGroupingOptions } from "../config/grouping-options";
import { type BoardScope, BoardScopeProvider } from "../core/scope";
import { coerceToLegacyViewMode, DEFAULT_COMBINED_STATE, DEFAULT_FILTER_STATE } from "../core/view-config";
import { FilterBuilderContent } from "../filter/filter-builder";
import { deserializeFilters, serializeFilters } from "../filter/serialization";
import { TASK_SORT_FIELDS } from "../filter/sort-config";
import type { FilterState, TaskViewCombinedState } from "../filter/types";
import { useBoardViewState } from "../filter/use-board-view-state";
import type { SavedViewConfig } from "./saved-views-source";
import { useActiveView } from "./use-active-view";
import { useBoardSavedViews } from "./use-board-saved-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON, ViewIconColorTrigger } from "./view-icon-color-trigger";
import { isViewSlugTaken, normalizeViewSlugInput, resolveSlugUpdate } from "./view-settings-model";
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
 * filter, display, grouping, sort and show-completed, in a right-side sheet. Mount it once per page inside the
 * board's provider; open it with `viewSettingsActions.open(viewId)` (the switcher row's pencil, the panel header's
 * gear). Saves go through the board's saved-views source (`useBoardSavedViews()`).
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
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetTitle className="sr-only">View settings</SheetTitle>
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

	const [name, setName] = useState(view.name);
	const [slug, setSlug] = useState(view.slug ?? "");
	const [filterParams, setFilterParams] = useState(view.filterParams);
	const [viewConfig, setViewConfig] = useState<ViewConfig>(() => toFormConfig(view.viewConfig));
	const [saving, setSaving] = useState(false);

	const slugUpdate = resolveSlugUpdate(slug, view.slug);
	const slugTaken = slugUpdate !== undefined && isViewSlugTaken(slugUpdate, views, view.id);
	const groupingLabel = (id: string | undefined) => groupingOptions.find((option) => option.id === id)?.label;

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
		if (!confirm("Are you sure you want to delete this view?")) return;
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
		<div className="flex flex-col gap-3">
			<Label variant={"heading"}>General</Label>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Name</TileTitle>
					</TileHeader>
					<TileAction className="w-full">
						<InputGroup className="bg-accent border-0 shadow-none transition-all">
							<InputGroupAddon align="inline-start">
								<ViewIconColorTrigger
									value={{
										icon: viewConfig.icon || DEFAULT_VIEW_ICON,
										color: viewConfig.color || DEFAULT_VIEW_COLOR,
									}}
									onChange={({ icon, color }) => setViewConfig((prev) => ({ ...prev, icon, color }))}
								/>
							</InputGroupAddon>
							<InputGroupInput
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter view name"
							/>
						</InputGroup>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Slug</TileTitle>
					</TileHeader>
					<TileAction className="w-full flex-col items-start">
						<InputGroup className="bg-accent border-0 shadow-none transition-all">
							<InputGroupAddon align="inline-start">
								<InputGroupText className="font-mono">?view=</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput
								placeholder="my-view"
								className="font-mono pl-0!"
								value={slug}
								onChange={(e) => setSlug(normalizeViewSlugInput(e.target.value))}
							/>
						</InputGroup>
						{slugTaken && <p className="text-xs text-destructive">Another view already uses this slug.</p>}
					</TileAction>
				</Tile>
			</div>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full flex-col gap-3" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Filter</TileTitle>
					</TileHeader>
					<ViewFilterField filterParams={filterParams} onChange={setFilterParams} />
				</Tile>
			</div>
			<Label variant={"heading"}>View settings</Label>
			<div className="bg-card rounded-lg flex flex-col">
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Display</TileTitle>
					</TileHeader>
					<TileAction className="">
						<RadioGroup
							value={viewConfig.mode}
							className="flex items-center gap-2"
							onValueChange={(v) =>
								setViewConfig((prev) => ({ ...prev, mode: v === "kanban" ? "kanban" : "list" }))
							}
						>
							<Label
								className={cn(
									"flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
									viewConfig.mode === "list" && "border-primary/50 bg-accent"
								)}
							>
								<RadioGroupItem value={"list"} className="sr-only" />
								<div className="flex items-center gap-1">
									<IconList className="size-4" />
									<span className="cursor-pointer text-sm font-semibold">List</span>
								</div>
							</Label>
							<Label
								className={cn(
									"flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-accent/50 transition-colors",
									viewConfig.mode === "kanban" && "border-primary/50 bg-accent"
								)}
							>
								<RadioGroupItem value={"kanban"} className="sr-only" />
								<div className="flex items-center gap-1">
									<IconLayoutKanban className="size-4" />
									<span className="cursor-pointer text-sm font-semibold">Kanban</span>
								</div>
							</Label>
						</RadioGroup>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Group by</TileTitle>
					</TileHeader>
					<TileAction>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="outline" className="gap-2">
										<IconLayoutRows className="h-4 w-4" />
										<span>{groupingLabel(viewConfig.groupBy) ?? "Status"}</span>
									</Button>
								}
							/>
							<DropdownMenuContent align="end">
								<DropdownMenuRadioGroup
									value={viewConfig.groupBy}
									onValueChange={(v) => {
										const option = groupingOptions.find((candidate) => candidate.id === v);
										if (option) setViewConfig((prev) => ({ ...prev, groupBy: option.id }));
									}}
								>
									{groupingOptions.map((grouping) => (
										<DropdownMenuRadioItem key={grouping.id} value={grouping.id}>
											{grouping.label}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Sub-group by</TileTitle>
					</TileHeader>
					<TileAction>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="outline" className="gap-2">
										{viewConfig.subGroupBy && viewConfig.subGroupBy !== "none" ? (
											<>
												<IconLayoutRows className="h-4 w-4" />
												<span>{groupingLabel(viewConfig.subGroupBy) ?? "None"}</span>
											</>
										) : (
											<>
												<IconEyeOff className="h-4 w-4" />
												<span>None</span>
											</>
										)}
									</Button>
								}
							/>
							<DropdownMenuContent align="end">
								<DropdownMenuRadioGroup
									value={viewConfig.subGroupBy || "none"}
									onValueChange={(v) => {
										const option = groupingOptions.find((candidate) => candidate.id === v);
										setViewConfig((prev) => ({ ...prev, subGroupBy: option?.id }));
									}}
								>
									<DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
									{groupingOptions
										.filter((option) => option.id !== viewConfig.groupBy)
										.map((grouping) => (
											<DropdownMenuRadioItem key={grouping.id} value={grouping.id}>
												{grouping.label}
											</DropdownMenuRadioItem>
										))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Sort by</TileTitle>
					</TileHeader>
					<TileAction className="gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="outline" className="gap-2">
										<IconArrowsSort className="h-4 w-4" />
										<span>{TASK_SORT_FIELDS.find((f) => f.id === viewConfig.sortBy)?.label || "None"}</span>
									</Button>
								}
							/>
							<DropdownMenuContent align="end">
								<DropdownMenuRadioGroup
									value={viewConfig.sortBy || "none"}
									onValueChange={(v) => {
										const field = TASK_SORT_FIELDS.find((candidate) => candidate.id === v);
										setViewConfig((prev) => ({ ...prev, sortBy: field?.id ?? "none" }));
									}}
								>
									<DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
									{TASK_SORT_FIELDS.map((field) => (
										<DropdownMenuRadioItem key={field.id} value={field.id}>
											{field.label}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						{viewConfig.sortBy && viewConfig.sortBy !== "none" && (
							<Button
								variant="outline"
								size="icon"
								aria-label={
									viewConfig.sortDirection === "desc"
										? "Sort direction: descending"
										: "Sort direction: ascending"
								}
								title={viewConfig.sortDirection === "desc" ? "Descending" : "Ascending"}
								onClick={() =>
									setViewConfig((prev) => ({
										...prev,
										sortDirection: prev.sortDirection === "desc" ? "asc" : "desc",
									}))
								}
							>
								{viewConfig.sortDirection === "desc" ? (
									<IconSortDescending className="h-4 w-4" />
								) : (
									<IconSortAscending className="h-4 w-4" />
								)}
							</Button>
						)}
					</TileAction>
				</Tile>
				<Tile className="md:w-full" variant={"transparent"}>
					<TileHeader className="md:w-full">
						<TileTitle>Show completed tasks</TileTitle>
					</TileHeader>
					<TileAction>
						<Switch
							checked={viewConfig.showCompletedTasks}
							onCheckedChange={(checked) => setViewConfig((prev) => ({ ...prev, showCompletedTasks: checked }))}
						/>
					</TileAction>
				</Tile>
			</div>
			<div className="flex flex-col gap-4 max-w-2xl">
				<div className="flex items-center gap-2 mt-4">
					<Button onClick={handleSave} variant={"primary"} disabled={saving || !name.trim() || slugTaken}>
						<IconDeviceFloppy className="" />
						Save Changes
					</Button>
					<Button variant="ghost" className="text-muted-foreground" onClick={handleDelete}>
						<IconTrash className="" />
						Delete View
					</Button>
				</div>
			</div>
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
		<div className="rounded-md border px-2 py-1">
			<BoardScopeProvider scope={scope}>
				<FilterBuilderContent />
			</BoardScopeProvider>
		</div>
	);
}
