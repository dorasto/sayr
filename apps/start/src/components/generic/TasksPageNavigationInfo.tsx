import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { ensureCdnUrl } from "@repo/util";
import {
	IconCheck,
	IconChevronDown,
	IconSlash,
	IconStack2,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useMatch } from "@tanstack/react-router";
import { parseAsString, useQueryState } from "nuqs";
import RenderIcon from "@/components/generic/RenderIcon";
import {
	DEFAULT_TASK_VIEW_STATE,
	deserializeFilters,
	type FilterState,
	serializeFilters,
	useTaskViewState,
} from "@/components/tasks/filter";
import { useLayoutData } from "./Context";
import TasksPageActions from "./TasksPageActions";

export default function TasksPageNavigationInfo() {
	// Use route match to get organization data instead of context
	// This avoids the context provider requirement at the AdminNavigation level
	const match = useMatch({ from: "/admin/$orgId", shouldThrow: false });
	const organization = match?.loaderData?.organization;

	// Get categories and views from state management
	const { value: views } = useStateManagement<schema.savedViewType[]>(
		"views",
		[],
		3,
	);
	const { value: categories } = useStateManagement<schema.categoryType[]>(
		"categories",
		[],
		1,
	);
	const { setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		{ groups: [], operator: "AND" },
		1,
	);
	const [filtersParam] = useQueryState(
		"filters",
		parseAsString.withDefault(""),
	);
	const [selectedViewSlug, setSelectedViewSlug] = useQueryState("view", {
		...parseAsString,
		clearOnDefault: true,
	});
	const { setViewState } = useTaskViewState();
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

	// Helper to map view config to state
	const mapConfigToState = (
		config: NonNullable<schema.savedViewType["viewConfig"]>,
	) => ({
		grouping: config.groupBy,
		showEmptyGroups: config.showEmptyGroups,
		showCompletedTasks: config.showCompletedTasks,
		viewMode: config.mode,
	});

	// Determine current view name and icon
	let currentViewName = "All tasks";
	let CurrentViewIcon = <IconStack2 className="size-3.5 text-muted-foreground" />;

	if (filtersParam === "" && !selectedViewSlug) {
		currentViewName = "All tasks";
		CurrentViewIcon = <IconStack2 className="size-3.5 text-muted-foreground" />;
	} else if (filtersParam === serializeFilters(myAssignedFilterState)) {
		currentViewName = "Your tasks";
		CurrentViewIcon = <IconUser className="size-3.5 text-muted-foreground" />;
	} else if (selectedViewSlug) {
		// Check for custom view by slug
		const view = views.find(
			(v) => (v.slug || v.id) === selectedViewSlug,
		);
		if (view) {
			currentViewName = view.name;
			CurrentViewIcon = (
				<RenderIcon
					iconName={view.viewConfig?.icon || "IconStack2"}
					color={view.viewConfig?.color || undefined}
					className="size-3.5! [&_svg]:size-3.5! border-0"
					button
				/>
			);
		}
	} else {
		// Check for category filter
		const category = categories.find(
			(c) => serializeFilters(createCategoryFilter(c.id)) === filtersParam,
		);
		if (category) {
			currentViewName = category.name;
			CurrentViewIcon = (
				<RenderIcon
					iconName={category.icon || "IconCircleFilled"}
					color={category.color || undefined}
					className="size-3.5! [&_svg]:size-3.5! border-0"
					button
				/>
			);
		} else {
			// Check for custom view by filter params (fallback)
			const view = views.find((v) => v.filterParams === filtersParam);
			if (view) {
				currentViewName = view.name;
				CurrentViewIcon = (
					<RenderIcon
						iconName={view.viewConfig?.icon || "IconStack2"}
						color={view.viewConfig?.color || undefined}
						className="size-3.5! [&_svg]:size-3.5! border-0"
						button
					/>
				);
			}
		}
	}

	const handleViewSelect = (
		filterState: FilterState,
		viewSlug?: string | null,
		viewConfig?: schema.savedViewType["viewConfig"],
	) => {
		setSelectedViewSlug(viewSlug ?? null);
		setFilterState(filterState);
		if (viewConfig) {
			setViewState(mapConfigToState(viewConfig));
		} else {
			setViewState(DEFAULT_TASK_VIEW_STATE);
		}
	};

	if (!organization) return null;

	return (
		<div className="flex items-center gap-2 text-sm">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link
								to="/admin/$orgId/tasks"
								params={{ orgId: organization.id }}
								className=""
							>
								<Button
									variant={"primary"}
									className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
									size={"sm"}
								>
									<Avatar className="h-4 w-4">
										<AvatarImage
											src={
												organization.logo ? ensureCdnUrl(organization.logo) : ""
											}
											alt={organization.name}
											className=""
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
									<span>{organization.name}</span>
								</Button>
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator>
						<IconSlash />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<BreadcrumbPage className="flex items-center gap-1 cursor-pointer hover:bg-accent rounded-lg px-2 py-1 transition-colors">
									{CurrentViewIcon}
									<span className="text-xs">{currentViewName}</span>
									<IconChevronDown className="size-3 text-muted-foreground" />
								</BreadcrumbPage>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuItem
									onClick={() =>
										handleViewSelect({ groups: [], operator: "AND" })
									}
								>
									<IconStack2 className="size-4 text-muted-foreground" />
									All tasks
									{filtersParam === "" && !selectedViewSlug && (
										<IconCheck className="ml-auto size-4" />
									)}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => handleViewSelect(myAssignedFilterState)}
								>
									<IconUser className="size-4 text-muted-foreground" />
									Your tasks
									{filtersParam === serializeFilters(myAssignedFilterState) && (
										<IconCheck className="ml-auto size-4" />
									)}
								</DropdownMenuItem>

								{categories.length > 0 && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuLabel>Categories</DropdownMenuLabel>
										{categories.map((category) => {
											const isActive =
												filtersParam ===
												serializeFilters(createCategoryFilter(category.id));
											return (
												<DropdownMenuItem
													key={category.id}
													onClick={() =>
														handleViewSelect(createCategoryFilter(category.id))
													}
												>
													<RenderIcon
														iconName={category.icon || "IconCircleFilled"}
														color={category.color || undefined}
														className="size-4! [&_svg]:size-3! border-0"
														button
													/>
													<span>{category.name}</span>
													{isActive && <IconCheck className="ml-auto size-4" />}
												</DropdownMenuItem>
											);
										})}
									</>
								)}

								{views.length > 0 && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuLabel>Custom Views</DropdownMenuLabel>
										{views.map((view) => {
											const viewSlug = view.slug || view.id;
											const isActive = selectedViewSlug === viewSlug;
											return (
												<DropdownMenuItem
													key={view.id}
													onClick={() =>
														handleViewSelect(
															deserializeFilters(view.filterParams) || {
																groups: [],
																operator: "AND",
															},
															viewSlug,
															view.viewConfig,
														)
													}
												>
													<RenderIcon
														iconName={view.viewConfig?.icon || "IconStack2"}
														color={view.viewConfig?.color || undefined}
														className="size-4! [&_svg]:size-3! border-0"
														button
													/>
													<span>{view.name}</span>
													{isActive && <IconCheck className="ml-auto size-4" />}
												</DropdownMenuItem>
											);
										})}
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</BreadcrumbItem>
					<BreadcrumbSeparator>
						<IconSlash />
					</BreadcrumbSeparator>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<TasksPageActions />
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}
