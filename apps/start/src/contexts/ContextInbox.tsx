import type { schema, TeamPermissions } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getNotifications, getUnreadNotificationCount } from "@/lib/fetches/notification";
import { notificationActions } from "@/lib/stores/notification-store";

const NOTIFICATION_PAGE_SIZE = 20;

interface InboxContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: InboxContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: InboxContextType["labels"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: InboxContextType["categories"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: InboxContextType["releases"]) => void;
	notifications: schema.NotificationWithDetails[];
	setNotifications: (newValue: schema.NotificationWithDetails[]) => void;
	unreadCount: number;
	setUnreadCount: (count: number) => void;
	refreshNotifications: () => Promise<void>;
	hasMoreNotifications: boolean;
	isLoadingMoreNotifications: boolean;
	loadMoreNotifications: () => Promise<void>;
	permissionsByOrg: Record<string, TeamPermissions>;
}

const InboxContext = createContext<InboxContextType | undefined>(undefined);

export function RootProviderInbox({
	children,
	tasks,
	labels,
	categories,
	releases,
	permissionsByOrg,
}: {
	children: ReactNode;
	tasks: InboxContextType["tasks"];
	labels: InboxContextType["labels"];
	categories: InboxContextType["categories"];
	releases: InboxContextType["releases"];
	permissionsByOrg: InboxContextType["permissionsByOrg"];
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement("inbox-tasks", tasks, 30000);
	const { value: newLabels, setValue: setLabels } = useStateManagement("inbox-labels", labels, 30000);
	const { value: newCategories, setValue: setCategories } = useStateManagement("inbox-categories", categories, 30000);
	const { value: newReleases, setValue: setReleases } = useStateManagement("inbox-releases", releases, 30000);

	// Notification state
	const [notifications, setNotifications] = useState<schema.NotificationWithDetails[]>([]);
	const [unreadCount, _setUnreadCount] = useState(0);
	const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
	const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
	const isLoadingMoreRef = useRef(false);

	// Wrap setUnreadCount to sync with the global notification store
	const setUnreadCount = useCallback((count: number) => {
		_setUnreadCount(count);
		notificationActions.setCount(count);
	}, []);

	const refreshNotifications = useCallback(async () => {
		try {
			const [notifResult, countResult] = await Promise.all([
				getNotifications({ limit: NOTIFICATION_PAGE_SIZE }),
				getUnreadNotificationCount(),
			]);
			if (notifResult.success) {
				setNotifications(notifResult.data);
				setHasMoreNotifications(notifResult.data.length === NOTIFICATION_PAGE_SIZE);
			}
			if (countResult.success) {
				_setUnreadCount(countResult.data.count);
				notificationActions.setCount(countResult.data.count);
			}
		} catch {
			// Notification fetch failures are non-critical
		}
	}, []);

	const loadMoreNotifications = useCallback(async () => {
		if (isLoadingMoreRef.current || !hasMoreNotifications) return;
		isLoadingMoreRef.current = true;
		setIsLoadingMoreNotifications(true);

		try {
			const result = await getNotifications({
				limit: NOTIFICATION_PAGE_SIZE,
				offset: notifications.length,
			});
			if (result.success) {
				setNotifications((prev) => [...prev, ...result.data]);
				setHasMoreNotifications(result.data.length === NOTIFICATION_PAGE_SIZE);
			}
		} catch {
			// Load-more failures are non-critical
		} finally {
			isLoadingMoreRef.current = false;
			setIsLoadingMoreNotifications(false);
		}
	}, [hasMoreNotifications, notifications.length]);

	// Sync props -> state
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setCategories(categories), [categories, setCategories]);
	useEffect(() => setReleases(releases), [releases, setReleases]);

	// Fetch notifications on mount
	useEffect(() => {
		refreshNotifications();
	}, [refreshNotifications]);

	return (
		<InboxContext.Provider
			value={{
				tasks: newTasks,
				setTasks,
				labels: newLabels,
				setLabels,
				categories: newCategories,
				setCategories,
				releases: newReleases,
				setReleases,
				notifications,
				setNotifications,
				unreadCount,
				setUnreadCount,
				refreshNotifications,
				hasMoreNotifications,
				isLoadingMoreNotifications,
				loadMoreNotifications,
				permissionsByOrg,
			}}
		>
			{children}
		</InboxContext.Provider>
	);
}

export function useInbox() {
	const context = useContext(InboxContext);
	if (context === undefined) {
		throw new Error("useInbox must be used within a RootProviderInbox");
	}
	return context;
}
