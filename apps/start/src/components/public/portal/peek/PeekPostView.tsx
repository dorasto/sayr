import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { ensureCdnUrl, getDisplayName, getInitials } from "@repo/util";
import { IconBrandGithub } from "@tabler/icons-react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { formatShortDate } from "@/lib/portal/board-row";
import type { PeekPost } from "@/lib/portal/peek";
import { PublicComments } from "../../public-comments";
import { useBoardReleases } from "../board/useBoardSideData";
import { useBoardVote } from "../board/useBoardVote";
import { CategoryTag } from "../ui/CategoryTag";
import { ReleaseTag } from "../ui/ReleaseTag";
import { StatusChip } from "../ui/StatusChip";
import { VoteBox } from "../ui/VoteBox";
import { PeekDescription } from "./PeekDescription";
import { usePeek } from "./peek-context";

interface PeekPostViewProps {
  post: PeekPost;
}

/**
 * The open post in the board panel: status, tags and vote on top, then the title, author, description and the full
 * comment thread (replies, reactions and the comment box), so nothing needs the full page.
 */
export function PeekPostView({ post }: PeekPostViewProps) {
  const { organization, categories } = usePublicOrganizationLayout();
  const { tasks } = usePeek();
  const { releasesById } = useBoardReleases(organization.slug);
  const vote = useBoardVote(post);

  const category = post.category
    ? categories.find((c) => c.id === post.category)
    : undefined;
  const release =
    post.releaseId && post.status !== "done"
      ? releasesById.get(post.releaseId)
      : undefined;
  const creator = post.createdBy ?? null;
  const creatorName = creator ? getDisplayName(creator) : null;

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <StatusChip status={post.status} />
          {category && <CategoryTag category={category} />}
          {release && <ReleaseTag name={release.name} />}
          <VoteBox
            count={vote.voteCount}
            voted={vote.voted}
            disabled={vote.disabled}
            onToggle={vote.toggle}
            size="chip"
            className="ml-auto"
          />
        </div>
        <Label variant="heading" className="block text-lg leading-7">
          {post.title}
        </Label>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          {creator && creatorName && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-5">
                {creator.image && (
                  <AvatarImage
                    src={ensureCdnUrl(creator.image)}
                    alt={creatorName}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {getInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{creatorName}</span>
            </span>
          )}
          {post.createdAt && <span>{formatShortDate(post.createdAt)}</span>}
          {post.githubIssue && (
            <a
              href={post.githubIssue.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
            >
              <IconBrandGithub aria-hidden className="size-[15px]" />#
              {post.githubIssue.issueNumber}
            </a>
          )}
        </div>
      </header>

      {post.description && <PeekDescription post={post} tasks={tasks} />}

      <div className="mt-2 border-t pt-6 px-2">
        <PublicComments
          taskId={post.id}
          taskShortId={post.shortId}
          organizationId={organization.id}
          taskStatus={post.status}
          tasks={tasks}
          authorId={creator?.id}
        />
      </div>
    </article>
  );
}
