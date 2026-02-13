import { getDisplayName } from "@repo/util";
import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineAssigneeAdded({
  item,
  availableUsers = [],
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const user = availableUsers.find((user) => user.id === item.toValue);
  const selfAssign = item.actor?.id === user?.id;
  return selfAssign ? (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconUserPlus}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      assigned themself
    </TimelineItemWrapper>
  ) : (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconUserPlus}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      assigned{" "}
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={user ? getDisplayName(user) : "Unknown"}
        image={user?.image || ""}
      />
    </TimelineItemWrapper>
  );
}

export function TimelineAssigneeRemoved({
  item,
  availableUsers = [],
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const user = availableUsers.find((user) => user.id === item.toValue);
  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconUserMinus}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      removed
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={user ? getDisplayName(user) : "Unknown"}
        image={user?.image || ""}
      />
    </TimelineItemWrapper>
  );
}
