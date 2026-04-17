import type { schema } from "@repo/database";
import {
  Tile,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
  useStateManagement,
  useStateManagementFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import { extractHslValues, generateSlug } from "@repo/util";
import {
  IconArrowUpRight,
  IconChevronUp,
  IconCircleFilled,
  IconTag,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, useState, useEffect, Suspense } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import RenderIcon from "@/components/generic/RenderIcon";

import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { PublicComments } from "./public-comments";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { PanelWrapper } from "@/components/generic/wrapper";
import { Label } from "@repo/ui/components/label";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PublicTaskContentProps {
  task: schema.TaskWithLabels;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

export function PublicTaskContent({
  task: initialTask,
  panelOpen,
  setPanelOpen,
}: PublicTaskContentProps) {
  const { organization, categories, serverEvents } =
    usePublicOrganizationLayout();
  const queryClient = useQueryClient();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const isMember = useIsOrgMember(organization);

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const orgSlugMatch = rawPathname.match(/^\/orgs\/([^/]+)/);
  const orgSlug = orgSlugMatch?.[1] ?? "";

  // Local task state so WS updates can mutate it in real-time
  const [task, setTask] = useState(initialTask);

  // Sync if the server prop changes (e.g. navigation to a different task)
  useEffect(() => {
    setTask(initialTask);
    setLocalVoteCount(initialTask.voteCount);
  }, [initialTask]);

  // Fetch votes for this org (ensures vote state is available even on direct navigation)
  const {
    value: { data: votesData, refetch: refetchVotes },
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

  const votes = votesData ?? [];

  const status = statusConfig[task.status as keyof typeof statusConfig];
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
  const category = categories.find((c) => c.id === task.category);
  const isVoted = !!votes.find((v) => v.taskId === task.id);

  // Track vote count locally for optimistic updates
  const [localVoteCount, setLocalVoteCount] = useState(task.voteCount);

  const handleVote = async () => {
    const votesKey = ["votes", organization.id];
    const previousVotes = queryClient.getQueryData<
      {
        taskId: string;
        voteCount: number;
        count: number;
      }[]
    >(votesKey);
    const previousCount = localVoteCount;

    // Optimistic: toggle vote state and count
    queryClient.setQueryData(
      votesKey,
      (
        old: { taskId: string; voteCount: number; count: number }[] | undefined,
      ) => {
        if (!old) return old;
        return isVoted
          ? old.filter((v) => v.taskId !== task.id)
          : [...old, { taskId: task.id, voteCount: 0, count: 1 }];
      },
    );
    setLocalVoteCount(isVoted ? localVoteCount - 1 : localVoteCount + 1);

    try {
      await CreateTaskVoteAction(organization.id, task.id, sseClientId);
    } catch (error) {
      console.error(error);
      headlessToast.error({
        title: "Failed to vote",
        description: "Could not update vote.",
      });
      queryClient.setQueryData(votesKey, previousVotes);
      setLocalVoteCount(previousCount);
    }
  };

  // SSE handlers for real-time updates on this task
  const handlers: WSMessageHandler<ServerEventMessage> = {
    UPDATE_TASK: (msg) => {
      if (
        msg.scope === "PUBLIC" &&
        msg.meta?.orgId === organization.id &&
        msg.data.id === task.id
      ) {
        setTask(msg.data);
      }
    },
    UPDATE_TASK_VOTE: (msg) => {
      if (
        msg.scope === "PUBLIC" &&
        msg.meta?.orgId === organization.id &&
        msg.data.id === task.id
      ) {
        setLocalVoteCount(msg.data.voteCount);
        refetchVotes();
      }
    },
    UPDATE_TASK_COMMENTS: (msg) => {
      console.log("🚀 ~ PublicTaskContent ~ msg:", msg);
      if (
        msg.scope === "PUBLIC" &&
        msg.meta?.orgId === organization.id &&
        msg.data.id === task.id
      ) {
        queryClient.invalidateQueries({
          queryKey: ["public-comments", task.id, task.organizationId],
        });
      }
    },
  };
  const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);
  useEffect(() => {
    if (!serverEvents.event) return;
    serverEvents.event.addEventListener("message", handleMessage);
    return () => {
      serverEvents.event?.removeEventListener("message", handleMessage);
    };
  }, [serverEvents.event, handleMessage]);
  useEffect(() => {
    const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
      if (msg.type === "SSE_RECONNECTED") {
        console.log("🟢 Global SSE reconnected — refreshing data");
        queryClient.invalidateQueries({
          queryKey: ["public-comments", task.id, task.organizationId],
        });
      }
    });
    return unsubscribe;
  }, [task.id, queryClient, task.organizationId]);
  return (
    <PanelWrapper
      isOpen={panelOpen}
      setOpen={setPanelOpen}
      panelDefaultSize={28}
      panelMinSize={20}
      panelHeader={
        <div className="flex items-center gap-3 justify-between w-full">
          <Label className="text-sm font-semibold">Details</Label>
          {isMember && (
            <a
              href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs text-muted-foreground"
              >
                <IconArrowUpRight className="" />
                Open internally
              </Button>
            </a>
          )}
        </div>
      }
      panelBody={
        <div className="flex flex-col gap-0">
          <div className="flex flex-col gap-1 p-1">
            {/* Vote button */}
            <Tile
              className={cn(
                "bg-card w-full cursor-pointer select-none hover:bg-accent md:w-full",
                isVoted
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground",
              )}
              onClick={handleVote}
            >
              <TileHeader className="w-full">
                <div className="flex flex-row gap-3 w-full">
                  <TileTitle className="flex items-center gap-2">
                    <TileIcon
                      className={cn(
                        isVoted
                          ? "text-primary bg-primary/20"
                          : "text-muted-foreground",
                      )}
                    >
                      <IconChevronUp />
                    </TileIcon>
                    Votes
                  </TileTitle>
                  <span className="ml-auto text-sm text-muted-foreground font-medium">
                    {localVoteCount}
                  </span>
                </div>
              </TileHeader>
            </Tile>

            {/* Status */}
            {status && (
              <Tile className="bg-card w-full select-none md:w-full">
                <TileHeader className="w-full">
                  <div className="flex flex-row gap-3 w-full">
                    <TileTitle className="flex items-center gap-2">
                      <TileIcon
                        style={{
                          background: `hsla(${extractHslValues(status.hsla)}, 0.1)`,
                        }}
                      >
                        {status.icon(cn(status.className, "size-4"))}
                      </TileIcon>
                      {status.label || task.status}
                    </TileTitle>
                  </div>
                </TileHeader>
              </Tile>
            )}

            {/* Priority */}
            {priority && task.priority !== "none" && (
              <Tile className="bg-card w-full select-none md:w-full">
                <TileHeader className="w-full">
                  <div className="flex flex-row gap-3 w-full">
                    <TileTitle className="flex items-center gap-2">
                      <TileIcon>
                        {priority.icon(cn(priority.className, "size-4"))}
                      </TileIcon>
                      {priority.label}
                    </TileTitle>
                  </div>
                </TileHeader>
              </Tile>
            )}

            {/* Category */}
            {category && (
              <Link
                to="/orgs/$orgSlug"
                params={{ orgSlug }}
                search={{ category: generateSlug(category.name) }}
              >
                <Tile className="bg-card w-full select-none hover:bg-accent cursor-pointer md:w-full">
                  <TileHeader className="w-full">
                    <div className="flex flex-row gap-3 w-full">
                      <TileTitle className="flex items-center gap-2">
                        <TileIcon
                          style={{
                            background: category.color
                              ? `hsla(${extractHslValues(category.color)}, 0.1)`
                              : undefined,
                          }}
                        >
                          <RenderIcon
                            iconName={category.icon || "IconCategory"}
                            size={16}
                            color={category.color || undefined}
                            raw
                          />
                        </TileIcon>
                        {category.name}
                      </TileTitle>
                    </div>
                  </TileHeader>
                </Tile>
              </Link>
            )}
            {category && (
              <Link
                to="/orgs/$orgSlug"
                params={{ orgSlug }}
                search={{ category: generateSlug(category.name) }}
              >
                <Tile className="bg-card w-full select-none hover:bg-accent cursor-pointer md:w-full">
                  <TileHeader className="w-full">
                    <div className="flex flex-row gap-3 w-full">
                      <TileTitle className="flex items-center gap-2">
                        <TileIcon
                          style={{
                            background: category.color
                              ? `hsla(${extractHslValues(category.color)}, 0.1)`
                              : undefined,
                          }}
                        >
                          <RenderIcon
                            iconName={category.icon || "IconCategory"}
                            size={16}
                            color={category.color || undefined}
                            raw
                          />
                        </TileIcon>
                        {category.name}
                      </TileTitle>
                    </div>
                  </TileHeader>
                </Tile>
              </Link>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <Tile className="bg-card w-full select-none md:w-full">
                <TileHeader className="w-full">
                  <div className="flex flex-row gap-3 w-full">
                    <TileTitle className="flex items-start gap-2">
                      <TileIcon>
                        <IconTag className="size-4 text-muted-foreground" />
                      </TileIcon>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.labels.map((label) => (
                          <span
                            key={label.id}
                            className="flex items-center gap-1.5 border rounded-full px-1 pr-2"
                            style={{
                              borderColor: label.color || "var(--border)",
                              backgroundColor: label.color
                                ? `hsla(${extractHslValues(label.color)}, 0.1)`
                                : undefined,
                            }}
                          >
                            <IconCircleFilled
                              size={12}
                              style={{
                                color: label.color || "var(--muted-foreground)",
                              }}
                            />
                            <span>{label.name}</span>
                          </span>
                        ))}
                      </div>
                    </TileTitle>
                  </div>
                </TileHeader>
              </Tile>
            )}
          </div>
        </div>
      }
      className="h-full"
    >
      {/* Left pane: scrollable main content */}
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
            <span className="text-muted-foreground text-sm">
              #{task.shortId}
            </span>
          </div>

          {task.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Suspense
                fallback={
                  <div className="h-20 animate-pulse bg-muted rounded" />
                }
              >
                <Editor
                  readonly={true}
                  defaultContent={task.description}
                  hideBlockHandle
                  mentionViewUsers={organization.members.map((m) => m.user)}
                />
              </Suspense>
            </div>
          )}

          <PublicComments
            taskId={task.id}
            organizationId={task.organizationId}
            taskStatus={task.status}
          />
        </div>
      </div>
    </PanelWrapper>
  );
}
