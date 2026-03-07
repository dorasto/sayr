import { getDisplayName } from "@repo/util";
import { IconBrandGithub, IconGitBranch, IconTrash } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

type GithubBranchLinkedData = {
  provider: "github";
  repository: {
    name: string;
    owner: string;
  };
  branch: {
    name: string;
    url: string;
    deleted?: boolean;
  };
  author?: string;
};

function parseBranchData(
  item: TimelineItemProps["item"],
): GithubBranchLinkedData | null {
  const raw = item.fromValue ?? item.toValue;
  if (!raw) return null;

  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.branch?.name && data?.repository?.name) {
      return data as GithubBranchLinkedData;
    }
  } catch { }

  return null;
}

export function TimelineGithubBranchLinked({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const data = parseBranchData(item);
  if (!data) return null;

  const hasActor = !!item.actor;
  const authorName = hasActor
    ? getDisplayName(item.actor!)
    : data.author || "Someone";

  const authorImage = hasActor
    ? item.actor!.image || ""
    : data.author
      ? `https://github.com/${data.author}.png?size=64`
      : "";

  const isDeleted = !!data.branch.deleted;
  const Icon = isDeleted ? IconTrash : IconGitBranch;

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={Icon}
      color="bg-accent text-muted-foreground [&_svg]:text-foreground"
    >
      <InlineLabel
        text={authorName}
        image={authorImage}
        className="text-muted-foreground hover:text-foreground"
      />{" "}
      {isDeleted ? "deleted branch" : "linked branch"}{" "}
      <a
        href={data.branch.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1"
      >
        <InlineLabel
          text=""
          icon={<IconBrandGithub size={12} />}
          className="max-w-52"
          textNode={
            <span className="flex items-center min-w-0 overflow-hidden!">
              <span className="truncate">
                {data.repository.owner}/{data.repository.name}:
                {data.branch.name}
              </span>
            </span>
          }
        />
      </a>
    </TimelineItemWrapper>
  );
}