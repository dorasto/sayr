import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import {
  extractTaskText,
  formatDate,
  formatDateTimeFromNow,
  getDisplayName,
} from "@repo/util";
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconMessage,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import {
  healthConfig,
  type Health,
} from "@/components/releases/status-updates/types";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { InlineLabel } from "@/components/tasks";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const basePublicApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/public/v1"
    : "/api/public/v1";

interface PublicReleaseStatusUpdatesProps {
  organizationId: string;
  orgSlug: string;
  releaseSlug: string;
}

interface StatusUpdateData {
  id: string;
  releaseId: string;
  organizationId: string;
  content: schema.NodeJSON | null;
  health: "on_track" | "at_risk" | "off_track";
  visibility: "public" | "internal";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    createdAt: string;
  } | null;
  commentCount: number;
}

const DEFAULT_VISIBLE_COUNT = 3;

export function PublicReleaseStatusUpdates({
  organizationId,
  orgSlug,
  releaseSlug,
}: PublicReleaseStatusUpdatesProps) {
  const { data: session } = authClient.useSession();
  const { organization } = usePublicOrganizationLayout();
  const isOrgMember = useIsOrgMember(organization);

  const [updates, setUpdates] = useState<StatusUpdateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/status-updates`,
      );
      if (!res.ok) throw new Error("Failed to fetch status updates");
      const data = await res.json();
      setUpdates(data.data?.updates ?? []);
    } catch (error) {
      console.error("Failed to load status updates:", error);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, releaseSlug]);

  useMemo(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const visibleUpdates = expanded
    ? updates
    : updates.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = updates.length > DEFAULT_VISIBLE_COUNT;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <IconLoader2 className="animate-spin size-4 text-muted-foreground" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No status updates yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {visibleUpdates.map((update) => (
          <StatusUpdateCard key={update.id} update={update} />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <IconChevronUp size={14} />
              Show less
            </>
          ) : (
            <>
              <IconChevronDown size={14} />
              View all {updates.length} updates
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface StatusUpdateCardProps {
  update: StatusUpdateData;
}

function StatusUpdateCard({ update }: StatusUpdateCardProps) {
  const health = healthConfig[update.health as Health] ?? healthConfig.on_track;
  const authorName = update.author ? getDisplayName(update.author) : "Unknown";
  const descriptionPreview = extractTaskText(update.content);

  return (
    <Tile className="md:w-full">
      <TileHeader className="w-full flex flex-row md:flex-row items-center">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              "gap-1 text-[10px] border pointer-events-none",
              health.className,
            )}
          >
            {health.icon} {health.label}
          </Badge>

          <TileTitle asChild>
            {update.createdAt && (
              <Label variant="description" className="text-xs">
                {update.createdAt && formatDate(update.createdAt)} -{" "}
                {formatDateTimeFromNow(update.createdAt)}
              </Label>
            )}
          </TileTitle>
        </div>
        <TileDescription asChild>
          <Label
            variant={"description"}
            className="pt-2 line-clamp-2 text-foreground"
          >
            {descriptionPreview}
          </Label>
        </TileDescription>
        <div className="flex items-center justify-between mt-3">
          <TileDescription asChild>
            <InlineLabel text={authorName} image={update.author?.image} />
          </TileDescription>
          {update.commentCount > 0 && (
            <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <IconMessage size={12} />
              {update.commentCount}
            </div>
          )}
        </div>

        {/*<div className="flex items-center gap-1.5">
          {update.author?.image && (
            <img
              src={update.author.image}
              alt={authorName}
              className="size-4 rounded-full"
            />
          )}
          <span className="text-xs font-medium">{authorName}</span>
          {update.createdAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatDate(update.createdAt)}
            </span>
          )}
        </div>*/}
      </TileHeader>
    </Tile>
    // <div className="rounded-xl border bg-accent/50 p-2.5 flex flex-col gap-2">
    //   <div className="flex items-center gap-2 flex-wrap">
    //     <Badge
    //       variant="outline"
    //       className={cn(
    //         "gap-1 text-[10px] border pointer-events-none",
    //         health.className,
    //       )}
    //     >
    //       {health.icon} {health.label}
    //     </Badge>
    //     {update.createdAt && (
    //       <Label variant="description" className="text-[10px]">
    //         {update.createdAt && (
    //           <span className="text-[10px] text-muted-foreground">
    //             {formatDate(update.createdAt)}
    //           </span>
    //         )}{" "}
    //         - {formatDateTimeFromNow(update.createdAt)}
    //       </Label>
    //     )}

    //   </div>

    //   {update.content && (
    //     <Suspense
    //       fallback={
    //         <div className="h-4 animate-pulse bg-muted rounded w-3/4" />
    //       }
    //     >
    //       <Editor
    //         readonly
    //         defaultContent={update.content as schema.NodeJSON}
    //         hideBlockHandle
    //         className="text-xs"
    //       />
    //     </Suspense>
    //   )}
    // </div>
  );
}
