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
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	task: schema.TaskWithLabels;
}
export function TaskNewCommentContent({ task, setTasks, setSelectedTask, tasks }: TaskNewCommentContentProps) {
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
						const finalTasks = tasks.map((t) => (t.id === task.id && data.data ? data.data : t));
						setTasks(finalTasks);
						if (task && task.id === data.data.id) {
							setSelectedTask(data.data);
						}
					}
				}}
			>
				Create
			</Button>
		</div>
	);
}
