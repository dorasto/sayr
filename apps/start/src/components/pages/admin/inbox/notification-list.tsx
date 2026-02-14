import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { IconChecks } from "@tabler/icons-react";
import { useInbox } from "@/contexts/ContextInbox";
import {
  archiveNotificationAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "@/lib/fetches/notification";
import { NotificationEmptyState } from "./notifications/notification-empty-state";
import { NotificationItem } from "./notifications/notification-item";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  onSelectTask: (taskId: string, orgId: string) => void;
  selectedTaskId: string | null;
}

export function NotificationList({
  onSelectTask,
  selectedTaskId,
}: NotificationListProps) {
  const {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    refreshNotifications,
  } = useInbox();

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

  const handleMarkUnread = async (notificationId: string) => {
    // Optimistic update
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification?.read) {
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: false } : n,
        ),
      );
      setUnreadCount(unreadCount + 1);
    }

    const result = await markNotificationUnreadAction(notificationId);
    if (!result.success) {
      // Revert on failure
      refreshNotifications();
    }
  };

  const handleDelete = async (notificationId: string) => {
    // Optimistic update — remove from list
    const prev = notifications;
    setNotifications(notifications.filter((n) => n.id !== notificationId));
    const wasUnread = prev.find((n) => n.id === notificationId && !n.read);
    if (wasUnread) setUnreadCount(Math.max(0, unreadCount - 1));

    const result = await deleteNotificationAction(notificationId);
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
            {/*{unreadCount > 0 && (*/}
            <Badge
              variant={"outline"}
              className={cn(unreadCount === 0 && "opacity-0")}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
            {/*)}*/}
          </Label>
          {/*{unreadCount > 0 && (*/}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1",
              unreadCount === 0 && "opacity-0",
            )}
            onClick={handleMarkAllRead}
          >
            <IconChecks className="size-3.5" />
            Mark all read
          </Button>
          {/*)}*/}
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-1">
          {notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedTaskId === notification.task.id}
                onClick={() => handleClick(notification)}
                onMarkRead={() => handleMarkRead(notification.id)}
                onMarkUnread={() => handleMarkUnread(notification.id)}
                onArchive={() => handleArchive(notification.id)}
                onDelete={() => handleDelete(notification.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
