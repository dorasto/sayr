import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import PublicTaskSide from "./side";
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
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { WSMessage } from "@/lib/ws";
import { useQueryClient } from "@tanstack/react-query";
const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";
export type SortOption = "mostPopular" | "newest" | "trending";
export default function PublicOrgHomePage() {
  const queryClient = useQueryClient();

  const lastTaskIdsRef = useRef<string>("");
  const { ws, organization, setTasks, categories, setLabels, setCategories, tasks } = usePublicOrganizationLayout();
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
    value: { isLoading: tasksLoading, data: tasksData },
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
        const queryString = window.location.search; // Returns:'?q=123'
        const params = new URLSearchParams(queryString);
        const category = categories.find(
          (c) => generateSlug(c.name) === params.get("category"),
        );
        const categoryId = category?.id;
        const categoryParam = categoryId
          ? `category_id=${encodeURIComponent(categoryId)}`
          : "";
        const fullUrl = `${url}&page=${pageParam}&sortBy=${sortBy}${categoryParam ? `&${categoryParam}` : ""
          }`;

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
  const handlers: WSMessageHandler<WSMessage> = {
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
  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE PublicOrgHomePage]", { msg }),
  });
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    // Cleanup on unmount or dependency change
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);
  const pageLoading = tasksLoading || sessionPending || votesLoading;

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="relative rounded-2xl overflow-hidden bg-secondary">
        <div className="aspect-32/9 w-full bg-secondary/30">
          {organization.bannerImg && (
            <img
              width={1260}
              height={540}
              className="w-full h-full object-cover"
              src={organization.bannerImg}
              alt={organization.name}
            />
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-background via-background/70 to-transparent pt-24">
          <div className="flex items-end gap-4">
            {organization.logo ? (
              <img
                height={80}
                width={80}
                className="rounded-xl"
                src={organization.logo}
                alt={organization.name}
                loading="lazy"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border shadow-sm bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {organization.name.substring(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground font-medium max-w-prose line-clamp-2">
                {organization.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {pageLoading ? (
          <div className="col-span-full flex h-48 w-full items-center justify-center">
            <IconLoader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="md:col-span-1 ">
              <PublicTaskSide />
            </div>
            <div className="md:col-span-3">
              <PublicTaskView sortBy={sortBy} setSortBy={setSortBy} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
