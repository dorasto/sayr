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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
	IconArrowBackUp,
	IconBan,
	IconCheck,
	IconDots,
	IconLoader2,
	IconPencil,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useState } from "react";
import { Pill } from "@/components/public/portal/ui/Pill";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import { PostReactions } from "@/components/public/portal/post/PostReactions";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import type { PublicCommentItemProps } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/**
 * One comment or reply: 32px avatar (ring for the post author and team members), name, Author/Team pills, time, body,
 * reactions + Reply. GitHub-origin comments show an initials avatar, the GitHub login (linked to the profile) and a
 * "via GitHub" pill, and never an Author/Team badge. Renders a plain `div`; wrap it in an `li` when it is part of a list.
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
}: PublicCommentItemProps) {
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

	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState<NodeJSON | undefined>(comment.content);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const canSave = !!editedContent && editedContent !== comment.content;

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

	const showMenu = !isEditing && isOwnComment && (onEdit || onDelete);
	const hasReactions = !!reactions && Object.values(reactions).some((info) => info.count > 0);
	const showActionsRow = !isEditing && (hasReactions || !!onToggleReaction || (!!onReply && !isReply));

	return (
		<>
			<div
				className={cn(
					"group/comment flex gap-3",
					comment.visibility === "internal" &&
						"rounded-portal-md border border-portal-accent-line bg-portal-accent-soft p-3"
				)}
			>
				<PortalAvatar
					name={authorName}
					image={isGithub ? null : comment.createdBy?.image}
					size={isReply ? 28 : 32}
					ring={isTeam || showAuthorPill}
					className="mt-0.5"
				/>
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
						{isGithub && comment.externalAuthorUrl ? (
							<a
								href={comment.externalAuthorUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="font-semibold text-sm text-portal-fg hover:underline"
							>
								{authorName}
							</a>
						) : (
							<b className="font-semibold text-sm text-portal-fg">{authorName}</b>
						)}
						{showAuthorPill && <Pill variant="author" />}
						{isTeam && <Pill variant="team" />}
						{isGithub && <Pill variant="gh" />}
						{isBlocked && isOrgMember && (
							<span className="inline-flex h-[22px] items-center gap-1 rounded-portal-tag bg-portal-bad-soft px-2 font-semibold text-portal-bad text-xs">
								<IconBan aria-hidden className="size-3" />
								Blocked user
							</span>
						)}
						<time dateTime={comment.createdAt} className="text-[13px] text-portal-fg-3">
							{formatDateTimeFromNow(comment.createdAt)}
						</time>
						{comment.updatedAt && comment.updatedAt !== comment.createdAt && (
							<span className="text-[13px] text-portal-fg-3 italic">(edited)</span>
						)}

						{showMenu && (
							<div className="ml-auto opacity-100 transition-opacity has-data-popup-open:opacity-100 md:opacity-0 md:group-hover/comment:opacity-100 md:focus-within:opacity-100">
								<DropdownMenu>
									<DropdownMenuTrigger
										aria-label="Comment actions"
										className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-portal-fg-3 outline-none after:absolute after:-inset-2 after:content-[''] md:after:hidden transition-colors hover:bg-portal-hover hover:text-portal-fg focus-visible:ring-2 focus-visible:ring-portal-focus data-popup-open:bg-portal-hover"
									>
										<IconDots aria-hidden className="size-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{onEdit && (
											<DropdownMenuItem onClick={() => setIsEditing(true)}>
												<IconPencil size={16} />
												Edit
											</DropdownMenuItem>
										)}
										{onEdit && onDelete && <DropdownMenuSeparator />}
										{onDelete && (
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
							</div>
						)}
					</div>

					{isEditing ? (
						<>
							<div className="overflow-hidden rounded-portal-md border border-portal-line-2 bg-portal-surface p-3 focus-within:border-portal-focus">
								<Suspense fallback={<div className="h-16 animate-pulse rounded bg-portal-raised" />}>
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
								<PortalButton variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
									<IconX aria-hidden />
									Cancel
								</PortalButton>
								<PortalButton variant="primary" size="sm" onClick={handleSave} disabled={isSaving || !canSave}>
									<IconCheck aria-hidden />
									{isSaving ? "Saving..." : "Update comment"}
								</PortalButton>
							</div>
						</>
					) : (
						comment.content && (
							<div className={COMMENT_PROSE}>
								<Suspense fallback={<div className="h-4 w-3/4 animate-pulse rounded bg-portal-raised" />}>
									<Editor readonly={true} defaultContent={comment.content} tasks={tasks} hideBlockHandle />
								</Suspense>
							</div>
						)
					)}

					{showActionsRow && (
						<div className="mt-2.5 flex flex-wrap items-center gap-1.5">
							<PostReactions
								reactions={reactions}
								onToggle={onToggleReaction ? (emoji) => onToggleReaction(comment.id, emoji) : undefined}
								users={users}
								currentUserId={currentUserId}
							/>
							{onReply && !isReply && (
								<button
									type="button"
									onClick={onReply}
									className="relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-[12.5px] text-portal-fg-3 outline-none after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] md:after:hidden transition-colors hover:bg-portal-hover hover:text-portal-fg focus-visible:ring-2 focus-visible:ring-portal-focus"
								>
									<IconArrowBackUp aria-hidden className="size-3.5" />
									Reply
								</button>
							)}
						</div>
					)}
					{footer}
				</div>
			</div>

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
