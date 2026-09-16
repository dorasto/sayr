import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import type { schema } from "@repo/database";
import { IconGripVertical, IconPinnedOff } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import RenderIcon from "@/components/generic/RenderIcon";
import { personalViewsActions, personalViewsStore } from "@/lib/stores/personal-views-store";

const DEFAULT_VIEW_ICON = "IconBookmark";

function FavouriteRow({
	view,
	isActive,
	isSidebarOpen,
}: {
	view: schema.savedViewType;
	isActive: boolean;
	isSidebarOpen: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id });
	const targetSlug = view.slug || view.id;

	return (
		<SidebarMenuItem isActive={isActive} className="min-h-auto group/fav">
			<div
				ref={setNodeRef}
				style={{ transform: CSS.Transform.toString(transform), transition }}
				className={cn("flex items-center w-full gap-0.5", isDragging && "opacity-50")}
			>
				{isSidebarOpen && (
					// biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit drag handle, not a real interactive control
					<button
						type="button"
						{...attributes}
						{...listeners}
						aria-label="Reorder favourite"
						className="shrink-0 touch-none cursor-grab text-transparent group-hover/fav:text-muted-foreground hover:text-foreground active:cursor-grabbing"
					>
						<IconGripVertical className="size-3.5" />
					</button>
				)}
				<Link to="/home" search={{ view: targetSlug }} className="min-w-0 flex-1">
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
				{isSidebarOpen && (
					<button
						type="button"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							personalViewsActions.togglePin(view.id);
						}}
						title="Unpin"
						className="shrink-0 text-transparent group-hover/fav:text-muted-foreground hover:text-foreground"
					>
						<IconPinnedOff className="size-3.5" />
					</button>
				)}
			</div>
		</SidebarMenuItem>
	);
}

/**
 * Pinned personal views, rendered above the Organizations group — the sidebar half of
 * pinning a saved view from /home (see board/saved-views/*). Reads the same global
 * personal-views-store the /home page itself uses, so pin/unpin/reorder/rename there
 * shows up here immediately with no separate fetch. Hidden entirely when nothing is
 * pinned, matching how Organizations always has content but this optionally doesn't.
 *
 * Drag-and-drop uses a dedicated grip handle (not the whole row) so the row's own Link
 * navigation isn't fought over by the drag gesture — same reasoning as board-list-view.tsx,
 * just single-container here instead of multi-group.
 */
export function FavouritesSection({ isSidebarOpen }: { isSidebarOpen: boolean }) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const search = useRouterState({ select: (state) => state.location.search }) as Record<string, unknown>;
	const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
	const activeViewSlug = normalizedPathname === "/home" ? (search.view as string | undefined) : undefined;

	const pinnedViews = useStore(personalViewsStore, (state) => state.views.filter((view) => view.pinned));

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = pinnedViews.findIndex((view) => view.id === active.id);
		const newIndex = pinnedViews.findIndex((view) => view.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(pinnedViews, oldIndex, newIndex);
		personalViewsActions.reorder(reordered.map((view) => view.id));
	};

	if (pinnedViews.length === 0) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Favourites</SidebarGroupLabel>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={pinnedViews.map((view) => view.id)} strategy={verticalListSortingStrategy}>
					<SidebarMenu className={cn(isSidebarOpen && "gap-0.5")}>
						{pinnedViews.map((view) => {
							const targetSlug = view.slug || view.id;
							return (
								<FavouriteRow
									key={view.id}
									view={view}
									isActive={activeViewSlug === targetSlug}
									isSidebarOpen={isSidebarOpen}
								/>
							);
						})}
					</SidebarMenu>
				</SortableContext>
			</DndContext>
		</SidebarGroup>
	);
}
