import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LoginDialog from "@/components/auth/login";
import processUploads from "@/components/prosekit/upload";
import { isMultiline } from "@/components/shared/comments/comment-input";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { CreateTaskCommentAction } from "@/lib/fetches/task";
import { publicCommentsKey } from "./usePostComments";
import { useCanAct } from "./useCanAct";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/** DOM id of the composer, so a sticky bar can scroll to it. */
export const POST_COMMENT_COMPOSER_ID = "post-comment-composer";

interface PostCommentComposerProps {
	taskId: string;
	organizationId: string;
	taskStatus: string;
	tasks?: schema.TaskWithLabels[];
	className?: string;
}

/**
 * The comment box for a post: the rich-text composer when the viewer can write, otherwise the log in prompt (logged
 * out) or a short note on why commenting is off. Standalone so Peek can pin it inside its panel.
 */
export function PostCommentComposer({
	taskId,
	organizationId,
	taskStatus,
	tasks,
	className,
}: PostCommentComposerProps) {
	const queryClient = useQueryClient();
	const { organization, categories } = usePublicOrganizationLayout();
	const { isLoggedIn, canAct } = useCanAct(taskStatus);
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editorKey, setEditorKey] = useState(0);
	const multiline = useMemo(() => isMultiline(commentContent), [commentContent]);

	// The Editor's mention hook reads this to fetch org members and task participants.
	useEffect(() => {
		if (organizationId) {
			setMentionContext({ orgId: organizationId, orgShortId: organization.shortId, taskId });
		}
	}, [organizationId, organization.shortId, taskId, setMentionContext]);

	const handleSubmitComment = useCallback(async () => {
		if (!commentContent || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const processedContent = await processUploads(
				commentContent,
				"public",
				organizationId,
				"public-comment-upload"
			);
			const result = await CreateTaskCommentAction(organizationId, taskId, processedContent, "public", sseClientId);
			if (result.success) {
				setCommentContent(undefined);
				setEditorKey((k) => k + 1);
				queryClient.invalidateQueries({ queryKey: publicCommentsKey(taskId, organizationId) });
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
	}, [commentContent, isSubmitting, organizationId, taskId, sseClientId, queryClient]);

	if (canAct) {
		const submitButton = (
			<Button size="sm" onClick={handleSubmitComment} disabled={isSubmitting || !commentContent} className="h-7">
				{isSubmitting ? <IconLoader2 aria-hidden className="animate-spin" /> : "Post"}
				{!isSubmitting && <IconArrowBack aria-hidden />}
			</Button>
		);

		// Same shape as the admin comment box: one line with the button beside it, the button drops below once the
		// draft runs over one line.
		return (
			<div
				id={POST_COMMENT_COMPOSER_ID}
				className={cn(
					"scroll-mt-20 rounded-lg border bg-accent/50 px-3 py-2 text-foreground transition-all",
					!multiline && "flex items-center gap-2",
					className
				)}
			>
				<div className={cn(!multiline && "min-w-0 flex-1")}>
					<Suspense fallback={<Skeleton className="h-6" />}>
						<Editor
							key={editorKey}
							firstLinePlaceholder="Write a comment..."
							onChange={setCommentContent}
							submit={handleSubmitComment}
							categories={categories}
							tasks={tasks}
							hideBlockHandle
						/>
					</Suspense>
				</div>
				{multiline ? <div className="flex items-center justify-end">{submitButton}</div> : submitButton}
			</div>
		);
	}

	if (!isLoggedIn) {
		// Comments and reactions need a Sayr account (voting does not).
		return (
			<div
				className={cn(
					"flex items-center gap-2 rounded-lg border bg-accent/50 px-3 py-2 text-muted-foreground text-sm",
					className
				)}
			>
				<span className="min-w-0 flex-1">Log in to comment and react</span>
				<LoginDialog
					trigger={
						<Button size="sm" className="h-7">
							Log in
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<p className={cn("text-muted-foreground text-sm", className)}>
			{taskStatus === "done" || taskStatus === "canceled"
				? "This post is closed. Comments are turned off."
				: "This organization has turned off public actions."}
		</p>
	);
}
