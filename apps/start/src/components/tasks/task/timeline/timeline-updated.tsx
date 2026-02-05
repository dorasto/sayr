import {
  IconEdit,
  IconFileDescription,
  IconLock,
  IconLockOpen2,
  IconPencil,
} from "@tabler/icons-react";
import { getDisplayName } from "@repo/util";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

interface UpdatedFieldValue {
  field: "title" | "description" | "visible";
  value: string | object | null;
}

export function TimelineUpdated({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const renderUpdateMessage = () => {
    // Try to parse the structured format
    let fromData: UpdatedFieldValue | null = null;
    let toData: UpdatedFieldValue | null = null;

    try {
      if (
        item.fromValue &&
        typeof item.fromValue === "object" &&
        "field" in item.fromValue
      ) {
        fromData = item.fromValue as UpdatedFieldValue;
      } else if (item.fromValue && typeof item.fromValue === "string") {
        // Try to parse JSON string
        const parsed = JSON.parse(item.fromValue);
        if (parsed && typeof parsed === "object" && "field" in parsed) {
          fromData = parsed as UpdatedFieldValue;
        }
      }
    } catch {
      // Not structured data, fall back to legacy format
    }

    try {
      if (
        item.toValue &&
        typeof item.toValue === "object" &&
        "field" in item.toValue
      ) {
        toData = item.toValue as UpdatedFieldValue;
      } else if (item.toValue && typeof item.toValue === "string") {
        // Try to parse JSON string
        const parsed = JSON.parse(item.toValue);
        if (parsed && typeof parsed === "object" && "field" in parsed) {
          toData = parsed as UpdatedFieldValue;
        }
      }
    } catch {
      // Not structured data, fall back to legacy format
    }

    // Handle structured title change
    if (fromData?.field === "title" && toData?.field === "title") {
      const fromTitle = String(fromData.value || "Untitled");
      const toTitle = String(toData.value || "Untitled");

      return (
        <>
          <InlineLabel
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          changed the title from{" "}
          <span className="font-medium text-muted-foreground line-through">
            {fromTitle}
          </span>{" "}
          to <span className="font-medium">{toTitle}</span>
        </>
      );
    }

    // Handle structured description change
    if (fromData?.field === "description" || toData?.field === "description") {
      return (
        <>
          <InlineLabel
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          updated the description
        </>
      );
    }

    // Handle structured visibility change
    if (fromData?.field === "visible" && toData?.field === "visible") {
      const toVisible = String(toData.value || "public");
      const isNowPrivate = toVisible === "private";

      return (
        <>
          <InlineLabel
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          made this task{" "}
          <span className="font-medium inline-flex items-center gap-1">
            {isNowPrivate ? (
              <InlineLabel
                text="private"
                icon={<IconLock className="size-3" />}
              />
            ) : (
              <InlineLabel
                text="public"
                icon={<IconLockOpen2 className="size-3" />}
              />
            )}
          </span>
        </>
      );
    }

    // Legacy format: just show generic message
    return (
      <>
        <InlineLabel
          text={item.actor ? getDisplayName(item.actor) : "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        updated the task
      </>
    );
  };

  // Determine icon based on field type
  const getIcon = () => {
    try {
      let toData: UpdatedFieldValue | null = null;
      if (
        item.toValue &&
        typeof item.toValue === "object" &&
        "field" in item.toValue
      ) {
        toData = item.toValue as UpdatedFieldValue;
      } else if (item.toValue && typeof item.toValue === "string") {
        const parsed = JSON.parse(item.toValue);
        if (parsed && typeof parsed === "object" && "field" in parsed) {
          toData = parsed as UpdatedFieldValue;
        }
      }

      if (toData?.field === "title") return IconPencil;
      if (toData?.field === "description") return IconFileDescription;
      if (toData?.field === "visible") {
        return toData.value === "private" ? IconLock : IconLockOpen2;
      }
    } catch {
      // Fall back to default
    }
    return IconEdit;
  };

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={getIcon()}
      color="bg-accent text-primary-foreground"
    >
      {renderUpdateMessage()}
    </TimelineItemWrapper>
  );
}
