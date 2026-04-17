import type { schema } from "@repo/database";
import { getDisplayName } from "@repo/util";
import { IconArrowRight, IconRocket } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";
import { Link } from "@tanstack/react-router";

export function TimelineReleaseChange({
  item,
  releases = [],
  showSeparator = true,
}: TimelineItemProps & {
  releases: schema.releaseType[];
  showSeparator?: boolean;
}) {
  const renderReleaseChange = () => {
    if (!item.fromValue && !item.toValue) {
      return (
        <>
          <InlineLabel
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
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
            className="text-muted-foreground"
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
          />{" "}
          added this to{" "}
          {toRelease ? (
            <Link
              to="/$orgId/releases/$releaseSlug"
              params={{
                orgId: toRelease.organizationId,
                releaseSlug: toRelease.slug,
              }}
            >
              <InlineLabel
                className="text-muted-foreground hover:text-foreground"
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
            </Link>
          ) : (
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
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
            text={item.actor ? getDisplayName(item.actor) : "Unknown"}
            image={item.actor?.image || ""}
            className="text-muted-foreground"
          />{" "}
          removed this from{" "}
          {fromRelease ? (
            <Link
              to="/$orgId/releases/$releaseSlug"
              params={{
                orgId: fromRelease.organizationId,
                releaseSlug: fromRelease.slug,
              }}
            >
              <InlineLabel
                className="text-muted-foreground hover:text-foreground"
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
                      style={{
                        backgroundColor: fromRelease.color || "#cccccc",
                      }}
                    />
                  )
                }
              />
            </Link>
          ) : (
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
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
          className="text-muted-foreground"
          text={item.actor ? getDisplayName(item.actor) : "Unknown"}
          image={item.actor?.image || ""}
        />{" "}
        changed the release{" "}
        {fromRelease ? (
          <>
            from{" "}
            <Link
              to="/$orgId/releases/$releaseSlug"
              params={{
                orgId: fromRelease.organizationId,
                releaseSlug: fromRelease.slug,
              }}
            >
              <InlineLabel
                className="text-muted-foreground hover:text-foreground"
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
                      style={{
                        backgroundColor: fromRelease.color || "#cccccc",
                      }}
                    />
                  )
                }
              />
            </Link>{" "}
          </>
        ) : fromId ? (
          <>
            from{" "}
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
              text={`Unknown (${fromId})`}
              icon={<IconRocket size={12} />}
            />{" "}
          </>
        ) : null}
        {toRelease ? (
          <>
            to{" "}
            <Link
              to="/$orgId/releases/$releaseSlug"
              params={{
                orgId: toRelease.organizationId,
                releaseSlug: toRelease.slug,
              }}
            >
              <InlineLabel
                className="text-muted-foreground hover:text-foreground"
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
            </Link>
          </>
        ) : toId ? (
          <>
            to{" "}
            <InlineLabel
              className="text-muted-foreground hover:text-foreground"
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
