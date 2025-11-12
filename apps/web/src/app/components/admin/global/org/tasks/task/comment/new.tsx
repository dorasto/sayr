"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconArrowUp } from "@tabler/icons-react";
import { useState } from "react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { CreateTaskCommentAction } from "@/app/lib/fetches";
import { extractTextContent, useToastAction } from "@/app/lib/util";

interface TaskNewCommentContentProps {
	task: schema.TaskWithLabels;
	onFinish?: () => void;
}
export function TaskNewCommentContent({ task, onFinish }: TaskNewCommentContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();
	const [newComment, setNewComment] = useState<undefined | PartialBlock[]>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	const commentText = extractTextContent(newComment);
	const disabled = isFetching || commentText.length === 0;
	const handleSubmit = async () => {
		if (isFetching || commentText.length === 0) {
			headlessToast.error({
				title: "Cannot submit empty comment",
				description: "Please enter some text before submitting your comment.",
				id: "create-task-comment",
			});
			return;
		}
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
					title: "Couldn’t post comment",
					description: "The comment appears locally but could not be saved to the server. Please try again.",
				},
			},
			() => CreateTaskCommentAction(task.organizationId, task.id, newComment, wsClientId)
		);
		if (data?.success && data.data && task && task.id === data.data.id) {
			setNewComment(undefined);
			setEditorKey((prev) => prev + 1);
			onFinish?.();
		}
	};
	return (
		<div className="text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50 flex flex-col">
			<Editor
				key={editorKey} // 👈 force rerender when the key changes
				emptyDocumentPlaceholder="Leave a comment"
				trailing={false}
				language="en"
				value={newComment}
				onChange={setNewComment}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						handleSubmit();
					}
				}}
			/>
			<div className="flex items-center gap-2 ml-auto">
				<Button
					variant={disabled ? "accent" : "default"}
					size={"sm"}
					disabled={disabled}
					onClick={handleSubmit}
					className={cn("border-transparent")}
				>
					<IconArrowBack />
				</Button>
			</div>
		</div>
	);
}
