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
  /**
   * For a tab strip that sits in a bar (the board's page bar): the tabs fill the bar's height, the bar's own
   * `border-b` is the underline track, and a strip too wide for its space scrolls sideways instead of overflowing.
   */
  fill?: boolean;
}

/**
 * Underline tabs (40px, accent underline, hairline bottom border) built on the shared cossui Tabs. Renders the tab
 * strip only — the caller swaps its own content based on `value`.
 */
export function PortalTabs({
  value,
  onValueChange,
  items,
  className,
  fill = false,
}: PortalTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className={cn(fill && "gap-0", className)}
    >
      <TabsList
        variant="underline"
        className={cn(
          "w-full justify-start gap-1 data-[orientation=horizontal]:py-0 *:data-[slot=tabs-trigger]:hover:bg-transparent",
          fill
            ? // Indicator sits inside the strip (not 1px below it) so the scroll container doesn't clip it.
              "flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden **:data-[slot=tab-indicator]:translate-y-0!"
            : "border-portal-line border-b",
        )}
      >
        {items.map((item) => (
          <TabsTab
            key={item.value}
            value={item.value}
            className={cn(
              "grow-0 gap-2 rounded-none text-sm",
              fill
                ? "h-auto shrink-0 px-2.5 sm:h-auto md:px-3"
                : "h-10 px-3 sm:h-10 max-md:h-11",
              "text-portal-fg-2 hover:text-portal-fg data-active:text-portal-fg focus-visible:ring-0",
              "data-active:[&>.ct]:text-portal-fg-2",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ct font-medium text-portal-fg-3 text-xs tabular-nums">
                {item.count}
              </span>
            )}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
