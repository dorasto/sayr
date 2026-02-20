import { Store } from "@tanstack/react-store";
import { getUnreadNotificationCount } from "@/lib/fetches/notification";

export interface NotificationStoreState {
	unreadCount: number;
	lastFetchedAt: number;
}

export const notificationStore = new Store<NotificationStoreState>({
	unreadCount: 0,
	lastFetchedAt: 0,
});

export const notificationActions = {
	/** Fetch the unread count from the server and update the store. */
	refresh: async () => {
		try {
			const result = await getUnreadNotificationCount();
			if (result.success) {
				notificationStore.setState((state) => ({
					...state,
					unreadCount: result.data.count,
					lastFetchedAt: Date.now(),
				}));
			}
		} catch {
			// Non-critical
		}
	},

	/** Increment the unread count (e.g. on NEW_NOTIFICATION). */
	increment: () => {
		notificationStore.setState((state) => ({
			...state,
			unreadCount: state.unreadCount + 1,
		}));
	},

	/** Decrement the unread count (e.g. on single NOTIFICATION_READ). */
	decrement: () => {
		notificationStore.setState((state) => ({
			...state,
			unreadCount: Math.max(0, state.unreadCount - 1),
		}));
	},

	/** Mark all as read. */
	markAllRead: () => {
		notificationStore.setState((state) => ({
			...state,
			unreadCount: 0,
		}));
	},

	/** Set a specific count. */
	setCount: (count: number) => {
		notificationStore.setState((state) => ({
			...state,
			unreadCount: count,
		}));
	},
};
