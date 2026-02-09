import { getDisplayName } from "@repo/util";
import { IconBrandGithub, IconGitCommit } from "@tabler/icons-react";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import type { TimelineItemProps } from "./types";

type CommitRefData = {
  repo: string;
  commitSha: string;
  commitUrl: string;
  message: string;
  author: string;
};

function parseCommitData(
  item: TimelineItemProps["item"],
): CommitRefData | null {
  const raw = item.fromValue ?? item.toValue;
  if (!raw) return null;

  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.commitSha && data?.repo) return data as CommitRefData;
  } catch {
    // ignore parse errors
  }
  return null;
}

export function TimelineGithubCommit({
  item,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const commitData = parseCommitData(item);
  if (!commitData) return null;

  const shortSha = commitData.commitSha.slice(0, 7);
  const hasActor = !!item.actor;
  const authorName = hasActor
    ? getDisplayName(item.actor!)
    : commitData.author || "Someone";
  const authorImage = hasActor
    ? item.actor!.image || ""
    : commitData.author
      ? `https://github.com/${commitData.author}.png?size=64`
      : "";

  return (
    <TimelineItemWrapper
      showSeparator={showSeparator}
      item={item}
      icon={IconGitCommit}
      color="bg-accent text-muted-foreground [&_svg]:text-foreground"
    >
      <InlineLabel
        text={authorName}
        image={authorImage}
        className="text-mutedforeground"
      />{" "}
      mentioned in{" "}
      <a
        href={commitData.commitUrl}
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
                {commitData.message.split("\n")[0]}
              </span>
            </span>
          }
        />
      </a>
    </TimelineItemWrapper>
  );
}
