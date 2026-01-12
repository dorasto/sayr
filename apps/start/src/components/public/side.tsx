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
import { IconStack2, IconUser, IconUsers } from "@tabler/icons-react";

import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import { useSticky } from "@/hooks/use-sticky";
import { serializeFilters } from "@/components/tasks/filter";
import { type PriorityKey, priorityConfig } from "@/components/tasks/shared";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import RenderIcon from "@/components/generic/RenderIcon";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import LoginDialog from "../auth/login";

export default function PublicTaskSide() {
  const { organization, tasks, categories } = usePublicOrganizationLayout();
  const { stuck, stickyRef } = useSticky();

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
    <div
      className="flex flex-col gap-3 w-full sticky top-3 self-start"
      ref={stickyRef}
    >
      <LoginDialog trigger={<Button size={"lg"}>Sign in</Button>} />
      <div className="flex flex-col gap-1 bg-card rounded-xl">
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            stuck ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden min-h-0">
            <Tile className="bg-card md:w-full cursor-pointer select-none">
              <TileHeader className="w-full">
                <div className="flex flex-row gap-3 w-full">
                  <TileTitle className="flex items-center gap-2 w-full">
                    <TileIcon className="size-6!">
                      <Avatar className="size-4! rounded-md">
                        <AvatarImage
                          src={organization.logo || ""}
                          alt={organization.name}
                        />
                        <AvatarFallback className="rounded-md uppercase text-xs">
                          <IconUser className="size-6! transition-all" />
                        </AvatarFallback>
                      </Avatar>
                    </TileIcon>
                    <span className="line-clamp-1">{organization.name}</span>
                  </TileTitle>
                </div>
              </TileHeader>
            </Tile>
          </div>
        </div>

        <div className="flex flex-col gap-1 p-3">
          <Tile
            className={cn(
              "bg-card md:w-full cursor-pointer select-none",
              isAllTasksActive ? "bg-accent" : "bg-card hover:bg-accent",
            )}
            onClick={() => clearView()}
          >
            <TileHeader className="w-full">
              <div className="flex flex-row gap-3 w-full">
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
                  Open
                </TileTitle>
                <TileDescription className="ml-auto">
                  {opentaskCount}
                </TileDescription>
              </div>
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
                <TileHeader className="w-full">
                  <div className="flex flex-row gap-3 w-full">
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
                    <TileDescription className="ml-auto">
                      {categoryTaskCount}
                    </TileDescription>
                  </div>
                </TileHeader>
              </Tile>
            );
          })}
          <Label
            variant={"subheading"}
            className="pt-9 text-muted-foreground text-xs"
          >
            Powered by Sayr.io
          </Label>
        </div>
      </div>
    </div>
  );
}
