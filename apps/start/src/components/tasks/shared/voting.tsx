"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronUp } from "@tabler/icons-react";
import { CreateTaskVoteAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";

interface TaskVotingProps {
  task: schema.TaskWithLabels;
  editable?: boolean;
  onChange?: (voted: boolean) => void;
  className?: string;
  voted?: boolean;
  onVote?: () => void;
  organizationId: string;
  wsClientId: string;
}

export function TaskVoting({
  task,
  editable = false,
  onChange,
  className,
  voted: votedProp,
  onVote,
  organizationId,
  wsClientId,
}: TaskVotingProps) {
  const { runWithToast } = useToastAction();

  // Determine if the current user has voted on this task
  const hasVoted = votedProp !== undefined ? votedProp : false;

  const handleVote = async () => {
    // Call onVote callback first if provided
    if (onVote) {
      onVote();
      return;
    }

    // Call onChange with the new voted state
    if (onChange) {
      onChange(!hasVoted);
    }

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
        "flex items-center bg-muted p-1 font-bold hover:bg-secondary gap-1 h-7! border-transparent",
        hasVoted && "border-primary bg-primary/10",
        className,
      )}
    >
      <IconChevronUp />
      <span className="text-xs font-normal">
        {task.voteCount?.toString() || "0"}
      </span>
    </Button>
  );
}

export default TaskVoting;
