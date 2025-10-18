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
	return (
		<div>
			<Editor language="en" value={newComment} onChange={setNewComment} />
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
							onFinish?.();
						}
					}
				}}
			>
				Create
			</Button>
		</div>
	);
}
