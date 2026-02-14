import type { schema } from "@repo/database";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useInbox } from "@/contexts/ContextInbox";
import {
	archiveNotificationAction,
	deleteNotificationAction,
	markNotificationReadAction,
	markNotificationUnreadAction,
} from "@/lib/fetches/notification";
import { NotificationEmptyState } from "./notifications/notification-empty-state";
import { NotificationItem } from "./notifications/notification-item";

interface NotificationListProps {
	onSelectTask: (taskId: string, orgId: string) => void;
	selectedTaskId: string | null;
}

export function NotificationList({ onSelectTask, selectedTaskId }: NotificationListProps) {
	const { notifications, setNotifications, unreadCount, setUnreadCount, refreshNotifications } = useInbox();

	const handleMarkRead = async (notificationId: string) => {
		setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
		setUnreadCount(Math.max(0, unreadCount - 1));

		const result = await markNotificationReadAction(notificationId);
		if (!result.success) {
			refreshNotifications();
		}
	};

	const handleArchive = async (notificationId: string) => {
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
		const notification = notifications.find((n) => n.id === notificationId);
		if (notification?.read) {
			setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, read: false } : n)));
			setUnreadCount(unreadCount + 1);
		}

		const result = await markNotificationUnreadAction(notificationId);
		if (!result.success) {
			refreshNotifications();
		}
	};

	const handleDelete = async (notificationId: string) => {
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
