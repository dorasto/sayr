import { useState } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { applyFilters } from "@/components/tasks/filter/filter-config";
import { useEffect, useMemo } from "react";
import { PublicTaskItem } from "./task-item";
import {
  useWSMessageHandler,
  WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";
import {
  useStateManagementFetch,
  useStateManagement,
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
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? import.meta.env.VITE_EXTERNAL_API_URL
    : "/api";

type SortOption = "mostPopular" | "newest" | "trending";

export function PublicTaskView() {
  const {
    tasks,
    categories,
    ws,
    setTasks,
    organization,
    setLabels,
    setCategories,
  } = usePublicOrganizationLayout();
  const queryClient = useQueryClient();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { value: votes } = useStateManagementFetch<
    {
      taskId: string;
      voteCount: number;
      count: number;
    }[],
    Partial<
      {
        taskId: string;
        voteCount: number;
        count: number;
      }[]
    >
  >({
    key: ["votes", organization.id],
    fetch: {
      url: `${baseApiUrl}/admin/organization/task/voted?orgId=${organization.id}`,
      custom: async (url) => {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
        const data = await res.json();
        return data.data.tasks;
      },
    },
    staleTime: 1000,
    gcTime: 2000 * 60,
    refetchOnWindowFocus: false,
  });
  const { filters } = useTaskViewManager();
  const [sortBy, setSortBy] = useState<SortOption>("mostPopular");

  const filteredTasks = useMemo(() => {
    let result = applyFilters(tasks, filters);

    // Default filter: hide "done" and "canceled" if no status filter is active
    const hasStatusFilter = filters.groups.some((g) =>
      g.conditions.some((c) => c.field === "status"),
    );

    if (!hasStatusFilter) {
      result = result.filter(
        (task) => task.status !== "done" && task.status !== "canceled",
      );
    }

    return [...result].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortBy === "newest") {
        return bDate - aDate;
      }

      if (sortBy === "trending") {
        // Trending: (Votes + Comments) / (Hours + 2)^1.5
        // This bubbles up items with high engagement relative to their age.
        const now = Date.now();
        const aHours = (now - aDate) / (1000 * 60 * 60);
        const bHours = (now - bDate) / (1000 * 60 * 60);
        
        const aActivity = (a.voteCount || 0) + (a.comments?.length || 0);
        const bActivity = (b.voteCount || 0) + (b.comments?.length || 0);

        const aScore = aActivity / Math.pow(aHours + 2, 1.5);
        const bScore = bActivity / Math.pow(bHours + 2, 1.5);

        return bScore - aScore;
      }

      // Default: mostPopular
      // Sort by voteCount DESC, then by createdAt DESC
      if (b.voteCount !== a.voteCount) {
        return (b.voteCount || 0) - (a.voteCount || 0);
      }
      return bDate - aDate;
    });
  }, [tasks, filters, sortBy]);

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

    // Optimistic Update Tasks
    const previousTasks = [...tasks];
    setTasks(
      tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            voteCount: isVoted ? t.voteCount - 1 : t.voteCount + 1,
          };
        }
        return t;
      }),
    );

    // Optimistic Update Votes
    queryClient.setQueryData(
      votesKey,
      (
        old: { taskId: string; voteCount: number; count: number }[] | undefined,
      ) => {
        if (!old) return old;
        if (isVoted) {
          return old.filter((v) => v.taskId !== taskId);
        } else {
          return [...old, { taskId, voteCount: 0, count: 1 }];
        }
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
      // Revert
      setTasks(previousTasks);
      queryClient.setQueryData(votesKey, previousVotes);
    }
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "mostPopular": return "Most popular";
      case "newest": return "Newest";
      case "trending": return "Trending";
    }
  };

  if (filteredTasks.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center border rounded-lg bg-card/50 border-dashed">
        No public tasks found matching your criteria.
      </div>
    );
  }
  const handlers: WSMessageHandler<WSMessage> = {
    CREATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setTasks([...tasks, msg.data]);
      }
    },
    UPDATE_LABELS: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setLabels(msg.data);
      }
    },
    UPDATE_TASK_VOTE: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        const { id, voteCount } = msg.data;
        const updatedTasks = tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                voteCount,
              }
            : task,
        );
        setTasks(updatedTasks);
        votes.refetch();
      }
    },
    // UPDATE_VIEWS: (msg) => {
    //   if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
    //     setViews(msg.data);
    //   }
    // },
    UPDATE_CATEGORIES: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        setCategories(msg.data);
      }
    },
    UPDATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        const updatedTask = msg.data;
        const updatedTasks = tasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        );
        setTasks(updatedTasks);
      }
    },
  };
  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE PublicTaskView]", { msg }),
  });
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    // Cleanup on unmount or dependency change
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-card p-3 rounded-lg">
        <Tile className="gap-3 p-0" variant={"transparent"}>
          <TileHeader>
            <TileTitle>Sort by</TileTitle>
          </TileHeader>
          <TileAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="primary" size={"sm"}>
                  {getSortLabel(sortBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
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
          </TileAction>
        </Tile>
      </div>
      {filteredTasks.map((task) => {
        const voted = !!votes.data?.find((e) => e.taskId === task.id);
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
  );
}
