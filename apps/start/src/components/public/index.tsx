import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import PublicTaskSide from "./side";
import { PublicTaskView } from "./task-view";
import { useStateManagementFetch, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { schema } from "@repo/database";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { getCategoryIdsFromFilters } from "../tasks/filter/serialization";
import { IconLoader2 } from "@tabler/icons-react";
import { authClient } from "@repo/auth/client";
const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? import.meta.env.VITE_EXTERNAL_API_URL : "/api";

export default function PublicOrgHomePage() {
  const { organization } = usePublicOrganizationLayout();
  const { filters } = useTaskViewManager();
  const { isPending: sessionPending } = authClient.useSession();

  const { value: { isLoading: votesLoading } } = useStateManagementFetch<
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

  const { value: { isLoading: tasksLoading } } = useStateManagementInfiniteFetch<
    {
      data: schema.TaskWithLabels[];
      pagination: {
        page: number;
        hasMore: boolean;
      };
    }
  >({
    key: ["org-tasks", organization.id],
    fetch: {
      url: `${baseApiUrl}/admin/organization/task/tasks?org_id=${organization.id}`,

      custom: async (url, page) => {
        const pageParam = page ?? 1;

        const categoryIds = getCategoryIdsFromFilters(filters);
        const categoryParam =
          categoryIds.length > 0
            ? categoryIds.map((id) => `category_id=${encodeURIComponent(id)}`).join("&")
            : "";

        const fullUrl = `${url}&page=${pageParam}&sortBy=mostPopular${categoryParam ? `&${categoryParam}` : ""
          }`;

        const res = await fetch(fullUrl);
        if (!res.ok) {
          throw new Error("Failed to fetch tasks");
        }

        return res.json();
      },

      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore
          ? lastPage.pagination.page + 1
          : undefined,
    },
    staleTime: 1000 * 30,
  });

  const pageLoading = tasksLoading || sessionPending || votesLoading;

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="relative rounded-2xl overflow-hidden bg-card border">
        <div className="aspect-21/9 w-full bg-muted/30">
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
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background/95 to-transparent p-6 pt-24">
          <div className="flex items-end gap-4">
            {organization.logo ? (
              <img
                height={80}
                width={80}
                className="rounded-xl border shadow-sm bg-background"
                src={organization.logo}
                alt={organization.name}
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border shadow-sm bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground uppercase">
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
              <PublicTaskView />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
