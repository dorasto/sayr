"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import { IconPencil, IconSettings, IconStack2, IconUser, IconUsers, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { useState } from "react";
import { useTaskViewManager, type FilterState } from "@/hooks/useTaskViewManager";
import { useSticky } from "@/hooks/use-sticky";
import { useLayoutData } from "../generic/Context";
import RenderIcon from "../generic/RenderIcon";
import { serializeFilters } from "./filter";
import { type PriorityKey, priorityConfig } from "./shared";
import SettingsOrganizationViewDetailPage from "../pages/admin/settings/orgId/view-detail";

export default function ProjectSide() {
	console.log("[RENDER] ProjectSide");
	const { stuck, stickyRef } = useSticky();
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: tasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: views } = useStateManagement<schema.savedViewType[]>("views", [], 3);
	const { value: categories } = useStateManagement<schema.categoryType[]>("categories", [], 1);

	// Consolidated task view state management
	const { filters, viewSlug: selectedViewSlug, selectView, clearView, applyFilter } = useTaskViewManager(views);

	const [editingView, setEditingView] = useState<schema.savedViewType | null>(null);

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
	const isMyAssignedActive = serializeFilters(filters) === serializeFilters(myAssignedFilterState);

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
	// Check if no filters are active (showing all open tasks)
	const isAllTasksActive = filters.groups.length === 0 && !selectedViewSlug;

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
						to={`/settings/org/$orgId`}
						params={{ orgId: organization.id }}
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
						isAllTasksActive ? "bg-accent" : "bg-card hover:bg-accent"
					)}
					onClick={() => clearView()}
				>
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon
								className={cn(
									isAllTasksActive ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"
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
						if (isMyAssignedActive) {
							clearView();
						} else {
							applyFilter(myAssignedFilterState);
						}
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
					const categoryFilter = createCategoryFilter(category.id);
					const isActive = serializeFilters(filters) === serializeFilters(categoryFilter);
					const categoryTaskCount = tasks.filter((task) => task.category === category.id).length;

					return (
						<Tile
							className={cn(
								"bg-card md:w-full cursor-pointer select-none",
								isActive ? "bg-accent" : "bg-card hover:bg-accent"
							)}
							key={category.id}
							onClick={() => {
								if (isActive) {
									clearView();
								} else {
									applyFilter(categoryFilter);
								}
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
				</div>
				<TabsContent value="views" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{views.map((view) => {
							const viewSlug = view.slug || view.id;
							const isActive = selectedViewSlug === viewSlug;
							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group p-0 justify-baseline gap-0 group/view",
										isActive ? "bg-accent" : "bg-transparent hover:bg-accent"
									)}
									style={{
										backgroundColor: isActive
											? `hsla(${extractHslValues(view.viewConfig?.color || "#ffffff")}, 0.05)`
											: undefined,
									}}
									key={view.id}
								>
									<TileHeader
										className="h-fit p-3 flex-1 min-w-0"
										onClick={() => {
											if (isActive) {
												clearView();
											} else {
												selectView(view);
											}
										}}
									>
										<TileTitle className="flex items-center gap-2 min-w-0">
											<TileIcon className={cn("bg-transparent shrink-0")}>
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
											<span className="truncate min-w-0">{view.name}</span>
										</TileTitle>
									</TileHeader>

									<TileAction
										className={cn(
											"p-3 opacity-0 group-hover/view:opacity-100 transition-all",
											isActive && "opacity-100"
										)}
									>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={(e) => {
												e.stopPropagation();
												setEditingView(view);
											}}
										>
											<IconPencil className="size-5 text-muted-foreground" />
										</Button>
									</TileAction>
								</Tile>
							);
						})}
					</div>
				</TabsContent>
				<TabsContent value="priority" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{priorityViews.map(({ key, label }) => {
							const priorityFilter = createPriorityFilter(key);
							const isActive = serializeFilters(filters) === serializeFilters(priorityFilter);
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
											clearView();
										} else {
											applyFilter(priorityFilter);
										}
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

			{/* <GlobalSettings
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
			/> */}
			<Sheet open={!!editingView} onOpenChange={(open) => !open && setEditingView(null)}>
				<SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
					<SheetHeader className="sticky top-0 bg-card p-3 py-1  z-50 border-b">
						<div className="flex items-center justify-between mb-0">
							<SheetTitle asChild>
								<Label variant={"heading"} className="mb-0">
									{editingView?.name}
								</Label>
							</SheetTitle>
							<SheetClose asChild>
								<Button variant="ghost" size="icon" className="h-6 w-6">
									<IconX className="size-5" />
								</Button>
							</SheetClose>
						</div>
						<SheetDescription className="sr-only">Manage settings for this saved view.</SheetDescription>
					</SheetHeader>
					<div className="p-3">
						{editingView && (
							<SettingsOrganizationViewDetailPage viewId={editingView.id} initialView={editingView} />
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
