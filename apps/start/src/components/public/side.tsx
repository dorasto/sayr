"use client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import {
	Tile,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import {
	IconStack2,
	IconUsers,
} from "@tabler/icons-react";

import { useTaskViewManager, type FilterState } from "@/hooks/useTaskViewManager";
import { useSticky } from "@/hooks/use-sticky";
import { serializeFilters } from "@/components/tasks/filter";
import { type PriorityKey, priorityConfig } from "@/components/tasks/shared";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import RenderIcon from "@/components/generic/RenderIcon";
import { Button } from "@repo/ui/components/button";

export default function PublicTaskSide() {
	const { stuck, stickyRef } = useSticky();
	const { organization, tasks, categories } = usePublicOrganizationLayout();

	const {
		filters,
		viewSlug: selectedViewSlug,
		clearView,
		applyFilter,
	} = useTaskViewManager();

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
	const opentaskCount = tasks.filter(
		(task) => task.status !== "done" && task.status !== "canceled",
	).length;

	// Check if no filters are active (showing all open tasks)
	const isAllTasksActive = filters.groups.length === 0 && !selectedViewSlug;

	return (
		<div className="flex flex-col gap-3 w-full relative">
			<Tile className="bg-card md:w-full md:h-11">
				<TileHeader>
					<TileIcon>
						<Avatar className="h-3 w-3">
							<AvatarImage
								src={organization.logo || ""}
								alt={organization.name}
								className=""
							/>
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
					</TileIcon>
					<TileTitle className="flex items-center gap-2">
						{organization.name}
					</TileTitle>
				</TileHeader>
			</Tile>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
				<Tile
					className={cn(
						"bg-card md:w-full cursor-pointer select-none",
						isAllTasksActive ? "bg-accent" : "bg-card hover:bg-accent",
					)}
					onClick={() => clearView()}
				>
					<TileHeader>
						<TileTitle className="flex items-center gap-2">
							<TileIcon
								className={cn(
									isAllTasksActive
										? "text-foreground bg-muted-foreground/20"
										: "text-muted-foreground",
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
				
				{categories.map((category) => {
					const categoryFilter = createCategoryFilter(category.id);
					const isActive =
						serializeFilters(filters) === serializeFilters(categoryFilter);
					const categoryTaskCount = tasks.filter(
						(task) => task.category === category.id,
					).length;

					return (
						<Tile
							className={cn(
								"bg-card md:w-full cursor-pointer select-none",
								isActive ? "bg-accent" : "bg-card hover:bg-accent",
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
												!isActive && "text-muted-foreground",
											)}
										/>
									</TileIcon>
									{category.name}
								</TileTitle>
								<TileDescription>
									{categoryTaskCount}{" "}
									{categoryTaskCount === 1 ? "task" : "tasks"}
								</TileDescription>
							</TileHeader>
						</Tile>
					);
				})}
			</div>
			<Tabs
				defaultValue="priority"
				className="w-full p-1 relative bg-card rounded-lg"
			>
				<div
					className={cn(
						"flex items-center gap-2 shrink-0 sticky top-0 w-full bg-card z-50 p-1",
						stuck && "border-b shadow-xl",
					)}
					ref={stickyRef}
				>
					<TabsList
						className={cn(
							"justify-start w-full p-0 sticky top-0 bg-card transition-colors gap-2 h-auto overflow-x-scroll",
						)}
					>
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
				<TabsContent value="priority" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{priorityViews.map(({ key, label }) => {
							const priorityFilter = createPriorityFilter(key);
							const isActive =
								serializeFilters(filters) === serializeFilters(priorityFilter);
							const config = priorityConfig[key];

							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group",
										isActive ? "bg-accent" : "bg-transparent hover:bg-accent",
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
											<TileIcon
												className={cn(
													config.className,
													!isActive && "bg-transparent",
												)}
											>
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
		</div>
	);
}
