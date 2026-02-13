import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { statusConfig } from "../../shared/config";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineStatusChange({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const renderStatusChange = () => {
    if (!item.fromValue || !item.toValue) {
      return "changed the status";
    }

    // Parse JSON strings if needed
    const from = item.fromValue as string;
    const to = item.toValue as string;

    const fromConfig =
      statusConfig[from.replaceAll('"', "") as keyof typeof statusConfig];
    const toConfig =
      statusConfig[to.replaceAll('"', "") as keyof typeof statusConfig];

    return (
      <>
        <InlineLabel
          className="text-muted-foreground"
          text={item.actor ? getDisplayName(item.actor) : "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        changed the status from{" "}
        <InlineLabel
          className="text-muted-foreground hover:text-foreground"
          text={fromConfig?.label || to.replaceAll('"', "")}
          icon={fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
        />{" "}
        to{" "}
        <InlineLabel
          className="text-muted-foreground hover:text-foreground"
          text={toConfig?.label || to.replaceAll('"', "")}
          icon={toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
        />
      </>
    );
  };

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconArrowRight}
      color="bg-accent text-primary-foreground"
    >
      {renderStatusChange()}
    </TimelineItemWrapper>
  );
}
