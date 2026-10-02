import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconLoader2, IconMessageCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import LoginDialog from "@/components/auth/login";
import processUploads from "@/components/prosekit/upload";
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
		return (
			<div
				id={POST_COMMENT_COMPOSER_ID}
				className={cn(
					"scroll-mt-20 overflow-hidden rounded-xl border bg-background focus-within:border-ring",
					className
				)}
			>
				<Suspense fallback={<Skeleton className="h-20 rounded-none" />}>
					<Editor
						key={editorKey}
						firstLinePlaceholder="Write a comment..."
						className="bg-transparent p-3 pb-0"
						onChange={setCommentContent}
						submit={handleSubmitComment}
						categories={categories}
						tasks={tasks}
						hideBlockHandle
					/>
				</Suspense>
				<div className="flex items-center justify-end px-3 pb-3">
					<Button size="sm" onClick={handleSubmitComment} disabled={isSubmitting || !commentContent}>
						{isSubmitting ? <IconLoader2 aria-hidden className="animate-spin" /> : <IconArrowBack aria-hidden />}
						Comment
					</Button>
				</div>
			</div>
		);
	}

	if (!isLoggedIn) {
		// Comments and reactions need a Sayr account (voting does not).
		return (
			<Card className={cn("rounded-xl p-5", className)}>
				<div className="flex items-center gap-4">
					<span
						aria-hidden
						className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
					>
						<IconMessageCircle className="size-5" />
					</span>
					<div className="min-w-0 flex-1">
						<div className="font-semibold text-[15px] text-foreground">Log in to comment</div>
						<div className="mt-0.5 text-[13.5px] text-muted-foreground">
							Use your Sayr account. It takes a few seconds.
						</div>
					</div>
					<LoginDialog trigger={<Button>Log in</Button>} />
				</div>
			</Card>
		);
	}

	return (
		<Card className={cn("rounded-xl p-5", className)}>
			<p className="text-center text-[13.5px] text-muted-foreground">
				{taskStatus === "done" || taskStatus === "canceled"
					? "This post is closed. Comments are turned off."
					: "This organization has turned off public actions."}
			</p>
		</Card>
	);
}
