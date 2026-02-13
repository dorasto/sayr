import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { getNotifications, getUnreadNotificationCount } from "@/lib/fetches/notification";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	views: schema.savedViewType[];
	setViews: (newValue: ContextType["views"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: ContextType["releases"]) => void;
	notifications: schema.NotificationWithDetails[];
	setNotifications: (newValue: schema.NotificationWithDetails[]) => void;
	unreadCount: number;
	setUnreadCount: (count: number) => void;
	refreshNotifications: () => Promise<void>;
	activeTab: "tasks" | "inbox";
	setActiveTab: (tab: "tasks" | "inbox") => void;
}

const MyTasksContext = createContext<ContextType | undefined>(undefined);

export function RootProviderMyTasks({
	children,
	tasks,
	labels,
	views,
	categories,
	releases,
	initialTab = "tasks",
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	releases: ContextType["releases"];
	initialTab?: "tasks" | "inbox";
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement("my-tasks", tasks, 30000);
	const { value: newLabels, setValue: setLabels } = useStateManagement("my-labels", labels, 30000);
	const { value: NewViews, setValue: setViews } = useStateManagement("my-views", views, 30000);
	const { value: NewCategories, setValue: setCategories } = useStateManagement("my-categories", categories, 30000);
	const { value: NewReleases, setValue: setReleases } = useStateManagement("my-releases", releases, 30000);

	// Notification state
	const [notifications, setNotifications] = useState<schema.NotificationWithDetails[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [activeTab, setActiveTab] = useState<"tasks" | "inbox">(initialTab);

	const refreshNotifications = useCallback(async () => {
		try {
			const [notifResult, countResult] = await Promise.all([
				getNotifications({ limit: 50 }),
				getUnreadNotificationCount(),
			]);
			if (notifResult.success) {
				setNotifications(notifResult.data);
			}
			if (countResult.success) {
				setUnreadCount(countResult.data.count);
			}
		} catch {
			// Notification fetch failures are non-critical
		}
	}, []);

	// Sync props → state
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setViews(views), [views, setViews]);
	useEffect(() => setCategories(categories), [categories, setCategories]);
	useEffect(() => setReleases(releases), [releases, setReleases]);

	// Fetch notifications on mount
	useEffect(() => {
		refreshNotifications();
	}, [refreshNotifications]);

	return (
		<MyTasksContext.Provider
			value={{
				tasks: newTasks,
				setTasks,
				labels: newLabels,
				setLabels,
				views: NewViews,
				setViews,
				categories: NewCategories,
				setCategories,
				releases: NewReleases,
				setReleases,
				notifications,
				setNotifications,
				unreadCount,
				setUnreadCount,
				refreshNotifications,
				activeTab,
				setActiveTab,
			}}
		>
			{children}
		</MyTasksContext.Provider>
	);
}

export function useMyTasks() {
	const context = useContext(MyTasksContext);
	if (context === undefined) {
		throw new Error("useMyTasks must be used within a RootProviderMyTasks");
	}
	return context;
}
