import type { schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FetchCommentRepliesAction } from "@/lib/fetches/task";
import { getDisplayName } from "@repo/util";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineComment } from "./timeline-comment";
import { CommentReplyInput } from "@/components/tasks/task/comment/reply";
import type { TimelineItemProps } from "./types";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  parentComment: schema.taskTimelineWithActor;
  replyCount: number;
  latestReplyAuthor?: schema.UserSummary | null;
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  tasks?: schema.TaskWithLabels[];
  organization?: TimelineItemProps["organization"];
  /** When true, auto-expand the thread (e.g. when Reply button is clicked) */
  forceExpanded?: boolean;
}

/**
 * Collapsed thread trigger — rendered inside the parent comment card footer.
 * Shows "N replies" with the latest reply author avatar.
 */
export function CommentThreadTrigger({
  replyCount,
  latestReplyAuthor,
  expanded,
  onToggle,
}: {
  replyCount: number;
  latestReplyAuthor?: schema.UserSummary | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (replyCount === 0 && !expanded) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 pt-2 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-t border-border/50 w-full",
        replyCount === 0 && "pb-2",
      )}
    >
      {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      <span>
        {expanded ? "Hide" : replyCount}{" "}
        {replyCount === 1 ? "reply" : "replies"}
      </span>
      {!expanded && latestReplyAuthor && (
        <InlineLabel
          text={getDisplayName(latestReplyAuthor)}
          image={latestReplyAuthor.image || ""}
        />
      )}
    </button>
  );
}

/**
 * Expanded thread body — rendered below the parent comment card.
 * Shows replies as a continuous list with dividers, plus the reply input.
 */
export function CommentThreadBody({
  parentComment,
  availableUsers,
  categories,
  tasks,
  organization,
}: Omit<
  CommentThreadProps,
  "replyCount" | "latestReplyAuthor" | "forceExpanded"
>) {
  const {
    data: repliesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "comment-replies",
      parentComment.id,
      parentComment.organizationId,
    ],
    queryFn: async () => {
      const result = await FetchCommentRepliesAction(
        parentComment.organizationId,
        parentComment.id,
      );
      if (!result.success)
        throw new Error(result.error ?? "Failed to fetch replies");
      return result.data;
    },
    enabled: true,
    staleTime: 30_000,
  });

  return (
    <div className="">
      {isLoading ? (
        <div className="flex items-center gap-2 py-3 px-4">
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <Label variant="description">Loading replies...</Label>
        </div>
      ) : (
        <div className="flex flex-col">
          {(repliesData ?? []).map((reply, index) => (
            <div key={reply.id} className="">
              {index > 0 && <Separator className="opacity-50" />}
              <TimelineComment
                item={reply}
                availableUsers={availableUsers}
                categories={categories}
                tasks={tasks}
                showSeparator={false}
                organization={organization}
                isReply
              />
            </div>
          ))}
        </div>
      )}

      <div className="-mb-3 -mx-3 overflow-hidden border-t">
        <CommentReplyInput
          parentComment={parentComment}
          categories={categories}
          tasks={tasks}
          onReplyPosted={() => refetch()}
        />
      </div>
    </div>
  );
}

/**
 * Full CommentThread — manages expanded/collapsed state.
 * Renders the trigger (inside parent card via footer prop) and the body (below card).
 * This is kept for backward compat but the preferred approach is using
 * CommentThreadTrigger + CommentThreadBody separately.
 */
export function CommentThread({
  parentComment,
  replyCount,
  availableUsers,
  categories,
  tasks,
  organization,
  forceExpanded,
}: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when forceExpanded becomes true
  useEffect(() => {
    if (forceExpanded) {
      setExpanded(true);
    }
  }, [forceExpanded]);

  if (replyCount === 0 && !expanded) return null;

  return expanded ? (
    <CommentThreadBody
      parentComment={parentComment}
      availableUsers={availableUsers}
      categories={categories}
      tasks={tasks}
      organization={organization}
    />
  ) : null;
}
