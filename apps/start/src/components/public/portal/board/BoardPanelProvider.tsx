import type { schema } from "@repo/database";
import { useNavigate } from "@tanstack/react-router";
import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { usePanel } from "@/components/generic/use-page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import { type AppliedPanelView, getRowClickAction, getUrlSyncAction } from "@/lib/portal/board-panel";
import { normalizeShortId, PEEK_DESKTOP_QUERY, shouldInterceptRowClick } from "@/lib/portal/peek";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PeekContext, type PeekContextValue } from "../peek/peek-context";
import { PEEK_CONTENT, PEEK_HEADER } from "../peek/PeekPanel";
import { usePeekEnabled } from "../peek/usePeekEnabled";
import { usePeekPost } from "../peek/usePeekPost";
import { RAIL_CONTENT, RAIL_HEADER } from "./BoardRailPanel";
import { PUBLIC_BOARD_PANEL_ID } from "./constants";

const POPUP_SELECTOR = '[data-slot="indent-drawer-popup"]';

/**
 * Puts a post into the panel. The trigger id must always be passed: `setPanelContent` overwrites `lastTriggerId` with
 * it (undefined clears it), and `Page` keys the panel on it, which is what remounts the content (and resets its scroll)
 * when the view changes.
 */
function showPost(shortId: number) {
	sidebarActions.setPanelContent(PUBLIC_BOARD_PANEL_ID, PEEK_CONTENT, String(shortId));
	sidebarActions.setPanelHeader(PUBLIC_BOARD_PANEL_ID, PEEK_HEADER);
}

function showRail() {
	sidebarActions.setPanelContent(PUBLIC_BOARD_PANEL_ID, RAIL_CONTENT, undefined);
	sidebarActions.setPanelHeader(PUBLIC_BOARD_PANEL_ID, RAIL_HEADER);
}

/** Read straight from the media query: `usePeekEnabled()` still holds its server snapshot on the first client pass. */
const isDesktopNow = () => window.matchMedia(PEEK_DESKTOP_QUERY).matches;

interface BoardPanelProviderProps {
	/** The board's loaded posts (unfiltered), the live source the post view reads from. */
	tasks: schema.TaskWithLabels[];
	children: ReactNode;
}

/**
 * Drives the board's single right-hand panel (`PUBLIC_BOARD_PANEL_ID`, registered by the board's `Page`). Wrap the
 * `<Page>` in this. The panel's two views are plain module-level constants that read live data from context, so the
 * panel store only ever gets `setPanelContent`/`setPanelHeader` calls when the *view* changes:
 * - overview (`RAIL_CONTENT`, native header, X closes the panel) when no post is selected;
 * - post (`PEEK_CONTENT`, header with its own close action) while `?task=<shortId>` is set.
 *
 * `?task` is the source of truth for the selection, and the two stay in sync both ways:
 * - a plain row click on desktop sets the param and shows the post, opening the panel if it was closed (clicking the
 *   selected row again returns to the overview);
 * - a deep link or history navigation that changes the param swaps the view (desktop only; below 1024px a `?task`
 *   deep link is redirected to the full post page and rows just navigate);
 * - the post header's X (`closePost`) and a click on the selected row close the whole panel, like any row-click detail
 *   panel (the next open starts on the overview);
 * - any close of the whole panel (the overview header's X, Esc, drag-dismiss, the page toggle) is observed through
 *   `usePanel().isOpen` and clears the param too, so the URL never names a post the panel is not showing.
 */
export function BoardPanelProvider({ tasks, children }: BoardPanelProviderProps) {
	const { organization } = usePublicOrganizationLayout();
	const navigate = useNavigate();
	const { task: taskParam, setTask } = useTasksSearchParams();
	const urlShortId = normalizeShortId(taskParam);
	const panel = usePanel(PUBLIC_BOARD_PANEL_ID);
	const desktop = usePeekEnabled();

	const desktopRef = useRef(desktop);
	desktopRef.current = desktop;
	/** What this provider last put into the panel (see `AppliedPanelView`); `undefined` until the first apply. */
	const applied = useRef<AppliedPanelView>(undefined);
	/** The row link that opened the post, to return focus to when it is left. */
	const triggerRef = useRef<HTMLElement | null>(null);

	// The post is only resolved while the panel is open on desktop and a post is selected.
	const shortId = desktop && panel.isOpen ? urlShortId : null;
	const shortIdRef = useRef(shortId);
	shortIdRef.current = shortId;
	const { post, status } = usePeekPost(shortId, tasks);

	const returnFocusToTrigger = useCallback(() => {
		const trigger = triggerRef.current;
		triggerRef.current = null;
		if (!trigger?.isConnected) return;
		const active = document.activeElement;
		// Only when focus has nowhere better to be (the control that held it was unmounted, or is inside the panel).
		if (!active || active === document.body || active.closest(POPUP_SELECTOR)) {
			trigger.focus({ preventScroll: true });
		}
	}, []);

	/** Back to the overview with the panel left open: for a deep link to a post that is not there. */
	const showOverview = useCallback(() => {
		applied.current = null;
		setTask(null);
		showRail();
		returnFocusToTrigger();
	}, [setTask, returnFocusToTrigger]);

	/**
	 * The user is done with the post: close the whole panel (the row-click detail pattern: the selected row's
	 * highlight goes with it). The `isOpen` effect below clears `?task`, and the next open starts on the overview.
	 */
	const closePost = useCallback(() => {
		sidebarActions.close(PUBLIC_BOARD_PANEL_ID);
		returnFocusToTrigger();
	}, [returnFocusToTrigger]);

	const openPost = useCallback<PeekContextValue["openPost"]>(
		(task, event: MouseEvent<HTMLAnchorElement>) => {
			const rowShortId = normalizeShortId(task.shortId);
			const action = getRowClickAction({
				desktop: desktopRef.current,
				intercept: shouldInterceptRowClick(event.nativeEvent),
				rowShortId,
				selectedShortId: shortIdRef.current,
			});
			// Narrow viewports and modified clicks (new tab, etc.) follow the link to the full post.
			if (action === "follow-link" || rowShortId === null) return;
			event.preventDefault();

			if (action === "deselect") {
				closePost();
				return;
			}

			triggerRef.current = event.currentTarget;
			applied.current = rowShortId;
			setTask(rowShortId);
			showPost(rowShortId);
			// Opens the panel when the user had closed it; a no-op when it is already showing the overview.
			sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true);
		},
		[setTask, closePost]
	);

	// URL -> panel. Reacts to the `?task` param (and the viewport) changing, not to the panel's open state, so a close
	// made through the panel cannot be undone here before the isOpen effect below has cleared the param.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `desktop` only re-runs the effect when the viewport crosses 1024px; the decision itself reads the media query directly (see `isDesktopNow`).
	useEffect(() => {
		if (!panel.isRegistered) return;

		const action = getUrlSyncAction({ desktop: isDesktopNow(), urlShortId, applied: applied.current });
		switch (action) {
			case "none":
				return;
			case "show-rail":
				applied.current = null;
				showRail();
				return;
			case "show-post":
				if (urlShortId === null) return;
				applied.current = urlShortId;
				showPost(urlShortId);
				sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true);
				return;
			case "redirect-to-post":
				// Never show a post in the panel below 1024px: a shared `?task=` link lands on the full post instead.
				if (urlShortId === null) return;
				void navigate({
					to: "/orgs/$orgSlug/$shortId",
					params: { orgSlug: organization.slug, shortId: String(urlShortId) },
					replace: true,
				});
				return;
			case "clear-post":
				// The window was narrowed while a post was showing: back to the overview.
				applied.current = null;
				setTask(null);
				showRail();
				return;
		}
	}, [panel.isRegistered, urlShortId, desktop, navigate, organization.slug, setTask]);

	// Panel -> URL. Closing the whole panel (X on the overview, Esc, drag-dismiss, the page toggle) arrives as isOpen
	// going false; if a post was selected, drop it from the URL. The URL effect above then puts the overview back so
	// the next open starts there.
	const wasOpen = useRef(false);
	useEffect(() => {
		const closed = wasOpen.current && !panel.isOpen;
		wasOpen.current = panel.isOpen;
		if (!closed) return;

		if (urlShortId !== null && desktopRef.current) setTask(null);
		// Non-modal panel: hand focus back to the row (the browser may already have, or left it on the body).
		returnFocusToTrigger();
	}, [panel.isOpen, urlShortId, setTask, returnFocusToTrigger]);

	// A deep link to a post that does not exist (or is not public) falls back to the overview instead of staying empty.
	useEffect(() => {
		if (status === "missing") showOverview();
	}, [status, showOverview]);

	const value = useMemo<PeekContextValue>(
		() => ({ openPost, closePost, shortId, post, status, tasks }),
		[openPost, closePost, shortId, post, status, tasks]
	);

	return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}
