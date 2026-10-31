import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { getInitials } from "@repo/util";
import { IconBookmark, IconPinnedOff } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import { type FavouriteWithTarget, favouritesActions, favouritesStore } from "@/lib/stores/favourites-store";
import { SidebarGroupToggle } from "./sidebar-group-toggle";
import { reorderIds, useDragClickSuppression, useSidebarSortSensors } from "./sortable-sidebar";
import { favouriteTarget, markSidebarClick, sidebarItemId, useActiveSidebarItem } from "./use-active-sidebar-item";

const DEFAULT_VIEW_ICON = "IconBookmark";
// Matches view-icon-color-trigger.tsx's own DEFAULT_VIEW_COLOR — duplicated locally the same
// way DEFAULT_VIEW_ICON above already is, rather than importing from board/** into the sidebar.
const DEFAULT_VIEW_COLOR = "hsla(38, 92%, 50%, 1)";

// Same size as the org sections' view icons, so every row's label starts at the same x.
const VIEW_ICON_SWATCH_CLASS = "size-4 rounded-[5px] [&_svg]:size-2.5 shrink-0";

function useViewNavigate(currentPathname: string) {
	const { setSearchParams } = useTasksSearchParams();
	return (target: { pathname: string; slug: string }, event: { preventDefault: () => void }) => {
		if (currentPathname !== target.pathname) return;
		// Already on the view's page — write the URL directly instead of a full router navigation.
		// TanStack Router's navigate() pipeline is async even for a same-route, search-only
		// change, and racing it against rapid clicks left the URL and the actually-applied
		// view/panel out of sync until an unrelated re-render happened to catch up. This
		// mirrors exactly what useBoardViewState's own selectView() already does for the same
		// reason.
		event.preventDefault();
		setSearchParams({ view: target.slug, filters: null, category: null });
	};
}

function FavouriteRow({
	favourite,
	isActive,
	currentPathname,
}: {
	favourite: FavouriteWithTarget;
	isActive: boolean;
	currentPathname: string;
}) {
	const { view, organization } = favourite;
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: favourite.id,
	});
	const navigate = useViewNavigate(currentPathname);
	const target = favouriteTarget(favourite);
	const clickSuppression = useDragClickSuppression();

	const icon = (
		// Clipped to the swatch, so the org's logo tucks into its corner rather than sticking out of it.
		<span className="relative flex shrink-0 overflow-hidden rounded-md">
			<RenderIcon
				iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
				color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
				button
				className={VIEW_ICON_SWATCH_CLASS}
			/>
			{organization && (
				// The org's logo in the swatch's corner, so two orgs' same-named views can be told apart at a glance.
				<Avatar className="absolute right-0 bottom-0 size-2 rounded-none rounded-tl-[2px]">
					<AvatarImage src={organization.logo ?? undefined} alt={organization.name} />
					<AvatarFallback className="rounded-none text-[5px]">{getInitials(organization.name)}</AvatarFallback>
				</Avatar>
			)}
		</span>
	);

	return (
		<SidebarMenuItem isActive={isActive} className="min-h-auto group/fav">
			<div
				ref={setNodeRef}
				style={{ transform: CSS.Transform.toString(transform), transition }}
				{...attributes}
				{...listeners}
				{...clickSuppression}
				className={cn(
					"flex items-center w-full touch-none cursor-grab active:cursor-grabbing",
					isDragging && "opacity-50"
				)}
			>
				<Link
					to={target.pathname}
					search={{ view: target.slug }}
					onClick={(event) => {
						markSidebarClick(sidebarItemId.favourite(favourite.id));
						navigate(target, event);
					}}
					className="min-w-0 flex-1"
				>
					<SidebarMenuButton
						size="small"
						tooltip={organization ? `${view.name} · ${organization.name}` : view.name}
						icon={icon}
					>
						{/* The org slug sits at the far right and gives way first: it shrinks to nothing before the view name truncates. */}
						<span className="flex w-full min-w-0 items-baseline gap-1.5">
							<span className="min-w-0 truncate">{view.name}</span>
							{organization && (
								<span className="ml-auto min-w-0 shrink-[9999] truncate text-xs text-muted-foreground">
									{organization.slug}
								</span>
							)}
						</span>
					</SidebarMenuButton>
				</Link>
				<button
					type="button"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						favouritesActions.toggleView(view, organization);
					}}
					title="Unpin"
					// Takes no width until the row is hovered (or it's focused), then grows in and nudges the
					// slug left to make room — same transition-all as the row's own hover colours.
					className="flex w-0 shrink-0 cursor-pointer items-center justify-end overflow-hidden text-muted-foreground opacity-0 transition-all hover:text-foreground focus-visible:w-5 focus-visible:opacity-100 group-hover/fav:w-5 group-hover/fav:opacity-100"
				>
					<IconPinnedOff className="size-3.5 shrink-0" />
				</button>
			</div>
		</SidebarMenuItem>
	);
}

/**
 * The user's Favourites, rendered above the Organizations group: their pinned saved views — personal views and
 * org views in one list, in their own order (SAY-104). Pinning happens from a board's panel header; this is
 * where favourites are reordered (drag, shared with the Organizations list via sortable-sidebar.ts) and
 * unpinned. Reads the global favourites-store, so changes anywhere show up here at once. Hidden entirely when
 * nothing is pinned.
 *
 * Personal views open on /home; org views on their org's tasks page, with the org's logo badged on the view's
 * icon and its slug after the name.
 */
export function FavouritesSection() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
	const activeItemId = useActiveSidebarItem();

	const favourites = useStore(favouritesStore, (state) => state.favourites);
	const [favouritesOpen, setFavouritesOpen] = useState(true);
	const sensors = useSidebarSortSensors();

	const handleDragEnd = (event: DragEndEvent) => {
		const reordered = reorderIds(
			favourites.map((favourite) => favourite.id),
			event.active.id,
			event.over?.id
		);
		if (reordered) favouritesActions.reorder(reordered);
	};

	if (favourites.length === 0) return null;

	return (
		<SidebarGroupToggle
			label="Favourites"
			icon={<IconBookmark size={16} />}
			open={favouritesOpen}
			onOpenChange={setFavouritesOpen}
		>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={favourites.map((favourite) => favourite.id)} strategy={verticalListSortingStrategy}>
					<SidebarMenu className="gap-0.5">
						{favourites.map((favourite) => (
							<FavouriteRow
								key={favourite.id}
								favourite={favourite}
								isActive={activeItemId === sidebarItemId.favourite(favourite.id)}
								currentPathname={normalizedPathname}
							/>
						))}
					</SidebarMenu>
				</SortableContext>
			</DndContext>
		</SidebarGroupToggle>
	);
}
