"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import { IconSettings, IconStack2, IconUser, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import RenderIcon from "@/app/components/RenderIcon";
import { useSticky } from "@/app/hooks/use-sticky";
import { deserializeFilters, serializeFilters } from "../tasks/task/filter/dropdown/serialization";
import type { FilterState } from "../tasks/task/filter/types";
import { DEFAULT_TASK_VIEW_STATE, type TaskViewState } from "../tasks/task/grouping/types";
import { useTaskViewState } from "../tasks/task/grouping/use-task-view-state";
import GlobalSettings from "./GlobalSettings";
import { type PriorityKey, priorityConfig } from "./task-config";

export default function ProjectSide() {
	const { stuck, stickyRef } = useSticky();
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: tasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: views } = useStateManagement<schema.savedViewType[]>("views", [], 3);
	const { value: labels, setValue: setLabels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const { value: categories, setValue: setCategories } = useStateManagement<schema.categoryType[]>(
		"categories",
		[],
		1
	);
	const [filtersParam] = useQueryState("filters", parseAsString.withDefault(""));
	const [selectedViewSlug, setSelectedViewSlug] = useQueryState("view", {
		...parseAsString,
		clearOnDefault: true,
	});
	const { setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		{ groups: [], operator: "AND" },
		1
	);
	const { setViewState } = useTaskViewState();
	const [openSettings, setOpenSettings] = useState(false);

	const mapConfigToState = useCallback(
		(config: NonNullable<schema.savedViewType["viewConfig"]>): TaskViewState => ({
			grouping: config.groupBy,
			showEmptyGroups: config.showEmptyGroups,
			showCompletedTasks: config.showCompletedTasks,
			viewMode: config.mode,
		}),
		[]
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <needed>
	useEffect(() => {
		if (selectedViewSlug && views.length > 0) {
			const view = views.find((v) => (v.slug || v.id) === selectedViewSlug);
			if (view) {
				setFilterState(deserializeFilters(view.filterParams) || { groups: [], operator: "AND" });
				if (view.viewConfig) {
					setViewState(mapConfigToState(view.viewConfig));
				}
			}
		}
	}, [views]);

	const { account } = useLayoutData();

	// Create "My Assigned" filter state for current user
	const myAssignedFilterState: FilterState = {
		groups: [
			{
				id: "my-assigned-group",
				operator: "AND",
				conditions: [
					{
						id: `assignee-any-${account?.id}`,
						field: "assignee",
						operator: "any",
						value: account?.id || "",
					},
				],
			},
		],
		operator: "AND",
	};

	// Check if "My Assigned" view is active
	const isMyAssignedActive = filtersParam === serializeFilters(myAssignedFilterState);

	// Prebuilt priority views
	const priorityViews: Array<{ key: PriorityKey; label: string }> = [
		{ key: "urgent", label: "Urgent" },
		{ key: "high", label: "High Priority" },
		{ key: "medium", label: "Medium Priority" },
		{ key: "low", label: "Low Priority" },
	];

	// Helper to create priority filter
	const createPriorityFilter = (priority: PriorityKey): FilterState => ({
		groups: [
			{
				id: `priority-${priority}-group`,
				operator: "AND",
				conditions: [
					{
						id: `priority-any-${priority}`,
						field: "priority",
						operator: "any",
						value: priority,
					},
				],
			},
		],
		operator: "AND",
	});

	// Helper to create category filter
	const createCategoryFilter = (categoryId: string): FilterState => ({
		groups: [
			{
				id: `category-${categoryId}-group`,
				operator: "AND",
				conditions: [
					{
						id: `category-any-${categoryId}`,
						field: "category",
						operator: "any",
						value: categoryId,
					},
				],
			},
		],
		operator: "AND",
	});
	const createLabelFilter = (labelId: string): FilterState => ({
		groups: [
			{
				id: `label-${labelId}-group`,
				operator: "AND",
				conditions: [
					{
						id: `label-any-${labelId}`,
						field: "label",
						operator: "any",
						value: labelId,
					},
				],
			},
		],
		operator: "AND",
	});
	// Filter out done and canceled tasks to get open issues count
	const opentaskCount = tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length;
	const openusertaskCount = tasks.filter(
		(task) =>
			task.status !== "done" &&
			task.status !== "canceled" &&
			task.assignees.some((assignee) => assignee.id === account?.id)
	).length;

	if (!organization || !tasks) {
		return (
			<Skeleton className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 h-9 w-full justify-start" />
		);
	}
	return (
		<div className="flex flex-col gap-3 w-full relative">
			<Tile className="bg-card md:w-full md:h-11">
				<TileHeader>
					<TileIcon>
						<Avatar className="h-3 w-3">
							<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
					</TileIcon>
					<TileTitle className="flex items-center gap-2">{organization.name}</TileTitle>
				</TileHeader>
				<TileAction>
					<Link
						href={`/admin/settings/org/${organization.id}`}
						className="h-full w-full aspect-square flex items-center justify-center"
					>
						<Button variant={"ghost"} size={"icon"} className="p-0 h-4 w-4">
							<IconSettings className="size-4!" />
						</Button>
					</Link>
				</TileAction>
			</Tile>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
				<Tile
					className={cn(
						"bg-card md:w-full cursor-pointer select-none",
						filtersParam === "" ? "bg-accent" : "bg-card hover:bg-accent"
					)}
					onClick={() => {
						// Clear filters if already active
						setSelectedViewSlug(null);
						setFilterState({ groups: [], operator: "AND" });
						setViewState(DEFAULT_TASK_VIEW_STATE);
					}}
				>
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon
								className={cn(
									filtersParam === "" ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"
								)}
							>
								<IconStack2 />
							</TileIcon>
							Open tasks
						</TileTitle>
						<TileDescription>
							{opentaskCount} {opentaskCount === 1 ? "task" : "tasks"}
						</TileDescription>
					</TileHeader>
				</Tile>
				<Tile
					className={cn(
						"bg-card md:w-full cursor-pointer select-none",
						isMyAssignedActive ? "bg-accent" : "bg-card hover:bg-accent"
					)}
					onClick={() => {
						setSelectedViewSlug(null);
						if (isMyAssignedActive) {
							// Clear filters if already active
							setFilterState({ groups: [], operator: "AND" });
						} else {
							// Apply "My Assigned" filter
							// setFiltersParam(myAssignedFilterParam);
							setFilterState(myAssignedFilterState);
						}
						setViewState(DEFAULT_TASK_VIEW_STATE);
					}}
				>
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon
								className={cn(
									isMyAssignedActive ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"
								)}
							>
								<IconUser />
							</TileIcon>
							Your tasks
						</TileTitle>
						<TileDescription>
							{openusertaskCount} {openusertaskCount === 1 ? "task" : "tasks"}
						</TileDescription>
					</TileHeader>
				</Tile>
				{categories.map((category) => {
					const isActive = filtersParam === serializeFilters(createCategoryFilter(category.id));
					const categoryTaskCount = tasks.filter((task) => task.category === category.id).length;

					return (
						<Tile
							className={cn(
								"bg-card md:w-full cursor-pointer select-none",
								isActive ? "bg-accent" : "bg-card hover:bg-accent"
							)}
							key={category.id}
							onClick={() => {
								setSelectedViewSlug(null);
								if (isActive) {
									setFilterState({ groups: [], operator: "AND" });
								} else {
									setFilterState(createCategoryFilter(category.id));
								}
								setViewState(DEFAULT_TASK_VIEW_STATE);
							}}
						>
							<TileHeader>
								<TileTitle className="flex items-center gap-2">
									<TileIcon
										style={{
											background: isActive
												? `hsla(${extractHslValues(category.color || "#cccccc")}, 0.1)`
												: undefined,
										}}
									>
										<RenderIcon
											iconName={category.icon || "IconCircleFilled"}
											color={category.color || undefined}
											button
											focus={isActive}
											className={cn(
												"size-4! [&_svg]:size-3! border-0 ",
												!isActive && "text-muted-foreground"
											)}
										/>
										{/* <IconCircleFilled style={{ color: category.color || "#cccccc" }} /> */}
									</TileIcon>
									{category.name}
								</TileTitle>
								<TileDescription>
									{categoryTaskCount} {categoryTaskCount === 1 ? "task" : "tasks"}
								</TileDescription>
							</TileHeader>
							{/* <TileAction>
								<TileDescription className={cn(!isActive && "opacity-50")}>
									{categoryTaskCount} {categoryTaskCount === 1 ? "task" : "tasks"}
								</TileDescription>
							</TileAction> */}
						</Tile>
					);
				})}
			</div>
			<Tabs defaultValue="views" className="w-full p-1 relative bg-card rounded-lg">
				<div
					className={cn(
						"flex items-center gap-2 shrink-0 sticky top-0 w-full bg-card z-50 p-1",
						stuck && "border-b shadow-xl"
					)}
					ref={stickyRef}
				>
					<TabsList
						className={cn(
							"justify-start w-full p-0 sticky top-0 bg-card transition-colors gap-2 h-auto overflow-x-scroll"
						)}
					>
						<TabsTrigger asChild value="views">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-accent bg-transparent rounded-lg border-transparent text-xs w-auto px-2 py-1 h-auto"
								size={"sm"}
							>
								<IconStack2 className="w-3! h-3!" />
								Custom views
							</Button>
						</TabsTrigger>
						<TabsTrigger asChild value="priority">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-accent bg-transparent rounded-lg border-transparent text-xs w-auto px-2 py-1 h-auto"
								size={"sm"}
							>
								<IconStack2 className="w-3! h-3!" />
								Priority
							</Button>
						</TabsTrigger>
					</TabsList>

					{stuck && (
						<div className="flex items-center gap-2 ml-auto">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-card bg-transparent rounded-lg border-transparent aspect-square"
								size={"sm"}
								onClick={() => setOpenSettings(true)}
							>
								<IconSettings />
							</Button>
						</div>
					)}
				</div>
				<TabsContent value="views" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{views.map((view) => {
							const viewSlug = view.slug || view.id;
							const isActive = selectedViewSlug === viewSlug;
							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group",
										isActive ? "bg-accent" : "bg-transparent hover:bg-accent"
									)}
									style={{
										backgroundColor: isActive
											? `hsla(${extractHslValues(view.viewConfig?.color || "#ffffff")}, 0.05)`
											: undefined,
									}}
									key={view.id}
									onClick={() => {
										if (isActive) {
											setSelectedViewSlug(null);
											setFilterState({ groups: [], operator: "AND" });
											setViewState(DEFAULT_TASK_VIEW_STATE);
										} else {
											setSelectedViewSlug(viewSlug);
											setFilterState(
												deserializeFilters(view.filterParams) || { groups: [], operator: "AND" }
											);
											if (view.viewConfig) {
												setViewState(mapConfigToState(view.viewConfig));
											}
										}
									}}
								>
									<TileHeader className="h-fit max-w-fit">
										<TileTitle className="flex items-center gap-2 truncate">
											<TileIcon className={cn("bg-transparent")}>
												<RenderIcon
													iconName={view.viewConfig?.icon || "IconStack2"}
													color={view.viewConfig?.color || "#ffffff"}
													button
													className={cn(
														"size-5! [&_svg]:size-4! border-0 ",
														!isActive && "text-muted-foreground [&_svg]:grayscale! bg-transparent!"
													)}
												/>
												{/* <IconStack2 /> */}
											</TileIcon>
											{view.name}
										</TileTitle>
									</TileHeader>
									{/* {isActive && (
										<TileAction>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												onClick={(e) => {
													e.stopPropagation();
													if (!organization?.id) return;
													updateSavedViewAction(
														organization.id,
														{
															id: view.id,
															value: filtersParam || "",
															viewConfig: viewState as unknown as Record<string, unknown>,
														},
														wsClientId || ""
													);
												}}
											>
												<IconDeviceFloppy className="size-4" />
											</Button>
										</TileAction>
									)} */}
								</Tile>
							);
						})}
					</div>
				</TabsContent>
				<TabsContent value="priority" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{priorityViews.map(({ key, label }) => {
							const isActive = filtersParam === serializeFilters(createPriorityFilter(key));
							const config = priorityConfig[key];

							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group",
										isActive ? "bg-accent" : "bg-transparent hover:bg-accent"
									)}
									key={key}
									onClick={() => {
										if (isActive) {
											// setFiltersParam("");
											setFilterState({ groups: [], operator: "AND" });
										} else {
											// setFiltersParam(filterParam);
											setFilterState(createPriorityFilter(key));
										}
										setViewState(DEFAULT_TASK_VIEW_STATE);
									}}
								>
									<TileHeader>
										<TileTitle className="flex items-center gap-2">
											<TileIcon className={cn(config.className, !isActive && "bg-transparent")}>
												{config.icon("w-4 h-4")}
											</TileIcon>

											{label}
										</TileTitle>
									</TileHeader>
								</Tile>
							);
						})}
					</div>
				</TabsContent>
			</Tabs>

			<GlobalSettings
				organization={organization}
				labels={labels}
				setLabels={setLabels}
				isOpen={openSettings}
				setIsOpen={setOpenSettings}
				categories={categories}
				setCategories={setCategories}
				tasks={tasks}
				onCategoryClick={(categoryId) => {
					setFilterState(createCategoryFilter(categoryId));
					setOpenSettings(false);
				}}
				onLabelClick={(labelId) => {
					setFilterState(createLabelFilter(labelId));
					setOpenSettings(false);
				}}
			/>
		</div>
	);
}
