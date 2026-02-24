import { IconBrandGithub, IconGitPullRequest } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

type GithubPRClosedData = {
  repository: {
    name: string;
    owner: string;
  };
  pullRequest: {
    number: number;
    url: string;
    merged?: boolean;
  };
};

function parsePRClosedData(
  item: TimelineItemProps["item"],
): GithubPRClosedData | null {
  const raw = item.fromValue ?? item.toValue;
  if (!raw) return null;

  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.pullRequest?.number) {
      return data as GithubPRClosedData;
    }
  } catch { }

  return null;
}

export function TimelineGithubPRClosed({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const data = parsePRClosedData(item);
  if (!data) return null;

  const merged = data.pullRequest.merged;
  const color = merged
    ? "bg-green-500/10 text-green-600 [&_svg]:text-green-600"
    : "bg-muted text-muted-foreground [&_svg]:text-muted-foreground";
  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconGitPullRequest}
      color={color}
    >
      PR{" "}
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
      {merged ? "was merged ✅" : "was closed"}
    </TimelineItemWrapper>
  );
}