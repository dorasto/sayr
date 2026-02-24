import { getDisplayName } from "@repo/util";
import { IconBrandGithub, IconGitPullRequest } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

type GithubPRLinkedData = {
  provider: "github";
  repository: {
    name: string;
    owner: string;
  };
  pullRequest: {
    number: number;
    title: string;
    url: string;
    headBranch: string;
    baseBranch: string;
  };
  author?: string;
};

function parsePRData(
  item: TimelineItemProps["item"],
): GithubPRLinkedData | null {
  const raw = item.fromValue ?? item.toValue;
  if (!raw) return null;

  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.pullRequest?.number && data?.repository?.name) {
      return data as GithubPRLinkedData;
    }
  } catch { }

  return null;
}

export function TimelineGithubPRLinked({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const data = parsePRData(item);
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

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconGitPullRequest}
      color="bg-accent text-muted-foreground [&_svg]:text-foreground"
    >
      <InlineLabel
        text={authorName}
        image={authorImage}
        className="text-muted-foreground hover:text-foreground"
      />{" "}
      opened PR{" "}
      <a
        href={data.pullRequest.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <InlineLabel
          text={`#${data.pullRequest.number}`}
          icon={<IconBrandGithub size={12} />}
        />
      </a>{" "}
      from <strong>{data.pullRequest.headBranch}</strong> →{" "}
      <strong>{data.pullRequest.baseBranch}</strong>
    </TimelineItemWrapper>
  );
}