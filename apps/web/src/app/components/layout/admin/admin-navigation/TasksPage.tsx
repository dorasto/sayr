"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
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
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCheck, IconPlus, IconSlash, IconStack2, IconUser, IconUsers } from "@tabler/icons-react";
import { ChevronDownIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import {
	deserializeFilters,
	serializeFilters,
} from "@/app/components/admin/global/org/tasks/task/filter/dropdown/serialization";
import type { FilterState } from "@/app/components/admin/global/org/tasks/task/filter/types";
import RenderIcon from "@/app/components/RenderIcon";

const CreateIssueDialog = dynamic(() => import("@/app/components/admin/global/org/tasks/task/creator"), {
	ssr: false,
});

export default function TasksPage() {
	const { value: organization } = useStateManagement<schema.OrganizationWithMembers>("organization", null, 1);
	const { value: tasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", [], 1);
	const { value: labels } = useStateManagement<schema.labelType[]>("labels", [], 1);
	const { value: views } = useStateManagement<schema.savedViewType[]>("views", [], 1);
	const { value: categories } = useStateManagement<schema.categoryType[]>("categories", [], 1);
	const { setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		{ groups: [], operator: "AND" },
		1
	);
	const [filtersParam] = useQueryState("filters", parseAsString.withDefault(""));
	const { account } = useLayoutData();
	const [openNew, setOpenNew] = useState(false);

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

	let currentViewName = "All tasks";
	let CurrentViewIcon = <IconStack2 className="text-muted-foreground" />;

	if (filtersParam === "") {
		currentViewName = "All tasks";
		CurrentViewIcon = <IconStack2 className="text-muted-foreground" />;
	} else if (filtersParam === serializeFilters(myAssignedFilterState)) {
		currentViewName = "Your tasks";
		CurrentViewIcon = <IconUser className="text-muted-foreground" />;
	} else {
		const category = categories.find((c) => serializeFilters(createCategoryFilter(c.id)) === filtersParam);
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
			const view = views.find((v) => v.filterParams === filtersParam);
			if (view) {
				currentViewName = view.name;
				CurrentViewIcon = <IconStack2 className="text-muted-foreground" />;
			}
		}
	}

	if (!organization || !tasks) {
		return (
			<Skeleton className="flex items-center gap-2 shrink-0 rounded px-3 py-0.5 h-9 shadow-xs w-full justify-start bg-sidebar" />
		);
	}
	return (
		<div className="flex items-center gap-3 w-full">
			<div className="flex items-center gap-2 shrink-0 rounded-lg bg-accent h-9 shadow-xs w-fit justify-start overflow-hidden">
				<Breadcrumb className="h-full">
					<BreadcrumbList className="h-full gap-0">
						<BreadcrumbItem className="h-full">
							<BreadcrumbLink
								href={`/admin/${organization?.id}`}
								className="flex items-center gap-1 px-2 py-0.5 h-full"
							>
								<Avatar className="h-3.5 w-3.5">
									<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-3.5 w-3.5" />
									</AvatarFallback>
								</Avatar>
								{organization?.name}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator className="h-full flex items-center">
							<IconSlash className="h-full" />
						</BreadcrumbSeparator>
						<BreadcrumbItem className="h-full">
							<DropdownMenu>
								<DropdownMenuTrigger
									asChild
									// className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
								>
									<BreadcrumbPage className="flex items-center gap-1 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer hover:bg-border/80 h-full px-2 py-0.5">
										{CurrentViewIcon}
										{currentViewName}
										<ChevronDownIcon />
									</BreadcrumbPage>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-56">
									<DropdownMenuItem onClick={() => setFilterState({ groups: [], operator: "AND" })}>
										<IconStack2 className="text-muted-foreground" />
										All tasks
										{filtersParam === "" && <IconCheck className="ml-auto" />}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setFilterState(myAssignedFilterState)}>
										<IconUser className="text-muted-foreground" />
										Your tasks
										{filtersParam === serializeFilters(myAssignedFilterState) && (
											<IconCheck className="ml-auto" />
										)}
									</DropdownMenuItem>

									{categories.length > 0 && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuLabel>Categories</DropdownMenuLabel>
											{categories.map((category) => (
												<DropdownMenuItem
													key={category.id}
													onClick={() => setFilterState(createCategoryFilter(category.id))}
												>
													<RenderIcon
														iconName={category.icon || "IconCircleFilled"}
														color={category.color || undefined}
														className="size-4! [&_svg]:size-3! border-0"
														button
													/>
													<span>{category.name}</span>
													{filtersParam === serializeFilters(createCategoryFilter(category.id)) && (
														<IconCheck className="ml-auto" />
													)}
												</DropdownMenuItem>
											))}
										</>
									)}

									{views.length > 0 && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuLabel>Custom Views</DropdownMenuLabel>
											{views.map((view) => (
												<DropdownMenuItem
													key={view.id}
													onClick={() =>
														setFilterState(
															deserializeFilters(view.filterParams) || { groups: [], operator: "AND" }
														)
													}
												>
													<IconStack2 className="text-muted-foreground" />
													{view.name}
													{filtersParam === view.filterParams && <IconCheck className="ml-auto" />}
												</DropdownMenuItem>
											))}
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</BreadcrumbItem>
						{/* <BreadcrumbItem>
							<BreadcrumbLink href={`/admin/${organization?.id}/tasks`}>All tasks</BreadcrumbLink>
						</BreadcrumbItem> */}
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* Task Filters */}
			{/* <TaskFilterDropdown tasks={tasks} labels={labels} availableUsers={availableUsers} /> */}

			<Button variant={"accent"} size={"sm"} className="h-9 rounded-lg border-0" onClick={() => setOpenNew(true)}>
				<IconPlus />
				<span className="text-inherit">New task</span>
			</Button>
			<CreateIssueDialog
				organization={organization}
				tasks={tasks}
				setTasks={setTasks}
				_labels={labels}
				open={openNew}
				setOpen={setOpenNew}
			/>
		</div>
	);
}
