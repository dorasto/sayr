import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@repo/ui/components/doras-ui/sidebar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues, generateSlug } from "@repo/util";
import { IconChevronRight, IconRocket, IconStack2 } from "@tabler/icons-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import { serializeFilters } from "@/components/tasks/filter";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import RenderIcon from "@/components/generic/RenderIcon";

const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

export default function PublicSidebar() {
  const sidebarId = "public-sidebar";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { organization, categories } = usePublicOrganizationLayout();
  const {
    filters,
    viewSlug: selectedViewSlug,
    categorySlug,
    clearView,
    applyFilter,
    setCategoryFilter,
  } = useTaskViewManager();

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname =
    rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;

  // Fetch sidebar counts independently — never affected by pagination or active filters
  const {
    value: { data: countsData },
  } = useStateManagementFetch<{
    open: number;
    categories: { id: string | null; count: number }[];
  }>({
    key: ["org-task-counts", organization.id],
    fetch: {
      url: `${baseApiUrl}/v1/admin/organization/task/tasks/counts?org_id=${organization.id}`,
      custom: async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch task counts");
        const json = await res.json();
        return json.data;
      },
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const openTaskCount = countsData?.open ?? 0;
  const getCategoryCount = (categoryId: string) =>
    countsData?.categories.find((c) => c.id === categoryId)?.count ?? 0;

  // Helper to build a category filter state
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

  const isAllTasksActive =
    filters.groups.length === 0 && !selectedViewSlug && !categorySlug;

  // Derive the base tasks path and releases path from the current org slug in the URL
  const orgSlugMatch = pathname.match(/^\/orgs\/([^/]+)/);
  const orgSlug = orgSlugMatch?.[1] ?? "";
  const tasksPath = `/orgs/${orgSlug}`;
  const releasesPath = `/orgs/${orgSlug}/releases`;

  const isOnTasks = pathname === tasksPath || pathname === `${tasksPath}/`;
  const isOnReleases = pathname.startsWith(releasesPath);

  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const handleTasksClick = () => {
    clearView();
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ["org-tasks", organization.id],
      });
    }, 100);
  };

  const handleCategoryClick = (category: { id: string; name: string }) => {
    const slug = generateSlug(category.name);
    const categoryFilter = createCategoryFilter(category.id);
    const isActive =
      isOnTasks &&
      ((slug && categorySlug === slug) ||
        serializeFilters(filters) === serializeFilters(categoryFilter));

    if (!isOnTasks) {
      // Navigate to tasks page with the category query param
      navigate({
        to: tasksPath,
        search: slug ? { category: slug } : undefined,
      });
      return;
    }

    // Already on tasks page — toggle filter
    if (isActive) {
      clearView();
    } else {
      if (slug) {
        setCategoryFilter(slug);
      } else {
        applyFilter(categoryFilter);
      }
    }
    setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ["org-tasks", organization.id],
      });
    }, 100);
  };

  return (
    <Sidebar id={sidebarId} collapsible keyboardShortcut="b">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {/* Tasks — collapsible when categories exist */}
            {categories.length > 0 ? (
              <Collapsible
                open={categoriesOpen}
                onOpenChange={setCategoriesOpen}
                className="flex flex-col gap-0.5"
              >
                <SidebarMenuItem
                  className="min-h-auto group/coltrig"
                  isActive={isOnTasks && isAllTasksActive}
                >
                  <Link
                    to={tasksPath}
                    className="w-full"
                    onClick={handleTasksClick}
                  >
                    <SidebarMenuButton
                      size="small"
                      tooltip="Tasks"
                      isActive={isOnTasks && isAllTasksActive}
                      icon={
                        <CollapsibleTrigger asChild>
                          {/** biome-ignore lint/a11y/noStaticElementInteractions: required for toggle */}
                          {/** biome-ignore lint/a11y/useKeyWithClickEvents: required for toggle */}
                          <div
                            className="h-4 w-4 flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCategoriesOpen((prev) => !prev);
                            }}
                          >
                            <IconChevronRight
                              size={16}
                              className={cn(
                                "transition-transform duration-200 text-muted-foreground group-hover/coltrig:text-sidebar-foreground",
                                categoriesOpen && "rotate-90",
                              )}
                            />
                          </div>
                        </CollapsibleTrigger>
                      }
                    >
                      <span>Tasks</span>
                    </SidebarMenuButton>
                  </Link>
                  {openTaskCount > 0 && (
                    <SidebarMenuSub className="h-auto max-h-none">
                      <span className="text-xs text-muted-foreground">
                        {openTaskCount}
                      </span>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>

                <CollapsibleContent className="flex flex-col gap-0.5 ml-2 pl-2 border-l">
                  {categories.map((category) => {
                    const slug = generateSlug(category.name);
                    const categoryFilter = createCategoryFilter(category.id);
                    const isActive =
                      isOnTasks &&
                      ((slug && categorySlug === slug) ||
                        serializeFilters(filters) ===
                          serializeFilters(categoryFilter));
                    const count = getCategoryCount(category.id);

                    return (
                      <SidebarMenuItem
                        key={category.id}
                        className="min-h-auto"
                        isActive={!!isActive}
                      >
                        <SidebarMenuButton
                          size="small"
                          tooltip={category.name}
                          isActive={!!isActive}
                          onClick={() => handleCategoryClick(category)}
                          icon={
                            <span
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded",
                                isActive && "opacity-100",
                              )}
                              style={{
                                background: isActive
                                  ? `hsla(${extractHslValues(category.color || "#cccccc")}, 0.15)`
                                  : undefined,
                              }}
                            >
                              <RenderIcon
                                iconName={category.icon || "IconCircleFilled"}
                                color={category.color || undefined}
                                button
                                focus={!!isActive}
                                className={cn(
                                  "size-4! [&_svg]:size-3! border-0",
                                  !isActive && "text-muted-foreground",
                                )}
                              />
                            </span>
                          }
                        >
                          <span className="truncate flex-1">{category.name}</span>
                        </SidebarMenuButton>
                        <SidebarMenuSub className="h-auto max-h-none">
                          <span className="text-xs text-muted-foreground">
                            {count}
                          </span>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              /* No categories — plain Tasks item */
              <SidebarMenuItem
                className="min-h-auto"
                isActive={isOnTasks && isAllTasksActive}
              >
                <Link
                  to={tasksPath}
                  className="w-full"
                  onClick={handleTasksClick}
                >
                  <SidebarMenuButton
                    size="small"
                    tooltip="Tasks"
                    icon={<IconStack2 size={16} />}
                    isActive={isOnTasks && isAllTasksActive}
                  >
                    <span>Tasks</span>
                  </SidebarMenuButton>
                </Link>
                {openTaskCount > 0 && (
                  <SidebarMenuSub className="h-auto max-h-none">
                    <span className="text-xs text-muted-foreground">
                      {openTaskCount}
                    </span>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}

            {/* Releases */}
            <SidebarMenuItem className="min-h-auto" isActive={isOnReleases}>
              <Link to={releasesPath} className="w-full">
                <SidebarMenuButton
                  size="small"
                  tooltip="Releases"
                  icon={<IconRocket size={16} />}
                  isActive={isOnReleases}
                >
                  <span>Releases</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-0.5">
          {/* Branding */}
          <SidebarMenuItem className="min-h-auto">
            <a
              href="https://sayr.io"
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              <SidebarMenuButton
                size="small"
                tooltip="Powered by Sayr.io"
                icon={<TasqIcon className="size-4! transition-all" />}
              >
                <span className="text-xs text-muted-foreground">
                  Powered by Sayr.io
                </span>
              </SidebarMenuButton>
            </a>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
