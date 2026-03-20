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
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues, generateSlug } from "@repo/util";
import { IconStack2, IconUser } from "@tabler/icons-react";

import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import { useSticky } from "@/hooks/use-sticky";
import { serializeFilters } from "@/components/tasks/filter";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import RenderIcon from "@/components/generic/RenderIcon";
import { Button } from "@repo/ui/components/button";
import LoginDialog from "../auth/login";
import { authClient } from "@repo/auth/client";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Separator } from "@repo/ui/components/separator";
import TasqIcon from "@repo/ui/components/brand-icon";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";

const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

export default function PublicTaskSide() {
  const queryClient = useQueryClient();
  const { organization, categories } = usePublicOrganizationLayout();
  const { stuck, stickyRef } = useSticky();
  const isMobile = useIsMobile();
  const {
    filters,
    viewSlug: selectedViewSlug,
    categorySlug,
    clearView,
    applyFilter,
    setCategoryFilter,
  } = useTaskViewManager();

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

  // Check if no filters are active (showing all open tasks)
  const isAllTasksActive =
    filters.groups.length === 0 && !selectedViewSlug && !categorySlug;
  const { data: session, isPending } = authClient.useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div
      className="flex flex-col gap-3 w-full sticky top-0 pt-3 self-start"
      ref={stickyRef}
    >
      {isPending
        ? null
        : !session && (
            <LoginDialog
              trigger={
                <Button variant={"primary"} className="justify-start w-fit">
                  Sign in
                </Button>
              }
            />
          )}
      <div className="flex flex-col gap-0 bg-card rounded-xl">
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            stuck && !isMobile
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr] invisible",
          )}
        >
          <div className="overflow-hidden min-h-0">
            <Tile className="bg-card md:w-full cursor-pointer select-none">
              <TileHeader className="w-full">
                <div className="flex flex-row gap-3 w-full">
                  <TileTitle className="flex items-center gap-2 w-full">
                    <TileIcon className=" bg-transparent">
                      <Avatar className="size-6! rounded-md">
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

        <div className="flex flex-col gap-1 p-1">
          <Tile
            className={cn(
              "bg-card md:w-full cursor-pointer select-none",
              isAllTasksActive ? "bg-accent" : "bg-card hover:bg-accent",
            )}
            onClick={() => {
              (clearView(),
                setTimeout(() => {
                  queryClient.invalidateQueries({
                    queryKey: ["org-tasks", organization.id],
                  });
                }, 100));
            }}
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
                  {openTaskCount}
                </TileDescription>
              </div>
            </TileHeader>
          </Tile>

          {categories.map((category) => {
            const categoryFilter = createCategoryFilter(category.id);
            const slug = generateSlug(category.name);
            const isActive =
              (slug && categorySlug === slug) ||
              serializeFilters(filters) === serializeFilters(categoryFilter);
            const categoryTaskCount = getCategoryCount(category.id);

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
                    setTimeout(() => {
                      queryClient.invalidateQueries({
                        queryKey: ["org-tasks", organization.id],
                      });
                    }, 100);
                  } else {
                    if (slug) {
                      setCategoryFilter(slug);
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["org-tasks", organization.id],
                        });
                      }, 100);
                    } else {
                      setTimeout(() => {
                        queryClient.invalidateQueries({
                          queryKey: ["org-tasks", organization.id],
                        });
                      }, 100);
                      applyFilter(categoryFilter);
                    }
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
          <Separator />
          {isPending ? (
            <Skeleton className="h-10 w-24 rounded-lg" />
          ) : (
            session && (
              <>
                <Tile
                  className="bg-card md:w-full cursor-pointer select-none hover:bg-accent"
                  onClick={() => setSettingsOpen(true)}
                >
                  <TileHeader className="w-full">
                    <div className="flex flex-row gap-3 w-full">
                      <TileTitle className="flex items-center gap-2 w-full">
                        <TileIcon className="size-6! bg-transparent">
                          <Avatar className="size-4! rounded-md">
                            <AvatarImage
                              src={session.user.image || ""}
                              alt={session.user.name || ""}
                            />
                            <AvatarFallback className="rounded-md uppercase text-xs">
                              <IconUser className="size-6! transition-all" />
                            </AvatarFallback>
                          </Avatar>
                        </TileIcon>
                        <span className="line-clamp-1">
                          {session.user.name}
                        </span>
                      </TileTitle>
                    </div>
                  </TileHeader>
                </Tile>
                <UserSettingsDialog
                  isOpen={settingsOpen}
                  onOpenChange={setSettingsOpen}
                  user={session.user}
                />
              </>
            )
          )}
          <Tile className="bg-card md:w-full cursor-pointer select-none hover:bg-accent">
            <TileHeader className="w-full">
              <div className="flex flex-row gap-3 w-full">
                <TileTitle className="flex items-center gap-2 w-full">
                  <TileIcon className="size-6! bg-transparent">
                    <TasqIcon className="size-4! transition-all" />
                  </TileIcon>
                  <span className="line-clamp-1 text-xs">
                    Powered by Sayr.io
                  </span>
                </TileTitle>
              </div>
            </TileHeader>
          </Tile>
        </div>
      </div>
    </div>
  );
}
