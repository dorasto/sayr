"use client";

import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconLayoutSidebar } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import * as React from "react";
import {
  sidebarActions,
  sidebarStore,
} from "../../../../../apps/start/src/lib/sidebar/sidebar-store";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "3.5rem";

// Context for sidebar ID
interface SidebarContextProps {
  id: string;
  isCollapsed?: boolean;
  isMobile?: boolean;
}
export const SidebarContext = React.createContext<SidebarContextProps | null>(null);

// Hook to use sidebar
export function useSidebar(id?: string) {
  const context = React.useContext(SidebarContext);
  const isMobileEnv = useIsMobile();
  const sidebarId = id ?? context?.id;
  const isCollapsedContext = context?.isCollapsed;
  const isMobile = context?.isMobile ?? isMobileEnv;

  if (!sidebarId) {
    throw new Error(
      "useSidebar must be called with an id or within a Sidebar component",
    );
  }

  const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);

  const effectiveSidebar = React.useMemo(() => {
    if (isMobile && sidebar) {
      return { ...sidebar, open: true };
    }

    if (isCollapsedContext && sidebar) {
      return { ...sidebar, open: false, openMobile: false };
    }
    return sidebar;
  }, [sidebar, isCollapsedContext, isMobile]);

  const state = effectiveSidebar?.open ? "expanded" : "collapsed";

  return {
    state,
    isCollapsed: state === "collapsed",
    sidebar: effectiveSidebar,
    toggle: (isMobile = false) =>
      sidebarActions.toggleSidebar(sidebarId, isMobile),
    setOpen: (open: boolean, isMobile = false) =>
      sidebarActions.setOpen(sidebarId, open, isMobile),
    setVariant: (variant: "default" | "floating") =>
      sidebarActions.setVariant(sidebarId, variant),
  };
}

// Sidebar Root
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  side?: "left" | "right";
  variant?: "default" | "floating";
  collapsible?: boolean;
  defaultOpen?: boolean;
  width?: string;
  collapsedWidth?: string;
  keyboardShortcut?: string;
  rootClassName?: string;
  isCollapsed?: boolean;
}

export function Sidebar({
  id,
  side = "left",
  variant = "default",
  collapsible = true,
  defaultOpen = true,
  width = SIDEBAR_WIDTH,
  collapsedWidth = SIDEBAR_WIDTH_COLLAPSED,
  keyboardShortcut,
  className,
  rootClassName,
  isCollapsed,
  children,
  ...props
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = React.useState(false);
  const hasRegistered = React.useRef(false);

  // Subscribe to store state - this will have the persisted value on client
  const { sidebar } = useSidebar(id);

  // Mark when we're on the client
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Register sidebar on mount
  React.useEffect(() => {
    if (hasRegistered.current) return;

    const normalizedShortcut =
      keyboardShortcut && keyboardShortcut.length === 1
        ? `mod+${keyboardShortcut}`
        : keyboardShortcut;

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
      // Only support mod+key for now
      if (!event.metaKey && !event.ctrlKey) return;

      const key = keyboardShortcut.replace(/mod\+/i, "").toLowerCase();
      if (event.key.toLowerCase() === key) {
        event.preventDefault();
        sidebarActions.toggleSidebar(id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [id, keyboardShortcut]);

  // Update CSS variable when sidebar state changes
  React.useEffect(() => {
    if (sidebar) {
      const newWidth = sidebar.open ? width : collapsedWidth;
      document.documentElement.style.setProperty(
        `--sidebar-${id}-width`,
        newWidth,
      );
    }
  }, [sidebar?.open, id, width, collapsedWidth, sidebar]);

  // Use sidebar state if available, otherwise defaultOpen
  const isOpen = isCollapsed
    ? false
    : sidebar
      ? isMobile
        ? sidebar.openMobile
        : sidebar.open
      : defaultOpen;
  const currentWidth = isOpen ? width : collapsedWidth;

  // Mobile: show Sheet
  if (isMobile) {
    return (
      <SidebarContext.Provider
        value={{ id, isCollapsed: false, isMobile: true }}
      >
        <Sheet
          open={sidebar ? sidebar.openMobile : false}
          onOpenChange={(open) => sidebarActions.setOpen(id, open, true)}
        >
          <SheetContent side={side} className="w-[18rem] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Mobile navigation menu</SheetDescription>
            </SheetHeader>
            <div className="flex h-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      </SidebarContext.Provider>
    );
  }

  const baseStyles = "sticky top-0 h-full overflow-hidden transition-all";
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
      <div
        className={cn(
          variantRootStyles[variant],
          rootClassName,
          "hidden md:block",
        )}
      >
        <aside
          data-sidebar-id={id}
          data-variant={variant}
          data-side={side}
          style={{
            width: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            minWidth: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            maxWidth: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
          }}
          className={cn(baseStyles, variantStyles[variant], className, "")}
          {...props}
        >
          {/* Skeleton - no content on server */}
          <div
            className="flex h-full flex-col overflow-hidden"
            style={{
              width: `var(--sidebar-${id}-width, ${isCollapsed ? collapsedWidth : defaultOpen ? width : collapsedWidth})`,
            }}
          ></div>
        </aside>
      </div>
    );
  }

  // Client: render full sidebar with content
  return (
    <SidebarContext.Provider value={{ id, isCollapsed }}>
      <TooltipProvider delayDuration={0}>
        <div className={cn(variantRootStyles[variant], rootClassName)}>
          <aside
            data-sidebar-id={id}
            data-state={isOpen ? "expanded" : "collapsed"}
            data-variant={variant}
            data-side={side}
            style={{
              width: `var(--sidebar-${id}-width, ${currentWidth})`,
              minWidth: `var(--sidebar-${id}-width, ${currentWidth})`,
              maxWidth: `var(--sidebar-${id}-width, ${currentWidth})`,
            }}
            className={cn(baseStyles, variantStyles[variant], className)}
            {...props}
          >
            <div
              className="flex h-full flex-col overflow-hidden"
              style={{ width: `var(--sidebar-${id}-width, ${currentWidth})` }}
            >
              {children}
            </div>
          </aside>
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// Sidebar Header
export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-0.5 p-2", className)} {...props} />
  );
}

// Sidebar Content
export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2", className)}
      {...props}
    />
  );
}

// Sidebar Footer
export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t p-2", className)} {...props} />;
}

// Sidebar Group
export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

// Sidebar Group Label
export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

// Sidebar Menu
export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col 0.5", className)} {...props} />;
}

// Sidebar Menu Item
interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  isActive?: boolean;
  isCollapsed?: boolean;
  showWhenCollapsed?: boolean;
  hideWhenCollapsed?: boolean;
}

export function SidebarMenuItem({
  className,
  isActive,
  isCollapsed,
  showWhenCollapsed,
  hideWhenCollapsed,
  children,
  ...props
}: SidebarMenuItemProps) {
  const { isCollapsed: sidebarCollapsed } = useSidebar();

  // Hide when collapsed if hideWhenCollapsed is true
  if (hideWhenCollapsed && sidebarCollapsed) return null;

  // Hide when expanded if showWhenCollapsed is true
  if (showWhenCollapsed && !sidebarCollapsed) return null;

  return (
    <li
      className={cn(
        "relative duration-150 flex w-full items-center gap-1 shrink-0 px-1 min-h-10",
        "flex w-full items-center gap-3 transition-all justify-start text-left flex-1 group/item rounded-lg text-sm",

        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        (isCollapsed || sidebarCollapsed) && "justify-center aspect-square",

        className,
      )}
      data-active={isActive}
      {...props}
    >
      {children}
    </li>
  );
}

// Sidebar Menu Sub
export function SidebarMenuSub({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isCollapsed } = useSidebar();

  if (isCollapsed) return null;

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
  const { isCollapsed } = useSidebar();

  const button = (
    <button
      type="button"
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-3 text-inherit duration-150 transition-all justify-start text-left flex-1 rounded-lg p-2 min-h-10",
        "",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        size === "large" && "font-semibold py-3",
        size === "small" && "text-sm min-h-auto p-1",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        isCollapsed && "justify-center aspect-square ",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "[&>svg]:size-4 [&>svg]:shrink-0",
            size === "small" && "[&>svg]:size-4",
          )}
        >
          {icon}
        </span>
      )}
      {children
        ? !isCollapsed && <span className="flex-1 truncate">{children}</span>
        : null}
    </button>
  );

  if (isCollapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
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
  const { isCollapsed } = useSidebar();

  const trigger = (
    <button
      type="button"
      onClick={() => !isCollapsed && !forcePopup && setIsOpen(!isOpen)}
      className={cn(
        "flex w-full min-w-full items-center gap-3 text-inherit duration-150 transition-all justify-start text-left flex-1 rounded-lg p-2",
        "hover:bg-sidebar-accent hover:font-medium hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        !isCollapsed &&
          isOpen &&
          "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      {icon && <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          <IconChevronRight
            className={cn(
              "transition-all size-4",
              isOpen ? "rotate-90 transition-all" : "",
            )}
          />
        </>
      )}
    </button>
  );

  if (forcePopup) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        )}

        <PopoverContent side="right" align="start" className="w-48 p-0">
          <div className="flex flex-col gap-0.5">
            <div className="p-3 text-sm font-semibold border-b flex items-center gap-2">
              {icon && (
                <span className={cn("shrink-0", "[&>svg]:size-4")}>{icon}</span>
              )}
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
      {isOpen && (
        <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l pl-3">
          {children}
        </div>
      )}
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
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        className,
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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { sidebarId?: string }) {
  const context = React.useContext(SidebarContext);
  const sidebarId = propSidebarId ?? context?.id;

  if (!sidebarId) {
    throw new Error(
      "SidebarTrigger must be used within a Sidebar component or passed a sidebarId prop",
    );
  }

  const isMobile = useIsMobile();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("", className)}
      onClick={() => sidebarActions.toggleSidebar(sidebarId, isMobile)}
      {...props}
    >
      <IconLayoutSidebar className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
