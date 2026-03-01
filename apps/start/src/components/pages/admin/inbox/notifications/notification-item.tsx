import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArchive,
  IconBell,
  IconBellFilled,
  IconBellRinging,
  IconCheck,
  IconCircle,
  IconCircleFilled,
  IconExternalLink,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { notificationTypeConfig } from "./notification-type-config";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@repo/ui/context-menu";
import { formatDateCompact, formatDateTimeFromNow } from "@repo/util";

export interface NotificationItemProps {
  notification: schema.NotificationWithDetails;
  isSelected: boolean;
  onClick: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onOpenInNewTab?: () => void;
}

export function NotificationItem({
  notification,
  isSelected,
  onClick,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onOpenInNewTab,
}: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type] ?? {
    label: "updated",
    icon: (cls: string) => <IconBellRinging className={cls} />,
  };
  const actorName =
    notification.actor?.displayName || notification.actor?.name || "Someone";
  const status =
    statusConfig[notification.task.status as keyof typeof statusConfig];
  const priority =
    priorityConfig[notification.task.priority as keyof typeof priorityConfig];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex flex-col gap-1.5 p-3 text-left hover:bg-accent transition-colors rounded-lg text-muted-foreground group relative",
            isSelected && "bg-secondary hover:bg-secondary text-foreground",
            !isSelected &&
              !notification.read &&
              "bg-primary/5 hover:bg-primary/10 text-foreground",
          )}
        >
          {/* Unread dot */}
          {/*{!notification.read && (
            <span className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
          )}*/}

          {/* Row 1: Org badge + shortId + type icon + status/priority + actor avatar */}
          <div className="flex items-center flex-1 gap-1">
            {notification.organization && (
              <InlineLabel
                className="shrink ps-6 truncate text-inherit"
                icon={
                  <Avatar className="h-4 w-4">
                    <AvatarImage
                      src={notification.organization.logo || ""}
                      alt={notification.organization.name}
                    />
                    <AvatarFallback className="rounded-md uppercase text-xs">
                      <IconUsers className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                }
                text={notification.organization.name}
              />
            )}

            {notification.task.shortId && (
              <span className="text-xs text-muted-foreground">
                #{notification.task.shortId}
              </span>
            )}

            {/* Meta icons pushed right */}
            <div className="flex items-center gap-2 text-xs ml-auto shrink-0">
              {config.icon("size-3.5 text-muted-foreground/60")}
              {status && (
                <div className="flex items-center gap-1">
                  {status.icon(cn(status.className, "size-4"))}
                </div>
              )}
              {priority && notification.task.priority === "urgent" && (
                <div className="flex items-center gap-1">
                  {priority.icon(cn(priority.className, "size-4"))}
                </div>
              )}
              {!notification.read && (
                <IconBellFilled className="size-4 text-primary" />
              )}
            </div>
          </div>

          {/* Row 2: Action text + task title */}
          <div className="flex items-center gap-1 justify-between">
            <p className="text-xs font-medium line-clamp-1">
              <span className="text-inherit font-normal">
                {actorName} {config.label}
              </span>
            </p>
            <p className="text-xs font-medium line-clamp-1">
              <span className="text-inherit font-normal ml-auto">
                {formatDateTimeFromNow(notification.createdAt as Date)}
              </span>
            </p>
          </div>

          {/* Action buttons (visible on hover) */}
          {/*<div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-accent rounded-md p-0.5">
            {!notification.read && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Mark as read"
              >
                <IconCheck className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Archive"
            >
              <IconArchive className="size-3.5" />
            </button>
          </div>*/}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onOpenInNewTab && (
          <ContextMenuItem onClick={onOpenInNewTab}>
            <IconExternalLink className="size-4 mr-2" />
            Open in new tab
          </ContextMenuItem>
        )}
        {onOpenInNewTab && <ContextMenuSeparator />}
        {notification.read ? (
          <ContextMenuItem onClick={onMarkUnread}>
            <IconCircle className="size-4 mr-2" />
            Mark as unread
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={onMarkRead}>
            <IconCheck className="size-4 mr-2" />
            Mark as read
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={onArchive}>
          <IconArchive className="size-4 mr-2" />
          Archive
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <IconTrash className="size-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
