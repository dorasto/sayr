import type { schema } from "@repo/database";
import { IconArrowRight, IconRocket } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

export function TimelineReleaseChange({
  item,
  releases = [],
  showSeparator = true,
}: TimelineItemProps & { releases: schema.releaseType[]; showSeparator?: boolean }) {
  const renderReleaseChange = () => {
    if (!item.fromValue && !item.toValue) {
      return (
        <>
          <InlineLabel
            text={item.actor?.name || "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          changed the release
        </>
      );
    }

    const fromId = (item.fromValue as string)?.replaceAll('"', "") || null;
    const toId = (item.toValue as string)?.replaceAll('"', "") || null;
    const fromRelease = releases.find((r) => r.id === fromId);
    const toRelease = releases.find((r) => r.id === toId);

    // Case 1: No release → Release (added to release)
    if (!fromId && toId) {
      return (
        <>
          <InlineLabel
            text={item.actor?.name || "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          added this to{" "}
          {toRelease ? (
            <InlineLabel
              text={toRelease.name}
              icon={
                toRelease.icon ? (
                  <RenderIcon
                    iconName={toRelease.icon}
                    size={12}
                    color={toRelease.color || undefined}
                    raw
                  />
                ) : (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: toRelease.color || "#cccccc" }}
                  />
                )
              }
            />
          ) : (
            <InlineLabel
              text={`Unknown (${toId})`}
              icon={<IconRocket size={12} />}
            />
          )}
        </>
      );
    }

    // Case 2: Release → No release (removed from release)
    if (fromId && !toId) {
      return (
        <>
          <InlineLabel
            text={item.actor?.name || "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          removed this from{" "}
          {fromRelease ? (
            <InlineLabel
              text={fromRelease.name}
              icon={
                fromRelease.icon ? (
                  <RenderIcon
                    iconName={fromRelease.icon}
                    size={12}
                    color={fromRelease.color || undefined}
                    raw
                  />
                ) : (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: fromRelease.color || "#cccccc" }}
                  />
                )
              }
            />
          ) : (
            <InlineLabel
              text={`Unknown (${fromId})`}
              icon={<IconRocket size={12} />}
            />
          )}
        </>
      );
    }

    // Case 3: Release → Different Release (changed from X to Y)
    return (
      <>
        <InlineLabel
          text={item.actor?.name || "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        changed the release{" "}
        {fromRelease ? (
          <>
            from{" "}
            <InlineLabel
              text={fromRelease.name}
              icon={
                fromRelease.icon ? (
                  <RenderIcon
                    iconName={fromRelease.icon}
                    size={12}
                    color={fromRelease.color || undefined}
                    raw
                  />
                ) : (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: fromRelease.color || "#cccccc" }}
                  />
                )
              }
            />{" "}
          </>
        ) : fromId ? (
          <>
            from{" "}
            <InlineLabel
              text={`Unknown (${fromId})`}
              icon={<IconRocket size={12} />}
            />{" "}
          </>
        ) : null}
        {toRelease ? (
          <>
            to{" "}
            <InlineLabel
              text={toRelease.name}
              icon={
                toRelease.icon ? (
                  <RenderIcon
                    iconName={toRelease.icon}
                    size={12}
                    color={toRelease.color || undefined}
                    raw
                  />
                ) : (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: toRelease.color || "#cccccc" }}
                  />
                )
              }
            />
          </>
        ) : toId ? (
          <>
            to{" "}
            <InlineLabel
              text={`Unknown (${toId})`}
              icon={<IconRocket size={12} />}
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
      {renderReleaseChange()}
    </TimelineItemWrapper>
  );
}
