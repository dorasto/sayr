"use client";

import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Tile,
	TileAction,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, extractHslValues } from "@repo/util";
import {
	IconPencil,
	IconRocket,
	IconSettings,
	IconStack2,
	IconUser,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import RenderIcon from "@/components/generic/RenderIcon";
import SettingsOrganizationViewDetailPage from "@/components/pages/admin/settings/orgId/view-detail";
import { releaseStatusConfig } from "@/components/releases/config";
import { serializeFilters } from "@/components/tasks/filter";
import { type PriorityKey, priorityConfig } from "@/components/tasks/shared";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import {
	useTaskViewManager,
	type FilterState,
} from "@/hooks/useTaskViewManager";

// --- Filter helpers ---

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

const createReleaseFilter = (releaseId: string): FilterState => ({
	groups: [
		{
			id: `release-${releaseId}-group`,
			operator: "AND",
			conditions: [
				{
					id: `release-any-${releaseId}`,
					field: "release",
					operator: "any",
					value: releaseId,
				},
			],
		},
	],
	operator: "AND",
});

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

const priorityViews: Array<{ key: PriorityKey; label: string }> = [
	{ key: "urgent", label: "Urgent" },
	{ key: "high", label: "High Priority" },
	{ key: "medium", label: "Medium Priority" },
	{ key: "low", label: "Low Priority" },
];

// --- Interactive panel content ---

/**
 * Fixed header for the tasks panel, height-matched to PageHeader.Identity (h-11).
 * Shows org name + settings link.
 */
function TasksPanelHeader() {
	const { organization } = useLayoutOrganization();

	return (
		<div className="flex items-center gap-2 w-full flex-1 min-w-0">
			<Avatar className="h-4 w-4 shrink-0">
				<AvatarImage
					src={
						organization.logo
							? ensureCdnUrl(organization.logo)
							: ""
					}
					alt={organization.name}
				/>
				<AvatarFallback className="rounded-md uppercase text-[10px]">
					<IconUsers className="h-3 w-3" />
				</AvatarFallback>
			</Avatar>
			<span className="text-xs font-medium truncate">{organization.name}</span>
			<div className="ml-auto shrink-0">
				<Link
					to={"/settings/org/$orgId"}
					params={{ orgId: organization.id }}
				>
					<Button
						variant={"ghost"}
						size={"icon"}
						className="p-0 h-6 w-6"
					>
						<IconSettings className="size-3.5!" />
					</Button>
				</Link>
			</div>
		</div>
	);
}

/**
 * Full interactive panel content for the tasks list page.
 * Overview tiles, tabs (views/releases/priority), settings link, and view editing sheet.
 */
function TasksPanelContent() {
	const { account } = useLayoutData();
	const { views, categories, releases } =
		useLayoutOrganization();
	const { tasks } = useLayoutTasks();

	const {
		filters,
		viewSlug: selectedViewSlug,
		selectView,
		clearView,
		applyFilter,
	} = useTaskViewManager(views);

	const [editingView, setEditingView] = useState<schema.savedViewType | null>(
		null,
	);

	// "My Assigned" filter for current user
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

	const currentFiltersSerialized = serializeFilters(filters);
	const isAllTasksActive = filters.groups.length === 0 && !selectedViewSlug;
	const isMyAssignedActive =
		currentFiltersSerialized === serializeFilters(myAssignedFilterState);

	// Task counts
	const openTaskCount = tasks.filter(
		(t) => t.status !== "done" && t.status !== "canceled",
	).length;
	const openUserTaskCount = tasks.filter(
		(t) =>
			t.status !== "done" &&
			t.status !== "canceled" &&
			t.assignees.some((a) => a.id === account?.id),
	).length;

	return (
		<div className="flex flex-col gap-3 w-full relative">
			{/* Overview tiles */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
				<Tile
					className={cn(
						"bg-card md:w-full cursor-pointer select-none",
						isAllTasksActive
							? "bg-accent"
							: "bg-card hover:bg-accent",
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
							{openTaskCount}{" "}
							{openTaskCount === 1 ? "task" : "tasks"}
						</TileDescription>
					</TileHeader>
				</Tile>
				<Tile
					className={cn(
						"bg-card md:w-full cursor-pointer select-none",
						isMyAssignedActive
							? "bg-accent"
							: "bg-card hover:bg-accent",
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
									isMyAssignedActive
										? "text-foreground bg-muted-foreground/20"
										: "text-muted-foreground",
								)}
							>
								<IconUser />
							</TileIcon>
							Your tasks
						</TileTitle>
						<TileDescription>
							{openUserTaskCount}{" "}
							{openUserTaskCount === 1 ? "task" : "tasks"}
						</TileDescription>
					</TileHeader>
				</Tile>
				{categories.map((category) => {
					const categoryFilter = createCategoryFilter(category.id);
					const isActive =
						currentFiltersSerialized ===
						serializeFilters(categoryFilter);
					const categoryTaskCount = tasks.filter(
						(t) => t.category === category.id,
					).length;

					return (
						<Tile
							className={cn(
								"bg-card md:w-full cursor-pointer select-none",
								isActive
									? "bg-accent"
									: "bg-card hover:bg-accent",
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
											iconName={
												category.icon ||
												"IconCircleFilled"
											}
											color={
												category.color || undefined
											}
											button
											focus={isActive}
											className={cn(
												"size-4! [&_svg]:size-3! border-0 ",
												!isActive &&
													"text-muted-foreground",
											)}
										/>
									</TileIcon>
									{category.name}
								</TileTitle>
								<TileDescription>
									{categoryTaskCount}{" "}
									{categoryTaskCount === 1
										? "task"
										: "tasks"}
								</TileDescription>
							</TileHeader>
						</Tile>
					);
				})}
			</div>

			{/* Tabs: saved views, releases, priority */}
			<Tabs
				defaultValue="views"
				className="w-full p-1 relative bg-card rounded-lg"
			>
				<div className="flex items-center gap-2 shrink-0 sticky top-0 w-full bg-card z-50 p-1">
					<TabsList className="justify-start w-full p-0 sticky top-0 bg-card transition-colors gap-2 h-auto overflow-x-scroll">
						<TabsTrigger asChild value="views">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-accent bg-transparent rounded-lg border-transparent text-xs w-auto px-2 py-1 h-auto"
								size={"sm"}
							>
								<IconStack2 className="w-3! h-3!" />
								Saved views
							</Button>
						</TabsTrigger>
						<TabsTrigger asChild value="release">
							<Button
								variant={"accent"}
								className="data-[state=active]:bg-accent bg-transparent rounded-lg border-transparent text-xs w-auto px-2 py-1 h-auto"
								size={"sm"}
							>
								<IconRocket className="w-3! h-3!" />
								Releases
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

				{/* Saved Views tab */}
				<TabsContent value="views" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{views.map((view) => {
							const viewSlug = view.slug || view.id;
							const isActive = selectedViewSlug === viewSlug;
							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group p-0 justify-baseline gap-0 group/view",
										isActive
											? "bg-accent"
											: "bg-transparent hover:bg-accent",
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
											<TileIcon
												className={cn(
													"bg-transparent shrink-0",
												)}
											>
												<RenderIcon
													iconName={
														view.viewConfig
															?.icon ||
														"IconStack2"
													}
													color={
														view.viewConfig
															?.color ||
														"#ffffff"
													}
													button
													className={cn(
														"size-5! [&_svg]:size-4! border-0 ",
														!isActive &&
															"text-muted-foreground [&_svg]:grayscale! bg-transparent!",
													)}
												/>
											</TileIcon>
											<span className="truncate min-w-0">
												{view.name}
											</span>
										</TileTitle>
									</TileHeader>

									<TileAction
										className={cn(
											"p-3 opacity-0 group-hover/view:opacity-100 transition-all",
											isActive && "opacity-100",
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

				{/* Releases tab */}
				<TabsContent value="release" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{releases.length === 0 ? (
							<div className="p-3 text-muted-foreground text-sm text-center">
								No releases yet
							</div>
						) : (
							releases.map((release) => {
								const releaseFilter = createReleaseFilter(
									release.id,
								);
								const isActive =
									currentFiltersSerialized ===
									serializeFilters(releaseFilter);

								return (
									<Tile
										className={cn(
											"md:w-full cursor-pointer transition-colors group p-0 justify-baseline gap-0 group/release",
											isActive
												? "bg-accent"
												: "bg-transparent hover:bg-accent",
										)}
										style={{
											backgroundColor: isActive
												? `hsla(${extractHslValues(release.color || "#ffffff")}, 0.05)`
												: undefined,
										}}
										key={release.id}
									>
										<TileHeader
											className="h-fit p-3 flex-1 min-w-0"
											onClick={() => {
												if (isActive) {
													clearView();
												} else {
													applyFilter(
														releaseFilter,
													);
												}
											}}
										>
											<TileTitle className="flex items-center gap-2 min-w-0">
												<TileIcon
													className={cn(
														"bg-transparent shrink-0",
													)}
													style={{
														background: isActive
															? `hsla(${extractHslValues(release.color || "#ffffff")}, 0.1)`
															: undefined,
													}}
												>
													<RenderIcon
														iconName={
															release.icon ||
															"IconRocket"
														}
														color={
															release.color ||
															undefined
														}
														button
														focus={isActive}
														className={cn(
															"size-5! [&_svg]:size-4! border-0 ",
															!isActive &&
																"text-muted-foreground [&_svg]:grayscale! bg-transparent!",
														)}
													/>
												</TileIcon>
												<span className="truncate min-w-0">
													{release.name}
												</span>
											</TileTitle>
										</TileHeader>
										<TileAction
											className={cn(
												"p-3 transition-all",
											)}
										>
											<TileDescription asChild>
												<Badge
													className={cn(
														"border rounded-lg text-xs cursor-pointer gap-1.5",
														releaseStatusConfig[
															release.status
														].badgeClassName,
													)}
												>
													{releaseStatusConfig[
														release.status
													].icon("w-3 h-3")}
													{
														releaseStatusConfig[
															release.status
														].label
													}
												</Badge>
											</TileDescription>
										</TileAction>
									</Tile>
								);
							})
						)}
					</div>
				</TabsContent>

				{/* Priority tab */}
				<TabsContent value="priority" className="mt-0">
					<div className="flex flex-col gap-0.5">
						{priorityViews.map(({ key, label }) => {
							const priorityFilter = createPriorityFilter(key);
							const isActive =
								currentFiltersSerialized ===
								serializeFilters(priorityFilter);
							const config = priorityConfig[key];

							return (
								<Tile
									className={cn(
										"md:w-full cursor-pointer transition-colors group",
										isActive
											? "bg-accent"
											: "bg-transparent hover:bg-accent",
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
													!isActive &&
														"bg-transparent",
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

			{/* View editing sheet */}
			<Sheet
				open={!!editingView}
				onOpenChange={(open) => !open && setEditingView(null)}
			>
				<SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0">
					<SheetHeader className="sticky top-0 bg-card p-3 py-1 z-50 border-b">
						<div className="flex items-center justify-between mb-0">
							<SheetTitle asChild>
								<Label variant={"heading"} className="mb-0">
									{editingView?.name}
								</Label>
							</SheetTitle>
							<SheetClose asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
								>
									<IconX className="size-5" />
								</Button>
							</SheetClose>
						</div>
						<SheetDescription className="sr-only">
							Manage settings for this saved view.
						</SheetDescription>
					</SheetHeader>
					<div className="p-3">
						{editingView && (
							<SettingsOrganizationViewDetailPage
								viewId={editingView.id}
								initialView={editingView}
							/>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

// Export the panel components directly for use as PanelWrapper props
export { TasksPanelHeader, TasksPanelContent };
