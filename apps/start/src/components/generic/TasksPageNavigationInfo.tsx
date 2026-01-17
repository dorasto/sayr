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
import RenderIcon from "@/components/generic/RenderIcon";
import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import { serializeFilters } from "@/components/tasks/filter";
import { useLayoutData } from "./Context";
import TasksPageActions from "./TasksPageActions";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";

export default function TasksPageNavigationInfo() {
  // Use route match to get organization data instead of context
  // This avoids the context provider requirement at the AdminNavigation level
  const match = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
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

  // Consolidated task view state management
  const {
    filters,
    viewSlug: selectedViewSlug,
    selectView,
    clearView,
    applyFilter,
  } = useTaskViewManager();
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

  // Check if all tasks (no filters active)
  const currentFiltersSerialized = serializeFilters(filters);
  const isAllTasksActive = filters.groups.length === 0 && !selectedViewSlug;
  const isMyAssignedActive =
    currentFiltersSerialized === serializeFilters(myAssignedFilterState);

  // Determine current view name and icon
  let currentViewName = "All tasks";
  let CurrentViewIcon = (
    <IconStack2 className="size-3.5 text-muted-foreground" />
  );

  if (isAllTasksActive) {
    currentViewName = "All tasks";
    CurrentViewIcon = <IconStack2 className="size-3.5 text-muted-foreground" />;
  } else if (isMyAssignedActive) {
    currentViewName = "Your tasks";
    CurrentViewIcon = <IconUser className="size-3.5 text-muted-foreground" />;
  } else if (selectedViewSlug) {
    // Check for custom view by slug
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
  } else {
    // Check for category filter
    const category = categories.find(
      (c) =>
        serializeFilters(createCategoryFilter(c.id)) ===
        currentFiltersSerialized,
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
      const view = views.find(
        (v) => v.filterParams === currentFiltersSerialized,
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
    }
  }

  if (!organization) return null;
  const isMobile = useIsMobile();
  return (
    <div className="flex items-center gap-2 text-sm">
      <Breadcrumb>
        <BreadcrumbList>
          {!isMobile && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/$orgId/tasks"
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
                            organization.logo
                              ? ensureCdnUrl(organization.logo)
                              : ""
                          }
                          alt={organization.name}
                          className=""
                        />
                        <AvatarFallback className="rounded-md uppercase text-xs">
                          <IconUsers className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      {!isMobile && <span>{organization.name}</span>}
                    </Button>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <IconSlash />
              </BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <BreadcrumbPage className="flex items-center gap-1 cursor-pointer hover:bg-accent rounded-lg px-2 py-1 transition-colors max-w-40">
                  {CurrentViewIcon}
                  <span className="text-xs truncate">{currentViewName}</span>
                  <IconChevronDown className="size-3 text-muted-foreground shrink-0" />
                </BreadcrumbPage>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => clearView()}>
                  <IconStack2 className="size-4 text-muted-foreground" />
                  All tasks
                  {isAllTasksActive && <IconCheck className="ml-auto size-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => applyFilter(myAssignedFilterState)}
                >
                  <IconUser className="size-4 text-muted-foreground" />
                  Your tasks
                  {isMyAssignedActive && (
                    <IconCheck className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>

                {categories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Categories</DropdownMenuLabel>
                    {categories.map((category) => {
                      const categoryFilter = createCategoryFilter(category.id);
                      const isActive =
                        currentFiltersSerialized ===
                        serializeFilters(categoryFilter);
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
                        <DropdownMenuItem
                          key={view.id}
                          onClick={() => selectView(view)}
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
