import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getDisplayName, getInitials } from "@repo/util";
import { IconArrowRight, IconBrandGithub } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { formatShortDate } from "@/lib/portal/board-row";
import { getLatestUpdate } from "@/lib/portal/latest-update";
import { fullPostLinkLabel, type PeekPost } from "@/lib/portal/peek";
import { toDate } from "@/lib/portal/time";
import { useBoardReleases } from "../board/useBoardSideData";
import { useBoardVote } from "../board/useBoardVote";
import { PostCommentComposer } from "../post/CommentComposer";
import { LatestUpdateCard } from "../post/LatestUpdateCard";
import { PostStatusBanner } from "../post/PostStatusBanner";
import { usePostComments } from "../post/usePostComments";
import { CategoryTag } from "../ui/CategoryTag";
import { Pill } from "../ui/Pill";
import { ReleaseTag } from "../ui/ReleaseTag";
import { StatusChip } from "../ui/StatusChip";
import { Stepper } from "../ui/Stepper";
import { VoteButton } from "../ui/VoteButton";
import { PeekDescription } from "./PeekDescription";
import { usePeek } from "./peek-context";

interface PeekPostViewProps {
  post: PeekPost;
}

/** The open post in the board panel: status, title, author, vote, progress, latest update, description, composer. */
export function PeekPostView({ post }: PeekPostViewProps) {
  const { organization, categories } = usePublicOrganizationLayout();
  const { tasks } = usePeek();
  const { releasesById } = useBoardReleases(organization.slug);
  const vote = useBoardVote(post);
  const {
    allComments,
    totalCount,
    isLoading: commentsLoading,
  } = usePostComments({ taskId: post.id, organizationId: organization.id });

  const latestUpdate = useMemo(
    () => getLatestUpdate(allComments, organization),
    [allComments, organization],
  );

  const category = post.category
    ? categories.find((c) => c.id === post.category)
    : undefined;
  const release = post.releaseId
    ? (releasesById.get(post.releaseId) ?? null)
    : null;
  const releaseTag = release && post.status !== "done" ? release : null;
  // The status banner takes dates as Date | string; the release summary may carry any date-ish value.
  const bannerRelease = useMemo(
    () =>
      release
        ? {
            name: release.name,
            slug: release.slug,
            status: release.status,
            releasedAt: toDate(release.releasedAt),
            targetDate: toDate(release.targetDate),
            createdAt: toDate(release.createdAt),
          }
        : null,
    [release],
  );
  const creator = post.createdBy ?? null;
  const creatorName = creator ? getDisplayName(creator) : null;
  const commentCount = commentsLoading
    ? (post.comments?.length ?? 0)
    : totalCount;

  return (
    <div className="">
      <div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <StatusChip status={post.status} />
        {category && <CategoryTag category={category} />}
        {releaseTag && <ReleaseTag name={releaseTag.name} />}
      </div>

      <h2 className="font-bold text-[26px] text-foreground leading-8 tracking-[-0.026em]">
        {post.title}
      </h2>

      <div className="mt-3.5 mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13.5px] text-muted-foreground">
        {creator && creatorName && (
          <>
            <Avatar className="size-6">
              {creator.image ? (
                <AvatarImage
                  src={ensureCdnUrl(creator.image)}
                  alt={creatorName}
                />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(creatorName)}
              </AvatarFallback>
            </Avatar>
            <b className="font-semibold text-foreground">{creatorName}</b>
            <Pill variant="author" />
          </>
        )}
        {post.createdAt && <span>{formatShortDate(post.createdAt)}</span>}
      </div>

      <div className="mb-6 flex gap-2.5">
        <VoteButton
          count={vote.voteCount}
          voted={vote.voted}
          disabled={vote.disabled}
          onToggle={vote.toggle}
          showCount
          className="flex-1"
        />
        {post.githubIssue && (
          <a
            href={post.githubIssue.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Linked GitHub issue #${post.githubIssue.issueNumber}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "shrink-0",
            )}
          >
            <IconBrandGithub aria-hidden className="size-[18px]!" />#
            {post.githubIssue.issueNumber}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {post.status !== "canceled" && (
          <div className="rounded-xl border bg-card px-2 pt-4 pb-3">
            <Stepper status={post.status} />
          </div>
        )}
        <PostStatusBanner
          task={post}
          release={bannerRelease}
          orgSlug={organization.slug}
          lastUpdateBy={
            latestUpdate?.createdBy
              ? getDisplayName(latestUpdate.createdBy)
              : null
          }
        />
        {latestUpdate && (
          <LatestUpdateCard
            comment={latestUpdate}
            isAuthor={!!creator && latestUpdate.createdBy?.id === creator.id}
            tasks={tasks}
          />
        )}
      </div>

      <hr className="mt-6 mb-5 border-border" />

      {post.description && <PeekDescription post={post} tasks={tasks} />}

      {post.shortId !== null && (
        <Link
          to="/orgs/$orgSlug/$shortId"
          params={{ orgSlug: organization.slug, shortId: String(post.shortId) }}
          className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary text-sm hover:underline"
        >
          {fullPostLinkLabel(commentCount)}
          <IconArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}

      <div className="mt-7 border-t pt-5">
        <PostCommentComposer
          taskId={post.id}
          organizationId={organization.id}
          taskStatus={post.status}
          tasks={tasks}
        />
      </div>
    </div>
  );
}
