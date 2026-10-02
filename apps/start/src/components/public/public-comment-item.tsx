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
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDateTimeFromNow, getDisplayName, getInitials } from "@repo/util";
import {
	IconArrowBackUp,
	IconBan,
	IconCheck,
	IconDots,
	IconLoader2,
	IconMoodPlus,
	IconPencil,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useState } from "react";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import { Pill } from "@/components/public/portal/ui/Pill";
import { REACTION_OPTIONS, type ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import type { PublicCommentItemProps } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

type ReactionMap = Record<string, { count: number; users: string[] }>;

const REACTION_CHIP =
	"relative inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-medium text-[12.5px] outline-none after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] md:after:hidden transition-colors";

function reactorsTitle(info: { count: number; users: string[] }, users?: schema.userType[]): string {
	const names = info.users
		.map((id) => users?.find((user) => user.id === id))
		.filter((user): user is schema.userType => !!user)
		.map((user) => getDisplayName(user));
	if (names.length === 0) return `${info.count} ${info.count === 1 ? "person" : "people"} reacted`;
	const shown = names.slice(0, 5).join(", ");
	return names.length > 5 ? `${shown} and ${names.length - 5} more` : shown;
}

/**
 * Reaction chips for a comment (28px pills, primary-tinted when the viewer reacted) plus an add-reaction picker using
 * the same emoji set as everywhere else (`REACTION_OPTIONS`). Omit `onToggle` when the viewer cannot react (logged
 * out, or public actions are off): chips render read-only.
 */
function CommentReactions({
	reactions,
	onToggle,
	users,
	currentUserId,
}: {
	reactions?: ReactionMap;
	onToggle?: (emoji: ReactionEmoji) => void;
	users?: schema.userType[];
	currentUserId?: string;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const entries = Object.entries(reactions ?? {}).filter(([, info]) => info.count > 0);
	const reacted = (info: { users: string[] }) => !!currentUserId && info.users.includes(currentUserId);

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{entries.map(([emoji, info]) =>
				onToggle ? (
					<button
						key={emoji}
						type="button"
						aria-pressed={reacted(info)}
						title={reactorsTitle(info, users)}
						onClick={() => onToggle(emoji as ReactionEmoji)}
						className={cn(
							REACTION_CHIP,
							reacted(info)
								? "border-primary/50 bg-primary/15 text-primary"
								: "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
						)}
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</button>
				) : (
					<span
						key={emoji}
						title={reactorsTitle(info, users)}
						className={cn(REACTION_CHIP, "border-border text-muted-foreground")}
					>
						<span className="text-sm leading-none">{emoji}</span>
						{info.count}
					</span>
				)
			)}
			{onToggle && (
				<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
					<PopoverTrigger
						aria-label="Add reaction"
						className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-transparent after:absolute after:-inset-2 after:content-[''] md:after:hidden text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
					>
						<IconMoodPlus aria-hidden className="size-4" />
					</PopoverTrigger>
					<PopoverContent className="w-auto p-1" align="start" sideOffset={4}>
						<div className="grid grid-cols-4 gap-1">
							{REACTION_OPTIONS.map(({ emoji, label }) => (
								<button
									key={emoji}
									type="button"
									aria-label={label}
									onClick={() => {
										onToggle(emoji);
										setPickerOpen(false);
									}}
									className={cn(
										"flex size-9 cursor-pointer items-center justify-center rounded-md text-lg max-md:size-11 transition-colors hover:bg-accent focus-visible:bg-accent",
										reacted(reactions?.[emoji] ?? { users: [] }) && "bg-accent"
									)}
								>
									{emoji}
								</button>
							))}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}

/**
 * One comment or reply: 32px avatar, name, Author/Team pills, time, body,
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
					comment.visibility === "internal" && "rounded-lg border border-primary/50 bg-primary/15 p-3"
				)}
			>
				<Avatar className={cn("mt-0.5", isReply ? "size-7" : "size-8")}>
					{!isGithub && comment.createdBy?.image ? (
						<AvatarImage src={ensureCdnUrl(comment.createdBy.image)} alt={authorName} />
					) : null}
					<AvatarFallback className="text-xs font-semibold">{getInitials(authorName)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
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

						{showMenu && (
							<div className="ml-auto opacity-100 transition-opacity has-data-popup-open:opacity-100 md:opacity-0 md:group-hover/comment:opacity-100 md:focus-within:opacity-100">
								<DropdownMenu>
									<DropdownMenuTrigger
										aria-label="Comment actions"
										className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none after:absolute after:-inset-2 after:content-[''] md:after:hidden transition-colors hover:bg-accent hover:text-foreground data-popup-open:bg-accent"
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

					{showActionsRow && (
						<div className="mt-2.5 flex flex-wrap items-center gap-1.5">
							<CommentReactions
								reactions={reactions}
								onToggle={onToggleReaction ? (emoji) => onToggleReaction(comment.id, emoji) : undefined}
								users={users}
								currentUserId={currentUserId}
							/>
							{onReply && !isReply && (
								<button
									type="button"
									onClick={onReply}
									className="relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-[12.5px] text-muted-foreground outline-none after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] md:after:hidden transition-colors hover:bg-accent hover:text-foreground"
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
