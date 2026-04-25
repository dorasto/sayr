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
import { cn } from "@repo/ui/lib/utils";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
  IconCheck,
  IconDots,
  IconLoader2,
  IconLock,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import {
  ReactionDisplay,
  ReactionPicker,
  type ReactionEmoji,
} from "@/components/tasks/task/timeline/reactions";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export interface CommentItemData {
  id: string;
  createdBy?: schema.UserSummary | null;
  createdAt?: Date | string | null;
  content?: schema.NodeJSON | null;
  visibility?: "public" | "internal";
  reactions?: schema.ReleaseCommentWithAuthor["reactions"];
}

interface CommentItemProps {
  comment: CommentItemData;
  availableUsers: schema.UserSummary[];
  isOwn: boolean;
  canManage: boolean;
  currentUserId?: string;
  onEdit?: (id: string, content: schema.NodeJSON) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  onReactionToggle?: (id: string, emoji: ReactionEmoji) => void;
  className?: string;
}

export function CommentItem({
  comment,
  availableUsers,
  isOwn,
  canManage,
  currentUserId,
  onEdit,
  onDelete,
  onReactionToggle,
  className,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(
    comment.content ?? undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorName = comment.createdBy
    ? getDisplayName(comment.createdBy)
    : "Unknown";

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

  const existingReactions: ReactionEmoji[] = currentUserId
    ? (Object.entries(comment.reactions?.reactions ?? {})
        .filter(([, data]) => data.users.includes(currentUserId))
        .map(([emoji]) => emoji) as ReactionEmoji[])
    : [];

  return (
    <>
      <div
        className={cn(
          "flex flex-col group/comment-item pt-2 rounded-xl",
          comment.visibility === "internal" &&
            "bg-internal px-1 border border-internal-border",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <InlineLabel
            text={authorName}
            image={comment.createdBy?.image ?? ""}
            avatarClassName="size-5!"
            textNode={
              <div className="flex items-center gap-2 pl-2">
                <Label
                  className="text-xs text-foreground"
                  variant="description"
                >
                  {authorName}
                </Label>
                {comment.createdAt && (
                  <Label
                    variant="description"
                    className="text-muted-foreground"
                  >
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
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/comment-item:opacity-100 has-data-[state=open]:opacity-100 transition-all">
            {onReactionToggle && !isEditing && (
              <ReactionPicker
                onSelect={(e) => onReactionToggle(comment.id, e)}
                existingReactions={existingReactions}
              />
            )}
            {(isOwn || canManage) && !isEditing && (
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
                  {onEdit && isOwn && (
                    <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                      <IconPencil size={16} /> Edit
                    </DropdownMenuItem>
                  )}
                  {onEdit && onDelete && <DropdownMenuSeparator />}
                  {(isOwn || canManage) && onDelete && (
                    <DropdownMenuItem
                      onSelect={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
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
            <Suspense
              fallback={<div className="h-10 animate-pulse bg-muted rounded" />}
            >
              <Editor
                defaultContent={comment.content ?? undefined}
                onChange={setEditContent}
                hideBlockHandle
                mentionViewUsers={availableUsers}
              />
            </Suspense>
            <div className="flex gap-2 justify-end mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="text-muted-foreground"
              >
                <IconX size={14} /> Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <IconCheck size={14} /> {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        ) : (
          comment.content && (
            <Suspense
              fallback={
                <div className="h-4 animate-pulse bg-muted rounded w-3/4" />
              }
            >
              <Editor
                readonly
                defaultContent={comment.content}
                hideBlockHandle
                mentionViewUsers={availableUsers}
                className="pl-1"
              />
            </Suspense>
          )
        )}

        {/* Reaction display — shown when reactions exist, below content */}
        {!isEditing &&
          onReactionToggle &&
          (comment.reactions?.total ?? 0) > 0 && (
            <div className="mt-1 pl-1">
              <ReactionDisplay
                reactions={comment.reactions?.reactions}
                toggleReaction={(e) => onReactionToggle(comment.id, e)}
                currentUserId={currentUserId}
              />
            </div>
          )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Label variant="heading">Delete comment?</Label>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
                <IconLoader2 className="animate-spin size-4" />
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
