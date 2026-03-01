"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Toggle } from "@repo/ui/components/toggle";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconLock, IconLockOpen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { CreateTaskCommentAction } from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";
import Editor from "@/components/prosekit/editor";
import type { NodeJSON } from "prosekit/core";
import processUploads from "@/components/prosekit/upload";

type CommentVisibility = "internal" | "public";

/** Check if ProseMirror doc JSON has more than one block-level content node */
function isMultiline(doc: NodeJSON | undefined): boolean {
	if (!doc?.content) return false;
	if (doc.content.length > 1) return true;
	const first = doc.content[0];
	if (first?.content) {
		return first.content.some((node) => node.type === "hardBreak");
	}
	return false;
}

interface TaskNewCommentContentProps {
  task: schema.TaskWithLabels;
  onFinish?: () => void;
  categories: schema.categoryType[];
  tasks: schema.TaskWithLabels[];
}
export function TaskNewCommentContent({
  task,
  onFinish,
  categories,
  tasks,
}: TaskNewCommentContentProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
   const { runWithToast, isFetching } = useToastAction();
   const [newComment, setNewComment] = useState<undefined | NodeJSON>(undefined);
   const [editorKey, setEditorKey] = useState(0);
   const [visibility, setVisibility] = useState<CommentVisibility>("public");
   const commentText = extractTextContent(newComment);
   const disabled = isFetching || commentText.length === 0;
   const multiline = useMemo(() => isMultiline(newComment), [newComment]);
  const handleSubmit = async () => {
    if (!newComment || isFetching || commentText.length === 0) {
      console.log(newComment);
      headlessToast.error({
        title: "Cannot submit empty comment",
        description: "Please enter some text before submitting your comment.",
        id: "create-task-comment",
      });
      return;
    }
    const updatedContent = await processUploads(
      newComment,
      visibility,
      task.organizationId,
      "create-task-comment",
    );
    const data = await runWithToast(
      "create-task-comment",
      {
        loading: {
          title: "Posting comment...",
          description: "Your comment is being added to the task.",
        },
        success: {
          title: "Comment added",
          description: "Your comment was saved successfully.",
        },
        error: {
          title: "Couldn't post comment",
          description:
            "The comment appears locally but could not be saved to the server. Please try again.",
        },
      },
      () =>
        CreateTaskCommentAction(
          task.organizationId,
          task.id,
          updatedContent,
          visibility,
          wsClientId,
        ),
    );

    if (data?.success && data.data && task && task.id === data.data.id) {
      setNewComment(undefined);
      setEditorKey((prev) => prev + 1);
      onFinish?.();
    }
  };
   const actionButtons = (
      <ButtonGroup>
         <Button
            variant={"primary"}
            size={"sm"}
            disabled={disabled}
            onClick={handleSubmit}
            data-track="post-comment"
            data-track-data={JSON.stringify({ taskId: task.id })}
            className={cn(
               "border-0",
               visibility === "internal" && "bg-primary/10 hover:bg-primary/20",
            )}
         >
            Post
            <IconArrowBack />
         </Button>
         <Toggle
            aria-label="Toggle visibility"
            size="sm"
            className={cn(
               "border-0 bg-accent hover:bg-secondary",
               visibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
            )}
            variant={"primary"}
            pressed={visibility === "internal"}
            onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
            defaultPressed={true}
         >
            {visibility === "internal" ? <IconLock /> : <IconLockOpen2 />}
         </Toggle>
      </ButtonGroup>
   );

   return (
      <div
         className={cn(
            "text-foreground mt-2 rounded-lg border px-4 py-2 bg-accent/50 transition-all",
            visibility === "internal" && "border-primary/30 bg-primary/5",
            !multiline && "flex items-center gap-2",
         )}
      >
         <div className={cn(!multiline && "flex-1 min-w-0")}>
            <Editor
               key={editorKey}
               onChange={setNewComment}
               categories={categories}
               tasks={tasks}
               submit={handleSubmit}
               hideBlockHandle={true}
               firstLinePlaceholder="Write a comment..."
            />
         </div>
         {multiline ? (
            <div className="flex items-center justify-end">{actionButtons}</div>
         ) : (
            actionButtons
         )}
      </div>
   );
}
