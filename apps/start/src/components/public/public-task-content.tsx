import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import TasqIcon from "@repo/ui/components/brand-icon";
import {
  Tile,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Separator } from "@repo/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import {
  useStateManagement,
  useStateManagementFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  extractHslValues,
  formatDateCompact,
  getDisplayName,
} from "@repo/util";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconChevronUp,
  IconCircleFilled,
  IconDashboard,
  IconHash,
  IconLock,
  IconProgress,
  IconTag,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, useState, useEffect, useMemo, Suspense } from "react";
import { authClient } from "@repo/auth/client";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import RenderIcon from "@/components/generic/RenderIcon";

import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useSticky } from "@/hooks/use-sticky";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { PublicComments } from "./public-comments";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PublicTaskContentProps {
  task: schema.TaskWithLabels;
}

const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

export function PublicTaskContent({
  task: initialTask,
}: PublicTaskContentProps) {
  const { organization, categories, ws } = usePublicOrganizationLayout();
  const queryClient = useQueryClient();
  // const { stuck, stickyRef } = useSticky();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { data: session } = authClient.useSession();

  // Check if the logged-in user is a member of this organization
  const isOrgMember = useMemo(() => {
    if (!session?.user?.id) return false;
    return organization.members.some((m) => m.user.id === session.user.id);
  }, [session?.user?.id, organization.members]);

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
      await CreateTaskVoteAction(organization.id, task.id, wsClientId);
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

  // WebSocket handlers for real-time updates on this task
  const handlers: WSMessageHandler<WSMessage> = {
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
  const handleMessage = useWSMessageHandler<WSMessage>(handlers);
  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);
  useEffect(() => {
    const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
      if (msg.type === "WS_RECONNECTED") {
        console.log("🟢 Global WS reconnected — refreshing data");
        queryClient.invalidateQueries({
          queryKey: ["public-comments", task.id, task.organizationId],
        });
      }
    });
    return unsubscribe;
  }, [task.id, queryClient, task.organizationId]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <div
          className="flex flex-col gap-3 w-full sticky top-0 pt-3 self-start"
          // ref={stickyRef}
        >
          {/* Back button and member actions */}
          <div className="flex items-center gap-1 w-full justify-between">
            <Link
              to=".."
              params={{ orgSlug: organization.slug }}
              className="w-fit"
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <IconArrowLeft className="size-4" />
                Back
              </Button>
            </Link>
            {isOrgMember && (
              <a
                href={`${import.meta.env.VITE_URL_ROOT}/${organization.id}/tasks/${task.shortId}`}
                className="w-fit"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  tooltipText="Open this issue on the admin portal"
                >
                  Open internally
                  <IconLock className="size-4" />
                </Button>
              </a>
            )}
          </div>

          {/* Metadata card */}
          <div className="flex flex-col gap-0 bg-card rounded-xl">
            <div className="flex flex-col gap-1 p-1">
              <Link to=".." params={{ orgSlug: organization.slug }}>
                <Tile className="bg-card md:w-full cursor-pointer select-none hover:bg-accent">
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
                              {organization.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </TileIcon>
                        <span className="line-clamp-1">
                          {organization.name}
                        </span>
                      </TileTitle>
                    </div>
                  </TileHeader>
                </Tile>
              </Link>
              {/* Vote button */}
              <Tile
                className={cn(
                  "bg-card md:w-full cursor-pointer select-none hover:bg-accent",
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
                <Tile className="bg-card md:w-full select-none">
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
                <Tile className="bg-card md:w-full select-none">
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
                <Tile className="bg-card md:w-full select-none">
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
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <Tile className="bg-card md:w-full select-none">
                  <TileHeader className="w-full">
                    <div className="flex flex-row gap-3 w-full">
                      <TileTitle className="flex items-center gap-2">
                        <TileIcon>
                          <IconTag className="size-4 text-muted-foreground" />
                        </TileIcon>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.labels.map((label, i) => (
                            <span key={label.id} className="flex items-center gap-1.5">
                              <IconCircleFilled
                                size={8}
                                style={{ color: label.color || "var(--muted-foreground)" }}
                              />
                              <span>{label.name}</span>
                              {i < task.labels.length - 1 && (
                                <span className="text-muted-foreground">·</span>
                              )}
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
        </div>
      </div>

      {/* Main content */}
      <div className="md:col-span-3 flex flex-col">
        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
          <span className="text-muted-foreground text-sm">#{task.shortId}</span>
        </div>

        {/* Description */}
        {task.description && (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none pb-3">
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
          </>
        )}
        {/* Comments */}
        <PublicComments taskId={task.id} organizationId={task.organizationId} taskStatus={task.status} />
      </div>
    </div>
  );
}
