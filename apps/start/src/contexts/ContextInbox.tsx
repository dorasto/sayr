import { notificationActions } from "@/lib/stores/notification-store";
import type { schema, TeamPermissions } from "@repo/database";
import { useStateManagement, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

interface InboxContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: InboxContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: InboxContextType["labels"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: InboxContextType["categories"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: InboxContextType["releases"]) => void;
	notifications: {
		id: string
		type: string
		data: {
			taskId: string
			timelineEventId: string
		}
		delivered: boolean
		readAt: string
		createdAt: string
		updatedAt: string
		actor: {
			id: string
			name: string
			image: string
			displayName: string
		}
		recipient: {
			id: string
			name: string
			image: string
			displayName: string
		}
		organization: {
			id: string
			name: string
			slug: string
			logo: string
			shortId: string
		}
		task: {
			id: string
			shortId: number
			status: string
			priority: string
		}
		unread: boolean
	}[];
	unreadCount: number;
	refreshNotifications: () => void;
	hasMoreNotifications: boolean;
	isLoadingMoreNotifications: boolean;
	loadMoreNotifications: () => void;
	permissionsByOrg: Record<string, TeamPermissions>;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		totalItems: number;
		hasMore: boolean;
	}
}

const InboxContext = createContext<InboxContextType | undefined>(undefined);


export type Notification = {
	id: string;
	profileId: string;
	data: Record<string, unknown>;
	type: string;
	delivered: boolean;
	unread: boolean;
	readAt: string | Date | null;
	createdAt: string | Date;
	updatedAt: string | Date;
};

type NotificationPage = {
	items: Notification[];
	unreadCount: number;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		totalItems: number;
		hasMore: boolean;
	};
};


function getPageData(response: NotificationPage): NotificationPage {
	return {
		items: response.items ?? [],
		unreadCount: response.unreadCount ?? 0,
		pagination: response.pagination ??
			response.pagination ?? {
			page: 1,
			limit: 20,
			totalPages: 1,
			totalItems: 0,
			hasMore: false,
		},
	};
}
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
	const originalTitle = useRef<string | null>(null);
	const { value: newTasks, setValue: setTasks } = useStateManagement("inbox-tasks", tasks, 30000);
	const { value: newLabels, setValue: setLabels } = useStateManagement("inbox-labels", labels, 30000);
	const { value: newCategories, setValue: setCategories } = useStateManagement("inbox-categories", categories, 30000);
	const { value: newReleases, setValue: setReleases } = useStateManagement("inbox-releases", releases, 30000);
	const notificationsQuery = useStateManagementInfiniteFetch<
		NotificationPage,
		Record<string, never>
	>({
		key: ["inbox-notifications"],
		fetch: {
			url: "/v1/admin/notification",
			custom: async (_url, page) => {
				const pageNumber = page ? Number(page) : 1;
				const params = new URLSearchParams();
				params.set("page", String(pageNumber));
				params.set("limit", String(20))
				const qs = params.toString();
				const url = `${API_URL}/v1/admin/notification${qs ? `?${qs}` : ""}`;
				const res = await fetch(url, {
					method: "GET",
					credentials: "include",
				});
				return res.json();
			},
			getNextPageParam: (lastPage) => {
				const pageData = getPageData(lastPage);
				return pageData.pagination.hasMore
					? String(pageData.pagination.page + 1)
					: undefined;
			},
		},
		staleTime: 30_000,
	});

	const pages = notificationsQuery.value.data ?? [];
	const pageData = pages.map(getPageData);
	const notifications: any = pageData.flatMap((page) => page.items);
	const pagination = pageData.at(-1)?.pagination ?? {
		page: 1,
		limit: 20,
		totalPages: 1,
		totalItems: 0,
		hasMore: false,
	};
	const firstPage = pageData[0];
	const unreadCount = firstPage?.unreadCount ?? 0;
	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		if (originalTitle.current === null) {
			originalTitle.current = document.title;
		}

		const title = originalTitle.current;

		document.title = unreadCount > 0
			? `(${unreadCount}) ${title}`
			: title;
		notificationActions.setCount(unreadCount)
		return () => {
			document.title = title;
		};
	}, [unreadCount]);
	// Sync props -> state
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setCategories(categories), [categories, setCategories]);
	useEffect(() => setReleases(releases), [releases, setReleases]);
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
				unreadCount,
				refreshNotifications: notificationsQuery.value.refetch,
				hasMoreNotifications: notificationsQuery.value.hasNextPage,
				isLoadingMoreNotifications: notificationsQuery.value.isFetchingNextPage,
				loadMoreNotifications: notificationsQuery.value.fetchNextPage,
				permissionsByOrg,
				pagination,
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
