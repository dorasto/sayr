"use client";

import { useState } from "react";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBackUp, IconX } from "@tabler/icons-react";
import { extractTextContent, useToastAction } from "@/lib/util";
import { UpdateTaskCommentAction } from "@/lib/fetches/task";
import Editor from "@/components/prosekit/editor";
import type { NodeJSON } from "prosekit/core";
import { processUploadsAndDeletions } from "@/components/prosekit/upload";

interface TaskEditCommentContentProps {
	task: schema.TaskWithLabels;
	comment: schema.taskCommentType; // existing comment to edit
	categories: schema.categoryType[];
	tasks: schema.TaskWithLabels[];
	onFinish?: () => void; // called on successful update
	onCancel?: () => void; // optional cancel handler
}

export function TaskEditCommentContent({
	task,
	comment,
	categories,
	tasks,
	onFinish,
	onCancel,
}: TaskEditCommentContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();

	// Preload editor with current comment content + visibility
	const [updatedContent, setUpdatedContent] = useState<NodeJSON | undefined>(comment.content as NodeJSON | undefined);
	const [editorKey, setEditorKey] = useState(0);
	const oldCommentText = extractTextContent(comment.content);
	const commentText = extractTextContent(updatedContent);
	const disabled = isFetching || commentText.trim().length === 0 || oldCommentText === commentText;
	async function handleUpdate() {
		if (!updatedContent || disabled) {
			headlessToast.error({
				title: "Cannot update comment",
				description: "Please make sure there is content before updating this comment.",
				id: "update-task-comment",
			});
			return;
		}
		const processed = await processUploadsAndDeletions(
			comment.content as NodeJSON,
			updatedContent,
			comment.visibility,
			task.organizationId,
			"update-task-comment"
		);
		const data = await runWithToast(
			"update-task-comment",
			{
				loading: {
					title: "Updating comment...",
					description: "Saving your changes.",
				},
				success: {
					title: "Comment updated",
					description: "Your edits were saved successfully.",
				},
				error: {
					title: "Couldn't update comment",
					description: "The comment appears locally but could not be updated on the server.",
				},
			},
			// Your custom action to update the comment — similar to CreateTaskCommentAction
			() =>
				UpdateTaskCommentAction(task.organizationId, task.id, comment.id, processed, comment.visibility, wsClientId)
		);
		if (data?.success && data.data && task && task.id === data.data.id) {
			setEditorKey((prev) => prev + 1);
			onFinish?.();
		}
	}

	return (
		<div
			className={cn(
				"text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50 flex flex-col",
				comment.visibility === "internal" && "border-primary/30 bg-primary/5"
			)}
		>
			<Editor
				key={editorKey}
				onChange={setUpdatedContent}
				defaultContent={comment.content as NodeJSON}
				categories={categories}
				tasks={tasks}
				submit={handleUpdate}
			/>

			<div className="flex items-center gap-2 ml-auto">
				<ButtonGroup>
					<Button
						variant="default"
						size="sm"
						disabled={disabled}
						onClick={handleUpdate}
						className={cn(
							"border-transparent",
							comment.visibility === "internal" && "bg-primary/10 hover:bg-primary/20"
						)}
					>
						Save Changes
						<IconArrowBackUp />
					</Button>

					{onCancel && (
						<Button
							variant="ghost"
							size="sm"
							disabled={isFetching}
							onClick={onCancel}
							className="text-muted-foreground hover:text-foreground"
						>
							Cancel
							<IconX />
						</Button>
					)}
				</ButtonGroup>
			</div>
		</div>
	);
}
