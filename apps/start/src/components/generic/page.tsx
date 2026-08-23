import { Button } from "@repo/ui/components/button";
import {
	IndentDrawer,
	type IndentDrawerActions,
	IndentDrawerContent,
	IndentDrawerIndentBackground,
	IndentDrawerProvider,
	IndentDrawerRegion,
} from "@repo/ui/components/doras-ui/indent-drawer";
import { SidebarContext } from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import { isValidElement, useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/generic/PageHeader";
import type { PanelHeaderConfig, PanelTabConfig } from "@/lib/sidebar/sidebar-store";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";

// Helper to check if a header is a PanelHeaderConfig object rather than a
// plain React node. Panel state headers are always PanelHeaderConfig, so
// we can't rely on a specific key like `title` being present — an empty
// `{}` is a valid (if minimal) config. Instead distinguish by shape: a
// React element (or primitive/array passed as children) is a ReactNode;
// any other plain object is a config.
function isPanelHeaderConfig(header: unknown): header is PanelHeaderConfig {
	return typeof header === "object" && header !== null && !Array.isArray(header) && !isValidElement(header);
}

// Panel configuration. Every panel renders through the same non-modal
// IndentDrawer/float system, on every breakpoint — a floating card that
// pushes (not covers) the page's main content, animated open/close.
export interface PanelConfig {
	id: string;
	header?: React.ReactNode | PanelHeaderConfig;
	tabs?: Array<PanelTabConfig>;
	defaultTab?: string;
	defaultOpen?: boolean;
	/** If false, ignores persisted open state and always resets to defaultOpen on load — CRUD panels. @default true */
	persistOpenState?: boolean;
	/** Desktop drawer/push width. @default "380px" */
	width?: string;
	/** Mobile drawer/push height (max-height + vertical push). @default "38dvh" */
	height?: string;
	/** Mobile only, opt-in: also shrink the pushed content by this factor (e.g. 0.85) while open. */
	mobileZoom?: number;
	/**
	 * Renders with a dimming backdrop, focus trap, and blocked background
	 * interaction (Base UI's own `modal` handling), instead of the default
	 * non-modal push-content behavior. Backdrop clicks dismiss the panel
	 * unless overridden. @default false
	 */
	modal?: boolean;
	/** Renders as a small popover pinned to its trigger element instead of a drawer. */
	anchored?: boolean;
	/** Desktop-only drag-to-resize on the panel's near edge. Ignored for anchored panels. @default true */
	resizable?: boolean;
	/** @default 280 */
	minWidth?: number;
	/** @default 720 */
	maxWidth?: number;
}

export interface PageProps {
	children: React.ReactNode;
	header?: React.ReactNode;
	toolbar?: React.ReactNode;
	panels?: { left?: PanelConfig; right?: PanelConfig };
	className?: string;
}

function PanelHeader({
	header,
	panelId,
	onClose,
}: {
	header: PanelHeaderConfig;
	panelId: string;
	onClose?: () => void;
}) {
	const { title, icon, actions, showClose = true } = header;
	return (
		<div className="flex h-11 w-full shrink-0 items-center border-b px-3">
			{(title || icon) && (
				<div className="flex min-w-0 items-center gap-2">
					{icon}
					{title && <span className="shrink truncate text-xs font-medium">{title}</span>}
				</div>
			)}
			<div className="ml-auto flex shrink-0 items-center gap-1">
				{actions}
				{showClose && (
					<Button
						variant="ghost"
						size="icon"
						onClick={(e) => {
							e.stopPropagation();
							onClose ? onClose() : sidebarActions.setOpen(panelId, false);
						}}
					>
						<IconX />
					</Button>
				)}
			</div>
		</div>
	);
}

function PanelTabBar({
	panelId,
	tabs,
	currentTab,
	header,
	onClose,
}: {
	panelId: string;
	tabs: Array<PanelTabConfig>;
	currentTab: string | undefined;
	header: PanelHeaderConfig | undefined;
	onClose?: () => void;
}) {
	return (
		<div className="flex h-11 shrink-0 items-center border-b px-2">
			<div className="scrollbar-hide flex min-w-0 items-center gap-1 overflow-x-auto">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => sidebarActions.setActiveTab(panelId, tab.id)}
						className={cn(
							"flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
							currentTab === tab.id
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:text-foreground"
						)}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>
			<div className="ml-auto flex shrink-0 items-center gap-1">
				{header?.actions}
				{(header?.showClose ?? true) && (
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={(e) => {
							e.stopPropagation();
							onClose ? onClose() : sidebarActions.setOpen(panelId, false);
						}}
					>
						<IconX className="size-4" />
					</Button>
				)}
			</div>
		</div>
	);
}

// Exported so usePanelTrigger can render it inside a Popover for anchored panels.
export function PanelContent({
	panelId,
	fallbackHeader,
	hideHeader = false,
	isPopover = false,
	onClose,
}: {
	panelId: string;
	fallbackHeader?: React.ReactNode | PanelHeaderConfig;
	hideHeader?: boolean;
	isPopover?: boolean;
	onClose?: () => void;
}) {
	const panelState = useStore(
		sidebarStore,
		useCallback((state: { sidebars: Record<string, any> }) => state.sidebars[panelId], [panelId])
	);

	const isOpen = panelState?.open ?? false;
	const header = panelState?.header as PanelHeaderConfig | undefined;
	const content = panelState?.content as React.ReactNode;
	const tabs = panelState?.tabs as Array<PanelTabConfig> | undefined;
	const activeTab = panelState?.activeTab as string | undefined;
	const lastTriggerId = panelState?.lastTriggerId as string | undefined;

	if (!isOpen) return null;

	const hasTabs = tabs && tabs.length > 0;
	const currentTab = activeTab ?? tabs?.[0]?.id;

	return (
		<SidebarContext.Provider value={{ id: panelId, isCollapsed: false }}>
			<div className={isPopover ? "flex min-h-0 flex-1 flex-col" : "flex h-full flex-col"}>
				{hasTabs ? (
					<>
						{!hideHeader && (
							<PanelTabBar
								panelId={panelId}
								tabs={tabs}
								currentTab={currentTab}
								header={header}
								onClose={onClose}
							/>
						)}
						{/* key forces remount when switching items */}
						<div key={lastTriggerId} className="flex-1 overflow-y-auto p-2">
							{tabs.find((t) => t.id === currentTab)?.content ?? <div />}
						</div>
					</>
				) : (
					<>
						{!hideHeader &&
							(header ? (
								<PanelHeader header={header} panelId={panelId} onClose={onClose} />
							) : fallbackHeader && isPanelHeaderConfig(fallbackHeader) ? (
								<PanelHeader header={fallbackHeader} panelId={panelId} onClose={onClose} />
							) : (
								fallbackHeader && (
									<div className="flex h-11 shrink-0 items-center border-b px-3">{fallbackHeader}</div>
								)
							))}
						<div className="flex-1 overflow-y-auto p-2">{content || <div />}</div>
					</>
				)}
			</div>
		</SidebarContext.Provider>
	);
}

function PageLoader() {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<IconLoader2 className="size-5 animate-spin text-muted-foreground" />
		</div>
	);
}

export function Page({ children, header, toolbar, panels, className }: PageProps) {
	const [isClient, setIsClient] = useState(false);
	// Where a `modal` panel's backdrop portals to, so it covers the whole
	// page (including the sticky header below) instead of just the drawer's
	// own confined push-region — see IndentDrawerContent's backdropContainer.
	const [pageRootContainer, setPageRootContainer] = useState<HTMLDivElement | null>(null);
	const [leftFloatContainer, setLeftFloatContainer] = useState<HTMLDivElement | null>(null);
	const [rightFloatContainer, setRightFloatContainer] = useState<HTMLDivElement | null>(null);

	// See sidebar-store.ts's drawerHandles doc comment.
	const leftDrawerActionsRef = useRef<IndentDrawerActions | null>(null);
	const rightDrawerActionsRef = useRef<IndentDrawerActions | null>(null);
	const hasRegistered = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

	const leftPanelState = useStore(
		sidebarStore,
		useCallback(
			(state: { sidebars: Record<string, any> }) => (panels?.left?.id ? state.sidebars[panels.left.id] : undefined),
			[panels?.left?.id]
		)
	);
	const rightPanelState = useStore(
		sidebarStore,
		useCallback(
			(state: { sidebars: Record<string, any> }) =>
				panels?.right?.id ? state.sidebars[panels.right.id] : undefined,
			[panels?.right?.id]
		)
	);

	const isLeftOpen = panels?.left ? (leftPanelState?.open ?? panels.left.defaultOpen ?? false) : false;
	const isRightOpen = panels?.right ? (rightPanelState?.open ?? panels.right.defaultOpen ?? false) : false;
	const leftLastTriggerId = leftPanelState?.lastTriggerId as string | undefined;
	const rightLastTriggerId = rightPanelState?.lastTriggerId as string | undefined;

	// A user's drag-resize (px, sticky across visits) always wins over the
	// route's own configured default — see resizedWidth's doc comment in
	// sidebar-store.ts. Fed to BOTH IndentDrawerRegion and IndentDrawerContent
	// below so the push-margin and the drawer's own rendered width can never
	// drift apart, regardless of whether the underlying value is a px number
	// or the route's original width string (fixed px, %, whatever).
	const leftWidth = leftPanelState?.resizedWidth ? `${leftPanelState.resizedWidth}px` : panels?.left?.width;
	const rightWidth = rightPanelState?.resizedWidth ? `${rightPanelState.resizedWidth}px` : panels?.right?.width;

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Register panels and handle defaultOpen.
	useEffect(() => {
		if (!isClient) return;

		if (panels?.left && !hasRegistered.current.left) {
			const existing = sidebarStore.state.sidebars[panels.left.id];
			const shouldPersist = panels.left.persistOpenState ?? true;

			if (!existing) {
				sidebarActions.registerSidebar(panels.left.id, {
					open: panels.left.defaultOpen ?? false,
					side: "left",
					variant: "panel",
					anchored: panels.left.anchored,
					width: panels.left.width,
					height: panels.left.height,
					mobileZoom: panels.left.mobileZoom,
				});
			} else {
				// See syncPanelConfig's doc comment in sidebar-store.ts — this is
				// NOT optional, skipping it reintroduces the stale-config bug.
				sidebarActions.syncPanelConfig(panels.left.id, {
					anchored: panels.left.anchored,
					width: panels.left.width,
					height: panels.left.height,
					mobileZoom: panels.left.mobileZoom,
				});
				if (!shouldPersist) sidebarActions.setOpen(panels.left.id, panels.left.defaultOpen ?? false);
			}
			if (panels.left.tabs) sidebarActions.setTabs(panels.left.id, panels.left.tabs);
			if (panels.left.defaultTab) sidebarActions.setActiveTab(panels.left.id, panels.left.defaultTab);
			hasRegistered.current.left = true;
		}

		if (panels?.right && !hasRegistered.current.right) {
			const existing = sidebarStore.state.sidebars[panels.right.id];
			const shouldPersist = panels.right.persistOpenState ?? true;

			if (!existing) {
				sidebarActions.registerSidebar(panels.right.id, {
					open: panels.right.defaultOpen ?? false,
					side: "right",
					variant: "panel",
					anchored: panels.right.anchored,
					width: panels.right.width,
					height: panels.right.height,
					mobileZoom: panels.right.mobileZoom,
				});
			} else {
				sidebarActions.syncPanelConfig(panels.right.id, {
					anchored: panels.right.anchored,
					width: panels.right.width,
					height: panels.right.height,
					mobileZoom: panels.right.mobileZoom,
				});
				if (!shouldPersist) sidebarActions.setOpen(panels.right.id, panels.right.defaultOpen ?? false);
			}
			if (panels.right.tabs) sidebarActions.setTabs(panels.right.id, panels.right.tabs);
			if (panels.right.defaultTab) sidebarActions.setActiveTab(panels.right.id, panels.right.defaultTab);
			hasRegistered.current.right = true;
		}
	}, [isClient, panels]);

	// Register/unregister this panel's imperative drawer-close handle —
	// skipped for anchored panels, which never mount an IndentDrawer here.
	useEffect(() => {
		if (!panels?.left?.id || panels.left.anchored) return;
		const id = panels.left.id;
		sidebarActions.registerDrawerHandle(id, { close: () => leftDrawerActionsRef.current?.close() });
		return () => sidebarActions.unregisterDrawerHandle(id);
	}, [panels?.left?.id, panels?.left?.anchored]);

	useEffect(() => {
		if (!panels?.right?.id || panels.right.anchored) return;
		const id = panels.right.id;
		sidebarActions.registerDrawerHandle(id, { close: () => rightDrawerActionsRef.current?.close() });
		return () => sidebarActions.unregisterDrawerHandle(id);
	}, [panels?.right?.id, panels?.right?.anchored]);

	if (!isClient) {
		return (
			<div className={cn("flex h-full w-full items-center justify-center", className)}>
				<PageLoader />
			</div>
		);
	}

	// Anchored panels render entirely at their own trigger's call site (see
	// usePanelTrigger's panelPopover) — Page skips them here.
	const showRightDrawer = panels?.right && !panels.right.anchored;
	const showLeftDrawer = panels?.left && !panels.left.anchored;

	// The route's own content needs its own scroll container — neither this
	// outer wrapper (overflow-hidden, just clips) nor IndentDrawerRegion
	// below (also overflow-hidden by design — it's clipping the
	// push-animation area, not limiting content) provide one.
	let content: React.ReactNode = <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>;

	if (showRightDrawer && panels?.right) {
		content = (
			<IndentDrawerProvider>
				<div ref={setRightFloatContainer} className="relative min-h-0 flex-1">
					<IndentDrawerIndentBackground />
					<IndentDrawerRegion
						side="right"
						width={rightWidth}
						height={panels.right.height}
						mobileZoom={panels.right.mobileZoom}
					>
						{content}
					</IndentDrawerRegion>
					<IndentDrawer
						side="right"
						open={isRightOpen}
						modal={panels.right.modal}
						actionsRef={rightDrawerActionsRef}
						onOpenChange={(open: boolean) => sidebarActions.setOpen(panels.right!.id, open)}
					>
						<IndentDrawerContent
							container={rightFloatContainer}
							backdropContainer={pageRootContainer}
							side="right"
							width={rightWidth}
							height={panels.right.height}
							modal={panels.right.modal}
							resizable={panels.right.resizable ?? true}
							onResize={(px) => sidebarActions.setResizedWidth(panels.right!.id, px)}
							minWidth={panels.right.minWidth}
							maxWidth={panels.right.maxWidth}
						>
							<PanelContent
								key={rightLastTriggerId}
								panelId={panels.right.id}
								fallbackHeader={panels.right.header}
								onClose={() => sidebarActions.close(panels.right!.id)}
							/>
						</IndentDrawerContent>
					</IndentDrawer>
				</div>
			</IndentDrawerProvider>
		);
	}

	if (showLeftDrawer && panels?.left) {
		content = (
			<IndentDrawerProvider>
				<div ref={setLeftFloatContainer} className="relative min-h-0 flex-1">
					<IndentDrawerIndentBackground />
					<IndentDrawerRegion
						side="left"
						width={leftWidth}
						height={panels.left.height}
						mobileZoom={panels.left.mobileZoom}
					>
						{content}
					</IndentDrawerRegion>
					<IndentDrawer
						side="left"
						open={isLeftOpen}
						modal={panels.left.modal}
						actionsRef={leftDrawerActionsRef}
						onOpenChange={(open: boolean) => sidebarActions.setOpen(panels.left!.id, open)}
					>
						<IndentDrawerContent
							container={leftFloatContainer}
							backdropContainer={pageRootContainer}
							side="left"
							width={leftWidth}
							height={panels.left.height}
							modal={panels.left.modal}
							resizable={panels.left.resizable ?? true}
							onResize={(px) => sidebarActions.setResizedWidth(panels.left!.id, px)}
							minWidth={panels.left.minWidth}
							maxWidth={panels.left.maxWidth}
						>
							<PanelContent
								key={leftLastTriggerId}
								panelId={panels.left.id}
								fallbackHeader={panels.left.header}
								onClose={() => sidebarActions.close(panels.left!.id)}
							/>
						</IndentDrawerContent>
					</IndentDrawer>
				</div>
			</IndentDrawerProvider>
		);
	}

	return (
		<div ref={setPageRootContainer} className={cn("relative flex h-full w-full flex-col overflow-hidden", className)}>
			{header && <PageHeader>{header}</PageHeader>}
			{toolbar && (
				<div className="flex h-11 shrink-0 items-center gap-1 border-b px-2 md:gap-2 md:px-3">{toolbar}</div>
			)}
			{/* No extra wrapping div here on purpose: `content`'s own outermost
			    element already carries `relative min-h-0 flex-1` (set on the
			    innermost ref={setXFloatContainer} div above, which becomes the
			    outermost one once any drawer wrapping is applied). An extra
			    non-flex wrapper div around it would make that flex-1/min-h-0
			    inert (no flex container to size against), letting the
			    container grow to its unbounded content height instead of the
			    available viewport space — which pushes the portalled drawer
			    far off-screen on mobile. Direct flex-item child of this
			    flex-col root is what makes the sizing chain work. */}
			{content}
		</div>
	);
}
