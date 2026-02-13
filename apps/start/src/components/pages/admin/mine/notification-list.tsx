import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArchive,
  IconBell,
  IconCheck,
  IconChecks,
  IconMessage,
  IconStatusChange,
  IconUrgent,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useMyTasks } from "@/contexts/ContextMine";
import {
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/fetches/notification";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";

const notificationTypeConfig: Record<
  string,
  { label: string; icon: (className: string) => React.ReactNode }
> = {
  mention: {
    label: "mentioned you",
    icon: (cls) => <IconBell className={cls} />,
  },
  status_change: {
    label: "changed status",
    icon: (cls) => <IconStatusChange className={cls} />,
  },
  priority_change: {
    label: "changed priority",
    icon: (cls) => <IconUrgent className={cls} />,
  },
  assignee_added: {
    label: "assigned you",
    icon: (cls) => <IconUserPlus className={cls} />,
  },
  assignee_removed: {
    label: "unassigned you",
    icon: (cls) => <IconUserMinus className={cls} />,
  },
  comment: {
    label: "commented",
    icon: (cls) => <IconMessage className={cls} />,
  },
};

interface NotificationListProps {
  onSelectTask: (taskId: string, orgId: string) => void;
}

export function NotificationList({ onSelectTask }: NotificationListProps) {
  const {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    refreshNotifications,
  } = useMyTasks();

  const handleMarkRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    );
    setUnreadCount(Math.max(0, unreadCount - 1));

    const result = await markNotificationReadAction(notificationId);
    if (!result.success) {
      // Revert on failure
      refreshNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const result = await markAllNotificationsReadAction();
    if (!result.success) {
      refreshNotifications();
    }
  };

  const handleArchive = async (notificationId: string) => {
    // Optimistic update — remove from list
    const prev = notifications;
    setNotifications(notifications.filter((n) => n.id !== notificationId));
    const wasUnread = prev.find((n) => n.id === notificationId && !n.read);
    if (wasUnread) setUnreadCount(Math.max(0, unreadCount - 1));

    const result = await archiveNotificationAction(notificationId);
    if (!result.success) {
      refreshNotifications();
    }
  };

  const handleClick = async (notification: schema.NotificationWithDetails) => {
    if (!notification.read) {
      handleMarkRead(notification.id);
    }
    onSelectTask(notification.task.id, notification.organizationId);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-3 border-b bg-card">
        <div className="flex items-center gap-3 justify-between">
          <Label
            variant="heading"
            className="text-base flex items-center gap-2"
          >
            Inbox
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-5 text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Label>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleMarkAllRead}
            >
              <IconChecks className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <IconBell className="size-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-1">You're all caught up</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleClick(notification)}
                onMarkRead={() => handleMarkRead(notification.id)}
                onArchive={() => handleArchive(notification.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface NotificationItemProps {
  notification: schema.NotificationWithDetails;
  onClick: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  onArchive,
}: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type] ?? {
    label: "updated",
    icon: (cls: string) => <IconBell className={cls} />,
  };
  const actorName =
    notification.actor?.displayName || notification.actor?.name || "Someone";
  const status =
    statusConfig[notification.task.status as keyof typeof statusConfig];
  const priority =
    priorityConfig[notification.task.priority as keyof typeof priorityConfig];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 p-3 text-left hover:bg-accent transition-colors rounded-lg text-muted-foreground group relative",
        !notification.read && "bg-primary/5 hover:bg-primary/10",
      )}
    >
      {/* Unread dot */}
      {!notification.read && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}

      {/* Row 1: Org badge + shortId + type icon + status/priority + actor avatar */}
      <div className="flex items-center flex-1 gap-1">
        {notification.organization && (
          <InlineLabel
            className="shrink"
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
          {priority && notification.task.priority !== "none" && (
            <div className="flex items-center gap-1">
              {priority.icon(cn(priority.className, "size-4"))}
            </div>
          )}
          <Avatar className="size-5 shrink-0">
            <AvatarImage
              src={notification.actor?.image || ""}
              alt={actorName}
            />
            <AvatarFallback className="text-[10px] uppercase">
              {actorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Row 2: Action text + task title */}
      <p className="text-sm font-medium line-clamp-1 ps-1.5">
        <span className="text-muted-foreground font-normal">
          {actorName} {config.label}
        </span>{" "}
        {notification.task.title || "Untitled task"}
      </p>

      {/* Action buttons (visible on hover) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-accent rounded-md p-0.5">
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
      </div>
    </button>
  );
}
