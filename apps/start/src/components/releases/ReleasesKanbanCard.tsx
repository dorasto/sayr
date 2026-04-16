import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { extractTaskText, formatDate } from "@repo/util";
import { IconRocket, IconSettings } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseStatusConfig } from "./config";
import { Label } from "@repo/ui/components/label";

interface ReleasesKanbanCardProps {
  release: schema.releaseType;
  orgId: string;
}

export function ReleasesKanbanCard({
  release,
  orgId,
}: ReleasesKanbanCardProps) {
  const descriptionPreview = extractTaskText(release.description);
  const statusConfig = releaseStatusConfig[release.status];

  return (
    <Link
      to="/$orgId/releases/$releaseSlug"
      params={{ orgId, releaseSlug: release.slug }}
      className="flex-1 min-w-0 cursor-pointer w-full"
    >
      <div
        className={cn(
          "bg-card border rounded-lg p-3 flex flex-col gap-2 cursor-pointer hover:bg-accent transition-colors group w-full",
        )}
        style={{
          borderLeftColor: statusConfig.color,
          borderLeftWidth: "3px",
        }}
      >
        {/* Header row: icon + name + settings link */}
        <div className="flex items-start gap-2 w-full min-w-0">
          <div className="shrink-0">
            {release.icon ? (
              <RenderIcon
                iconName={release.icon}
                color={release.color || "#ffffff"}
                button
                className={cn("size-5! [&_svg]:size-3.5! border-0")}
              />
            ) : (
              <div
                className="size-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: release.color || "#cccccc" }}
              >
                <IconRocket className="size-3 text-white" />
              </div>
            )}
          </div>

          <Label
            variant={"subheading"}
            className="leading-tight line-clamp-1 cursor-pointer max-w-4/5"
          >
            {release.name}
          </Label>
          <Label
            variant={"description"}
            className="leading-tight truncate ml-auto cursor-pointer max-w-1/5"
          >
            {release.slug}
          </Label>
        </div>

        {/* Description preview */}
        {descriptionPreview && (
          <Label
            variant={"description"}
            className="line-clamp-2 cursor-pointer"
          >
            {descriptionPreview}
          </Label>
        )}

        {/* Footer: dates + status badge */}
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
          {release.targetDate && release.status !== "released" && (
            <Badge
              className={cn(
                "border rounded-lg text-xs gap-1 px-1.5 py-0.5 h-auto bg-secondary pointer-events-none",
              )}
            >
              Target: {formatDate(release.targetDate)}
            </Badge>
          )}

          <Badge
            className={cn(
              "ml-auto border rounded-lg text-xs gap-1 px-1.5 py-0.5 h-auto",
              statusConfig.badgeClassName,
            )}
          >
            {statusConfig.icon("size-2.5")}
            {statusConfig.label}{" "}
            {release.status == "released" &&
              release.releasedAt &&
              formatDate(release.releasedAt)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
