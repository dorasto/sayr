"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import { Separator } from "@repo/ui/components/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import {
	IconCheck,
	IconChevronDown,
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconStack2,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import RenderIcon from "@/components/generic/RenderIcon";
import { TaskFilterDropdown, serializeFilters } from "@/components/tasks/filter";
import ProjectSide from "@/components/tasks/side";
import CreateIssueDialog from "@/components/tasks/task/creator";
import { useTaskViewManager, type FilterState } from "@/hooks/useTaskViewManager";
import { TaskViewDropdown, UnifiedTaskView } from "@/components/tasks/views";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";

export default function OrganizationTasksHomePage() {
	const { ws, account } = useLayoutData();
	const {
		organization,
		setOrganization,
		labels,
		setLabels,
		views,
		setViews,
		categories,
		setCategories,
		releases,
		issueTemplates,
		isProjectPanelOpen,
		setProjectPanelOpen,
	} = useLayoutOrganization();
	const {
		viewMode,
		filters,
		viewSlug: selectedViewSlug,
		selectView,
		clearView,
		applyFilter,
	} = useTaskViewManager(views);
	const { tasks, setTasks } = useLayoutTasks();
	const ref = useRef<ResizablePanelHandle>(null);
	const useMobile = useIsMobile();

	// Get categories and views from state management (for breadcrumb view switcher)
	const { value: stateCategories } = useStateManagement<schema.categoryType[]>("categories", [], 1);

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

	// Category filter helper
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

	// Determine active view for breadcrumb display
	const currentFiltersSerialized = serializeFilters(filters);
	const isAllTasksActive = filters.groups.length === 0 && !selectedViewSlug;
	const isMyAssignedActive = currentFiltersSerialized === serializeFilters(myAssignedFilterState);

	let currentViewName = "All tasks";
	let CurrentViewIcon = <IconStack2 className="size-3.5 text-muted-foreground" />;

	if (isMyAssignedActive) {
		currentViewName = "Your tasks";
		CurrentViewIcon = <IconUser className="size-3.5 text-muted-foreground" />;
	} else if (selectedViewSlug) {
		const view = views.find((v) => (v.slug || v.id) === selectedViewSlug);
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
	} else if (!isAllTasksActive) {
		const category = stateCategories.find(
			(c) => serializeFilters(createCategoryFilter(c.id)) === currentFiltersSerialized,
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
			const view = views.find((v) => v.filterParams === currentFiltersSerialized);
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

	// DEBUG: Check releases in parent component
	// console.log('[OrganizationTasksHomePage] releases:', releases);
	// console.log('[OrganizationTasksHomePage] releases.length:', releases?.length ?? 'undefined');

	useEffect(() => {
		if (useMobile) {
			setProjectPanelOpen(false);
		}
	}, [useMobile, setProjectPanelOpen]);

	useEffect(() => {
		if (useMobile) return;
		const panel = ref.current;
		if (panel) {
			if (isProjectPanelOpen) {
				panel.expand();
			} else {
				panel.collapse();
			}
		}
	}, [isProjectPanelOpen, useMobile]);

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `tasks`,
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		CREATE_TASK: (msg) => {
			setTasks([...tasks, msg.data]);
		},
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setLabels(msg.data);
			}
		},
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setViews(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setCategories(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		// onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE PROJECT PAGE]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	const availableUsers = organization?.members.map((member) => member.user) || [];

	return (
		<div className="relative flex flex-col h-full max-h-full">
			<PageHeader>
				<PageHeader.Identity
					actions={
						<CreateIssueDialog
							organization={organization}
							tasks={tasks}
							setTasks={setTasks}
							_labels={labels}
							issueTemplates={issueTemplates}
							releases={releases ?? []}
						/>
					}
				>
					{!useMobile && (
						<>
							<Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
								<Button
									variant={"primary"}
									className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
									size={"sm"}
								>
									<Avatar className="h-4 w-4">
										<AvatarImage
											src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
											alt={organization.name}
										/>
										<AvatarFallback className="rounded-md uppercase text-xs">
											<IconUsers className="h-4 w-4" />
										</AvatarFallback>
									</Avatar>
									<span>{organization.name}</span>
								</Button>
							</Link>
							<span className="text-muted-foreground text-xs">/</span>
						</>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={"primary"}
								className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1 max-w-40"
								size={"sm"}
							>
								{CurrentViewIcon}
								<span className="truncate">{currentViewName}</span>
								<IconChevronDown className="size-3 text-muted-foreground shrink-0" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuItem onClick={() => clearView()}>
								<IconStack2 className="size-4 text-muted-foreground" />
								All tasks
								{isAllTasksActive && <IconCheck className="ml-auto size-4" />}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => applyFilter(myAssignedFilterState)}>
								<IconUser className="size-4 text-muted-foreground" />
								Your tasks
								{isMyAssignedActive && <IconCheck className="ml-auto size-4" />}
							</DropdownMenuItem>

							{stateCategories.length > 0 && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuLabel>Categories</DropdownMenuLabel>
									{stateCategories.map((category) => {
										const categoryFilter = createCategoryFilter(category.id);
										const isActive = currentFiltersSerialized === serializeFilters(categoryFilter);
										return (
											<DropdownMenuItem
												key={category.id}
												onClick={() => applyFilter(categoryFilter)}
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
											<DropdownMenuItem key={view.id} onClick={() => selectView(view)}>
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
				</PageHeader.Identity>
				<PageHeader.Toolbar
					left={
						<TaskFilterDropdown
							tasks={tasks}
							labels={labels}
							availableUsers={availableUsers}
							organizationId={organization.id}
							views={views}
							setViews={setViews}
							categories={categories}
							releases={releases}
						/>
					}
					right={
						<>
							<Separator orientation="vertical" className="h-5" />
							<TaskViewDropdown />
							<Button
								variant="accent"
								className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1")}
								onClick={() =>
									isProjectPanelOpen ? setProjectPanelOpen(false) : setProjectPanelOpen(true)
								}
							>
								{isProjectPanelOpen ? (
									<IconLayoutSidebarRightFilled />
								) : (
									<IconLayoutSidebarRight />
								)}
							</Button>
						</>
					}
				/>
			</PageHeader>
			<ResizablePanelGroup direction="horizontal" className={cn(viewMode === "kanban" && "")}>
				<ResizablePanel defaultSize={useMobile ? 100 : 70} minSize={70} className={cn(viewMode === "list" && "")}>
					<div
						className={cn(
							"flex-1 overflow-y-auto h-full flex flex-col relative",
							viewMode === "kanban" && "px-0"
						)}
					>
					<UnifiedTaskView
						tasks={tasks}
						setTasks={setTasks}
						ws={ws}
						availableUsers={availableUsers}
						organization={organization}
						categories={categories}
						releases={releases}
						views={views}
					/>
					</div>
				</ResizablePanel>
				{useMobile ? (
					<Sheet defaultOpen={false} open={isProjectPanelOpen} onOpenChange={setProjectPanelOpen}>
						<SheetContent className="p-0" showClose={false}>
							<SheetHeader className="sr-only">
								<SheetTitle>Are you absolutely sure?</SheetTitle>
								<SheetDescription>
									This action cannot be undone. This will permanently delete your account and remove your data
									from our servers.
								</SheetDescription>
							</SheetHeader>
							<div className="flex-1 overflow-y-auto h-full flex flex-col relative p-3">
								<ProjectSide />
							</div>
						</SheetContent>
					</Sheet>
				) : (
					<>
						<ResizableHandle />
						<ResizablePanel
							defaultSize={isProjectPanelOpen ? 30 : 0}
							minSize={20}
							collapsedSize={0}
							collapsible={true}
							ref={ref}
							onCollapse={() => setProjectPanelOpen(false)}
							onExpand={() => setProjectPanelOpen(true)}
						>
							<div className="flex-1 overflow-y-auto h-full flex flex-col relative px-2">
								<ProjectSide />
							</div>
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
