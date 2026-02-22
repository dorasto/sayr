import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
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
import { TimelineComment } from "./timeline-comment";
import { CommentReplyInput } from "@/components/tasks/task/comment/reply";
import type { TimelineItemProps } from "./types";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  parentComment: schema.taskTimelineWithActor;
  replyCount: number;
  latestReplyAuthor?: schema.UserSummary | null;
  replyAuthors?: schema.UserSummary[];
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  tasks?: schema.TaskWithLabels[];
  organization?: TimelineItemProps["organization"];
  /** When true, auto-expand the thread (e.g. when Reply button is clicked) */
  forceExpanded?: boolean;
}

/**
 * Collapsed thread trigger — rendered inside the parent comment card footer.
 * Shows "N replies" with overlapping avatars of unique reply authors.
 */
const MAX_VISIBLE_AVATARS = 3;

export function CommentThreadTrigger({
  replyCount,
  replyAuthors,
  expanded,
  onToggle,
}: {
  replyCount: number;
  replyAuthors?: schema.UserSummary[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (replyCount === 0 && !expanded) return null;

  const visibleAuthors = (replyAuthors ?? []).slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = (replyAuthors ?? []).length - MAX_VISIBLE_AVATARS;

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
      {!expanded && visibleAuthors.length > 0 && (
        <div className="flex items-center -space-x-1.5">
          {visibleAuthors.map((author) => (
            <Avatar key={author.id} className="size-5 border-2 border-background rounded-full">
              <AvatarImage src={author.image || ""} alt={getDisplayName(author)} />
              <AvatarFallback className="text-[8px] rounded-full">
                {getDisplayName(author).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {overflowCount > 0 && (
            <div className="size-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
              +{overflowCount}
            </div>
          )}
        </div>
      )}
      <span>
        {expanded ? "Hide" : replyCount}{" "}
        {replyCount === 1 ? "reply" : "replies"}
      </span>
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
