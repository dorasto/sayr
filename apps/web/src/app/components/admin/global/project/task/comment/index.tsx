"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { formatDateTime, formatDateTimeFromNow } from "@repo/util";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import RenderUser from "../render-user";
import { TaskNewCommentContent } from "./new";

interface TaskNewCommentContentProps {
	org_id: string;
	project_id: string;
	task: schema.TaskWithLabels;
	ws: WebSocket | null;
}

export function TaskComments({ org_id, project_id, task, ws }: TaskNewCommentContentProps) {
	const [pageIndex, setPageIndex] = useState(0);
	const [pendingComment, setPendingComment] = useState<{
		blockNote: PartialBlock[] | undefined;
	} | null>(null);
	const { value } = useStateManagementInfiniteFetch<{
		comments: schema.CommentsWithAuthor;
		pagination: { page: number; totalPages: number };
	}>({
		key: ["comments", task.id],
		fetch: {
			url: `${
				process.env.NEXT_PUBLIC_EXTERNAL_API_URL
			}/admin/organization/project/task/comments?org_id=${org_id}&project_id=${project_id}&task_id=${task.id}&limit=5`,
			custom: async (url, page = 1) => {
				const fullUrl = `${url}&page=${page}`;
				const res = await fetch(fullUrl, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				const data = await res.json();
				return data.data; // { comments, pagination }
			},
			getNextPageParam: (lastPage) =>
				lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
		},
		staleTime: 1000,
		refetchOnWindowFocus: false,
	});

	const handleGoToPage = async (direction: "next" | "prev") => {
		if (direction === "next") {
			if (pageIndex === value.data.length - 1 && value.hasNextPage) {
				await value.fetchNextPage();
			}
			setPageIndex((prev) => Math.min(prev + 1, value.data.length));
		} else {
			setPageIndex((prev) => Math.max(prev - 1, 0));
		}
	};

	const currentPage = value.data[pageIndex];
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_TASK_COMMENTS: async (msg) => {
			if (msg.data.id === task.id) {
				await value.refetch();
				setPendingComment(null);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE TASK COMMENTS]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	return (
		<div className="w-full space-y-6">
			{/* Comments */}
			<div className="space-y-4">
				{pendingComment && (
					<div className="rounded-md border border-neutral-700 bg-neutral-900/50 p-4 shadow-sm opacity-70">
						<div className="flex items-center gap-2 mb-3">
							<RenderUser name="You" image="" />
							<span className="text-sm text-neutral-400 flex items-center gap-1">
								<Loader2 className="animate-spin w-4 h-4" /> Sending…
							</span>
						</div>
						<div className="ml-8 border-l border-neutral-800 pl-3">
							<Editor readonly value={pendingComment.blockNote} />
						</div>
					</div>
				)}
				{currentPage?.comments?.slice(0, pendingComment ? 4 : currentPage.comments.length).map((comment) => (
					<div
						key={comment.id}
						className="rounded-md border border-neutral-700 bg-neutral-900/50 p-4 shadow-sm transition hover:bg-neutral-900"
					>
						<div className="flex items-center gap-2 mb-3">
							<RenderUser name={comment.createdBy?.name || ""} image={comment.createdBy?.image || ""} />
							<Tooltip delayDuration={500}>
								<TooltipTrigger asChild>
									<span className="text-sm">{formatDateTimeFromNow(comment.createdAt as Date)}</span>
								</TooltipTrigger>
								<TooltipContent side="top">{formatDateTime(comment.createdAt as Date)}</TooltipContent>
							</Tooltip>
						</div>
						<div className="ml-8 border-l border-neutral-800 pl-3">
							<Editor readonly value={comment.blockNote as PartialBlock[]} />
						</div>
					</div>
				))}
				{!currentPage?.comments?.length && (
					<p className="text-center text-neutral-400 italic">No comments yet — be the first one!</p>
				)}
			</div>

			{/* Pagination Controls */}
			<div className="flex justify-center items-center gap-4 py-3 text-sm">
				<Button
					onClick={() => handleGoToPage("prev")}
					variant="secondary"
					disabled={pageIndex === 0 || value.isFetchingNextPage}
				>
					⬅ Prev
				</Button>
				<span className="text-neutral-400">
					Page <strong className="text-neutral-200">{currentPage?.pagination.page ?? pageIndex + 1}</strong> of{" "}
					<strong className="text-neutral-200">
						{currentPage?.pagination.totalPages ?? (value.data[0]?.pagination.totalPages || 1)}
					</strong>
				</span>
				<Button
					onClick={() => handleGoToPage("next")}
					disabled={(!value.hasNextPage && pageIndex === value.data.length - 1) || value.isFetchingNextPage}
				>
					Next ➡
				</Button>
			</div>

			{/* Comment Composer */}
			<div className="border-t border-neutral-800 pt-4">
				<TaskNewCommentContent
					task={task}
					onPending={(draft) => setPendingComment({ blockNote: draft })}
					refetch={value.refetch}
					onFinish={() => setPendingComment(null)}
				/>
			</div>
		</div>
	);
}
