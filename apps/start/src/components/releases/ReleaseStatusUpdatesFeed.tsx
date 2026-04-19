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
import { Badge } from "@repo/ui/components/badge";
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
	IconAlertTriangle,
	IconArrowBack,
	IconCheck,
	IconChevronDown,
	IconCircleCheck,
	IconDots,
	IconLoader2,
	IconLock,
	IconLockOpen2,
	IconMessage,
	IconPencil,
	IconPlus,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
	createReleaseCommentAction,
	createReleaseStatusUpdateAction,
	deleteReleaseCommentAction,
	deleteReleaseStatusUpdateAction,
	getReleaseCommentsAction,
	getReleaseStatusUpdatesAction,
	updateReleaseCommentAction,
	updateReleaseStatusUpdateAction,
} from "@/lib/fetches/release";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { useLayoutData } from "@/components/generic/Context";

const Editor = lazy(() => import("@/components/prosekit/editor"));

type Health = "on_track" | "at_risk" | "off_track";
type Visibility = "public" | "internal";

const healthConfig: Record<Health, { label: string; icon: React.ReactNode; className: string }> = {
	on_track: {
		label: "On track",
		icon: <IconCircleCheck size={14} />,
		className: "bg-green-500/10 text-green-600 border-green-500/30",
	},
	at_risk: {
		label: "At risk",
		icon: <IconAlertTriangle size={14} />,
		className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
	},
	off_track: {
		label: "Off track",
		icon: <IconX size={14} />,
		className: "bg-red-500/10 text-red-600 border-red-500/30",
	},
};

// ── Inline comment item ────────────────────────────────────────────────────────

interface ReleaseCommentItemProps {
	comment: schema.ReleaseCommentWithAuthor;
	availableUsers: schema.UserSummary[];
	currentUserId?: string;
	isOwn: boolean;
	canManage: boolean;
	onEdit?: (id: string, content: schema.NodeJSON) => Promise<boolean>;
	onDelete?: (id: string) => Promise<boolean>;
}

function ReleaseCommentItem({ comment, availableUsers, isOwn, canManage, onEdit, onDelete }: ReleaseCommentItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(comment.content);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const authorName = comment.createdBy ? getDisplayName(comment.createdBy) : "Unknown";

	const handleSave = useCallback(async () => {
		if (!editContent || !onEdit) return;
		setIsSaving(true);
		const ok = await onEdit(comment.id, editContent);
		setIsSaving(false);
		if (ok) setIsEditing(false);
	}, [editContent, onEdit, comment.id]);

	const handleDelete = useCallback(async () => {
		if (!onDelete) return;
		setIsDeleting(true);
		await onDelete(comment.id);
		setIsDeleting(false);
		setDeleteDialogOpen(false);
	}, [onDelete, comment.id]);

	return (
		<>
			<div
				className={cn(
					"flex flex-col group/reply-item py-2",
					comment.visibility === "internal" && "bg-primary/5 rounded px-1 border border-primary/20",
				)}
			>
				<div className="flex items-center gap-3">
					<InlineLabel
						text={authorName}
						image={comment.createdBy?.image ?? ""}
						avatarClassName="size-5!"
						textNode={
							<div className="flex items-center gap-2 pl-2">
								<Label className="text-xs text-foreground" variant="description">
									{authorName}
								</Label>
								{comment.createdAt && (
									<Label variant="description" className="text-muted-foreground">
										{formatDateTimeFromNow(comment.createdAt)}
									</Label>
								)}
								{comment.visibility === "internal" && (
									<Badge variant="outline" className="gap-1 text-xs py-0 h-4">
										<IconLock size={10} /> Internal
									</Badge>
								)}
							</div>
						}
					/>
					<div className="flex items-center gap-1 ml-auto opacity-0 group-hover/reply-item:opacity-100 has-data-[state=open]:opacity-100 transition-all">
						{(isOwn || canManage) && !isEditing && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent">
										<IconDots size={16} />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{onEdit && isOwn && (
										<DropdownMenuItem onSelect={() => setIsEditing(true)}>
											<IconPencil size={16} /> Edit
										</DropdownMenuItem>
									)}
									{onEdit && onDelete && <DropdownMenuSeparator />}
									{(isOwn || canManage) && onDelete && (
										<DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
											<IconTrash size={16} /> Delete
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>

				{isEditing ? (
					<>
						<Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded" />}>
							<Editor defaultContent={comment.content} onChange={setEditContent} hideBlockHandle mentionViewUsers={availableUsers} />
						</Suspense>
						<div className="flex gap-2 justify-end mt-1">
							<Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-muted-foreground">
								<IconX size={14} /> Cancel
							</Button>
							<Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
								<IconCheck size={14} /> {isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</>
				) : (
					comment.content && (
						<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4" />}>
							<Editor readonly defaultContent={comment.content} hideBlockHandle mentionViewUsers={availableUsers} className="pl-1" />
						</Suspense>
					)
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
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isDeleting ? <IconLoader2 className="animate-spin size-4" /> : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

// ── Inline comment reply input ─────────────────────────────────────────────────

interface InlineCommentInputProps {
	orgId: string;
	releaseId: string;
	statusUpdateId: string;
	sseClientId: string;
	availableUsers: schema.UserSummary[];
	onPosted: () => Promise<void>;
}

function InlineCommentInput({ orgId, releaseId, statusUpdateId, sseClientId, availableUsers, onPosted }: InlineCommentInputProps) {
	const { account } = useLayoutData();
	const [content, setContent] = useState<schema.NodeJSON | undefined>();
	const [editorKey, setEditorKey] = useState(0);
	const [isPosting, setIsPosting] = useState(false);
	const [visibility, setVisibility] = useState<"public" | "internal">("internal");

	const displayName = account ? getDisplayName(account) : "You";

	const handlePost = useCallback(async () => {
		if (!content) return;
		setIsPosting(true);
		try {
			const result = await createReleaseCommentAction(
				orgId,
				releaseId,
				{ content, visibility, statusUpdateId },
				sseClientId,
			);
			if (result.success) {
				setContent(undefined);
				setEditorKey((k) => k + 1);
				await onPosted();
			}
		} finally {
			setIsPosting(false);
		}
	}, [orgId, releaseId, statusUpdateId, sseClientId, content, visibility, onPosted]);

	return (
		<div className="text-foreground transition-all flex gap-2 items-start px-3 py-2">
			<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
				<AvatarImage src={account?.image || "/avatar.jpg"} alt={displayName} />
				<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
					{displayName.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1 min-w-0 flex items-center gap-2">
				<div className="flex-1 min-w-0">
					<Editor
						key={editorKey}
						onChange={setContent}
						hideBlockHandle
						firstLinePlaceholder="Reply..."
						mentionViewUsers={availableUsers}
						submit={handlePost}
					/>
				</div>
				<ButtonGroup>
					<Button
						variant="primary"
						size="icon"
						disabled={!content || isPosting}
						onClick={handlePost}
						className="h-7 w-7 shrink-0"
					>
						{isPosting ? <IconLoader2 className="animate-spin size-4" /> : <IconArrowBack size={14} />}
					</Button>
					<Toggle
						aria-label="Toggle visibility"
						size="sm"
						className={cn(
							"border-0 bg-accent hover:bg-secondary h-7 w-7",
							visibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
						)}
						variant="primary"
						pressed={visibility === "internal"}
						onPressedChange={(pressed) => setVisibility(pressed ? "internal" : "public")}
					>
						{visibility === "internal" ? <IconLock size={14} /> : <IconLockOpen2 size={14} />}
					</Toggle>
				</ButtonGroup>
			</div>
		</div>
	);
}

// ── Status update card ─────────────────────────────────────────────────────────

interface StatusUpdateCardProps {
	update: schema.ReleaseStatusUpdateWithAuthor;
	releaseId: string;
	orgId: string;
	sseClientId: string;
	currentUserId?: string;
	canManage: boolean;
	availableUsers: schema.UserSummary[];
	onDelete: (id: string) => void;
	onEdit: (id: string, data: Partial<{ content: schema.NodeJSON; health: Health; visibility: Visibility }>) => Promise<boolean>;
}

function StatusUpdateCard({
	update,
	releaseId,
	orgId,
	sseClientId,
	currentUserId,
	canManage,
	availableUsers,
	onDelete,
	onEdit,
}: StatusUpdateCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editHealth, setEditHealth] = useState<Health>(update.health as Health);
	const [editVisibility, setEditVisibility] = useState<Visibility>(update.visibility as Visibility);
	const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(update.content as schema.NodeJSON | undefined);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [comments, setComments] = useState<schema.ReleaseCommentWithAuthor[]>([]);
	const [commentsLoading, setCommentsLoading] = useState(false);
	const [commentsLoaded, setCommentsLoaded] = useState(false);

	const loadComments = useCallback(async () => {
		setCommentsLoading(true);
		try {
			const result = await getReleaseCommentsAction(orgId, releaseId, update.id);
			if (result.success) {
				setComments(result.data);
				setCommentsLoaded(true);
			}
		} finally {
			setCommentsLoading(false);
		}
	}, [orgId, releaseId, update.id]);

	const handleToggleComments = useCallback(async () => {
		const next = !commentsOpen;
		setCommentsOpen(next);
		if (next && !commentsLoaded) await loadComments();
	}, [commentsOpen, commentsLoaded, loadComments]);

	const handleSaveEdit = useCallback(async () => {
		setIsSaving(true);
		const success = await onEdit(update.id, { content: editContent, health: editHealth, visibility: editVisibility });
		setIsSaving(false);
		if (success) setIsEditing(false);
	}, [onEdit, update.id, editContent, editHealth, editVisibility]);

	const handleDelete = useCallback(async () => {
		setIsDeleting(true);
		onDelete(update.id);
		setIsDeleting(false);
		setDeleteDialogOpen(false);
	}, [onDelete, update.id]);

	const handleEditComment = useCallback(
		async (commentId: string, content: schema.NodeJSON) => {
			const result = await updateReleaseCommentAction(orgId, releaseId, commentId, { content }, sseClientId);
			if (result.success) await loadComments();
			return result.success;
		},
		[orgId, releaseId, sseClientId, loadComments],
	);

	const handleDeleteComment = useCallback(
		async (commentId: string) => {
			const result = await deleteReleaseCommentAction(orgId, releaseId, commentId);
			if (result.success) await loadComments();
			return result.success;
		},
		[orgId, releaseId, loadComments],
	);

	const isOwn = !!currentUserId && update.author?.id === currentUserId;
	const health = healthConfig[update.health as Health] ?? healthConfig.on_track;
	const authorName = update.author ? getDisplayName(update.author) : "Unknown";

	return (
		<>
			<div
				className={cn(
					"rounded-lg border bg-accent/50 relative overflow-hidden p-2 group/update",
					update.visibility === "internal" && "border-primary/30 bg-primary/5",
				)}
			>
				{/* Header */}
				<div className="flex items-center gap-3">
					<InlineLabel
						text={authorName}
						image={update.author?.image ?? ""}
						avatarClassName="size-5!"
						textNode={
							<div className="flex items-center gap-2 pl-2 flex-wrap">
								<Label className="text-xs text-foreground" variant="description">
									{authorName}
								</Label>
								{isEditing ? (
									<>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Badge variant="outline" className={cn("gap-1 text-xs cursor-pointer border", healthConfig[editHealth].className)}>
													{healthConfig[editHealth].icon} {healthConfig[editHealth].label}
												</Badge>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												{(["on_track", "at_risk", "off_track"] as Health[]).map((h) => (
													<DropdownMenuItem key={h} onClick={() => setEditHealth(h)}>
														<span className={cn("flex items-center gap-2", healthConfig[h].className)}>
															{healthConfig[h].icon} {healthConfig[h].label}
														</span>
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Badge variant="outline" className="gap-1 text-xs cursor-pointer">
													{editVisibility === "internal" ? <IconLock size={12} /> : null}
													{editVisibility === "public" ? "Public" : "Internal"}
												</Badge>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<DropdownMenuItem onClick={() => setEditVisibility("public")}>Public</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setEditVisibility("internal")}>
													<IconLock size={12} /> Internal
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</>
								) : (
									<>
										<Badge variant="outline" className={cn("gap-1 text-xs border pointer-events-none", health.className)}>
											{health.icon} {health.label}
										</Badge>
										{update.visibility === "internal" && (
											<Badge variant="outline" className="gap-1 text-xs pointer-events-none">
												<IconLock size={12} /> Internal
											</Badge>
										)}
									</>
								)}
								{update.createdAt && (
									<Label variant="description" className="text-muted-foreground">
										{formatDateTimeFromNow(update.createdAt)}
									</Label>
								)}
							</div>
						}
					/>
					<div className="flex items-center gap-1 ml-auto opacity-0 group-hover/update:opacity-100 has-data-[state=open]:opacity-100 transition-all">
						{!isEditing && (
							<Button
								variant="ghost"
								size="icon"
								className="p-1 h-auto w-auto aspect-square"
								onClick={handleToggleComments}
							>
								<IconMessage size={16} />
							</Button>
						)}
						{(isOwn || canManage) && !isEditing && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent">
										<IconDots size={16} />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={() => setIsEditing(true)}>
										<IconPencil size={16} /> Edit
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
										<IconTrash size={16} /> Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>

				{/* Content */}
				{isEditing ? (
					<>
						<Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
							<Editor
								defaultContent={update.content as schema.NodeJSON | undefined}
								onChange={setEditContent}
								hideBlockHandle
								mentionViewUsers={availableUsers}
							/>
						</Suspense>
						<div className="flex items-center gap-2 mt-1 justify-end">
							<Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-muted-foreground">
								<IconX size={16} /> Cancel
							</Button>
							<Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={isSaving}>
								<IconCheck size={16} /> {isSaving ? "Saving..." : "Save"}
							</Button>
						</div>
					</>
				) : (
					update.content && (
						<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4" />}>
							<Editor readonly defaultContent={update.content as schema.NodeJSON} hideBlockHandle mentionViewUsers={availableUsers} className="pl-1" />
						</Suspense>
					)
				)}

				{/* Inline comment thread */}
				{!isEditing && commentsOpen && (
					<div className={cn("border-t mt-2", update.visibility === "internal" ? "border-primary/20" : "border-border")}>
						{commentsLoading ? (
							<div className="flex items-center justify-center py-3">
								<IconLoader2 className="animate-spin size-4 text-muted-foreground" />
							</div>
						) : (
							<div className="flex flex-col divide-y divide-border">
								{comments.map((c) => (
									<ReleaseCommentItem
										key={c.id}
										comment={c}
										availableUsers={availableUsers}
										currentUserId={currentUserId}
										isOwn={!!currentUserId && c.createdBy?.id === currentUserId}
										canManage={canManage}
										onEdit={handleEditComment}
										onDelete={handleDeleteComment}
									/>
								))}
							</div>
						)}
						<InlineCommentInput
							orgId={orgId}
							releaseId={releaseId}
							statusUpdateId={update.id}
							sseClientId={sseClientId}
							availableUsers={availableUsers}
							onPosted={loadComments}
						/>
					</div>
				)}

				{/* Bottom reply count row — always visible once we know there are comments */}
				{!isEditing && !commentsOpen && commentsLoaded && comments.length > 0 && (
					<button
						type="button"
						className={cn(
							"flex items-center gap-1.5 mt-2 pt-2 border-t w-full text-xs text-muted-foreground hover:text-foreground transition-colors",
							update.visibility === "internal" ? "border-primary/20" : "border-border",
						)}
						onClick={handleToggleComments}
					>
						<IconChevronDown size={12} />
						<Avatar className="size-4 rounded-full">
							<AvatarImage src={comments[0]?.createdBy?.image ?? ""} alt="" />
							<AvatarFallback className="rounded-full bg-muted text-[9px] uppercase">
								{(comments[0]?.createdBy ? getDisplayName(comments[0].createdBy) : "?").slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						{comments.length} {comments.length === 1 ? "reply" : "replies"}
					</button>
				)}
			</div>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle asChild>
							<Label variant="heading">Delete status update?</Label>
						</AlertDialogTitle>
						<AlertDialogDescription>This will permanently delete the status update and its comments.</AlertDialogDescription>
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

// ── Main feed component ────────────────────────────────────────────────────────

interface Props {
	releaseId: string;
	orgId: string;
	currentUserId?: string;
	canManage?: boolean;
	/** Increment to trigger a refetch (e.g. on SSE event) */
	refreshKey?: number;
}

export function ReleaseStatusUpdatesFeed({ releaseId, orgId, currentUserId, canManage = false, refreshKey = 0 }: Props) {
	const { organization } = useLayoutOrganization();
	const { account } = useLayoutData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const [updates, setUpdates] = useState<schema.ReleaseStatusUpdateWithAuthor[]>([]);
	const [loading, setLoading] = useState(false);
	const [composerOpen, setComposerOpen] = useState(false);
	const [newHealth, setNewHealth] = useState<Health>("on_track");
	const [newVisibility, setNewVisibility] = useState<Visibility>("internal");
	const [newContent, setNewContent] = useState<schema.NodeJSON | undefined>();
	const [composerEditorKey, setComposerEditorKey] = useState(0);
	const [isPosting, setIsPosting] = useState(false);

	const availableUsers = organization.members.map((m) => m.user as schema.UserSummary);
	const displayName = account ? getDisplayName(account) : "You";

	const loadUpdates = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getReleaseStatusUpdatesAction(orgId, releaseId);
			if (result.success) setUpdates(result.data);
		} finally {
			setLoading(false);
		}
	}, [orgId, releaseId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers a re-fetch
	useEffect(() => {
		void loadUpdates();
	}, [loadUpdates, refreshKey]);

	const handlePost = useCallback(async () => {
		if (!newContent) return;
		setIsPosting(true);
		try {
			const result = await createReleaseStatusUpdateAction(
				orgId,
				releaseId,
				{ content: newContent, health: newHealth, visibility: newVisibility },
				sseClientId,
			);
			if (result.success) {
				setComposerOpen(false);
				setNewContent(undefined);
				setNewHealth("on_track");
				setNewVisibility("internal");
				setComposerEditorKey((k) => k + 1);
				await loadUpdates();
			}
		} finally {
			setIsPosting(false);
		}
	}, [orgId, releaseId, sseClientId, newContent, newHealth, newVisibility, loadUpdates]);

	const handleEdit = useCallback(
		async (id: string, data: Partial<{ content: schema.NodeJSON; health: Health; visibility: Visibility }>) => {
			const result = await updateReleaseStatusUpdateAction(orgId, releaseId, id, data, sseClientId);
			if (result.success) await loadUpdates();
			return result.success;
		},
		[orgId, releaseId, sseClientId, loadUpdates],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteReleaseStatusUpdateAction(orgId, releaseId, id);
			setUpdates((prev) => prev.filter((u) => u.id !== id));
		},
		[orgId, releaseId],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<Label variant="subheading">Status updates</Label>
				{canManage && !composerOpen && (
					<Button
						variant="primary"
						size="sm"
						className="text-xs h-7 gap-1"
						onClick={() => setComposerOpen(true)}
					>
						<IconPlus size={14} />
						Post update
					</Button>
				)}
			</div>

			{/* New update composer – styled like TaskNewCommentContent */}
			{composerOpen && (
				<div
					className={cn(
						"text-foreground rounded-lg border px-4 py-2 bg-accent/50",
						newVisibility === "internal" && "border-primary/30 bg-primary/5",
					)}
				>
					<div className="flex items-center gap-2 flex-wrap mb-1">
						<Label variant="description" className="text-xs text-muted-foreground">Health</Label>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Badge variant="outline" className={cn("gap-1 text-xs cursor-pointer border", healthConfig[newHealth].className)}>
									{healthConfig[newHealth].icon} {healthConfig[newHealth].label}
								</Badge>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{(["on_track", "at_risk", "off_track"] as Health[]).map((h) => (
									<DropdownMenuItem key={h} onClick={() => setNewHealth(h)}>
										<span className={cn("flex items-center gap-2", healthConfig[h].className)}>
											{healthConfig[h].icon} {healthConfig[h].label}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex items-start gap-2">
						<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
							<AvatarImage src={account?.image || "/avatar.jpg"} alt={displayName} />
							<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
								{displayName.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<Suspense fallback={<div className="h-8 animate-pulse bg-muted rounded" />}>
								<Editor
									key={composerEditorKey}
									onChange={setNewContent}
									hideBlockHandle
									firstLinePlaceholder="What's the current status of this release?"
									mentionViewUsers={availableUsers}
									submit={handlePost}
								/>
							</Suspense>
						</div>
						<ButtonGroup>
							<Button
								variant="primary"
								size="sm"
								disabled={!newContent || isPosting}
								onClick={handlePost}
								className={cn("border-0", newVisibility === "internal" && "bg-primary/10 hover:bg-primary/20")}
							>
								Post
								<IconArrowBack />
							</Button>
							<Toggle
								aria-label="Toggle visibility"
								size="sm"
								className={cn(
									"border-0 bg-accent hover:bg-secondary",
									newVisibility === "internal" && "bg-primary/10! hover:bg-primary/20!",
								)}
								variant="primary"
								pressed={newVisibility === "internal"}
								onPressedChange={(pressed) => setNewVisibility(pressed ? "internal" : "public")}
							>
								{newVisibility === "internal" ? <IconLock /> : <IconLockOpen2 />}
							</Toggle>
						</ButtonGroup>
					</div>
					<div className="flex justify-end mt-1">
						<Button variant="ghost" size="sm" onClick={() => setComposerOpen(false)} className="text-muted-foreground text-xs">
							Cancel
						</Button>
					</div>
				</div>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-6">
					<IconLoader2 className="animate-spin size-5 text-muted-foreground" />
				</div>
			) : updates.length === 0 ? (
				<p className="text-xs text-muted-foreground py-2">No status updates yet.</p>
			) : (
				<div className="flex flex-col gap-3">
					{updates.map((u) => (
						<StatusUpdateCard
							key={u.id}
							update={u}
							releaseId={releaseId}
							orgId={orgId}
							sseClientId={sseClientId}
							currentUserId={currentUserId}
							canManage={canManage}
							availableUsers={availableUsers}
							onDelete={handleDelete}
							onEdit={handleEdit}
						/>
					))}
				</div>
			)}
		</div>
	);
}
