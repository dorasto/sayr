import { useState, useEffect } from "react";
import { IconMessageDots, IconPencil } from "@tabler/icons-react";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@repo/ui/components/dialog";
import type { schema } from "@repo/database";
import { TaskEditCommentContent } from "../comment/edit";
import { useQueryClient } from "@tanstack/react-query";

// --------------------
// CommentHistoryDialog
// --------------------
function CommentHistoryDialog({
	orgId,
	taskId,
	commentId,
	visibility,
	tasks,
	categories,
	availableUsers,
}: {
	orgId: string;
	taskId: string;
	commentId: string;
	visibility: "public" | "internal";
	tasks?: schema.TaskWithLabels[];
	availableUsers?: schema.userType[];
	categories?: schema.categoryType[];
}) {
	const [open, setOpen] = useState(false);
	const [history, setHistory] = useState<schema.taskCommentHistoryType[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchHistory() {
			if (!open) return;
			setLoading(true);
			setError(null);

			try {
				const url = `${import.meta.env.VITE_EXTERNAL_API_URL}/admin/organization/task/get-comment-history?org_id=${orgId}&task_id=${taskId}&comment_id=${commentId}`;
				const res = await fetch(url, { credentials: "include" });
				if (!res.ok) throw new Error("Failed to fetch comment history");
				const data = await res.json();
				setHistory(data.success && Array.isArray(data.data) ? data.data : []);
				// biome-ignore lint/suspicious/noExplicitAny: <error>
			} catch (err: any) {
				console.error(err);
				setError(err.message || "An error occurred while fetching history.");
			} finally {
				setLoading(false);
			}
		}
		fetchHistory();
	}, [open, orgId, taskId, commentId]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					View History
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden bg-background text-foreground border border-border shadow-xl">
				<DialogHeader>
					<DialogTitle>Comment History</DialogTitle>
					<DialogDescription>Previous versions of this comment.</DialogDescription>
				</DialogHeader>

				{/* Scrollable content area */}
				<div className="flex-1 overflow-y-auto pr-1">
					{loading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}

					{error && <p className="text-sm text-destructive">Error: {error}</p>}

					{!loading && !error && history.length === 0 && (
						<p className="text-sm text-muted-foreground">No history found.</p>
					)}

					{!loading &&
						!error &&
						history.map((entry) => {
							const actor = availableUsers?.find((user) => user.id === entry.editedBy);
							return (
								<TimelineItemWrapper
									key={entry.id}
									item={{
										id: entry.id,
										organizationId: entry.organizationId,
										taskId: entry.taskId || "",
										createdAt: entry.editedAt,
										updatedAt: entry.editedAt,
										eventType: "comment",
										actor,
										content: entry.content,
										visibility,
										toValue: "",
										fromValue: "",
										actorId: entry.editedBy,
									}}
									icon={IconMessageDots}
									color="bg-accent text-primary-foreground"
									availableUsers={availableUsers || []}
									categories={categories || []}
									tasks={tasks || []}
								/>
							);
						})}
				</div>

				<DialogFooter className="pt-4">
					<Button variant="secondary" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --------------------
// CommentEditDialog
// --------------------
function CommentEditDialog({
	item,
	availableUsers,
	categories,
	tasks,
	onFinish,
}: {
	item: schema.taskCommentType;
	availableUsers: schema.userType[];
	categories: schema.categoryType[];
	tasks: schema.TaskWithLabels[];
	onFinish?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const task = tasks.find((t) => t.id === item.taskId);
	if (!task) return null;
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="ml-2">
					<IconPencil size={16} className="mr-1" /> Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Comment</DialogTitle>
					<DialogDescription>Modify your comment below.</DialogDescription>
				</DialogHeader>
				<TaskEditCommentContent
					task={task}
					comment={item}
					availableUsers={availableUsers}
					categories={categories}
					tasks={tasks}
					onFinish={() => {
						setOpen(false);
						onFinish?.();
					}}
					onCancel={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

// --------------------
// TimelineComment
// --------------------
export function TimelineComment({ item, availableUsers, categories, tasks }: TimelineItemProps) {
	const queryClient = useQueryClient();
	const showHistory = item.createdAt && item.updatedAt && item.createdAt !== item.updatedAt;

	return (
		<TimelineItemWrapper
			item={item}
			availableUsers={availableUsers || []}
			categories={categories || []}
			tasks={tasks || []}
			icon={IconMessageDots}
			color="bg-accent text-primary-foreground"
			outerChildren={
				<div className="flex flex-col gap-2">
					<div className="flex gap-2">
						{showHistory && (
							<CommentHistoryDialog
								commentId={item.id}
								orgId={item.organizationId}
								taskId={item.taskId}
								availableUsers={availableUsers}
								categories={categories}
								tasks={tasks}
								visibility={item.visibility}
							/>
						)}
						<CommentEditDialog
							item={{ ...item, createdBy: item.actorId, updatedAt: item.createdAt }}
							availableUsers={availableUsers || []}
							categories={categories || []}
							tasks={tasks || []}
							onFinish={() => {
								queryClient.invalidateQueries({
									queryKey: ["timeline", "comments", item.taskId, item.organizationId],
								});
							}}
						/>
					</div>
				</div>
			}
		/>
	);
}
