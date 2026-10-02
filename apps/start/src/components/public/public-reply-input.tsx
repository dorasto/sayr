import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { IconArrowBack, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useState } from "react";
import { isMultiline } from "@/components/shared/comments/comment-input";
import { CreateTaskCommentAction } from "@/lib/fetches/task";
import { extractTextContent } from "@/lib/util";
import type { CommentData } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface PublicReplyInputProps {
	parentComment: CommentData;
	categories?: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	onReplyPosted?: () => void;
	/** Optional custom post reply function (e.g., for release comments). */
	onPostReply?: (content: NodeJSON) => Promise<boolean>;
}

/** Compact reply input shown at the bottom of an expanded public comment thread. */
export function PublicReplyInput({
	parentComment,
	categories,
	tasks,
	onReplyPosted,
	onPostReply,
}: PublicReplyInputProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const [content, setContent] = useState<undefined | NodeJSON>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const commentText = extractTextContent(content);
	const disabled = isSubmitting || commentText.length === 0;

	const handleSubmit = useCallback(async () => {
		if (!content || isSubmitting || commentText.length === 0) return;

		setIsSubmitting(true);
		try {
			// Use custom post reply if provided (e.g., for release comments)
			if (onPostReply) {
				const success = await onPostReply(content);
				if (success) {
					setContent(undefined);
					setEditorKey((prev) => prev + 1);
					queryClient.invalidateQueries({
						queryKey: ["comment-replies", parentComment.id, parentComment.organizationId],
					});
					onReplyPosted?.();
				}
			} else {
				const result = await CreateTaskCommentAction(
					parentComment.organizationId,
					parentComment.taskId,
					content,
					"public",
					sseClientId,
					parentComment.id
				);
				if (result.success) {
					setContent(undefined);
					setEditorKey((prev) => prev + 1);
					// Refresh both replies and parent comments (for updated replyCount)
					queryClient.invalidateQueries({
						queryKey: ["comment-replies", parentComment.id, parentComment.organizationId],
					});
					queryClient.invalidateQueries({
						queryKey: ["public-comments", parentComment.taskId, parentComment.organizationId],
					});
					onReplyPosted?.();
				} else {
					headlessToast.error({
						title: "Failed to post reply",
						description: result.error || "Something went wrong.",
						id: "public-reply-error",
					});
				}
			}
		} catch {
			headlessToast.error({
				title: "Failed to post reply",
				description: "Could not post your reply. Please try again.",
				id: "public-reply-error",
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [content, isSubmitting, commentText, parentComment, sseClientId, queryClient, onReplyPosted, onPostReply]);

	const displayName = session?.user?.name ?? "User";
	const multiline = isMultiline(content);

	const submitButton = (
		<Button size="sm" disabled={disabled} onClick={handleSubmit} className="h-7">
			{isSubmitting ? <IconLoader2 aria-hidden className="animate-spin" /> : "Reply"}
			{!isSubmitting && <IconArrowBack aria-hidden />}
		</Button>
	);

	return (
		<div className="mt-3 flex items-start gap-2.5 text-foreground">
			<Avatar className="mt-2 size-5">
				{session?.user?.image ? <AvatarImage src={ensureCdnUrl(session.user.image)} alt={displayName} /> : null}
				<AvatarFallback className="text-[10px]">{getInitials(displayName)}</AvatarFallback>
			</Avatar>
			{/* Same shape as the comment box: the button sits beside a one-line draft and drops below a longer one. */}
			<div
				className={cn(
					"min-w-0 flex-1 rounded-lg border bg-accent/50 px-3 py-1.5 transition-all",
					!multiline && "flex items-center gap-2"
				)}
			>
				<div className={cn(!multiline && "min-w-0 flex-1")}>
					<Suspense fallback={<Skeleton className="h-6" />}>
						<Editor
							key={editorKey}
							onChange={setContent}
							categories={categories}
							tasks={tasks}
							submit={handleSubmit}
							hideBlockHandle
							firstLinePlaceholder="Write a reply..."
						/>
					</Suspense>
				</div>
				{multiline ? <div className="flex items-center justify-end">{submitButton}</div> : submitButton}
			</div>
		</div>
	);
}
