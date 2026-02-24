import { IconBrandGithub, IconGitCommit } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

type GithubPRCommitData = {
  repository: {
    name: string;
    owner: string;
  };
  pullRequest: {
    number: number;
    url: string;
  };
  commit: {
    sha: string;
  };
};

function parsePRCommitData(
  item: TimelineItemProps["item"],
): GithubPRCommitData | null {
  const raw = item.fromValue ?? item.toValue;
  if (!raw) return null;

  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.commit?.sha && data?.pullRequest?.number) {
      return data as GithubPRCommitData;
    }
  } catch { }

  return null;
}

export function TimelineGithubPRCommit({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const data = parsePRCommitData(item);
  if (!data) return null;

  const shortSha = data.commit.sha.slice(0, 7);

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconGitCommit}
      color="bg-accent text-muted-foreground [&_svg]:text-foreground"
    >
      New commit{" "}
      <a
        href={`${data.pullRequest.url}/commits/${data.commit.sha}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <InlineLabel
          text={shortSha}
          icon={<IconBrandGithub size={12} />}
        />
      </a>{" "}
      pushed to PR #{data.pullRequest.number}
    </TimelineItemWrapper>
  );
}