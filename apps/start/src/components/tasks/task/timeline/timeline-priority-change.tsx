import { cn } from "@repo/ui/lib/utils";
import { IconArrowRight } from "@tabler/icons-react";
import { priorityConfig } from "../../shared/config";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelinePriorityChange({ item, showSeparator = true }: TimelineItemProps & { showSeparator?: boolean }) {
  // Parse the 'to' value to get the priority config for the icon
  const to = (item.toValue as string)?.replaceAll('"', "");
  const toConfig = priorityConfig[to as keyof typeof priorityConfig];

  // Create a wrapper component that adapts the icon function to accept size prop
  const PriorityIcon = toConfig?.icon
    ? () =>
        toConfig.icon(
          cn(
            toConfig.className,
            `h-4 w-4`,
            to !== "urgent" && "fill-foreground",
          ),
        )
    : IconArrowRight;

  const renderPriorityChange = () => {
    if (!item.fromValue || !item.toValue) {
      return "changed the priority";
    }

    // Parse JSON strings if needed
    const from = item.fromValue as string;

    const fromConfig =
      priorityConfig[from.replaceAll('"', "") as keyof typeof priorityConfig];

    return (
      <>
        <InlineLabel
          text={item.actor?.name || "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        changed the priority from{" "}
        <InlineLabel
          text={fromConfig?.label || from.replaceAll('"', "")}
          icon={fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
        />{" "}
        to{" "}
        <InlineLabel
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
      icon={PriorityIcon}
      color="bg-accent text-primary-foreground"
    >
      {renderPriorityChange()}
    </TimelineItemWrapper>
  );
}
