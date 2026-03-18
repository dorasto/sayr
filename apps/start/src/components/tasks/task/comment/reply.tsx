"use client";

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconArrowBack } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { useMemo, useState } from "react";
import Editor from "@/components/prosekit/editor";
import { useLayoutData } from "@/components/generic/Context";
import processUploads from "@/components/prosekit/upload";
import { CreateTaskCommentAction } from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";

interface CommentReplyInputProps {
  parentComment: schema.taskTimelineWithActor;
  categories?: schema.categoryType[];
  tasks?: schema.TaskWithLabels[];
  onReplyPosted?: () => void;
}

/** Check if ProseMirror doc JSON has more than one block-level content node */
function isMultiline(doc: NodeJSON | undefined): boolean {
  if (!doc?.content) return false;
  // More than 1 top-level block = multiline
  if (doc.content.length > 1) return true;
  // Single block but check if it has a newline (hardBreak node)
  const first = doc.content[0];
  if (first?.content) {
    return first.content.some((node) => node.type === "hardBreak");
  }
  return false;
}

export function CommentReplyInput({
  parentComment,
  categories,
  tasks,
  onReplyPosted,
}: CommentReplyInputProps) {
  const queryClient = useQueryClient();
  const { account } = useLayoutData();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
  const { runWithToast, isFetching } = useToastAction();
  const [content, setContent] = useState<undefined | NodeJSON>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  const commentText = extractTextContent(content);
  const disabled = isFetching || commentText.length === 0;
  const multiline = useMemo(() => isMultiline(content), [content]);

  const handleSubmit = async () => {
    if (!content || isFetching || commentText.length === 0) {
      headlessToast.error({
        title: "Cannot submit empty reply",
        description: "Please enter some text before submitting your reply.",
        id: "create-reply-comment",
      });
      return;
    }

    const updatedContent = await processUploads(
      content,
      parentComment.visibility,
      parentComment.organizationId,
      "create-reply-comment",
    );

    const data = await runWithToast(
      "create-reply-comment",
      {
        loading: {
          title: "Posting reply...",
          description: "Your reply is being added.",
        },
        success: {
          title: "Reply added",
          description: "Your reply was saved successfully.",
        },
        error: {
          title: "Couldn't post reply",
          description: "Failed to save your reply. Please try again.",
        },
      },
      () =>
        CreateTaskCommentAction(
          parentComment.organizationId,
          parentComment.taskId ?? "",
          updatedContent,
          parentComment.visibility,
          sseClientId,
          parentComment.id,
        ),
    );

    if (data?.success) {
      setContent(undefined);
      setEditorKey((prev) => prev + 1);
      // Refresh both the replies query and the parent comments query (for updated replyCount)
      queryClient.invalidateQueries({
        queryKey: [
          "comment-replies",
          parentComment.id,
          parentComment.organizationId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "timeline",
          "comments",
          parentComment.taskId,
          parentComment.organizationId,
        ],
      });
      onReplyPosted?.();
    }
  };

  const replyButton = (
    <Button
      variant="primary"
      size="icon"
      disabled={disabled}
      onClick={handleSubmit}
      className={cn("h-7 w-7 shrink-0")}
    >
      <IconArrowBack size={14} />
    </Button>
  );

  const displayName = getDisplayName(account);

  return (
    <div
      className={cn(
        "text-foreground transition-all flex gap-2 items-start px-3 py-2",
        // multiline ? "px-3 py-2" : "px-3 py-0.5",
      )}
    >
      <Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
        <AvatarImage src={account.image || "/avatar.jpg"} alt={displayName} />
        <AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
          {displayName.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex-1 min-w-0",
          !multiline && "flex items-center gap-2",
        )}
      >
        <div className={cn(!multiline && "flex-1 min-w-0")}>
          <Editor
            key={editorKey}
            onChange={setContent}
            categories={categories}
            tasks={tasks}
            submit={handleSubmit}
            hideBlockHandle={true}
            firstLinePlaceholder="Reply..."
          />
        </div>
        {multiline ? (
          <div className="flex items-center justify-end">{replyButton}</div>
        ) : (
          replyButton
        )}
      </div>
    </div>
  );
}
