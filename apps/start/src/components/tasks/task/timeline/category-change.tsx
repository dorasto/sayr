import type { schema } from "@repo/database";
import { IconArrowRight, IconCategory } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { InlineLabel } from "../../shared/inlinelabel";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineCategoryChange({
  item,
  categories = [],
}: TimelineItemProps & { categories: schema.categoryType[] }) {
  const renderCategoryChange = () => {
    if (!item.fromValue && !item.toValue) {
      return (
        <>
          <InlineLabel
            text={item.actor?.name || "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          changed the category
        </>
      );
    }

    // Remove quotes if stored as stringified JSON
    const fromId = (item.fromValue as string)?.replaceAll('"', "") || null;
    const toId = (item.toValue as string)?.replaceAll('"', "") || null;

    const fromCategory = categories.find((c) => c.id === fromId);

    const toCategory = categories.find((c) => c.id === toId);

    return (
      <>
        <InlineLabel
          text={item.actor?.name || "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        changed the category{" "}
        {fromCategory ? (
          <>
            from{" "}
            <InlineLabel
              text={fromCategory.name}
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
              text={`Unknown (${fromId})`}
              icon={<IconCategory size={12} />}
            />{" "}
          </>
        ) : null}
        {toCategory ? (
          <>
            to{" "}
            <InlineLabel
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
      item={item}
      icon={IconArrowRight}
      color="bg-accent text-primary-foreground"
    >
      {renderCategoryChange()}
    </TimelineItemWrapper>
  );
}
