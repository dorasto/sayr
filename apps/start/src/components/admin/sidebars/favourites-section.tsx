import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import RenderIcon from "@/components/generic/RenderIcon";
import { personalViewsStore } from "@/lib/stores/personal-views-store";

const DEFAULT_VIEW_ICON = "IconBookmark";

/**
 * Pinned personal views, rendered above the Organizations group — the sidebar half of
 * pinning a saved view from /home (see board/saved-views/*). Reads the same global
 * personal-views-store the /home page itself uses, so pin/unpin/reorder/rename there
 * shows up here immediately with no separate fetch. Hidden entirely when nothing is
 * pinned, matching how Organizations always has content but this optionally doesn't.
 */
export function FavouritesSection({ isSidebarOpen }: { isSidebarOpen: boolean }) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const search = useRouterState({ select: (state) => state.location.search }) as Record<string, unknown>;
	const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
	const activeViewSlug = normalizedPathname === "/home" ? (search.view as string | undefined) : undefined;

	const pinnedViews = useStore(personalViewsStore, (state) => state.views.filter((view) => view.pinned));

	if (pinnedViews.length === 0) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Favourites</SidebarGroupLabel>
			<SidebarMenu className={cn(isSidebarOpen && "gap-0.5")}>
				{pinnedViews.map((view) => {
					const targetSlug = view.slug || view.id;
					const isActive = activeViewSlug === targetSlug;

					return (
						<SidebarMenuItem key={view.id} isActive={isActive} className="min-h-auto">
							<Link to="/home" search={{ view: targetSlug }} className="w-full">
								<SidebarMenuButton
									size="small"
									tooltip={view.name}
									icon={
										<RenderIcon
											iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
											color={view.viewConfig?.color}
											size={16}
											raw
										/>
									}
								>
									<span>{view.name}</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
