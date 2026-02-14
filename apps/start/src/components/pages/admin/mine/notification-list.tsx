import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { IconChecks } from "@tabler/icons-react";
import { useMyTasks } from "@/contexts/ContextMine";
import {
	archiveNotificationAction,
	markAllNotificationsReadAction,
	markNotificationReadAction,
} from "@/lib/fetches/notification";
import { NotificationItem } from "./notifications/notification-item";
import { NotificationEmptyState } from "./notifications/notification-empty-state";

interface NotificationListProps {
	onSelectTask: (taskId: string, orgId: string) => void;
	selectedTaskId: string | null;
}

export function NotificationList({ onSelectTask, selectedTaskId }: NotificationListProps) {
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
						<NotificationEmptyState />
					) : (
						notifications.map((notification) => (
						<NotificationItem
							key={notification.id}
							notification={notification}
							isSelected={selectedTaskId === notification.task.id}
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
