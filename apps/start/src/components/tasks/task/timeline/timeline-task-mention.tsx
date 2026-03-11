import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import { IconAt } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { statusConfig } from "../../shared/config";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

function parseSourceTaskId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null) {
    return (value as { sourceTaskId?: string }).sourceTaskId ?? null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed?.sourceTaskId ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function TimelineTaskMentioned({
  item,
  tasks = [],
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const sourceTaskId = parseSourceTaskId(item.toValue);
  const sourceTask = sourceTaskId
    ? tasks.find((t) => t.id === sourceTaskId)
    : null;

  const statusKey = sourceTask?.status?.replace(/"/g, "") as
    | keyof typeof statusConfig
    | undefined;
  const statusCfg = statusKey ? statusConfig[statusKey] : undefined;
  const statusIcon = statusCfg
    ? statusCfg.icon(cn(statusCfg.className, "h-3.5 w-3.5"))
    : undefined;

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconAt}
      color="bg-accent text-primary-foreground"
    >
      <InlineLabel
        className="text-muted-foreground hover:text-foreground"
        text={item.actor ? getDisplayName(item.actor) : "Unknown"}
        image={item.actor?.image || ""}
      />{" "}
      mentioned this in{" "}
      {sourceTask ? (
        <Link
          to="/$orgId/tasks/$taskShortId"
          params={{
            orgId: sourceTask.organizationId,
            taskShortId: String(sourceTask.shortId),
          }}
          className="inline"
        >
          <InlineLabel
            className="text-muted-foreground hover:text-foreground"
            text={`#${sourceTask.shortId} ${sourceTask.title}`}
            icon={statusIcon ?? <IconAt size={12} />}
          />
        </Link>
      ) : (
        <InlineLabel
          className="text-muted-foreground"
          text="another task"
          icon={<IconAt size={12} />}
        />
      )}
    </TimelineItemWrapper>
  );
}
