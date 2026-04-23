import type { schema } from "@repo/database";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
	IconDots,
	IconLoader2,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
	createReleaseCommentAction,
	deleteReleaseCommentAction,
	getReleaseCommentsAction,
	updateReleaseCommentAction,
} from "@/lib/fetches/release";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { CommentItem } from "@/components/shared/comments/CommentItem";
import { CommentInput } from "@/components/shared/comments/CommentInput";
import { ReplyThreadTrigger } from "@/components/shared/comments/ReplyThreadTrigger";

const Editor = lazy(() => import("@/components/prosekit/editor"));

// ---------------------------------------------------------------------------
// TopLevelCommentCard — a comment card with its own collapsible reply thread
// ---------------------------------------------------------------------------
interface TopLevelCommentCardProps {
	comment: schema.ReleaseCommentWithAuthor;
	replies: schema.ReleaseCommentWithAuthor[];
	availableUsers: schema.UserSummary[];
	currentUserId?: string;
	canManage: boolean;
	orgId: string;
	releaseId: string;
	sseClientId: string;
	onReload: () => void;
}

function TopLevelCommentCard({
	comment,
	replies,
	availableUsers,
	currentUserId,
	canManage,
	orgId,
	releaseId,
	sseClientId,
	onReload,
}: TopLevelCommentCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(comment.content as schema.NodeJSON | undefined);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showReplies, setShowReplies] = useState(false);

	const authorName = comment.createdBy ? getDisplayName(comment.createdBy) : "Unknown";
	const isOwn = !!currentUserId && comment.createdBy?.id === currentUserId;

	// Unique reply authors for the thread trigger avatars (most-recent-first, max 3)
	const replyAuthors: schema.UserSummary[] = Array.from(
		new Map(replies.map((r) => [r.createdBy?.id, r.createdBy]).filter((e): e is [string, schema.UserSummary] => !!e[1])).values()
	).slice(0, 3);

	const handleSave = useCallback(async () => {
		if (!editContent) return;
		setIsSaving(true);
		const result = await updateReleaseCommentAction(orgId, releaseId, comment.id, { content: editContent }, sseClientId);
		setIsSaving(false);
		if (result.success) {
			setIsEditing(false);
			onReload();
		}
	}, [editContent, orgId, releaseId, comment.id, sseClientId, onReload]);

	const handleDelete = useCallback(async () => {
		setIsDeleting(true);
		const result = await deleteReleaseCommentAction(orgId, releaseId, comment.id);
		setIsDeleting(false);
		setDeleteDialogOpen(false);
		if (result.success) onReload();
	}, [orgId, releaseId, comment.id, onReload]);

	const handlePostReply = useCallback(
		async (content: schema.NodeJSON) => {
			const result = await createReleaseCommentAction(
				orgId,
				releaseId,
				{ content, visibility: "internal", parentId: comment.id },
				sseClientId,
			);
			if (result.success) onReload();
			return result.success;
		},
		[orgId, releaseId, comment.id, sseClientId, onReload],
	);

	const handleEditReply = useCallback(
		async (replyId: string, content: schema.NodeJSON) => {
			const result = await updateReleaseCommentAction(orgId, releaseId, replyId, { content }, sseClientId);
			if (result.success) onReload();
			return result.success;
		},
		[orgId, releaseId, sseClientId, onReload],
	);

	const handleDeleteReply = useCallback(
		async (replyId: string) => {
			const result = await deleteReleaseCommentAction(orgId, releaseId, replyId);
			if (result.success) onReload();
			return result.success;
		},
		[orgId, releaseId, onReload],
	);

	return (
		<>
			<div
				className={cn(
					"rounded-lg border bg-card relative overflow-hidden group/comment",
					comment.visibility === "internal" && "border-primary/30 bg-primary/5",
				)}
			>
				{/* Header + content */}
				<div className="p-3">
					<div className="flex items-center gap-2 flex-wrap">
						<Avatar className="size-5 shrink-0 rounded-full">
							<AvatarImage src={comment.createdBy?.image ?? ""} alt={authorName} />
							<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
								{authorName.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm font-medium">{authorName}</span>
						{comment.createdAt && (
							<span className="text-xs text-muted-foreground">{formatDateTimeFromNow(comment.createdAt)}</span>
						)}
						<div className="ml-auto flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 has-data-[state=open]:opacity-100 transition-all">
							{(isOwn || canManage) && !isEditing && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-6 w-6">
											<IconDots size={14} />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{isOwn && (
											<DropdownMenuItem onSelect={() => setIsEditing(true)}>
												<IconPencil size={14} /> Edit
											</DropdownMenuItem>
										)}
										{isOwn && <DropdownMenuSeparator />}
										{(isOwn || canManage) && (
											<DropdownMenuItem
												onSelect={() => setDeleteDialogOpen(true)}
												className="text-destructive focus:text-destructive"
											>
												<IconTrash size={14} /> Delete
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					</div>

					{isEditing ? (
						<div className="mt-2">
							<Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
								<Editor
									defaultContent={comment.content as schema.NodeJSON | undefined}
									onChange={setEditContent}
									hideBlockHandle
									mentionViewUsers={availableUsers}
								/>
							</Suspense>
							<div className="flex items-center gap-2 mt-1 justify-end">
								<Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-muted-foreground">
									Cancel
								</Button>
								<Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
									{isSaving && <IconLoader2 size={14} className="animate-spin" />}
									Save
								</Button>
							</div>
						</div>
					) : (
						comment.content && (
							<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4 mt-1" />}>
								<Editor
									readonly
									defaultContent={comment.content as schema.NodeJSON | undefined}
									hideBlockHandle
									mentionViewUsers={availableUsers}
								/>
							</Suspense>
						)
					)}
				</div>

				{/* Reply thread trigger — always visible when replies exist */}
				{!showReplies && (
					<div className="px-3">
						<ReplyThreadTrigger
							count={replies.length}
							replyAuthors={replyAuthors}
							isInternal={comment.visibility === "internal"}
							onClick={() => setShowReplies(true)}
						/>
					</div>
				)}

				{/* Expanded reply thread */}
				{showReplies && (
					<>
						{replies.length > 0 && (
							<>
								<div className="px-3">
									<ReplyThreadTrigger
										count={replies.length}
										replyAuthors={replyAuthors}
										isInternal={comment.visibility === "internal"}
										expanded
										onClick={() => setShowReplies(false)}
									/>
								</div>
								<div className="flex flex-col divide-y divide-border mt-2">
									{replies.map((reply) => (
										<div key={reply.id} className="px-3 py-1">
											<CommentItem
												comment={reply}
												availableUsers={availableUsers}
												isOwn={!!currentUserId && reply.createdBy?.id === currentUserId}
												canManage={canManage}
												onEdit={handleEditReply}
												onDelete={handleDeleteReply}
											/>
										</div>
									))}
								</div>
							</>
						)}

						<div className="border-t border-border">
							<CommentInput
								availableUsers={availableUsers}
								placeholder="Reply..."
								showVisibilityToggle={false}
								onPost={handlePostReply}
							/>
						</div>
					</>
				)}
			</div>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle asChild>
							<Label variant="heading">Delete comment?</Label>
						</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? <IconLoader2 className="animate-spin size-4" /> : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
	releaseId: string;
	orgId: string;
	currentUserId?: string;
	canComment?: boolean;
	canManage?: boolean;
	refreshKey?: number;
}

export function ReleaseDiscussion({
	releaseId,
	orgId,
	currentUserId,
	canComment = true,
	canManage = false,
	refreshKey = 0,
}: Props) {
	const { organization } = useLayoutOrganization();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const [comments, setComments] = useState<schema.ReleaseCommentWithAuthor[]>([]);
	const [loading, setLoading] = useState(false);

	const availableUsers = organization.members.map((m) => m.user as schema.UserSummary);

	const loadComments = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getReleaseCommentsAction(orgId, releaseId, null);
			if (result.success) setComments(result.data);
		} finally {
			setLoading(false);
		}
	}, [orgId, releaseId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers a re-fetch
	useEffect(() => {
		void loadComments();
	}, [loadComments, refreshKey]);

	const handlePostComment = useCallback(
		async (content: schema.NodeJSON, visibility: "public" | "internal") => {
			const result = await createReleaseCommentAction(orgId, releaseId, { content, visibility }, sseClientId);
			if (result.success) loadComments();
			return result.success;
		},
		[orgId, releaseId, sseClientId, loadComments],
	);

	const topLevel = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
	const repliesByParent = useMemo(() => {
		const map = new Map<string, schema.ReleaseCommentWithAuthor[]>();
		for (const c of comments) {
			if (c.parentId) {
				const arr = map.get(c.parentId) ?? [];
				arr.push(c);
				map.set(c.parentId, arr);
			}
		}
		return map;
	}, [comments]);

	return (
		<div className="flex flex-col gap-3">
			<Label variant="subheading">Discussion</Label>

			{canComment && (
				<CommentInput
					availableUsers={availableUsers}
					placeholder="Write a comment..."
					submitLabel="Post"
					onPost={handlePostComment}
				/>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-6">
					<IconLoader2 className="animate-spin size-5 text-muted-foreground" />
				</div>
			) : topLevel.length === 0 ? (
				<p className="text-xs text-muted-foreground py-2">No comments yet.</p>
			) : (
				<div className="flex flex-col gap-2">
					{topLevel.map((c) => (
						<TopLevelCommentCard
							key={c.id}
							comment={c}
							replies={repliesByParent.get(c.id) ?? []}
							availableUsers={availableUsers}
							currentUserId={currentUserId}
							canManage={canManage}
							orgId={orgId}
							releaseId={releaseId}
							sseClientId={sseClientId}
							onReload={loadComments}
						/>
					))}
				</div>
			)}
		</div>
	);
}
