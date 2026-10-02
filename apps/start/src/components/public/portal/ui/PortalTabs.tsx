import { Tabs, TabsList, TabsTab } from "@repo/ui/components/cossui/tabs";
import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

export interface PortalTabItem {
	value: string;
	label: ReactNode;
	/** Muted count shown after the label. */
	count?: number | string;
}

interface PortalTabsProps {
	value: string;
	onValueChange: (value: string) => void;
	items: ReadonlyArray<PortalTabItem>;
	className?: string;
}

/**
 * Underline tabs (40px, accent underline, hairline bottom border) built on the shared cossui Tabs. Renders the tab
 * strip only — the caller swaps its own content based on `value`.
 */
export function PortalTabs({ value, onValueChange, items, className }: PortalTabsProps) {
	return (
		<Tabs value={value} onValueChange={(next) => onValueChange(String(next))} className={className}>
			<TabsList
				variant="underline"
				className="w-full justify-start gap-1 border-portal-line border-b data-[orientation=horizontal]:py-0 *:data-[slot=tabs-trigger]:hover:bg-transparent"
			>
				{items.map((item) => (
					<TabsTab
						key={item.value}
						value={item.value}
						className={cn(
							"h-10 grow-0 gap-2 rounded-none px-3 text-sm sm:h-10 max-md:h-11",
							"text-portal-fg-2 hover:text-portal-fg data-active:text-portal-fg",
							"data-active:[&>.ct]:text-portal-fg-2"
						)}
					>
						{item.label}
						{item.count !== undefined && (
							<span className="ct font-medium text-portal-fg-3 text-xs tabular-nums">{item.count}</span>
						)}
					</TabsTab>
				))}
			</TabsList>
		</Tabs>
	);
}
