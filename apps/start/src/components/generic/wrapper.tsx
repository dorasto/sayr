"use client";

import { Button } from "@repo/ui/components/button";
import { SidebarContext } from "@repo/ui/components/doras-ui/sidebar";
import { Label } from "@repo/ui/components/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PrimarySidebar } from "../admin/sidebars/primary";
import { SettingsSidebar } from "../admin/sidebars/settings";
import { StaffSidebar } from "../admin/sidebars/staff";
import { useAdminRoute } from "./useAdminRoute";

/**
 * Renders the correct sidebar based on the current route.
 * Placed at the root layout level so it spans full viewport height.
 */
export function AdminSidebar() {
  const { isSettingsPage, isStaffPage } = useAdminRoute();

  return isSettingsPage ? (
    <SettingsSidebar />
  ) : isStaffPage ? (
    <StaffSidebar />
  ) : (
    <PrimarySidebar />
  );
}

interface Props {
  children: React.ReactNode;
  className?: string;
}
export function Wrapper({ children, className }: Props) {
  const { isTaskPage } = useAdminRoute();
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 min-h-0 w-full">
      <div
        className={cn(
          "flex flex-1 h-full w-full transition-all pb-2 pt-2 pr-2",
          isMobile && "p-0",
        )}
      >
        <div
          className={cn(
            "h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout border dark:border-transparent",
            isTaskPage && "pt-0 pr-0",
            isMobile && "p-0",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface SubProps {
  children: React.ReactNode;
  className?: string;
  rootClassName?: string;
  style?: "default" | "compact";
  iconClassName?: string;
  title?: string;
  description?: string;
  descriptionRender?: React.ReactNode;
  icon?: React.ReactNode;
  backButton?: string;
  backButtonText?: string;
  backButtonClassName?: string;
  blur?: boolean;
  top?: boolean;
  topContent?: React.ReactNode;
}
export function SubWrapper({
  children,
  className,
  rootClassName,
  iconClassName,
  style = "default",
  title,
  description,
  descriptionRender,
  icon,
  backButton,
  backButtonClassName,
  topContent,
  backButtonText = "Back",
  blur = true,
  top = true,
}: SubProps) {
  return (
    <div className={cn("relative", rootClassName)}>
      {top && (
        <div
          className={cn(
            "",
            blur
              ? "sticky top-0 z-50 w-full md:h-7 backdrop-blur bg-linear-to-b from-background from-5% via-background/30 via-30% to-background/0 flex items-center px-3 pt-3"
              : "",
          )}
        >
          {backButton ? (
            <Link to={backButton} className="">
              <Button
                variant={"ghost"}
                className={cn(
                  "w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg",
                  backButtonClassName,
                )}
                size={"sm"}
              >
                <IconArrowLeft className="size-3!" />
                <span className="">{backButtonText}</span>
              </Button>
            </Link>
          ) : (
            <Button
              variant={"ghost"}
              className="w-fit text-xs p-1 h-auto invisible"
              size={"sm"}
            >
              <IconArrowLeft className="size-3!" />
              <span className="hidden lg:block">Back</span>
            </Button>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-9 md:p-6 md:pt-0",
          style === "compact" && "max-w-prose mx-auto p-3 md:pt-0",
          className,
        )}
      >
        <div className="flex items-center gap-3 justify-between">
          {title && (
            <div className="flex flex-col">
              {icon ? (
                <div className="flex gap-2">
                  <div
                    className={cn(
                      "bg-accent p-1 rounded-lg [&_svg]:size-10! h-fit",
                      iconClassName,
                    )}
                  >
                    {icon}
                  </div>
                  <div className="flex flex-col">
                    <Label
                      variant={"heading"}
                      className="text-2xl text-foreground"
                    >
                      {title}
                    </Label>
                    {description && (
                      <Label
                        variant={"subheading"}
                        className="text-muted-foreground"
                      >
                        {description}
                      </Label>
                    )}
                    {descriptionRender && <div>{descriptionRender}</div>}
                  </div>
                </div>
              ) : (
                <Label variant={"heading"} className="text-2xl text-foreground">
                  {title}
                </Label>
              )}

              {!icon && description && (
                <Label variant={"subheading"} className="text-muted-foreground">
                  {description}
                </Label>
              )}
            </div>
          )}
          {topContent && topContent}
        </div>
        {children}
      </div>{" "}
    </div>
  );
}

// --- PanelWrapper ---

interface PanelWrapperProps {
  /** Main page content (rendered in the left/primary panel). */
  children: React.ReactNode;
  /** Whether the right panel is open. Typically from `useLayoutOrganization().isProjectPanelOpen`. */
  isOpen: boolean;
  /** Toggle callback. Typically `useLayoutOrganization().setProjectPanelOpen`. */
  setOpen: (open: boolean) => void;
  /** Fixed header rendered at the top of the panel (h-11, border-b). */
  panelHeader?: React.ReactNode;
  /** Body content rendered inside the scrollable panel area. */
  panelBody?: React.ReactNode;
  /** Default size of the right panel when open (percentage, default 30). */
  panelDefaultSize?: number;
  /** Minimum size of the right panel (percentage, default 15). */
  panelMinSize?: number;
  /** Class name applied to the ResizablePanelGroup root. */
  className?: string;
  /** Class name applied to the main (left) content panel. */
  contentClassName?: string;
}

/**
 * Layout wrapper that renders children alongside a collapsible right panel.
 * Panel content is passed directly as props — each page owns its own panel content.
 *
 * On mobile, the panel renders as a Sheet instead of a resizable column.
 *
 * Usage:
 * ```tsx
 * <PanelWrapper
 *   isOpen={isProjectPanelOpen}
 *   setOpen={setProjectPanelOpen}
 *   panelHeader={<MyPanelHeader />}
 *   panelBody={<MyPanelContent />}
 * >
 *   <UnifiedTaskView ... />
 * </PanelWrapper>
 * ```
 */
export function PanelWrapper({
  children,
  isOpen,
  setOpen,
  panelHeader,
  panelBody,
  panelDefaultSize = 30,
  panelMinSize = 15,
  className,
  contentClassName,
}: PanelWrapperProps) {
  const isMobile = useIsMobile();
  const ref = useRef<ResizablePanelHandle>(null);
  const hasRegistered = useRef(false);

  // Register a lightweight sidebar entry so doras-ui SidebarMenu* components
  // can read from the sidebar store without being inside a full <Sidebar>.
  useEffect(() => {
    if (hasRegistered.current) return;
    sidebarActions.registerSidebar("panel-right", {
      open: true,
      side: "right",
      variant: "default",
    });
    hasRegistered.current = true;
  }, []);

  // Sync imperative panel state with isOpen prop
  useEffect(() => {
    if (isMobile) return;
    const panel = ref.current;
    if (panel) {
      if (isOpen) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  }, [isOpen, isMobile]);

  // Close panel on mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile, setOpen]);

  const hasPanel = panelHeader || panelBody;

  // No panel content — just render children directly
  if (!hasPanel) {
    return <>{children}</>;
  }

  const panelContent = (
    <SidebarContext.Provider value={{ id: "panel-right", isCollapsed: false }}>
      <div className="flex flex-col h-full">
        {panelHeader && (
          <div className="flex items-center h-11 shrink-0 border-b px-3">
            {panelHeader}
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto p-2">
          {panelBody}
        </div>
      </div>
    </SidebarContext.Provider>
  );

  if (isMobile) {
    return (
      <>
        {children}
        <Sheet defaultOpen={false} open={isOpen} onOpenChange={setOpen}>
          <SheetContent className="p-0" showClose={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>Panel</SheetTitle>
              <SheetDescription>Side panel content</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto h-full flex flex-col relative p-3">
              {panelContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={cn("overflow-hidden", className)}
    >
      <ResizablePanel
        defaultSize={isMobile ? 100 : 100 - panelDefaultSize}
        minSize={50}
        className={cn(contentClassName)}
      >
        {children}
      </ResizablePanel>
      <ResizableHandle className={cn(!isOpen && "hidden")} />
      <ResizablePanel
        defaultSize={isOpen ? panelDefaultSize : 0}
        minSize={panelMinSize}
        collapsedSize={0}
        collapsible
        ref={ref}
        onCollapse={() => setOpen(false)}
        onExpand={() => setOpen(true)}
        className="overflow-hidden"
      >
        {isOpen && panelContent}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
