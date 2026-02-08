import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { useStateManagement, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useState } from "react";
import { authClient } from "@repo/auth/client";
import { CreateTaskCommentAction } from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

interface PublicCommentsProps {
	taskId: string;
	organizationId: string;
}

interface CommentData {
	id: string;
	taskId: string;
	organizationId: string;
	content: NodeJSON;
	visibility: "public" | "internal";
	createdAt: string;
	updatedAt?: string;
	createdBy: { id: string; name: string; image: string | null; displayName?: string | null } | null;
	reactions?: {
		total: number;
		reactions: Record<string, { count: number; users: string[] }>;
	};
}

interface CommentsPage {
	data: CommentData[];
	pagination: {
		page: number;
		limit: number;
		totalItems: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export function PublicComments({ taskId, organizationId }: PublicCommentsProps) {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editorKey, setEditorKey] = useState(0);

	const commentLimit = 20;

	const {
		value: { data: commentsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage },
	} = useStateManagementInfiniteFetch<CommentsPage>({
		key: ["public-comments", taskId, organizationId],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/timeline/comments?org_id=${organizationId}&task_id=${taskId}&limit=${commentLimit}`,
			custom: async (url, pageParam) => {
				const page = pageParam ?? 1;
				const fullUrl = `${url}&page=${page}`;
				const res = await fetch(fullUrl, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				return res.json();
			},
			getNextPageParam: (lastPage) => (lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined),
		},
		staleTime: 1000 * 30,
	});

	const allComments = commentsData?.flatMap((page) => page.data) ?? [];

	const handleSubmitComment = useCallback(async () => {
		if (!commentContent || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const result = await CreateTaskCommentAction(organizationId, taskId, commentContent, "public", wsClientId);
			if (result.success) {
				setCommentContent(undefined);
				setEditorKey((k) => k + 1);
				queryClient.invalidateQueries({
					queryKey: ["public-comments", taskId, organizationId],
				});
			} else {
				headlessToast.error({
					title: "Failed to post comment",
					description: result.error || "Something went wrong.",
				});
			}
		} catch (error) {
			console.error(error);
			headlessToast.error({
				title: "Failed to post comment",
				description: "Could not post your comment. Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [commentContent, isSubmitting, organizationId, taskId, wsClientId, queryClient]);

	return (
		<div className="flex flex-col gap-4">
			<Label variant="heading" className="text-lg font-semibold">
				Comments
			</Label>

			{/* Comment list */}
			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<IconLoader2 className="animate-spin text-muted-foreground" />
				</div>
			) : allComments.length === 0 ? (
				<div className="text-muted-foreground text-sm py-4 text-center border rounded-lg bg-card/50 border-dashed">
					No comments yet. Be the first to comment!
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{allComments.map((comment) => (
						<PublicCommentItem key={comment.id} comment={comment} />
					))}

					{hasNextPage && (
						<Button
							variant="ghost"
							className="w-full"
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? (
								<>
									<IconLoader2 className="animate-spin size-4 mr-2" />
									Loading...
								</>
							) : (
								"Load more comments"
							)}
						</Button>
					)}
				</div>
			)}

			{/* Comment input */}
			{session?.user ? (
				<div className="flex flex-col gap-3 border rounded-lg p-4 bg-card">
					<div className="flex items-center gap-2">
						<Avatar className="size-6">
							<AvatarImage src={session.user.image || ""} alt={session.user.name} />
							<AvatarFallback className="text-xs">
								{session.user.name?.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<Label variant="description" className="text-sm font-medium">
							{session.user.name}
						</Label>
					</div>
					<Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded" />}>
						<Editor
							key={editorKey}
							placeholder="Write a comment..."
							className="min-h-[80px] border rounded-lg p-2 bg-background"
							onChange={setCommentContent}
							submit={handleSubmitComment}
							hideBlockHandle
						/>
					</Suspense>
					<div className="flex justify-end">
						<Button
							variant="primary"
							size="sm"
							onClick={handleSubmitComment}
							disabled={isSubmitting || !commentContent}
							className="gap-2"
						>
							{isSubmitting ? <IconLoader2 className="animate-spin size-4" /> : <IconSend className="size-4" />}
							Comment
						</Button>
					</div>
				</div>
			) : (
				<div className="border rounded-lg p-6 bg-card/50 border-dashed text-center">
					<p className="text-muted-foreground text-sm">Sign in to leave a comment.</p>
				</div>
			)}
		</div>
	);
}

function PublicCommentItem({ comment }: { comment: CommentData }) {
	const authorName = comment.createdBy ? getDisplayName(comment.createdBy) : "Anonymous";
	const reactions = comment.reactions?.reactions;
	const hasReactions = reactions && Object.keys(reactions).length > 0;

	return (
		<div className="flex gap-3 p-3 rounded-lg bg-accent/50">
			<Avatar className="size-8 shrink-0 mt-0.5">
				<AvatarImage src={comment.createdBy?.image || ""} alt={authorName} />
				<AvatarFallback className="text-xs">{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
			</Avatar>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<Label variant="description" className="text-sm font-medium">
						{authorName}
					</Label>
					<span className="text-xs text-muted-foreground">{formatDateTimeFromNow(comment.createdAt)}</span>
				</div>

				{comment.content && (
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4" />}>
							<Editor readonly={true} defaultContent={comment.content} hideBlockHandle />
						</Suspense>
					</div>
				)}

				{/* Read-only reaction display */}
				{hasReactions && (
					<div className="flex items-center gap-1 flex-wrap mt-1">
						{Object.entries(reactions).map(([emoji, info]) => (
							<span
								key={emoji}
								className={cn(
									"inline-flex items-center gap-1 h-6 px-2 text-sm rounded-full",
									"bg-accent/50 border border-border",
								)}
							>
								<span className="text-base leading-none">{emoji}</span>
								<span className="text-xs font-medium">{info.count}</span>
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
