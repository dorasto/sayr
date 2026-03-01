import type { schema } from "@repo/database";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useCallback, useEffect, useRef } from "react";
import { useInbox } from "@/contexts/ContextInbox";
import {
	archiveNotificationAction,
	deleteNotificationAction,
	markNotificationReadAction,
	markNotificationUnreadAction,
} from "@/lib/fetches/notification";
import { NotificationEmptyState } from "./notifications/notification-empty-state";
import { NotificationItem } from "./notifications/notification-item";

function NotificationSkeleton() {
	return (
		<div className="flex flex-col gap-1.5 p-3 rounded-lg">
			<div className="flex items-center gap-2">
				<Skeleton className="size-5 rounded-full" />
				<Skeleton className="h-3.5 w-24" />
				<Skeleton className="h-3.5 w-10 ml-auto" />
			</div>
			<Skeleton className="h-3 w-48" />
		</div>
	);
}

interface NotificationListProps {
	onSelectTask: (taskId: string, orgId: string, notificationId: string) => void;
	selectedNotificationId: string | null;
}

export function NotificationList({ onSelectTask, selectedNotificationId }: NotificationListProps) {
	const {
		notifications,
		setNotifications,
		unreadCount,
		setUnreadCount,
		refreshNotifications,
		hasMoreNotifications,
		isLoadingMoreNotifications,
		loadMoreNotifications,
	} = useInbox();

	const sentinelRef = useRef<HTMLDivElement>(null);

	const handleLoadMore = useCallback(() => {
		if (hasMoreNotifications && !isLoadingMoreNotifications && notifications.length > 0) {
			loadMoreNotifications();
		}
	}, [hasMoreNotifications, isLoadingMoreNotifications, notifications.length, loadMoreNotifications]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					handleLoadMore();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [handleLoadMore]);

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
		onSelectTask(notification.task.id, notification.organizationId, notification.id);
	};

	return (
		<div className="flex flex-col h-full min-h-0">
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-1 p-1">
					{notifications.length === 0 && !isLoadingMoreNotifications ? (
						<NotificationEmptyState />
					) : (
						<>
							{notifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									isSelected={selectedNotificationId === notification.id}
									onClick={() => handleClick(notification)}
									onMarkRead={() => handleMarkRead(notification.id)}
									onMarkUnread={() => handleMarkUnread(notification.id)}
									onArchive={() => handleArchive(notification.id)}
									onDelete={() => handleDelete(notification.id)}
								/>
							))}
							{isLoadingMoreNotifications && (
								<>
									<NotificationSkeleton />
									<NotificationSkeleton />
									<NotificationSkeleton />
								</>
							)}
							{hasMoreNotifications && <div ref={sentinelRef} className="h-1" />}
						</>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
