"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconLayoutSidebar, IconX } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import * as React from "react";
import { sidebarActions, sidebarStore } from "../../../../../apps/start/src/lib/sidebar/sidebar-store";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { TooltipProvider } from "../tooltip";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_COLLAPSE_THRESHOLD = 224;
const SIDEBAR_MIN_DRAG_WIDTH = SIDEBAR_COLLAPSE_THRESHOLD;
const SIDEBAR_COLLAPSE_EDGE_DISTANCE = 64;
const SIDEBAR_MAX_RESIZED_WIDTH = 480;
const SIDEBAR_MIN_CONTENT_WIDTH = 320;

function SidebarResizeHandle({ id, side }: { id: string; side: "left" | "right" }) {
	const cleanupRef = React.useRef<(() => void) | null>(null);

	React.useEffect(() => () => cleanupRef.current?.(), []);

	const resizeTo = (width: number) => {
		const maxWidth = Math.min(SIDEBAR_MAX_RESIZED_WIDTH, window.innerWidth - SIDEBAR_MIN_CONTENT_WIDTH);
		return Math.round(Math.min(maxWidth, Math.max(SIDEBAR_MIN_DRAG_WIDTH, width)));
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		const aside = event.currentTarget.closest<HTMLElement>("aside");
		if (!aside) return;

		event.preventDefault();
		event.stopPropagation();

		const startWidth = aside.getBoundingClientRect().width;
		const startX = event.clientX;
		const pointerId = event.pointerId;
		const widthProperty = `--sidebar-${id}-width`;
		const previousWidth = document.documentElement.style.getPropertyValue(widthProperty);
		const previousCursor = document.body.style.cursor;
		const previousUserSelect = document.body.style.userSelect;
		let nextWidth = startWidth;

		aside.dataset.resizing = "true";
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		const cleanup = () => {
			document.removeEventListener("pointermove", handleMove, true);
			document.removeEventListener("pointerup", handleUp, true);
			document.removeEventListener("pointercancel", handleCancel, true);
			window.removeEventListener("blur", handleBlur);
			delete aside.dataset.resizing;
			document.body.style.cursor = previousCursor;
			document.body.style.userSelect = previousUserSelect;
			cleanupRef.current = null;
		};
		const handleMove = (moveEvent: PointerEvent) => {
			if (moveEvent.pointerId !== pointerId) return false;
			moveEvent.stopPropagation();
			const delta = moveEvent.clientX - startX;
			const requestedWidth = startWidth + (side === "left" ? delta : -delta);
			if (requestedWidth < SIDEBAR_COLLAPSE_EDGE_DISTANCE) {
				cleanup();
				sidebarActions.collapseSidebar(id);
				return true;
			}
			nextWidth = resizeTo(requestedWidth);
			document.documentElement.style.setProperty(widthProperty, `${nextWidth}px`);
			return false;
		};
		const handleUp = (upEvent: PointerEvent) => {
			if (upEvent.pointerId !== pointerId) return;
			if (handleMove(upEvent)) return;
			cleanup();
			if (nextWidth !== startWidth) sidebarActions.setResizedWidth(id, nextWidth);
		};
		const handleCancel = (cancelEvent?: PointerEvent) => {
			if (cancelEvent && cancelEvent.pointerId !== pointerId) return;
			cleanup();
			if (previousWidth) document.documentElement.style.setProperty(widthProperty, previousWidth);
			else document.documentElement.style.removeProperty(widthProperty);
		};
		const handleBlur = () => handleCancel();

		cleanupRef.current = handleCancel;
		document.addEventListener("pointermove", handleMove, true);
		document.addEventListener("pointerup", handleUp, true);
		document.addEventListener("pointercancel", handleCancel, true);
		window.addEventListener("blur", handleBlur);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		const aside = event.currentTarget.closest<HTMLElement>("aside");
		if (!aside) return;

		event.preventDefault();
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const step = event.shiftKey ? 32 : 8;
		const requestedWidth = aside.getBoundingClientRect().width + (side === "left" ? direction : -direction) * step;
		if (requestedWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
			sidebarActions.collapseSidebar(id);
			return;
		}
		const nextWidth = resizeTo(requestedWidth);
		sidebarActions.setResizedWidth(id, nextWidth);
	};

	return (
		<div
			role="separator"
			aria-label="Resize sidebar"
			aria-orientation="vertical"
			aria-valuemin={SIDEBAR_MIN_DRAG_WIDTH}
			aria-valuemax={SIDEBAR_MAX_RESIZED_WIDTH}
			aria-valuenow={sidebarStore.state.sidebars[id]?.resizedWidth ?? 256}
			tabIndex={0}
			onPointerDown={handlePointerDown}
			onKeyDown={handleKeyDown}
			className={cn(
				"absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none select-none focus-visible:outline-2 focus-visible:outline-primary",
				"after:absolute after:inset-y-0 after:w-px after:bg-transparent hover:after:bg-primary/40",
				side === "left" ? "right-0 after:right-0" : "left-0 after:left-0"
			)}
		/>
	);
}

// Context for sidebar ID
interface SidebarContextProps {
	id: string;
	isOverlayOpen?: boolean;
}
export const SidebarContext = React.createContext<SidebarContextProps | null>(null);

// Hook to use sidebar
export function useSidebar(id?: string) {
	const context = React.useContext(SidebarContext);
	const sidebarId = id ?? context?.id;

	if (!sidebarId) {
		throw new Error("useSidebar must be called with an id or within a Sidebar component");
	}

	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);

	const effectiveSidebar = React.useMemo(() => {
		if (context?.isOverlayOpen && sidebar) {
			return { ...sidebar, open: true };
		}
		return sidebar;
	}, [sidebar, context?.isOverlayOpen]);

	const state = effectiveSidebar?.open ? "expanded" : "collapsed";

	return {
		state,
		isCollapsed: state === "collapsed",
		sidebar: effectiveSidebar,
		toggle: (isMobile = false) => sidebarActions.toggleSidebar(sidebarId, isMobile),
		setOpen: (open: boolean) => sidebarActions.setOpen(sidebarId, open),
		setVariant: (variant: "default" | "floating") => sidebarActions.setVariant(sidebarId, variant),
	};
}

function SidebarOverlay({
	id,
	side,
	width,
	isMobile,
	open,
	children,
}: {
	id: string;
	side: "left" | "right";
	width: string;
	isMobile: boolean;
	open: boolean;
	children: React.ReactNode;
}) {
	return (
		<DrawerPrimitive.Root
			open={open}
			modal={isMobile}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) sidebarActions.closeSidebarOverlay(id);
			}}
		>
			<DrawerPrimitive.Portal>
				{/*{isMobile && (*/}
				<DrawerPrimitive.Backdrop className="fixed inset-0 z-[10020] bg-black/50 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0" />
				{/*)}*/}
				<DrawerPrimitive.Viewport
					className={cn(
						"pointer-events-none fixed inset-0 z-[10030] flex",
						side === "left" ? "justify-start" : "justify-end"
					)}
				>
					<DrawerPrimitive.Popup
						data-sidebar-id={id}
						data-sidebar-overlay
						data-side={side}
						onPointerEnter={() => {
							if (!isMobile) {
								sidebarActions.cancelSidebarOverlayOpen(id);
								sidebarActions.cancelSidebarOverlayClose(id);
							}
						}}
						onPointerLeave={() => {
							if (!isMobile) sidebarActions.scheduleSidebarOverlayClose(id);
						}}
						onClickCapture={(event) => {
							if ((event.target as HTMLElement).closest("a")) sidebarActions.closeSidebarOverlay(id);
						}}
						initialFocus={false}
						style={{ width }}
						className={cn(
							"pointer-events-auto relative flex h-dvh max-w-[calc(100vw-1rem)] flex-col overflow-hidden bg-background shadow-lg outline-none",
							"transition-[transform,opacity,zoom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform border",
							side === "left"
								? "rounded-r-2xl data-starting-style:transform-[translateX(-100%)] data-ending-style:transform-[translateX(-100%)] border-l-0"
								: "rounded-l-2xl data-starting-style:transform-[translateX(100%)] data-ending-style:transform-[translateX(100%)] border-r-0"
						)}
					>
						<DrawerPrimitive.Title className="sr-only">Navigation</DrawerPrimitive.Title>
						<DrawerPrimitive.Description className="sr-only">Navigate the workspace</DrawerPrimitive.Description>
						<DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col overflow-hidden">
							{children}
						</DrawerPrimitive.Content>
						{isMobile && (
							<DrawerPrimitive.Close
								className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Close navigation"
							>
								<IconX className="size-4" />
							</DrawerPrimitive.Close>
						)}
					</DrawerPrimitive.Popup>
				</DrawerPrimitive.Viewport>
			</DrawerPrimitive.Portal>
		</DrawerPrimitive.Root>
	);
}

// Sidebar Root
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
	id: string;
	side?: "left" | "right";
	variant?: "default" | "floating";
	collapsible?: boolean;
	defaultOpen?: boolean;
	width?: string;
	resizable?: boolean;
	keyboardShortcut?: string;
	rootClassName?: string;
}

export function Sidebar({
	id,
	side = "left",
	variant = "default",
	collapsible = true,
	defaultOpen = true,
	width = SIDEBAR_WIDTH,
	resizable = false,
	keyboardShortcut,
	className,
	rootClassName,
	children,
	...props
}: SidebarProps) {
	const isMobile = useIsMobile();
	const [isClient, setIsClient] = React.useState(false);
	const hasRegistered = React.useRef(false);

	const sidebar = useStore(sidebarStore, (state) => state.sidebars[id]);

	// Mark when we're on the client
	React.useEffect(() => {
		setIsClient(true);
	}, []);

	// Register sidebar on mount
	React.useEffect(() => {
		if (hasRegistered.current) return;

		const normalizedShortcut =
			keyboardShortcut && keyboardShortcut.length === 1 ? `mod+${keyboardShortcut}` : keyboardShortcut;

		const existing = sidebarStore.state.sidebars[id];
		if (!existing) {
			sidebarActions.registerSidebar(id, {
				open: defaultOpen,
				variant,
				side,
				openMobile: false,
				keyboardShortcut: normalizedShortcut,
			});
		} else if (normalizedShortcut !== existing.keyboardShortcut) {
			// Update keyboard shortcut if changed
			sidebarActions.setKeyboardShortcut(id, normalizedShortcut);
		}

		hasRegistered.current = true;

		return () => {
			hasRegistered.current = false;
			// sidebarActions.unregisterSidebar(id);
		};
	}, [id, defaultOpen, variant, side, keyboardShortcut]);

	// Keyboard shortcut handler
	React.useEffect(() => {
		if (!keyboardShortcut) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey && !event.ctrlKey) return;

			const key = keyboardShortcut.replace(/mod\+/i, "").toLowerCase();
			if (event.key.toLowerCase() === key) {
				event.preventDefault();
				sidebarActions.toggleSidebar(id, isMobile);
			}
		};

		// Capture ensures the global navigation shortcut still works while an
		// overlay component owns focus or stops a bubbling key event.
		window.addEventListener("keydown", handleKeyDown, true);
		return () => window.removeEventListener("keydown", handleKeyDown, true);
	}, [id, isMobile, keyboardShortcut]);

	const isDockedOpen = !isMobile && (sidebar?.open ?? defaultOpen);
	const isOverlayOpen = sidebar?.overlayOpen ?? false;
	const savedWidth = sidebar?.resizedWidth;
	const expandedWidth =
		resizable && savedWidth !== undefined && Number.isFinite(savedWidth) && savedWidth > 0
			? `${Math.min(SIDEBAR_MAX_RESIZED_WIDTH, Math.max(SIDEBAR_COLLAPSE_THRESHOLD, savedWidth))}px`
			: width;
	const dockedWidth = `var(--sidebar-${id}-width, ${isDockedOpen ? expandedWidth : "0px"})`;
	const renderedDockedWidth = resizable
		? `min(${dockedWidth}, calc(100vw - ${SIDEBAR_MIN_CONTENT_WIDTH}px))`
		: dockedWidth;
	const overlayWidth = `min(${expandedWidth}, calc(100vw - 1rem))`;
	const skeletonWidth = `var(--sidebar-${id}-width, ${defaultOpen ? width : "0px"})`;
	const renderedSkeletonWidth = resizable
		? `min(${skeletonWidth}, calc(100vw - ${SIDEBAR_MIN_CONTENT_WIDTH}px))`
		: skeletonWidth;

	// Keep the pre-hydration CSS variable in sync with the persisted docking state.
	React.useEffect(() => {
		document.documentElement.style.setProperty(`--sidebar-${id}-width`, isDockedOpen ? expandedWidth : "0px");
	}, [expandedWidth, id, isDockedOpen]);

	const baseStyles = "sticky top-0 h-full overflow-hidden transition-[width] data-[resizing=true]:transition-none";
	const variantRootStyles = {
		default: "",
		floating: "m-3",
	};
	const variantStyles = {
		default: "bg-sidebar",
		floating: "bg-sidebar rounded-lg border",
	};

	// Server: render skeleton with CSS variable only (no content)
	// This prevents hydration mismatch because server doesn't know localStorage state
	if (!isClient) {
		return (
			<div className={cn(variantRootStyles[variant], rootClassName, "hidden md:block")}>
				<aside
					data-sidebar-id={id}
					data-variant={variant}
					data-side={side}
					style={{
						width: renderedSkeletonWidth,
						minWidth: renderedSkeletonWidth,
						maxWidth: renderedSkeletonWidth,
					}}
					className={cn(baseStyles, variantStyles[variant], className, "")}
					{...props}
				>
					{/* Skeleton - no content on server */}
					<div
						className="flex h-full flex-col overflow-hidden"
						style={{
							width: renderedSkeletonWidth,
						}}
					></div>
				</aside>
			</div>
		);
	}

	// Client: render full sidebar with content
	return (
		<SidebarContext.Provider value={{ id, isOverlayOpen }}>
			<TooltipProvider delay={0}>
				{isDockedOpen && (
					<div className={cn(variantRootStyles[variant], rootClassName)}>
						<aside
							data-sidebar-id={id}
							data-state="expanded"
							data-variant={variant}
							data-side={side}
							style={{
								width: renderedDockedWidth,
								minWidth: renderedDockedWidth,
								maxWidth: renderedDockedWidth,
							}}
							className={cn(baseStyles, variantStyles[variant], className)}
							{...props}
						>
							<div className="flex h-full flex-col overflow-hidden" style={{ width: renderedDockedWidth }}>
								{children}
							</div>
							{resizable && <SidebarResizeHandle id={id} side={side} />}
						</aside>
					</div>
				)}
				<SidebarOverlay id={id} side={side} width={overlayWidth} isMobile={isMobile} open={isOverlayOpen}>
					{children}
				</SidebarOverlay>
			</TooltipProvider>
		</SidebarContext.Provider>
	);
}

// Sidebar Header
export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("flex flex-col gap-0.5 p-2", className)} {...props} />;
}

// Sidebar Content
export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2", className)} {...props} />;
}

// Sidebar Footer
export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("mt-auto border-t p-2", className)} {...props} />;
}

// Sidebar Group
export function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

// Sidebar Group Label
export function SidebarGroupLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("px-3 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

// Sidebar Menu
export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
	return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

// Sidebar Menu Item
interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
	isActive?: boolean;
}

export function SidebarMenuItem({ className, isActive, children, ...props }: SidebarMenuItemProps) {
	return (
		<li
			className={cn(
				"relative flex w-full items-center gap-1 shrink-0 px-1 min-h-10",
				"flex w-full items-center gap-3 transition-all justify-start text-left flex-1 group/item rounded-lg text-sm",
				"text-muted-foreground",
				"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
				className
			)}
			data-active={isActive}
			{...props}
		>
			{children}
		</li>
	);
}

// Sidebar Menu Sub
export function SidebarMenuSub({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("flex items-center gap-1 w-fit", className)} {...props}>
			{children}
		</div>
	);
}

// Sidebar Menu Button
interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	isActive?: boolean;
	tooltip?: string;
	asChild?: boolean;
	icon?: React.ReactNode;
	size?: "default" | "large" | "small";
}

export function SidebarMenuButton({
	isActive,
	tooltip,
	icon,
	className,
	children,
	size,
	...props
}: SidebarMenuButtonProps) {
	return (
		<button
			type="button"
			data-active={isActive}
			aria-label={tooltip}
			className={cn(
				"flex w-full items-center gap-3 transition-all justify-start text-left flex-1 rounded-lg p-2 min-h-10",
				// Explicit color here, not text-inherit — this is the actual visible text, so it needs
				// its own transition driven by the exact same :hover/data-active state change as the
				// wrapping SidebarMenuItem's own background, not a value it merely inherits (and which
				// would then be re-animated a second time on the way down through this element's own
				// transition, reading as a lag between the two). group/item comes from that wrapping
				// SidebarMenuItem — see its own className.
				"text-muted-foreground group-hover/item:text-sidebar-accent-foreground",
				"group-data-[active=true]/item:font-medium group-data-[active=true]/item:text-sidebar-accent-foreground",
				"focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
				size === "large" && "font-semibold py-3",
				size === "small" && "text-sm min-h-auto p-1",
				isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
				className
			)}
			{...props}
		>
			{icon && (
				<span className={cn("[&>svg]:size-4 [&>svg]:shrink-0", size === "small" && "[&>svg]:size-4")}>{icon}</span>
			)}
			{children ? <span className="flex-1 truncate">{children}</span> : null}
		</button>
	);
}

// Sidebar Submenu
interface SidebarSubmenuProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string;
	icon?: React.ReactNode;
	defaultOpen?: boolean;
	forcePopup?: boolean;
}

export function SidebarSubmenu({
	label,
	icon,
	defaultOpen = false,
	className,
	children,
	forcePopup = false,
	...props
}: SidebarSubmenuProps) {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);

	const trigger = (
		<button
			type="button"
			onClick={() => !forcePopup && setIsOpen(!isOpen)}
			className={cn(
				"flex w-full min-w-full items-center gap-3 text-muted-foreground transition-all justify-start text-left flex-1 rounded-lg p-2",
				"hover:bg-sidebar-accent hover:font-medium hover:text-sidebar-accent-foreground",
				"focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
				isOpen && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
			)}
		>
			{icon && <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>}
			<span className="flex-1 truncate text-left">{label}</span>
			<IconChevronRight className={cn("transition-all size-4", isOpen && "rotate-90")} />
		</button>
	);

	if (forcePopup) {
		return (
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger render={trigger} />

				<PopoverContent side="right" align="start" className="w-48 p-0">
					<div className="flex flex-col gap-0.5">
						<div className="p-3 text-sm font-semibold border-b flex items-center gap-2">
							{icon && <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>}
							{label}
						</div>
						<div className="flex flex-col gap-0.5 p-1">{children}</div>
					</div>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<div className={cn("w-full", className)} {...props}>
			{trigger}
			{isOpen && <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l pl-3">{children}</div>}
		</div>
	);
}

// Sidebar Submenu Item
export function SidebarSubmenuItem({
	isActive,
	className,
	children,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
	return (
		<button
			type="button"
			data-active={isActive}
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all",
				"text-muted-foreground",
				"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				"focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
				isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
				className
			)}
			{...props}
		>
			{children}
		</button>
	);
}

// Sidebar Trigger
export function SidebarTrigger({
	sidebarId: propSidebarId,
	className,
	onClick,
	onPointerEnter,
	onPointerLeave,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { sidebarId?: string }) {
	const context = React.useContext(SidebarContext);
	const sidebarId = propSidebarId ?? context?.id;

	if (!sidebarId) {
		throw new Error("SidebarTrigger must be used within a Sidebar component or passed a sidebarId prop");
	}

	const isMobile = useIsMobile();
	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	const isDockedOpen = sidebar?.open ?? true;

	return (
		<Button
			variant="accent"
			size="sm"
			className={cn("", className)}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (isMobile) sidebarActions.toggleSidebar(sidebarId, true);
				else sidebarActions.setOpen(sidebarId, true);
			}}
			onPointerEnter={(event) => {
				onPointerEnter?.(event);
				if (!isMobile && !isDockedOpen) sidebarActions.scheduleSidebarOverlayOpen(sidebarId);
			}}
			onPointerLeave={(event) => {
				onPointerLeave?.(event);
				if (!isMobile && !isDockedOpen) {
					sidebarActions.cancelSidebarOverlayOpen(sidebarId);
				}
			}}
			{...props}
		>
			<IconLayoutSidebar className="h-4 w-4" />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}
