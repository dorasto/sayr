"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
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
 * its own, so this is toggle-only, styled to match SidebarGroupLabel's existing text-xs/muted
 * weight (not SidebarMenuButton's heavier nav-item styling) since it's still fundamentally a
 * section label, just now interactive. Compact/icon-only sidebar mode doesn't use this at all
 * — see favourites-section.tsx's own icon+flyout-dropdown handling for that case instead.
 */
export function SidebarGroupToggle({ label, icon, open, onOpenChange, children }: SidebarGroupToggleProps) {
	return (
		<Collapsible open={open} onOpenChange={onOpenChange} className="flex flex-col gap-0.5">
			<CollapsibleTrigger
				render={
					<button
						type="button"
						className="group/grouptrig flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
					>
						<span className="[&>svg]:size-3.5 [&>svg]:shrink-0">{icon}</span>
						<span className="flex-1 truncate">{label}</span>
						<IconChevronRight
							className={cn("size-3.5 shrink-0 transition-transform duration-200", open && "rotate-90")}
						/>
					</button>
				}
			/>
			<CollapsibleContent>{children}</CollapsibleContent>
		</Collapsible>
	);
}
