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
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDateTimeFromNow, getDisplayName, getInitials } from "@repo/util";
import {
	IconBan,
	IconCheck,
	IconDots,
	IconLink,
	IconLoader2,
	IconLock,
	IconMessage,
	IconPencil,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import { Pill } from "@/components/public/portal/ui/Pill";
import { type ReactionEmoji, ReactionPicker } from "@/components/tasks/task/timeline/reactions";
import { useScrollIntoViewWhileSettling } from "@/hooks/portal/useScrollIntoViewWhileSettling";
import { CommentReactions } from "./comment-reactions";
import type { PublicCommentItemProps } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/**
 * One comment or reply: avatar, name, Author/Team pills, time, body and reaction chips. Reply and the actions menu
 * (Copy link, Edit, Delete) sit at the right of the header and the add-reaction picker sits after the chips; all three
 * only show on hover, like the admin timeline. GitHub-origin comments show an initials avatar, the GitHub login (linked to the profile) and a "via GitHub"
 * pill, and never an Author/Team badge. `footer` (the reply thread) renders under the comment, outside its hover area,
 * so hovering a reply never reveals the parent's actions. Wrap it in an `li` when it is part of a list.
 */
export function PublicCommentItem({
	comment,
	memberTeamName,
	isAuthor = false,
	onToggleReaction,
	users,
	currentUserId,
	onEdit,
	onDelete,
	categories,
	tasks,
	footer,
	isReply,
	onReply,
	blockedUserIds,
	isOrgMember,
	commentLink,
	highlighted = false,
}: PublicCommentItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState<NodeJSON | undefined>(comment.content);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const rowRef = useRef<HTMLDivElement>(null);

	const isBlocked = !!comment.createdBy && !!blockedUserIds?.has(comment.createdBy.id);

	const isGithub = comment.source === "github";
	const isTeam = !isGithub && !!memberTeamName;
	const showAuthorPill = !isGithub && isAuthor;
	const authorName =
		isGithub && comment.externalAuthorLogin
			? comment.externalAuthorLogin
			: comment.createdBy
				? getDisplayName(comment.createdBy)
				: "Anonymous";
	const reactions = comment.reactions?.reactions;

	const isOwnComment = !!currentUserId && comment.createdBy?.id === currentUserId;
	const canSave = !!editedContent && editedContent !== comment.content;

	// Opened from this comment's link: bring it into view and keep it there while the post above finishes loading.
	useScrollIntoViewWhileSettling(rowRef, highlighted);

	const handleCopyLink = useCallback(async () => {
		if (!commentLink) return;
		try {
			await navigator.clipboard.writeText(commentLink);
			headlessToast.success({ title: "Link copied" });
		} catch {
			headlessToast.error({ title: "Could not copy the link" });
		}
	}, [commentLink]);

	const handleSave = useCallback(async () => {
		if (!editedContent || !canSave || !onEdit) return;
		setIsSaving(true);
		const success = await onEdit(comment.id, editedContent);
		setIsSaving(false);
		if (success) {
			setIsEditing(false);
		}
	}, [editedContent, canSave, onEdit, comment.id]);

	const handleCancel = useCallback(() => {
		setEditedContent(comment.content);
		setIsEditing(false);
	}, [comment.content]);

	const handleDelete = useCallback(async () => {
		if (!onDelete) return;
		setIsDeleting(true);
		const success = await onDelete(comment.id);
		setIsDeleting(false);
		if (success) {
			setDeleteDialogOpen(false);
		}
	}, [onDelete, comment.id]);

	// Non-members should not see blocked users' comments at all
	if (isBlocked && !isOrgMember) {
		return null;
	}

	const canManage = isOwnComment && (!!onEdit || !!onDelete);
	const hasReactions = !!reactions && Object.values(reactions).some((info) => info.count > 0);
	// A comment that already shows "N replies" needs no separate Reply action.
	const showReply = !!onReply && !isReply && (comment.replyCount ?? 0) === 0;
	const showActions = !isEditing && (showReply || !!commentLink || canManage);
	const myReactions = Object.entries(reactions ?? {})
		.filter(([, info]) => !!currentUserId && info.users.includes(currentUserId))
		.map(([emoji]) => emoji as ReactionEmoji);

	return (
		<>
			<div
				ref={rowRef}
				id={`comment-${comment.id}`}
				className={cn(
					"group/comment -mx-2 flex gap-2.5 rounded-lg px-2 py-1.5",
					comment.visibility === "internal" && "bg-primary/5 ring-1 ring-primary/30",
					highlighted && "bg-accent ring-2 ring-primary/60"
				)}
			>
				<Avatar className={cn("mt-0.5", isReply ? "size-5" : "size-6")}>
					{!isGithub && comment.createdBy?.image ? (
						<AvatarImage src={ensureCdnUrl(comment.createdBy.image)} alt={authorName} />
					) : null}
					<AvatarFallback className="text-xs font-semibold">{getInitials(authorName)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex min-h-6 items-start gap-2">
						<div className="flex min-h-6 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
							{isGithub && comment.externalAuthorUrl ? (
								<a
									href={comment.externalAuthorUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="font-semibold text-sm text-foreground hover:underline"
								>
									{authorName}
								</a>
							) : (
								<b className="font-semibold text-sm text-foreground">{authorName}</b>
							)}
							{showAuthorPill && <Pill variant="author" />}
							{isTeam && <Pill variant="team" />}
							{isGithub && <Pill variant="gh" />}
							{isBlocked && isOrgMember && (
								<span className="inline-flex h-[22px] items-center gap-1 rounded-md bg-destructive/15 px-2 font-semibold text-destructive text-xs">
									<IconBan aria-hidden className="size-3" />
									Blocked user
								</span>
							)}
							<time dateTime={comment.createdAt} className="text-[13px] text-muted-foreground">
								{formatDateTimeFromNow(comment.createdAt)}
							</time>
							{comment.updatedAt && comment.updatedAt !== comment.createdAt && (
								<span className="text-[13px] text-muted-foreground italic">(edited)</span>
							)}
							{comment.visibility === "internal" && (
								<Tooltip>
									<TooltipTrigger
										render={
											<span className="inline-flex items-center text-muted-foreground">
												<IconLock aria-hidden className="size-3.5" />
												<span className="sr-only">Internal comment</span>
											</span>
										}
									/>
									<TooltipContent>Internal comment. Only team members can see it.</TooltipContent>
								</Tooltip>
							)}
						</div>

						{showActions && (
							<div className="flex shrink-0 items-center gap-1 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover/comment:opacity-100 md:has-data-popup-open:opacity-100">
								{showReply && (
									<Tooltip>
										<TooltipTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													aria-label="Reply"
													className="aspect-square h-auto w-auto p-1"
													onClick={onReply}
												>
													<IconMessage size={16} />
												</Button>
											}
										/>
										<TooltipContent>Reply</TooltipContent>
									</Tooltip>
								)}
								{(commentLink || canManage) && (
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													aria-label="Comment actions"
													className="aspect-square h-auto w-auto p-1 data-popup-open:bg-accent"
												>
													<IconDots size={16} />
												</Button>
											}
										/>
										<DropdownMenuContent align="end">
											{commentLink && (
												<DropdownMenuItem onClick={handleCopyLink}>
													<IconLink size={16} />
													Copy link
												</DropdownMenuItem>
											)}
											{commentLink && canManage && <DropdownMenuSeparator />}
											{isOwnComment && onEdit && (
												<DropdownMenuItem onClick={() => setIsEditing(true)}>
													<IconPencil size={16} />
													Edit
												</DropdownMenuItem>
											)}
											{isOwnComment && onDelete && (
												<DropdownMenuItem
													onClick={() => setDeleteDialogOpen(true)}
													className="text-destructive focus:text-destructive"
												>
													<IconTrash size={16} />
													Delete
												</DropdownMenuItem>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
						)}
					</div>

					{isEditing ? (
						<>
							<div className="overflow-hidden rounded-lg border bg-background p-3 focus-within:border-ring">
								<Suspense fallback={<Skeleton className="h-16" />}>
									<Editor
										defaultContent={comment.content}
										categories={categories}
										tasks={tasks}
										onChange={setEditedContent}
										submit={handleSave}
										hideBlockHandle
									/>
								</Suspense>
							</div>
							<div className="mt-2 flex items-center justify-end gap-2">
								<Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
									<IconX aria-hidden />
									Cancel
								</Button>
								<Button size="sm" onClick={handleSave} disabled={isSaving || !canSave}>
									<IconCheck aria-hidden />
									{isSaving ? "Saving..." : "Update comment"}
								</Button>
							</div>
						</>
					) : (
						comment.content && (
							<div className={COMMENT_PROSE}>
								<Suspense fallback={<Skeleton className="h-4 w-3/4" />}>
									<Editor readonly={true} defaultContent={comment.content} tasks={tasks} hideBlockHandle />
								</Suspense>
							</div>
						)
					)}

					{!isEditing && (hasReactions || onToggleReaction) && (
						<div className="mt-1 flex flex-wrap items-center gap-1">
							<CommentReactions
								className="contents"
								reactions={reactions}
								onToggle={onToggleReaction ? (emoji) => onToggleReaction(comment.id, emoji) : undefined}
								users={users}
								currentUserId={currentUserId}
							/>
							{onToggleReaction && (
								<div className="flex transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover/comment:opacity-100 md:has-data-popup-open:opacity-100">
									<ReactionPicker
										onSelect={(emoji) => onToggleReaction(comment.id, emoji)}
										existingReactions={myReactions}
									/>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
			{footer && <div className="pl-8.5">{footer}</div>}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle asChild>
							<Label variant="heading">Delete comment?</Label>
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the comment.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<IconLoader2 className="mr-1 size-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
