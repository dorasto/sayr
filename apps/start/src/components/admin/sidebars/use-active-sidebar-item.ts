import { useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useMemo, useSyncExternalStore } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { type FavouriteWithTarget, favouritesStore } from "@/lib/stores/favourites-store";
import { heading, navigation } from "@/lib/routemap";
import { resolveActiveSidebarItem, type SidebarTarget } from "./sidebar-active";

/** Row ids, shared by the rows and the targets list below. */
export const sidebarItemId = {
	nav: (url: string) => `nav:${url}`,
	favourite: (favouriteId: string) => `fav:${favouriteId}`,
	orgOverview: (orgId: string) => `org:${orgId}`,
	orgTasks: (orgId: string) => `org:${orgId}:tasks`,
	orgReleases: (orgId: string) => `org:${orgId}:releases`,
	orgView: (orgId: string, viewId: string) => `org:${orgId}:view:${viewId}`,
};

/** The page a favourite opens: /home for a personal view, the org's tasks page for an org view. */
export function favouriteTarget(favourite: FavouriteWithTarget): { pathname: string; slug: string } {
	const slug = favourite.view.slug || favourite.view.id;
	return { pathname: favourite.organization ? `/${favourite.organization.id}/tasks` : "/home", slug };
}

// The row last clicked (rule 1 of resolveActiveSidebarItem). In memory only: after a reload the page decides.
let lastClickedId: string | null = null;
const listeners = new Set<() => void>();

/** Call from a row's onClick so that row, not a twin opening the same page, is the highlighted one. */
export function markSidebarClick(id: string) {
	if (lastClickedId === id) return;
	lastClickedId = id;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * The id of the one highlighted primary-sidebar row (see sidebar-active.ts). Every row in the sidebar is listed
 * here — nav items, each org's section, then Favourites, so an org's own section wins a tie with a favourite.
 */
export function useActiveSidebarItem(): string | undefined {
	const pathname = useRouterState({
		select: (s) => (s.location.pathname.length > 1 ? s.location.pathname.replace(/\/$/, "") : s.location.pathname),
	});
	const view = useRouterState({
		select: (s) => {
			const value = (s.location.search as Record<string, unknown>).view;
			return typeof value === "string" ? value : undefined;
		},
	});
	const { organizations, orgViews } = useLayoutData();
	const favourites = useStore(favouritesStore, (state) => state.favourites);
	const clicked = useSyncExternalStore(
		subscribe,
		() => lastClickedId,
		() => null
	);

	const targets = useMemo(() => {
		const list: SidebarTarget[] = [...heading, ...navigation]
			.flatMap((section) => section.items)
			.map((item) => ({ id: sidebarItemId.nav(item.url), pathname: item.url }));
		for (const org of organizations) {
			list.push(
				{ id: sidebarItemId.orgOverview(org.id), pathname: `/${org.id}` },
				{ id: sidebarItemId.orgTasks(org.id), pathname: `/${org.id}/tasks` },
				{ id: sidebarItemId.orgReleases(org.id), pathname: `/${org.id}/releases`, prefix: true }
			);
			for (const orgView of orgViews[org.id] ?? []) {
				list.push({
					id: sidebarItemId.orgView(org.id, orgView.id),
					pathname: `/${org.id}/tasks`,
					view: orgView.slug || orgView.id,
				});
			}
		}
		for (const favourite of favourites) {
			const { pathname: favouritePath, slug } = favouriteTarget(favourite);
			list.push({ id: sidebarItemId.favourite(favourite.id), pathname: favouritePath, view: slug });
		}
		return list;
	}, [organizations, orgViews, favourites]);

	return resolveActiveSidebarItem(targets, { pathname, view }, clicked);
}
