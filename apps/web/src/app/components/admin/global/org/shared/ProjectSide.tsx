"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
	IconChevronRight,
	IconCircleFilled,
	IconSettings,
	IconStack2,
	IconUser,
	IconUserCheck,
	IconUsers,
} from "@tabler/icons-react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { useSticky } from "@/app/hooks/use-sticky";
import { deserializeFilters, serializeFilters } from "../tasks/task/filter/dropdown/serialization";
import type { FilterState } from "../tasks/task/filter/types";
import GlobalSettings from "./GlobalSettings";
import { type PriorityKey, priorityConfig } from "./task-config";

export default function ProjectSide() {
	const { stuck, stickyRef } = useSticky();
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: tasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: views } = useStateManagement<schema.savedViewType[]>("views", [], 1);
	const { value: labels, setValue: setLabels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const { value: categories, setValue: setCategories } = useStateManagement<schema.categoryType[]>(
		"categories",
		[],
		1
	);
	const [filtersParam] = useQueryState("filters", parseAsString.withDefault(""));
	const { setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		{ groups: [], operator: "AND" },
		1
	);
	const [openSettings, setOpenSettings] = useState(false);

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
			<Tile className="bg-card md:w-full">
				<TileHeader>
					<TileIcon>
						<Avatar className="h-4 w-4">
							<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
					</TileIcon>
					<TileTitle className="flex items-center gap-2">{organization.name}</TileTitle>
				</TileHeader>
				<TileAction>
					<Button variant={"accent"} size={"icon"} onClick={() => setOpenSettings(true)}>
						<IconSettings />
					</Button>
				</TileAction>
			</Tile>
			<div className="flex flex-wrap gap-2 w-full">
				<Tile className="bg-card md:w-full max-w-40">
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon>
								<IconStack2 />
							</TileIcon>
							Open tasks
						</TileTitle>
						<TileDescription>{opentaskCount}</TileDescription>
					</TileHeader>
				</Tile>
				<Tile className="bg-card md:w-full max-w-40">
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon>
								<IconUser />
							</TileIcon>
							Your tasks
						</TileTitle>
						<TileDescription>{openusertaskCount}</TileDescription>
					</TileHeader>
				</Tile>
			</div>
			<Tabs defaultValue="views" className="w-full p-1 relative">
				<div
					className={cn(
						"flex items-center gap-2 shrink-0 sticky top-0 w-full bg-background z-50 p-1",
						stuck && "border-b shadow-xl"
					)}
					ref={stickyRef}
				>
					<TabsList className={cn("justify-start w-full p-0 sticky top-0 bg-background transition-colors")}>
						<TabsTrigger asChild value="views">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-card bg-transparent rounded-lg border-transparent"
								size={"sm"}
							>
								<IconStack2 className="w-4 h-4" />
								Views
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
						<Collapsible defaultOpen>
							<CollapsibleTrigger asChild className="group">
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors data-[state=closed]:bg-transparent data-[state=open]:bg-accent select-none"
									)}
								>
									<TileHeader>
										<TileTitle className="flex items-center gap-2">
											<TileIcon>
												<IconStack2 />
											</TileIcon>
											Saved views
										</TileTitle>
									</TileHeader>

									<TileAction>
										<IconChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
									</TileAction>
								</Tile>
							</CollapsibleTrigger>

							<CollapsibleContent className="pt-0.5 space-y-0.5">
								{views.map((view) => {
									const isActive = filtersParam === view.filterParams;
									return (
										<Tile
											className={cn(
												"md:w-full cursor-pointer transition-colors",
												isActive ? "bg-accent" : "bg-card hover:bg-accent"
											)}
											key={view.id}
											onClick={() => {
												if (isActive) {
													setFilterState({ groups: [], operator: "AND" });
												} else {
													setFilterState(
														deserializeFilters(view.filterParams) || { groups: [], operator: "AND" }
													);
												}
											}}
										>
											<TileHeader className="h-fit max-w-fit">
												<TileTitle className="flex items-center gap-2 truncate">
													<TileIcon>
														<IconStack2 />
													</TileIcon>
													{view.name}
												</TileTitle>
											</TileHeader>

											<TileAction>
												<TileDescription className={cn(!isActive && "opacity-0")}>
													Clear filter
												</TileDescription>
											</TileAction>
										</Tile>
									);
								})}
							</CollapsibleContent>
						</Collapsible>
						<Collapsible defaultOpen>
							<CollapsibleTrigger asChild className="group">
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors data-[state=open]:bg-accent select-none"
									)}
								>
									<TileHeader>
										<TileTitle className="flex items-center gap-2">
											<TileIcon>
												<IconUserCheck />
											</TileIcon>
											Default
										</TileTitle>
									</TileHeader>

									<TileAction>
										<IconChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
									</TileAction>
								</Tile>
							</CollapsibleTrigger>

							<CollapsibleContent className="pt-0.5 space-y-0.5">
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors",
										isMyAssignedActive ? "bg-accent" : "bg-card hover:bg-accent"
									)}
									onClick={() => {
										if (isMyAssignedActive) {
											// Clear filters if already active
											setFilterState({ groups: [], operator: "AND" });
										} else {
											// Apply "My Assigned" filter
											// setFiltersParam(myAssignedFilterParam);
											setFilterState(myAssignedFilterState);
										}
									}}
								>
									<TileHeader>
										<TileTitle className="flex items-center gap-2">
											<TileIcon>
												<IconUserCheck />
											</TileIcon>
											My Assigned
										</TileTitle>
									</TileHeader>
									<TileAction>
										<TileDescription className={cn(!isMyAssignedActive && "opacity-0")}>
											Clear filter
										</TileDescription>
									</TileAction>
								</Tile>
								{/* Prebuilt Priority Views */}
								{priorityViews.map(({ key, label }) => {
									const isActive = filtersParam === serializeFilters(createPriorityFilter(key));
									const config = priorityConfig[key];

									return (
										<Tile
											className={cn(
												"md:w-full cursor-pointer transition-colors",
												isActive ? "bg-accent" : "bg-card hover:bg-accent"
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
											}}
										>
											<TileHeader>
												<TileTitle className="flex items-center gap-2">
													<TileIcon className={config.className}>{config.icon("w-4 h-4")}</TileIcon>
													{label}
												</TileTitle>
											</TileHeader>
											<TileAction>
												<TileDescription className={cn(!isActive && "opacity-0")}>
													Clear filter
												</TileDescription>
											</TileAction>
										</Tile>
									);
								})}
							</CollapsibleContent>
						</Collapsible>
						{/* Category Views */}
						{categories.length > 0 && (
							<Collapsible defaultOpen>
								<CollapsibleTrigger asChild className="group">
									<Tile
										className={cn(
											"md:w-full cursor-pointer transition-colors data-[state=open]:bg-accent select-none"
										)}
									>
										<TileHeader>
											<TileTitle className="flex items-center gap-2">
												<TileIcon>
													<IconCircleFilled />
												</TileIcon>
												Categories
											</TileTitle>
										</TileHeader>

										<TileAction>
											<IconChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
										</TileAction>
									</Tile>
								</CollapsibleTrigger>

								<CollapsibleContent className="pt-0.5 space-y-0.5">
									{categories.map((category) => {
										const isActive = filtersParam === serializeFilters(createCategoryFilter(category.id));
										const categoryTaskCount = tasks.filter((task) => task.category === category.id).length;

										return (
											<Tile
												className={cn(
													"md:w-full cursor-pointer transition-colors",
													isActive ? "bg-accent" : "bg-card hover:bg-accent"
												)}
												key={category.id}
												onClick={() => {
													if (isActive) {
														setFilterState({ groups: [], operator: "AND" });
													} else {
														setFilterState(createCategoryFilter(category.id));
													}
												}}
											>
												<TileHeader>
													<TileTitle className="flex items-center gap-2">
														<TileIcon>
															<IconCircleFilled style={{ color: category.color || "#cccccc" }} />
														</TileIcon>
														{category.name}
													</TileTitle>
												</TileHeader>
												<TileAction>
													<TileDescription className={cn(!isActive && "opacity-50")}>
														{categoryTaskCount} {categoryTaskCount === 1 ? "task" : "tasks"}
													</TileDescription>
												</TileAction>
											</Tile>
										);
									})}
								</CollapsibleContent>
							</Collapsible>
						)}
					</div>
				</TabsContent>
			</Tabs>

			{/* <div className="flex items-center gap-2 shrink-0 rounded bg-accent border px-3 py-0.5 shadow-xs w-full justify-start">
				<Breadcrumb>
					<BreadcrumbList className="">
						<BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization?.id}`}>{organization?.name}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator>
							<IconSlash />
						</BreadcrumbSeparator>
						<BreadcrumbItem>
							<Button
								variant={"ghost"}
								size={"sm"}
								className="h-auto w-auto p-0 gap-1 items-center"
								onClick={() => setOpenProjectSettings(true)}
							>
								<IconSettings className="!size-4" /> {project?.name}
							</Button>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div> */}

			{/* Task Filters */}
			{/* <TaskFilterDropdown tasks={tasks} labels={labels} availableUsers={availableUsers} /> */}

			{/* <Button variant={"accent"} size={"sm"} className="h-9" onClick={() => setOpenNew(true)}>
				<IconPlus />
				<span className="text-inherit">New task</span>
			</Button>
			<CreateIssueDialog
				organization={organization}
				project={project}
				tasks={tasks}
				setTasks={setTasks}
				_labels={labels}
				open={openNew}
				setOpen={setOpenNew}
			/> */}

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
