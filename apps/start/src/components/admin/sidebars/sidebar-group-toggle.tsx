"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface SidebarGroupToggleProps {
  label: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * An open-sidebar group header that's also its own collapse toggle for whatever it wraps —
 * the group-level counterpart to primary-org.tsx's per-org row, which is simultaneously a
 * Link AND a collapsible trigger. A group like "Favourites"/"Organizations" has no page of
 * its own, so this is toggle-only, but still built from the exact same SidebarMenuItem +
 * SidebarMenuButton pair every other nav row (Inbox, an org row, etc.) uses, so it's the same
 * size/weight — not a smaller "just a label" treatment. Compact/icon-only sidebar mode
 * doesn't use this at all — see favourites-section.tsx's own icon+flyout-dropdown handling
 * for that case instead.
 */
export function SidebarGroupToggle({
  label,
  icon,
  open,
  onOpenChange,
  children,
}: SidebarGroupToggleProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="flex flex-col gap-0.5"
    >
      <SidebarMenuItem className="min-h-auto">
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              size="small"
              className="w-fit text-muted-foreground"
              icon={icon}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{label}</span>
                <IconChevronRight
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200",
                    open && "rotate-90",
                  )}
                />
              </span>
            </SidebarMenuButton>
          }
        />
      </SidebarMenuItem>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
