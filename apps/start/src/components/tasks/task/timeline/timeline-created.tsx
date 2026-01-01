import { IconPlus } from "@tabler/icons-react";
import {
  AvatarWithName,
  TimelineCreatedItem,
  TimelineItemWrapper,
} from "./base";
import type { TimelineItemProps } from "./types";
import { AvatarImage } from "@repo/ui/components/avatar";
import { InlineLabel } from "../../shared/inlinelabel";

export function TimelineCreated({ item, availableUsers }: TimelineItemProps) {
  return (
    <>
      <TimelineItemWrapper
        availableUsers={availableUsers || []}
        item={item}
        icon={IconPlus}
        color="bg-accent text-primary-foreground"
        first={true}
      />
      <TimelineItemWrapper
        hideContent={true}
        availableUsers={availableUsers || []}
        item={item}
        icon={IconPlus}
        color="bg-accent text-primary-foreground"
      >
        <InlineLabel
          text={item.actor?.name || "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        created this task
      </TimelineItemWrapper>
      {/*<TimelineCreatedItem
        item={item}
        icon={IconPlus}
        color="bg-accent text-primary-foreground"
      />*/}
    </>
  );
}
