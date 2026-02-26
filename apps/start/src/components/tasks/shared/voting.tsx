"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronUp } from "@tabler/icons-react";
import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import {
  onWindowMessage,
  sendWindowMessage,
} from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect } from "react";
const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";
interface TaskVotingProps {
  task: schema.TaskWithLabels;
  editable?: boolean;
  className?: string;
  organizationId: string;
  wsClientId: string;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
}

export function TaskVoting({
  task,
  editable = false,
  className,
  organizationId,
  wsClientId,
  tasks,
  setTasks,
  setSelectedTask,
}: TaskVotingProps) {
  const { runWithToast } = useToastAction();
  const {
    value: { data: voteData, refetch: refetchVotes },
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
    key: ["votes", organizationId],
    fetch: {
      url: `${baseApiUrl}/v1/admin/organization/task/voted?orgId=${organizationId}`,
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

  useEffect(() => {
    const unsubscribe = onWindowMessage<{ type: string; payload: string }>(
      "*",
      (msg) => {
        if (msg.type === "update-votes" && msg.payload === organizationId) {
          refetchVotes();
        }
      },
    );
    return unsubscribe;
  }, [task.organizationId]);
  // Determine if the current user has voted on this task
  const hasVoted = voteData?.some((v) => v.taskId === task.id);

  const handleVote = async () => {
    if (organizationId && editable && wsClientId) {
      try {
        const data = await runWithToast(
          "update-task-vote",
          {
            loading: {
              title: hasVoted ? "Removing vote..." : "Adding vote...",
              description:
                "Updating vote count... changes are already visible.",
            },
            success: {
              title: "Vote updated",
              description: "Your vote has been updated successfully.",
            },
            error: {
              title: "Vote update failed",
              description:
                "Your vote is showing, but we couldn't save it to the server. Please try again.",
            },
          },
          () => CreateTaskVoteAction(organizationId, task.id, wsClientId),
        );
        if (data?.success && data.data) {
          // Update successful, you might want to trigger a refresh or update state here
          console.log("Vote updated successfully:", data.data);
          const updatedTasks = tasks.map((task) =>
            task.id === data.data.taskId &&
            task.organizationId === organizationId
              ? {
                  ...task,
                  voteCount: data.data.voteCount,
                }
              : task,
          );
          setTasks(updatedTasks);
          if (task?.id === data.data.taskId) {
            setSelectedTask({
              ...task,
              voteCount: data.data.voteCount,
            });
          }
          sendWindowMessage(
            window,
            {
              type: "update-votes",
              payload: organizationId,
            },
            "*",
          );
        }
      } catch (error) {
        console.error("Error updating vote:", error);
      }
    }
  };

  return (
    <Button
      variant="primary"
      size={"sm"}
      onClick={handleVote}
      disabled={!editable}
      className={cn(
        "h-auto! bg-muted! hover:border-transparent! hover:bg-secondary!",
        hasVoted && "border-primary bg-primary/10! hover:border-transparent!",
        className,
      )}
    >
      <IconChevronUp />
      <span className="text-xs font-normal">
        {task.voteCount?.toString() || "0"} Votes
      </span>
    </Button>
  );
}

export default TaskVoting;
