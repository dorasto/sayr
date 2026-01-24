import { useEffect, useRef, useState } from "react";
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
} from "@repo/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { SearchIcon } from "lucide-react";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconFilter2 } from "@tabler/icons-react";
import { useSticky } from "@/hooks/use-sticky";
import { cn } from "@/lib/utils";
import { SortOption } from ".";

export function PublicTaskView({
  sortBy,
  setSortBy,
}: {
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
}) {
  const {
    tasks,
    categories,
    setTasks,
    organization,
  } = usePublicOrganizationLayout();

  const queryClient = useQueryClient();
  const { stuck, stickyRef } = useSticky();
  const isMobile = useIsMobile();

  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { value: votes } = useStateManagementKey<{
    taskId: string;
    voteCount: number;
    count: number;
  }[]>(["votes", organization.id], []);
  const didMountRef = useRef(false);
  // Instant typing state
  const [searchInput, setSearchInput] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("search") ?? "";
  });

  // Debounced value (used for URL + refetch)
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);

  // Wait until user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Sync URL + refetch only after debounce
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }

    const query = params.toString();
    const newUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;

    window.history.replaceState(null, "", newUrl);

    queryClient.invalidateQueries({
      queryKey: ["org-tasks", organization.id],
    });
  }, [debouncedSearch, organization.id, queryClient]);

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
      await CreateTaskVoteAction(organization.id, taskId, wsClientId);
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

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center border rounded-lg bg-card/50 border-dashed">
        No public tasks found matching your criteria.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="sticky top-0 z-50 pt-3 bg-background/95 backdrop-blur -mx-3 px-3"
        ref={stickyRef}
      >
        <div
          className={cn(
            "bg-card p-3 rounded-lg flex w-full items-center shadow-xl",
            stuck && "rounded-b-none border-b",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="primary" size="sm">
                <IconFilter2 />
                {!isMobile && (
                  <span className="truncate">{getSortLabel(sortBy)}</span>
                )}
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

          <InputGroup className="bg-accent rounded-lg border-transparent focus-within:bg-secondary transition-all focus-within:text-foreground placeholder:text-muted-foreground hover:bg-secondary max-w-48 h-9 ml-auto">
            <InputGroupInput
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

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
    </div>
  );
}