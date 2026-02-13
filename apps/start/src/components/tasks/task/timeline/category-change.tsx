import type { schema } from "@repo/database";
import { getDisplayName } from "@repo/util";
import { IconArrowRight, IconCategory } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCategoryChange({
  item,
  categories = [],
  showSeparator = true,
}: TimelineItemProps & {
  categories: schema.categoryType[];
  showSeparator?: boolean;
}) {
  const renderCategoryChange = () => {
    if (!item.fromValue && !item.toValue) {
      return (
        <>
          <InlineLabel
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          changed the category
        </>
      );
    }

    const fromId = (item.fromValue as string)?.replaceAll('"', "") || null;
    const toId = (item.toValue as string)?.replaceAll('"', "") || null;
    const fromCategory = categories.find((c) => c.id === fromId);
    const toCategory = categories.find((c) => c.id === toId);

    return (
      <>
        <InlineLabel
          text={item.actor ? getDisplayName(item.actor) : "Unknown"}
          image={item.actor?.image || ""}
          className="text-muted-foreground"
        />{" "}
        changed the category{" "}
        {fromCategory ? (
          <>
            from{" "}
            <InlineLabel
              text={fromCategory.name}
              className="text-muted-foreground hover:text-foreground"
              icon={
                <RenderIcon
                  iconName={fromCategory.icon || "IconCategory"}
                  size={12}
                  color={fromCategory.color || undefined}
                  raw
                />
              }
            />{" "}
          </>
        ) : fromId ? (
          <>
            from{" "}
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
              text={`Unknown (${fromId})`}
              icon={<IconCategory size={12} />}
            />{" "}
          </>
        ) : null}
        {toCategory ? (
          <>
            to{" "}
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
              text={toCategory.name}
              icon={
                <RenderIcon
                  iconName={toCategory.icon || "IconCategory"}
                  size={12}
                  color={toCategory.color || undefined}
                  raw
                />
              }
            />
          </>
        ) : toId ? (
          <>
            to{" "}
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
              text={`Unknown (${toId})`}
              icon={<IconCategory size={12} />}
            />
          </>
        ) : null}
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
      {renderCategoryChange()}
    </TimelineItemWrapper>
  );
}
