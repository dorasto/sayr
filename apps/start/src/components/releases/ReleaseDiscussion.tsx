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
import { ButtonGroup } from "@repo/ui/components/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { Toggle } from "@repo/ui/components/toggle";
import { cn } from "@repo/ui/lib/utils";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
	IconArrowBack,
	IconChevronDown,
	IconChevronUp,
	IconDots,
	IconLoader2,
	IconLock,
	IconLockOpen2,
	IconMessage,
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
import { useLayoutData } from "@/components/generic/Context";
import { extractTextContent } from "@/lib/util";

const Editor = lazy(() => import("@/components/prosekit/editor"));

type CommentVisibility = "public" | "internal";

function isMultiline(doc: schema.NodeJSON | undefined): boolean {
	if (!doc?.content) return false;
	if (doc.content.length > 1) return true;
	const first = doc.content[0];
	if (first?.content) {
		return first.content.some((node: { type: string }) => node.type === "hardBreak");
	}
	return false;
}

// ---------------------------------------------------------------------------
// ReplyInput — always-visible at bottom of card
// ---------------------------------------------------------------------------
interface ReplyInputProps {
	orgId: string;
	releaseId: string;
	parentId: string;
	availableUsers: schema.UserSummary[];
	sseClientId: string;
	onPosted: () => void;
}

function ReplyInput({ orgId, releaseId, parentId, availableUsers, sseClientId, onPosted }: ReplyInputProps) {
	const { account } = useLayoutData();
	const [content, setContent] = useState<schema.NodeJSON | undefined>();
	const [editorKey, setEditorKey] = useState(0);
	const [isPosting, setIsPosting] = useState(false);

	const commentText = extractTextContent(content);
	const disabled = isPosting || commentText.length === 0;
	const multiline = useMemo(() => isMultiline(content), [content]);
	const displayName = getDisplayName(account);

	const handleSubmit = useCallback(async () => {
		if (!content || commentText.length === 0) return;
		setIsPosting(true);
		try {
			const result = await createReleaseCommentAction(
				orgId,
				releaseId,
				{ content, visibility: "internal", parentId },
				sseClientId,
			);
			if (result.success) {
				setContent(undefined);
				setEditorKey((prev) => prev + 1);
				onPosted();
			}
		} finally {
			setIsPosting(false);
		}
	}, [content, commentText.length, orgId, releaseId, parentId, sseClientId, onPosted]);

	const replyButton = (
		<Button
			variant="primary"
			size="icon"
			disabled={disabled}
			onClick={handleSubmit}
			className="h-7 w-7 shrink-0"
		>
			{isPosting ? <IconLoader2 size={14} className="animate-spin" /> : <IconArrowBack size={14} />}
		</Button>
	);

	return (
		<div className="flex gap-2 items-start px-3 py-2">
			<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
				<AvatarImage src={account.image || "/avatar.jpg"} alt={displayName} />
				<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
					{displayName.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<div className={cn("flex-1 min-w-0", !multiline && "flex items-center gap-2")}>
				<div className={cn(!multiline && "flex-1 min-w-0")}>
					<Editor
						key={editorKey}
						onChange={setContent}
						hideBlockHandle
						firstLinePlaceholder="Reply..."
						mentionViewUsers={availableUsers}
					/>
				</div>
				{multiline ? <div className="flex items-center justify-end">{replyButton}</div> : replyButton}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// CommentItem — replies live inside the same card
// ---------------------------------------------------------------------------
interface CommentItemProps {
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

function CommentItem({
	comment,
	replies,
	availableUsers,
	currentUserId,
	canManage,
	orgId,
	releaseId,
	sseClientId,
	onReload,
}: CommentItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(comment.content as schema.NodeJSON | undefined);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showReplies, setShowReplies] = useState(false);

	const authorName = comment.createdBy ? getDisplayName(comment.createdBy) : "Unknown";
	const isOwn = !!currentUserId && comment.createdBy?.id === currentUserId;

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
							{!isEditing && (
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
									onClick={() => setShowReplies((v) => !v)}
									title="Reply"
								>
									<IconMessage size={14} />
								</Button>
							)}
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

				{/* Replies section — inside the card */}
				{replies.length > 0 && !showReplies && (
					<button
						type="button"
						className="flex items-center gap-1.5 border-t px-3 py-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
						onClick={() => setShowReplies(true)}
					>
						<IconChevronDown size={12} />
						<Avatar className="size-4 rounded-full">
							<AvatarImage src={replies[0]?.createdBy?.image ?? ""} alt="" />
							<AvatarFallback className="rounded-full bg-muted text-[9px] uppercase">
								{(replies[0]?.createdBy ? getDisplayName(replies[0].createdBy) : "?").slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						{replies.length} {replies.length === 1 ? "reply" : "replies"}
					</button>
				)}

				{showReplies && (
					<>
						{replies.length > 0 && (
							<>
								<button
									type="button"
									className="flex items-center gap-1 border-t px-3 py-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
									onClick={() => setShowReplies(false)}
								>
									<IconChevronUp size={12} />
									Hide {replies.length === 1 ? "reply" : "replies"}
								</button>
								<div className="flex flex-col">
									{replies.map((reply) => {
										const replyAuthor = reply.createdBy ? getDisplayName(reply.createdBy) : "Unknown";
										return (
											<div key={reply.id} className={cn(
												"border-t px-3 py-2",
												reply.visibility === "internal" && "bg-primary/5",
											)}>
												<div className="flex items-center gap-2 flex-wrap">
													<Avatar className="size-5 shrink-0 rounded-full">
														<AvatarImage src={reply.createdBy?.image ?? ""} alt={replyAuthor} />
														<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
															{replyAuthor.slice(0, 2)}
														</AvatarFallback>
													</Avatar>
													<span className="text-sm font-medium">{replyAuthor}</span>
													{reply.createdAt && (
														<span className="text-xs text-muted-foreground">{formatDateTimeFromNow(reply.createdAt)}</span>
													)}
													{reply.visibility === "internal" && (
														<span className="flex items-center gap-1 text-xs text-muted-foreground border rounded px-1.5 py-0.5">
															<IconLock size={10} /> Internal
														</span>
													)}
												</div>
												{reply.content && (
													<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4 mt-1" />}>
														<Editor
															readonly
															defaultContent={reply.content as schema.NodeJSON | undefined}
															hideBlockHandle
															mentionViewUsers={availableUsers}
														/>
													</Suspense>
												)}
											</div>
										);
									})}
								</div>
							</>
						)}

						{/* Reply input */}
						<div className="border-t">
							<ReplyInput
								orgId={orgId}
								releaseId={releaseId}
								parentId={comment.id}
								availableUsers={availableUsers}
								sseClientId={sseClientId}
								onPosted={() => {
									onReload();
								}}
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
// New comment composer — matches TaskNewCommentContent style
// ---------------------------------------------------------------------------
interface NewCommentComposerProps {
	orgId: string;
	releaseId: string;
	availableUsers: schema.UserSummary[];
	sseClientId: string;
	onPosted: () => void;
}

function NewCommentComposer({ orgId, releaseId, availableUsers, sseClientId, onPosted }: NewCommentComposerProps) {
	const [content, setContent] = useState<schema.NodeJSON | undefined>();
	const [editorKey, setEditorKey] = useState(0);
	const [visibility, setVisibility] = useState<CommentVisibility>("internal");
	const [isPosting, setIsPosting] = useState(false);

	const commentText = extractTextContent(content);
	const disabled = isPosting || commentText.length === 0;
	const multiline = useMemo(() => isMultiline(content), [content]);

	const handleSubmit = useCallback(async () => {
		if (!content || commentText.length === 0) return;
		setIsPosting(true);
		try {
			const result = await createReleaseCommentAction(
				orgId,
				releaseId,
				{ content, visibility },
				sseClientId,
			);
			if (result.success) {
				setContent(undefined);
				setEditorKey((prev) => prev + 1);
				onPosted();
			}
		} finally {
			setIsPosting(false);
		}
	}, [content, commentText.length, orgId, releaseId, visibility, sseClientId, onPosted]);

	const actionButtons = (
		<ButtonGroup>
			<Button
				variant="primary"
				size="sm"
				disabled={disabled}
				onClick={handleSubmit}
				className={cn("border-0", visibility === "internal" && "bg-primary/10 hover:bg-primary/20")}
			>
				Post
				{isPosting ? <IconLoader2 size={14} className="animate-spin" /> : <IconArrowBack size={14} />}
			</Button>
			<Toggle
				aria-label="Toggle visibility"
				size="sm"
				className={cn(
					"border-0 bg-accent hover:bg-secondary",
					visibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
				)}
				variant="primary"
				pressed={visibility === "internal"}
				onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
				defaultPressed
			>
				{visibility === "internal" ? <IconLock size={14} /> : <IconLockOpen2 size={14} />}
			</Toggle>
		</ButtonGroup>
	);

	return (
		<div
			className={cn(
				"text-foreground rounded-lg border px-4 py-2 bg-accent/50 transition-all",
				visibility === "internal" && "border-primary/30 bg-primary/5",
				!multiline && "flex items-center gap-2",
			)}
		>
			<div className={cn(!multiline && "flex-1 min-w-0")}>
				<Editor
					key={editorKey}
					onChange={setContent}
					hideBlockHandle
					firstLinePlaceholder="Write a comment..."
					mentionViewUsers={availableUsers}
				/>
			</div>
			{multiline ? <div className="flex items-center justify-end">{actionButtons}</div> : actionButtons}
		</div>
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
				<NewCommentComposer
					orgId={orgId}
					releaseId={releaseId}
					availableUsers={availableUsers}
					sseClientId={sseClientId}
					onPosted={loadComments}
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
						<CommentItem
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
