"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useState } from "react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { CreateTaskCommentAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";

interface TaskNewCommentContentProps {
	task: schema.TaskWithLabels;
	onFinish?: () => void;
}
export function TaskNewCommentContent({ task, onFinish }: TaskNewCommentContentProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();
	const [newComment, setNewComment] = useState<undefined | PartialBlock[]>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	return (
		<div className="text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50 flex flex-col">
			<Editor
				key={editorKey} // 👈 force rerender when the key changes
				emptyDocumentPlaceholder="Leave a comment"
				trailing={false}
				language="en"
				value={newComment}
				onChange={setNewComment}
			/>
			<div className="flex items-center gap-2 ml-auto">
				<Button
					disabled={isFetching}
					onClick={async () => {
						const data = await runWithToast(
							"update-task-comments",
							{
								loading: {
									title: "Updating task...",
									description: "Updating your task... changes are already visible.",
								},
								success: {
									title: "Task saved",
									description: "Your changes have been saved successfully.",
								},
								error: {
									title: "Save failed",
									description:
										"Your changes are showing, but we couldn't save them to the server. Please try again.",
								},
							},
							() => CreateTaskCommentAction(task.organizationId, task.projectId, task.id, newComment, wsClientId)
						);
						if (data?.success && data.data) {
							if (task && task.id === data.data.id) {
								setNewComment(undefined);
								setEditorKey((prev) => prev + 1); // 👈 triggers new Editor instance
								onFinish?.();
							}
						}
					}}
				>
					Comment
				</Button>
			</div>
		</div>
	);
}
