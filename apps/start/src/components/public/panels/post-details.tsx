import { formatDate } from "@repo/util";
import { IconBrandGithub } from "@tabler/icons-react";
import { FieldAssignee } from "@/components/board/fields/field-assignee";
import { FieldCategory } from "@/components/board/fields/field-category";
import { FieldLabel } from "@/components/board/fields/field-label";
import { FieldRelease } from "@/components/board/fields/field-release";
import { usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { parseGithubIssueUrl } from "@/lib/portal/github-issue";
import { DetailSection } from "./detail-section";

/**
 * The post's details in the panel, using the board's read-only `Field*` components (the page wraps it in a
 * `BoardProvider`): category, release, assignees, labels, plus the GitHub issue and posted date. Status sits on the
 * page beside the author, and priority is the team's own triage, so neither is shown here.
 */
export function PostDetails() {
	const { task, release } = usePublicTask();
	const github = task.githubIssue ? parseGithubIssueUrl(task.githubIssue.issueUrl) : null;

	return (
		<>
			{task.category && (
				<DetailSection label="Category">
					<FieldCategory task={task} />
				</DetailSection>
			)}
			{release && (
				<DetailSection label="Release">
					<FieldRelease task={task} />
				</DetailSection>
			)}
			{task.assignees.length > 0 && (
				<DetailSection label="Assigned to">
					<FieldAssignee task={task} />
				</DetailSection>
			)}
			{task.labels.length > 0 && (
				<DetailSection label="Labels">
					<FieldLabel task={task} />
				</DetailSection>
			)}
			{task.githubIssue && (
				<DetailSection label="GitHub">
					<a
						href={task.githubIssue.issueUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 hover:underline focus-visible:underline"
					>
						<IconBrandGithub aria-hidden className="size-4 text-muted-foreground" />
						{github ? `${github.repo}#${github.number}` : `#${task.githubIssue.issueNumber}`}
					</a>
				</DetailSection>
			)}
			{task.createdAt && <DetailSection label="Posted">{formatDate(task.createdAt, "en-GB")}</DetailSection>}
		</>
	);
}
