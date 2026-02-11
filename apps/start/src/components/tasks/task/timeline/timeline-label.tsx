import { getDisplayName } from "@repo/util";
import { IconTag, IconTagMinus, IconTagPlus } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineLabelAdded({
  item,
  labels = [],
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const value = item.toValue as string;
  const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
  if (!label) {
    return (
      <TimelineItemWrapper
        showSeparator={showSeparator}
        item={item}
        icon={IconTagPlus}
        color="bg-accent text-muted-foreground"
      >
        added a label
      </TimelineItemWrapper>
    );
  }
  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconTagPlus}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      added{" "}
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={label.name}
        icon={<IconTag size={12} style={{ color: label.color || undefined }} />}
      />
    </TimelineItemWrapper>
  );
}

export function TimelineLabelRemoved({
  item,
  labels = [],
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const value = item.toValue as string;
  const label = labels.find((label) => label.id === value?.replaceAll('"', ""));
  if (!label) {
    return (
      <TimelineItemWrapper
        showSeparator={showSeparator}
        item={item}
        icon={IconTagMinus}
        color="bg-accent text-muted-foreground"
      >
        removed a label
      </TimelineItemWrapper>
    );
  }
  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconTagMinus}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      removed{" "}
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={label.name}
        icon={<IconTag size={12} style={{ color: label.color || undefined }} />}
      />
    </TimelineItemWrapper>
  );
}
