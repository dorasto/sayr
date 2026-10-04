import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { IconBrandGithub, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useContext } from "react";
import { FieldCategory } from "@/components/board/fields/field-category";
import { FieldLabel } from "@/components/board/fields/field-label";
import { FieldStatus } from "@/components/board/fields/field-status";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { formatBoardTime, formatShortName } from "@/lib/portal/board-row";
import { buildExcerpt } from "@/lib/portal/excerpt";
import { getPortalStatus } from "@/lib/portal/status";
import { useBoardReleases } from "./portal/board/useBoardSideData";
import { useBoardVote } from "./portal/board/useBoardVote";
import { PeekContext } from "./portal/peek/peek-context";
import { ReleaseTag } from "./portal/ui/ReleaseTag";
import { VoteBox } from "./portal/ui/VoteBox";

interface PublicTaskItemProps {
  task: schema.TaskWithLabels;
  /** Drops the excerpt (the Activity page's denser list). */
  compact?: boolean;
}

/**
 * One public post: the board's `renderers.row` on the Feedback board, and the Activity page's list rows. The post's
 * content is the link; the vote button sits beside it on the right. Status, category and labels are the board's own
 * `Field*` components, read-only here, so a `BoardProvider` must be above it. On the Feedback board a click opens the
 * post in the Peek panel (`openPost` from the Peek context); without one (Activity) the link just navigates.
 */
export function PublicTaskItem({ task, compact = false }: PublicTaskItemProps) {
  const { organization } = usePublicOrganizationLayout();
  const { releasesById } = useBoardReleases(organization.slug);
  const peek = useContext(PeekContext);
  const vote = useBoardVote(task);

  const release =
    task.releaseId && task.status !== "done"
      ? releasesById.get(task.releaseId)
      : undefined;
  const excerpt = compact ? "" : buildExcerpt(task.description);
  const creator = task.createdBy ?? null;
  const creatorName = formatShortName(creator?.displayName || creator?.name);
  const time = formatBoardTime(task.createdAt);

  return (
    <div
      data-selected={peek?.shortId === task.shortId}
      className="mb-2 flex items-start gap-4 rounded-xl bg-card px-4 py-3 transition-colors hover:bg-secondary has-[a:focus-visible]:bg-secondary data-[selected=true]:bg-secondary"
    >
      <Link
        to="/orgs/$orgSlug/$shortId"
        params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
        onClick={(event) => peek?.openPost(task, event)}
        className="flex min-w-0 flex-1 flex-col gap-0.5 outline-none"
      >
        <div className="flex items-center justify-between">
          <FieldStatus task={task} label={getPortalStatus(task.status).label} />
          <VoteBox
            count={vote.voteCount}
            voted={vote.voted}
            disabled={vote.disabled}
            onToggle={vote.toggle}
            size="chip"
          />
        </div>
        <Label variant="heading" className="mt-1 line-clamp-1">
          {task.title}
        </Label>
        {/* Always takes its line (even with no description) so every card is the same height. */}
        {!compact && (
          <Label variant="description" className="line-clamp-1 min-h-lh">
            {excerpt}
          </Label>
        )}
        <div className="mt-1.5 flex h-6 items-center gap-3 overflow-hidden text-[13px] text-muted-foreground">
          {creator && creatorName && (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <Avatar className="size-5">
                {creator.image && (
                  <AvatarImage
                    src={ensureCdnUrl(creator.image)}
                    alt={creator.displayName || creator.name}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {getInitials(creator.displayName || creator.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{creatorName}</span>
            </span>
          )}
          {time && <span className="shrink-0 whitespace-nowrap">{time}</span>}
          {(task.category || release || task.labels.length > 0) && (
            <div className="hidden min-w-0 items-center gap-2 overflow-hidden md:flex">
              <FieldCategory task={task} />
              {release ? (
                <ReleaseTag name={release.name} />
              ) : (
                <FieldLabel task={task} />
              )}
            </div>
          )}
          {task.githubIssue && (
            <span
              className="hidden shrink-0 items-center md:inline-flex"
              title={`Linked GitHub issue #${task.githubIssue.issueNumber}`}
            >
              <IconBrandGithub
                aria-hidden
                className="size-[15px]"
                stroke={1.75}
              />
              <span className="sr-only">Linked GitHub issue</span>
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <IconMessage aria-hidden className="size-[15px]" stroke={1.75} />
            <span className="sr-only">Comments: </span>
            {task.comments?.length ?? 0}
          </span>
        </div>
      </Link>
    </div>
  );
}
