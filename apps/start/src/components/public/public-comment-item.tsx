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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
  IconBan,
  IconCheck,
  IconDots,
  IconLoader2,
  IconMessage,
  IconPencil,
  IconShieldCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useState } from "react";
import {
  ReactionDisplay,
  ReactionPicker,
  type ReactionEmoji,
} from "@/components/tasks/task/timeline/reactions";
import type { PublicCommentItemProps } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export function PublicCommentItem({
  comment,
  memberTeamName,
  onToggleReaction,
  users,
  currentUserId,
  onEdit,
  onDelete,
  categories,
  footer,
  isReply,
  onReply,
  blockedUserIds,
  isOrgMember,
}: PublicCommentItemProps) {
  const isBlocked =
    !!comment.createdBy && !!blockedUserIds?.has(comment.createdBy.id);

  const authorName = comment.createdBy
    ? getDisplayName(comment.createdBy)
    : "Anonymous";
  const reactions = comment.reactions?.reactions;
  const hasReactions = reactions && Object.keys(reactions).length > 0;

  const isOwnComment =
    !!currentUserId && comment.createdBy?.id === currentUserId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<NodeJSON | undefined>(
    comment.content,
  );
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

  return (
    <>
      <div
        className={cn(
          "rounded-xl bg-muted border",
          isReply
            ? "p-2 border-0 bg-transparent group/public-reply"
            : "p-3 group/public-comment",
          comment.visibility === "internal" && "border-primary/30 bg-primary/5",
        )}
      >
        <div className="flex gap-3">
          <Avatar
            className={cn("shrink-0 mt-0.5", isReply ? "size-6" : "size-8")}
          >
            <AvatarImage
              src={comment.createdBy?.image || ""}
              alt={authorName}
            />
            <AvatarFallback className="text-xs">
              {authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Label variant="description" className="text-sm font-medium">
                {authorName}
              </Label>
              {memberTeamName && (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs py-0 h-5 bg-primary/10 border-primary/20 text-primary"
                    >
                      <IconShieldCheck className="size-3" />
                      {memberTeamName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs">
                      This user is a member of {memberTeamName}.
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}
              {isBlocked && isOrgMember && (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs py-0 h-5 bg-destructive/10 border-destructive/20 text-destructive"
                    >
                      <IconBan className="size-3" />
                      Blocked user
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs">
                      This user has been blocked by an administrator.
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDateTimeFromNow(comment.createdAt)}
              </span>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-muted-foreground italic">
                  (edited)
                </span>
              )}

              {/* Inline actions — reaction picker + actions dropdown */}
              {!isEditing && (
                <div
                  className={cn(
                    "flex items-center gap-1 ml-auto opacity-0 has-data-[state=open]:opacity-100 transition-opacity",
                    isReply
                      ? "group-hover/public-reply:opacity-100"
                      : "group-hover/public-comment:opacity-100",
                  )}
                >
                  {onToggleReaction && (
                    <ReactionPicker
                      onSelect={(emoji) => onToggleReaction(comment.id, emoji)}
                      existingReactions={
                        currentUserId && reactions
                          ? (Object.entries(reactions)
                              .filter(([, data]) =>
                                data.users.includes(currentUserId),
                              )
                              .map(([emoji]) => emoji) as ReactionEmoji[])
                          : []
                      }
                    />
                  )}
                  {onReply && !isReply && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 h-auto w-auto aspect-square"
                      onClick={onReply}
                    >
                      <IconMessage size={16} />
                    </Button>
                  )}
                  {isOwnComment && (onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent"
                        >
                          <IconDots size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                            <IconPencil size={16} />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onEdit && onDelete && <DropdownMenuSeparator />}
                        {onDelete && (
                          <DropdownMenuItem
                            onSelect={() => setDeleteDialogOpen(true)}
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
                <Suspense
                  fallback={
                    <div className="h-16 animate-pulse bg-muted rounded" />
                  }
                >
                  <Editor
                    defaultContent={comment.content}
                    categories={categories}
                    onChange={setEditedContent}
                    submit={handleSave}
                    hideBlockHandle
                    mentionViewUsers={users}
                  />
                </Suspense>
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconX size={16} />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !canSave}
                  >
                    <IconCheck size={16} />
                    {isSaving ? "Saving..." : "Update comment"}
                  </Button>
                </div>
              </>
            ) : (
              comment.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Suspense
                    fallback={
                      <div className="h-4 animate-pulse bg-muted rounded w-3/4" />
                    }
                  >
                    <Editor
                      readonly={true}
                      defaultContent={comment.content}
                      hideBlockHandle
                      mentionViewUsers={users}
                    />
                  </Suspense>
                </div>
              )
            )}
          </div>
        </div>

        {/* Reactions + thread footer — full card width */}
        {hasReactions && (
          <div className="mt-1">
            {onToggleReaction ? (
              <ReactionDisplay
                reactions={reactions}
                toggleReaction={(emoji) => onToggleReaction(comment.id, emoji)}
                users={users}
                currentUserId={currentUserId}
              />
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
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
        )}
        {footer}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Label variant="heading">Delete comment?</Label>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              comment.
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
                  <IconLoader2 className="animate-spin size-4 mr-1" />
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
