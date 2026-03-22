import { useEffect, useRef } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { PublicTaskItem } from "./task-item";
import {
  useStateManagement,
  useStateManagementKey,
} from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@repo/ui/components/dropdown-menu";
import { IconFilter2, IconLoader2 } from "@tabler/icons-react";
import { SortOption } from ".";
import { PublicTaskCreator } from "./public-task-creator";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { generateSlug } from "@repo/util";
import { cn } from "@repo/ui/lib/utils";
import RenderIcon from "@/components/generic/RenderIcon";

export function PublicTaskView({
  sortBy,
  setSortBy,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) {
  const { tasks, categories, setTasks, organization } =
    usePublicOrganizationLayout();

  const queryClient = useQueryClient();

  const { categorySlug, setCategoryFilter, clearView } = useTaskViewManager();

  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { value: votes } = useStateManagementKey<
    {
      taskId: string;
      voteCount: number;
      count: number;
    }[]
  >(["votes", organization.id], []);
  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: trigger fetchNextPage when sentinel enters the scroll container.
  // The layout uses an inner overflow-y-auto div as the scroll root (not window),
  // so we walk up the DOM to find it and pass it as the IntersectionObserver root.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const getScrollParent = (el: HTMLElement): HTMLElement | null => {
      let parent = el.parentElement;
      while (parent) {
        const { overflow, overflowY } = getComputedStyle(parent);
        if (/auto|scroll/.test(overflow + overflowY)) return parent;
        parent = parent.parentElement;
      }
      return null;
    };

    const scrollParent = getScrollParent(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: scrollParent,
        rootMargin: "0px 0px 300px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleVote = async (taskId: string) => {
    const votesKey = ["votes", organization.id];
    const previousVotes = queryClient.getQueryData<
      {
        taskId: string;
        voteCount: number;
        count: number;
      }[]
    >(votesKey);

    const isVoted = previousVotes?.some((v) => v.taskId === taskId);
    const previousTasks = [...tasks];

    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              voteCount: isVoted ? t.voteCount - 1 : t.voteCount + 1,
            }
          : t,
      ),
    );

    queryClient.setQueryData(
      votesKey,
      (
        old: { taskId: string; voteCount: number; count: number }[] | undefined,
      ) => {
        if (!old) return old;
        return isVoted
          ? old.filter((v) => v.taskId !== taskId)
          : [...old, { taskId, voteCount: 0, count: 1 }];
      },
    );

    try {
      await CreateTaskVoteAction(organization.id, taskId, sseClientId);
    } catch (error) {
      console.error(error);
      headlessToast.error({
        title: "Failed to vote",
        description: "Could not update vote.",
      });
      setTasks(previousTasks);
      queryClient.setQueryData(votesKey, previousVotes);
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "mostPopular":
        return "Most popular";
      case "newest":
        return "Newest";
      case "trending":
        return "Trending";
    }
  };

  const activeCategoryName = categorySlug
    ? categories.find((c) => generateSlug(c.name) === categorySlug)?.name
    : null;

  const handleCategorySelect = (categoryId: string | null) => {
    if (categoryId === null) {
      clearView();
    } else {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        const slug = generateSlug(category.name);
        setCategoryFilter(slug);
      }
    }
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["org-tasks", organization.id] });
    }, 100);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar: sort + category */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconFilter2 />
              <span className="truncate">{getSortLabel(sortBy)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v as SortOption);
                setTimeout(() => {
                  queryClient.invalidateQueries({
                    queryKey: ["org-tasks", organization.id],
                  });
                }, 100);
              }}
            >
              <DropdownMenuRadioItem value="mostPopular">
                Most popular
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">
                Newest
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="trending">
                Trending
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {categories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeCategoryName ? "secondary" : "outline"}
                size="sm"
                className={cn(activeCategoryName && "font-medium")}
              >
                <span className="truncate">{activeCategoryName ?? "Category"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleCategorySelect(null)}
                className={cn(!categorySlug && "font-medium")}
              >
                All categories
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {categories.map((category) => {
                const slug = generateSlug(category.name);
                const isActive = categorySlug === slug;
                return (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={cn(isActive && "font-medium")}
                  >
                    <RenderIcon
                      iconName={category.icon || "IconCircleFilled"}
                      color={category.color || undefined}
                      button
                      focus={isActive}
                      className="size-4! [&_svg]:size-3! border-0 shrink-0"
                    />
                    <span className="truncate">{category.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <PublicTaskCreator />

      {tasks.length === 0 ? (
        <div className="text-muted-foreground p-4 text-center border rounded-lg bg-card/50 border-dashed">
          No public tasks found matching your criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const voted = !!votes?.find((e) => e.taskId === task.id);
            return (
              <PublicTaskItem
                key={task.id}
                task={task}
                categories={categories}
                voted={voted}
                onVote={() => handleVote(task.id)}
              />
            );
          })}
        </div>
      )}
      {/* Infinite scroll sentinel — always rendered so the observer stays attached */}
      <div ref={sentinelRef} className="h-px" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <IconLoader2 className="animate-spin text-muted-foreground size-5" />
        </div>
      )}
    </div>
  );
}

