import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { PublicTaskView } from "./task-view";
import {
  useStateManagementFetch,
  useStateManagementInfiniteFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { schema } from "@repo/database";
import { IconLoader2 } from "@tabler/icons-react";
import { authClient } from "@repo/auth/client";
import { useEffect, useRef, useState } from "react";
import { generateSlug } from "@repo/util";
import {
  useWSMessageHandler,
  WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import { useQueryClient } from "@tanstack/react-query";
import type { ServerEventMessage } from "@/lib/serverEvents";
const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";
export type SortOption = "mostPopular" | "newest" | "trending";
export default function PublicOrgHomePage() {
  const queryClient = useQueryClient();

  const lastTaskIdsRef = useRef<string>("");
  const {
    serverEvents,
    organization,
    setTasks,
    categories,
    setLabels,
    setCategories,
    tasks,
  } = usePublicOrganizationLayout();
  const { isPending: sessionPending } = authClient.useSession();
  const [sortBy, setSortBy] = useState<SortOption>("mostPopular");

  const {
    value: { isLoading: votesLoading, refetch: refetchVotes },
  } = useStateManagementFetch<
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
      url: `${baseApiUrl}/v1/admin/organization/task/voted?orgId=${organization.id}`,
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
  const {
    value: { isLoading: tasksLoading, data: tasksData, fetchNextPage, hasNextPage, isFetchingNextPage },
  } = useStateManagementInfiniteFetch<{
    data: schema.TaskWithLabels[];
    pagination: {
      page: number;
      hasMore: boolean;
    };
  }>({
    key: ["org-tasks", organization.id],
    fetch: {
      url: `${baseApiUrl}/v1/admin/organization/task/tasks?org_id=${organization.id}`,

      custom: async (url, page) => {
        const pageParam = page ?? 1;
        const queryString = window.location.search;
        const params = new URLSearchParams(queryString);
        const category = categories.find(
          (c) => generateSlug(c.name) === params.get("category"),
        );
        const search = params.get("search");
        const categoryId = category?.id;
        const categoryParam = categoryId
          ? `category_id=${encodeURIComponent(categoryId)}`
          : "";
        // When a search is active, include closed tasks so users can find done/canceled items
        const includeClosedParam = search ? "&include_closed=true" : "";
        const fullUrl = `${url}&page=${pageParam}&sortBy=${sortBy}${categoryParam ? `&${categoryParam}` : ""}${search ? `&q=${search}` : ""}${includeClosedParam}`;

        const res = await fetch(fullUrl);
        if (!res.ok) {
          throw new Error("Failed to fetch tasks");
        }

        return res.json();
      },

      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    },
    staleTime: 1000 * 30,
  });
  useEffect(() => {
    if (!tasksData) {
      if (lastTaskIdsRef.current !== "empty") {
        lastTaskIdsRef.current = "empty";
        setTasks([]);
      }
      return;
    }

    const nextTasks = tasksData.flatMap((page) => page.data);
    const nextIds = nextTasks.map((t) => t.id).join(",");

    if (nextIds !== lastTaskIdsRef.current) {
      lastTaskIdsRef.current = nextIds;
      setTasks(nextTasks);
    }
  }, [tasksData, setTasks]);
  const handlers: WSMessageHandler<ServerEventMessage> = {
    CREATE_TASK: (msg) => {
      if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
        queryClient.invalidateQueries({
          queryKey: ["org-tasks", organization.id],
        });
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
        refetchVotes();
      }
    },
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
  const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {
    // onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE PublicOrgHomePage]", { msg }),
  });
  useEffect(() => {
    if (!serverEvents.event) return;
    serverEvents.event.addEventListener("message", handleMessage);
    // Cleanup on unmount or dependency change
    return () => {
      serverEvents.event?.removeEventListener("message", handleMessage);
    };
  }, [serverEvents.event, handleMessage]);
  const pageLoading = tasksLoading || sessionPending || votesLoading;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {pageLoading ? (
        <div className="flex h-48 w-full items-center justify-center">
          <IconLoader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PublicTaskView
          sortBy={sortBy}
          setSortBy={setSortBy}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}
    </div>
  );
}
