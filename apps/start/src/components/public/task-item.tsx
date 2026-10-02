import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { IconBrandGithub, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createContext, memo, type MouseEvent, useContext } from "react";
import type { BoardRowRendererProps } from "@/components/board/core/renderers";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { buildExcerpt } from "@/lib/portal/excerpt";
import { formatBoardTime, formatShortName } from "@/lib/portal/board-row";
import { isTeamMember } from "@/lib/portal/team";
import { FieldCategory } from "@/components/board/fields/field-category";
import { FieldLabel } from "@/components/board/fields/field-label";
import { FieldStatus } from "@/components/board/fields/field-status";
import { getPortalStatus } from "@/lib/portal/status";
import { ReleaseTag } from "./portal/ui/ReleaseTag";
import { VoteBox } from "./portal/ui/VoteBox";
import { useBoardVote } from "./portal/board/useBoardVote";
import type { PublicReleaseSummary } from "./portal/board/useBoardSideData";
import { usePeek } from "./portal/peek/peek-context";
import { Label } from "@repo/ui/components/label";

export interface PublicTaskItemProps {
  task: schema.TaskWithLabels;
  /** The release this post belongs to, when known. The tag is only shown while the post is not done yet. */
  release?: { name: string } | null;
  /** Marks the row open in Peek: raised background and an accent bar. */
  selected?: boolean;
  /** Compact rows (a post is showing in the board panel) drop the excerpt. */
  compact?: boolean;
  /**
   * Seam for Peek: called when the row's link is clicked. Call `event.preventDefault()` to stop the navigation to
   * `/orgs/$orgSlug/$shortId` (e.g. to open the panel instead); leave the event alone to let the link navigate.
   */
  onOpen?: (
    task: schema.TaskWithLabels,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
}

/** One post on the board. The whole row is a link; the vote box sits above it and never navigates. */
function PublicTaskItemBase({
  task,
  release,
  selected = false,
  compact = false,
  onOpen,
}: PublicTaskItemProps) {
  const { organization } = usePublicOrganizationLayout();
  const vote = useBoardVote(task);

  const releaseTag = release && task.status !== "done" ? release : null;
  const excerpt = compact ? "" : buildExcerpt(task.description);
  const commentCount = task.comments?.length ?? 0;
  const creator = task.createdBy ?? null;
  const creatorName = formatShortName(creator?.displayName || creator?.name);
  const time = formatBoardTime(task.createdAt);

  const voteProps = {
    count: vote.voteCount,
    voted: vote.voted,
    disabled: vote.disabled,
    onToggle: vote.toggle,
  };

  return (
    <div
      data-selected={selected}
      className={cn(
        "relative border-t transition-colors first:border-t-0 hover:bg-accent has-focus-visible:bg-accent data-[selected=true]:bg-secondary group",
        // "flex p-3",
      )}
    >
      {/*<div
        className={cn(
          "flex gap-3 p-4 md:gap-4 md:py-5 md:pr-6 md:pl-5",
          compact && "md:py-4 md:pr-5 md:pl-4",
        )}
      >*/}
      {/*<div className="relative z-10 shrink-0 self-start">
          <VoteBox {...voteProps} size="sm" className="md:hidden" />
          <VoteBox {...voteProps} size="md" className="hidden md:flex" />
        </div>*/}

      <Link
        to="/orgs/$orgSlug/$shortId"
        params={{ orgSlug: organization.slug, shortId: String(task.shortId) }}
        onClick={(event) => onOpen?.(task, event)}
        className="block min-w-0 flex-1 outline-none after:absolute after:inset-0 after:content-['']"
      >
        <FieldStatus task={task} label={getPortalStatus(task.status).label} />
        <Label variant={"heading"} className={cn("block line-clamp-1")}>
          {task.title}
        </Label>
        {excerpt && (
          <Label
            // className="mb-2.5 line-clamp-2 text-[14px] text-muted-foreground leading-[21px] md:mb-3 md:leading-[22px]"
            variant={"description"}
            className="line-clamp-1"
          >
            {excerpt}
          </Label>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground leading-[18px] md:flex-nowrap md:gap-3.5">
          <span className="flex min-w-0 items-center gap-3.5 md:overflow-hidden">
            <FieldCategory task={task} />
            {releaseTag && (
              <ReleaseTag
                name={releaseTag.name}
                className="hidden md:inline-flex"
              />
            )}
            {!releaseTag && <FieldLabel task={task} />}
          </span>
          <span className="hidden grow md:block" />
          <span className="flex shrink-0 items-center gap-3 md:gap-3.5">
            <span className="inline-flex items-center gap-1.5">
              <IconMessage aria-hidden className="size-[15px]" stroke={1.75} />
              <span className="sr-only">Comments: </span>
              {commentCount}
            </span>
            {task.githubIssue && (
              <span
                className="hidden items-center md:inline-flex"
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
            {creator && creatorName && (
              <span className="inline-flex items-center gap-[7px]">
                {/* Team members get a surface gap and a primary outline (a plain shadow, no ring utility). */}
                <Avatar
                  className={cn(
                    "size-5",
                    isTeamMember(creator.id, organization) &&
                      "shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--primary)]",
                  )}
                >
                  {creator.image ? (
                    <AvatarImage
                      src={ensureCdnUrl(creator.image)}
                      alt={creator.displayName || creator.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-muted font-semibold text-foreground text-xs">
                    {getInitials(creator.displayName || creator.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-muted-foreground">
                  {creatorName}
                </span>
              </span>
            )}
            {time && (
              <span className="whitespace-nowrap md:min-w-16 md:text-right">
                {time}
              </span>
            )}
          </span>
        </div>
      </Link>
      {/*</div>*/}
    </div>
  );
}

export const PublicTaskItem = memo(PublicTaskItemBase);

/**
 * What the board's row renderer needs beyond `{ task }`: the board's renderer slots only receive the task, and the
 * public releases are summaries, not the `releaseType` rows a `BoardDataSource` holds. `PublicTaskView` provides it.
 */
export const PublicPostsContext = createContext<
  { releasesById: ReadonlyMap<string, PublicReleaseSummary> } | undefined
>(undefined);

/**
 * The board's list-row renderer (`renderers.row`): `PublicTaskItem` wired to the page's contexts. Always flat: the public
 * list is ranked server-side and shows subtasks as ordinary posts. Rows look the same whether or not a post is open in
 * the board panel; only the open one is marked, and clicks go to the panel's provider (`openPost`), which shows the post
 * on desktop and otherwise lets the link navigate to the full post.
 */
export function PublicBoardRow({ task }: BoardRowRendererProps) {
  const posts = useContext(PublicPostsContext);
  if (posts === undefined) {
    throw new Error("PublicBoardRow must be used within PublicPostsContext");
  }
  const { openPost, shortId: selectedShortId } = usePeek();

  return (
    <PublicTaskItem
      task={task}
      release={
        task.releaseId ? (posts.releasesById.get(task.releaseId) ?? null) : null
      }
      selected={selectedShortId !== null && selectedShortId === task.shortId}
      onOpen={openPost}
    />
  );
}
