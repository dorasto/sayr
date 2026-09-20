import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { IconBookmark, IconPinnedOff } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type React from "react";
import { useRef, useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import {
  personalViewsActions,
  personalViewsStore,
} from "@/lib/stores/personal-views-store";
import { SidebarGroupToggle } from "./sidebar-group-toggle";

// Same activation distance the row's own MouseSensor uses below — dnd-kit's built-in
// click-suppression-after-a-real-drag (a document-level capture-phase click listener,
// armed once its sensor's own activationConstraint.distance is exceeded) turned out not to
// reliably reach a real, same-page TanStack Router `<Link>` nested this deep, so this row
// tracks the same distance itself and suppresses the click directly — see the capture-phase
// handlers below.
const DRAG_CLICK_SUPPRESS_DISTANCE = 8;

const DEFAULT_VIEW_ICON = "IconBookmark";
// Matches view-icon-color-trigger.tsx's own DEFAULT_VIEW_COLOR — duplicated locally the same
// way DEFAULT_VIEW_ICON above already is, rather than importing from board/** into the sidebar.
const DEFAULT_VIEW_COLOR = "hsla(38, 92%, 50%, 1)";

const VIEW_ICON_SWATCH_CLASS = "size-5 rounded-md [&_svg]:size-3 shrink-0";

function useViewNavigate(isOnHomePage: boolean) {
  const { setSearchParams } = useTasksSearchParams();
  return (targetSlug: string, event: { preventDefault: () => void }) => {
    if (!isOnHomePage) return;
    // Already on /home — write the URL directly instead of a full router navigation.
    // TanStack Router's navigate() pipeline is async even for a same-route, search-only
    // change, and racing it against rapid clicks left the URL and the actually-applied
    // view/panel out of sync until an unrelated re-render happened to catch up. This
    // mirrors exactly what useBoardViewState's own selectView() already does for the same
    // reason.
    event.preventDefault();
    setSearchParams({ view: targetSlug, filters: null, category: null });
  };
}

function FavouriteRow({
  view,
  isActive,
  isOnHomePage,
}: {
  view: schema.savedViewType;
  isActive: boolean;
  isOnHomePage: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: view.id });
  const navigate = useViewNavigate(isOnHomePage);
  const targetSlug = view.slug || view.id;

  // Recorded on pointerdown (capture phase, so it runs before dnd-kit's own listener spread
  // via {...listeners} below), checked on click (also capture phase, so a suppressed click
  // never even reaches the Link's own bubble-phase onClick). Plain refs, not React state —
  // both handlers fire synchronously within the same native gesture, so there's no render/
  // re-render race to worry about, unlike gating this off dnd-kit's own isDragging/active
  // state (which only updates via React state on the *next* render).
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDownCapture = (event: React.PointerEvent) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleClickCapture = (event: React.MouseEvent) => {
    const start = pointerDownPos.current;
    pointerDownPos.current = null;
    if (!start) return;
    const moved =
      Math.abs(event.clientX - start.x) > DRAG_CLICK_SUPPRESS_DISTANCE ||
      Math.abs(event.clientY - start.y) > DRAG_CLICK_SUPPRESS_DISTANCE;
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <SidebarMenuItem isActive={isActive} className="min-h-auto group/fav">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onPointerDownCapture={handlePointerDownCapture}
        onClickCapture={handleClickCapture}
        className={cn(
          "flex items-center w-full gap-0.5 touch-none cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50",
        )}
      >
        <Link
          to="/home"
          search={{ view: targetSlug }}
          onClick={(event) => navigate(targetSlug, event)}
          className="min-w-0 flex-1"
        >
          <SidebarMenuButton
            size="small"
            tooltip={view.name}
            icon={
              <RenderIcon
                iconName={view.viewConfig?.icon || DEFAULT_VIEW_ICON}
                color={view.viewConfig?.color || DEFAULT_VIEW_COLOR}
                button
                className={VIEW_ICON_SWATCH_CLASS}
              />
            }
          >
            <span>{view.name}</span>
          </SidebarMenuButton>
        </Link>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            personalViewsActions.togglePin(view.id);
          }}
          title="Unpin"
          className="shrink-0 cursor-pointer text-transparent group-hover/fav:text-muted-foreground hover:text-foreground"
        >
          <IconPinnedOff className="size-3.5" />
        </button>
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
 * A SidebarGroupToggle (collapse/expand, no page of its own) wraps the
 * draggable list. The whole row is the drag target (no dedicated handle) — a distance-based
 * MouseSensor means dnd-kit only starts tracking a reorder past 8px of movement;
 * FavouriteRow separately suppresses the click that same gesture would otherwise leave
 * behind on its own Link (see its own doc comment for why). TouchSensor uses a delay
 * instead of distance (a press-and-hold, not a press-and-move) since touch scrolling
 * already uses movement — same two-sensor split grid-board.tsx's drag-and-drop uses for
 * the identical reason.
 */
export function FavouritesSection() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const search = useRouterState({
    select: (state) => state.location.search,
  }) as Record<string, unknown>;
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const isOnHomePage = normalizedPathname === "/home";
  const activeViewSlug = isOnHomePage
    ? (search.view as string | undefined)
    : undefined;

  const pinnedViews = useStore(personalViewsStore, (state) =>
    state.views.filter((view) => view.pinned),
  );
  const [favouritesOpen, setFavouritesOpen] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

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
    <SidebarGroupToggle
      label="Favourites"
      icon={<IconBookmark size={16} />}
      open={favouritesOpen}
      onOpenChange={setFavouritesOpen}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pinnedViews.map((view) => view.id)}
          strategy={verticalListSortingStrategy}
        >
          <SidebarMenu className="gap-0.5">
            {pinnedViews.map((view) => (
              <FavouriteRow
                key={view.id}
                view={view}
                isActive={activeViewSlug === (view.slug || view.id)}
                isOnHomePage={isOnHomePage}
              />
            ))}
          </SidebarMenu>
        </SortableContext>
      </DndContext>
    </SidebarGroupToggle>
  );
}
