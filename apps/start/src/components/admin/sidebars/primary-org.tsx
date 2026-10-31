import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { SidebarMenuButton, SidebarMenuItem } from "@repo/ui/components/doras-ui/sidebar";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
	IconChevronRight,
	IconHome,
	IconPin,
	IconPinFilled,
	IconProgress,
	IconRocket,
	IconSettings,
	IconSparkles,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import RenderIcon from "@/components/generic/RenderIcon";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import { favouritesActions, favouritesStore, isViewFavourite } from "@/lib/stores/favourites-store";
import { setOrgFolded, useIsOrgFolded } from "@/lib/stores/sidebar-folded-orgs";
import { useDragClickSuppression } from "./sortable-sidebar";
import { markSidebarClick, sidebarItemId, useActiveSidebarItem } from "./use-active-sidebar-item";

const EMPTY_VIEWS: schema.savedViewType[] = [];
/**
 * A row action that takes no width until its row is hovered (or it's focused), then grows in and nudges the row's
 * trailing content (the plan sparkles, a view name) over — the Favourites unpin button's pattern.
 */
const HOVER_ACTION_CLASS =
	"flex w-0 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md text-muted-foreground opacity-0 transition-all hover:text-foreground focus-visible:w-6 focus-visible:opacity-100";

/** Views listed before "N more views"; a single extra view is shown rather than hidden behind "1 more". */
const VISIBLE_VIEWS = 3;
const DEFAULT_VIEW_ICON = "IconBookmark";
// Matches view-icon-color-trigger.tsx's DEFAULT_VIEW_COLOR (duplicated like favourites-section.tsx does).
const DEFAULT_VIEW_COLOR = "hsla(38, 92%, 50%, 1)";

type Organization = schema.OrganizationWithMembers;

interface OrgSectionProps {
	organization: Organization;
	closeMobileSidebar: () => void;
}

function useCurrentPathname() {
	return useRouterState({
		select: (s) => (s.location.pathname.length > 1 ? s.location.pathname.replace(/\/$/, "") : s.location.pathname),
	});
}

function OrgAvatar({ organization, className }: { organization: Organization; className?: string }) {
	return (
		<Avatar className={cn("size-4 rounded-md bg-accent", className)}>
			<AvatarImage src={organization.logo || ""} alt={organization.name} />
			<AvatarFallback className="rounded-md text-xs uppercase">
				<IconUsers className="size-4" />
			</AvatarFallback>
		</Avatar>
	);
}

function OrgName({ organization }: { organization: Organization }) {
	return (
		<span className="flex w-full items-center gap-2 font-medium text-foreground">
			<span className="truncate">{organization.name}</span>
			{/* At the row's end; the settings gear grows in after it on hover and pushes it over. */}
			{organization.plan === "pro" && <IconSparkles className="ml-auto size-3.5 shrink-0 text-primary" />}
		</span>
	);
}

/** Link to the org's settings on the section heading, shown on hover (or keyboard focus). */
function OrgSettingsLink({ organization, onNavigate }: { organization: Organization; onNavigate: () => void }) {
	return (
		<Link
			to="/settings/org/$orgId"
			params={{ orgId: organization.id }}
			onClick={onNavigate}
			onPointerDown={(event) => event.stopPropagation()}
			title="Organization settings"
			className={cn(HOVER_ACTION_CLASS, "h-6 group-hover/orghead:w-6 group-hover/orghead:opacity-100")}
		>
			<IconSettings className="size-3.5" />
		</Link>
	);
}

/** Pins/unpins an org view in the viewer's Favourites, on the view's sidebar row (hover-revealed). */
function ViewPinButton({ view, organization }: { view: schema.savedViewType; organization: Organization }) {
	const pinned = useStore(favouritesStore, (state) => isViewFavourite(state, view.id));
	return (
		<button
			type="button"
			onPointerDown={(event) => event.stopPropagation()}
			onClick={() =>
				favouritesActions
					.toggleView(view, {
						id: organization.id,
						slug: organization.slug,
						name: organization.name,
						logo: organization.logo,
					})
					.catch(() =>
						headlessToast({
							title: pinned ? "Couldn't unpin the view" : "Couldn't pin the view",
							variant: "error",
						})
					)
			}
			title={pinned ? "Unpin from Favourites" : "Pin to Favourites"}
			className={cn(HOVER_ACTION_CLASS, "h-6 group-hover/viewrow:w-6 group-hover/viewrow:opacity-100")}
		>
			{pinned ? <IconPinFilled className="size-3.5 shrink-0" /> : <IconPin className="size-3.5 shrink-0" />}
		</button>
	);
}

/**
 * The org's own pages: Home (its overview), All tasks, Releases, then each of its shared saved views (the first few, then
 * "N more views"). Rendered under the section heading.
 */
function OrgSectionNav({ organization, onNavigate }: { organization: Organization; onNavigate: () => void }) {
	const pathname = useCurrentPathname();
	const activeItemId = useActiveSidebarItem();
	const { setSearchParams } = useTasksSearchParams();
	const views = useLayoutData().orgViews[organization.id] ?? EMPTY_VIEWS;
	const [showAllViews, setShowAllViews] = useState(false);

	const onTasksPage = pathname === `/${organization.id}/tasks`;
	const overflows = views.length > VISIBLE_VIEWS + 1;
	const visibleViews = overflows && !showAllViews ? views.slice(0, VISIBLE_VIEWS) : views;

	// Already on the org's tasks page: write the URL directly, like favourites-section.tsx — the router's async
	// navigate() races rapid view switches on the same route.
	const selectView = (itemId: string, slug: string | null) => (event: { preventDefault: () => void }) => {
		markSidebarClick(itemId);
		onNavigate();
		if (!onTasksPage) return;
		event.preventDefault();
		setSearchParams({ view: slug, filters: null, category: null });
	};

	return (
		<>
			<SidebarMenuItem className="min-h-auto" isActive={activeItemId === sidebarItemId.orgOverview(organization.id)}>
				<Link
					to="/$orgId"
					params={{ orgId: organization.id }}
					onClick={() => {
						markSidebarClick(sidebarItemId.orgOverview(organization.id));
						onNavigate();
					}}
					className="w-full"
				>
					<SidebarMenuButton size="small" icon={<IconHome size={16} />} tooltip="Home">
						<span>Home</span>
					</SidebarMenuButton>
				</Link>
			</SidebarMenuItem>
			<SidebarMenuItem className="min-h-auto" isActive={activeItemId === sidebarItemId.orgTasks(organization.id)}>
				<Link
					to="/$orgId/tasks"
					params={{ orgId: organization.id }}
					onClick={selectView(sidebarItemId.orgTasks(organization.id), null)}
					className="w-full"
				>
					<SidebarMenuButton size="small" icon={<IconProgress size={16} />} tooltip="All tasks">
						<span>All tasks</span>
					</SidebarMenuButton>
				</Link>
			</SidebarMenuItem>
			<SidebarMenuItem className="min-h-auto" isActive={activeItemId === sidebarItemId.orgReleases(organization.id)}>
				<Link
					to="/$orgId/releases"
					params={{ orgId: organization.id }}
					onClick={() => {
						markSidebarClick(sidebarItemId.orgReleases(organization.id));
						onNavigate();
					}}
					className="w-full"
				>
					<SidebarMenuButton size="small" icon={<IconRocket size={16} />} tooltip="Releases">
						<span>Releases</span>
					</SidebarMenuButton>
				</Link>
			</SidebarMenuItem>
			{visibleViews.map((view) => {
				const slug = view.slug || view.id;
				const itemId = sidebarItemId.orgView(organization.id, view.id);
				return (
					<SidebarMenuItem
						key={view.id}
						className="min-h-auto gap-0 group/viewrow"
						isActive={activeItemId === itemId}
					>
						<Link
							to="/$orgId/tasks"
							params={{ orgId: organization.id }}
							search={{ view: slug }}
							onClick={selectView(itemId, slug)}
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
										className="size-4 shrink-0 rounded-[5px] [&_svg]:size-2.5"
									/>
								}
							>
								<span>{view.name}</span>
							</SidebarMenuButton>
						</Link>
						<ViewPinButton view={view} organization={organization} />
					</SidebarMenuItem>
				);
			})}
			{overflows && (
				<SidebarMenuItem className="min-h-auto">
					<SidebarMenuButton size="small" onClick={() => setShowAllViews((show) => !show)}>
						<span className="pl-7 text-xs">
							{showAllViews ? "Show fewer" : `${views.length - VISIBLE_VIEWS} more views`}
						</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			)}
		</>
	);
}

/**
 * One organization in the primary sidebar (SAY-104 rework), inside the Organizations group: a heading — avatar
 * (a chevron on hover), name and a hover-revealed settings gear — that folds the section when clicked (folds are
 * remembered, see lib/stores/sidebar-folded-orgs.ts), over the org's Home, All tasks, Releases and saved views
 * (OrgSectionNav). There's no separate Views page: views are listed here and edited in the board's view
 * settings sheet.
 *
 * Sortable within OrgSortableList (org-sortable-list.tsx): the heading is the drag target, the whole section
 * moves, and every section folds while any org is being dragged so the rows are all one height.
 *
 * There's no icon-only sidebar: collapsing hides it, and it reopens as a full-width overlay with these same
 * sections.
 */
export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	const folded = useIsOrgFolded(organization.id);
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
		id: organization.id,
	});
	const { active } = useDndContext();
	const clickSuppression = useDragClickSuppression();
	const onNavigate = () => {
		if (isMobile) closeMobileSidebar();
	};
	const sortableStyle = { transform: CSS.Translate.toString(transform), transition };

	return (
		<div ref={setNodeRef} style={sortableStyle} className={cn("flex flex-col gap-0.5", isDragging && "opacity-40")}>
			{/* The drag activator: the heading, not the section's pages. */}
			<div ref={setActivatorNodeRef} {...attributes} {...listeners} {...clickSuppression}>
				<SidebarMenuItem className="min-h-auto gap-0 group/orghead">
					{/* The whole heading folds the section; the org's pages (Home first) are the rows below. */}
					<SidebarMenuButton
						size="small"
						className="min-w-0 flex-1 cursor-pointer"
						onClick={() => setOrgFolded(organization.id, !folded)}
						aria-label={folded ? `Expand ${organization.name}` : `Collapse ${organization.name}`}
						aria-expanded={!folded}
						icon={
							<span className="relative flex size-4 shrink-0 items-center justify-center">
								<IconChevronRight
									className={cn(
										"absolute inset-0 m-auto size-4 text-transparent transition-transform duration-200 group-hover/orghead:text-sidebar-foreground",
										!folded && "rotate-90"
									)}
								/>
								<OrgAvatar organization={organization} className="transition-none group-hover/orghead:size-0" />
							</span>
						}
					>
						<OrgName organization={organization} />
					</SidebarMenuButton>
					<OrgSettingsLink organization={organization} onNavigate={onNavigate} />
				</SidebarMenuItem>
			</div>
			{!folded && !active && (
				// Nested under the heading with a guide line, as the org's pages always were.
				<div className="ml-2 flex flex-col gap-0.5 border-l pl-2">
					<OrgSectionNav organization={organization} onNavigate={onNavigate} />
				</div>
			)}
		</div>
	);
}
