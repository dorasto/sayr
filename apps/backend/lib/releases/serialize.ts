import type { schema } from "@repo/database";
import { prosekitJSONToMarkdown } from "@/prosekit/markdown";
import { isOpenTaskStatus } from "./rules";

/** Rich-text JSON to Markdown, or `null` when the field was never set. */
export function toMarkdown(doc: schema.NodeJSON | null | undefined): string | null {
	return doc ? prosekitJSONToMarkdown(doc) : null;
}

/**
 * Adds a `contentMarkdown` field next to a row's raw `content` JSON — the
 * shape status updates and comments are returned in, so a caller (the CLI, a
 * script) can read text without parsing editor JSON. The raw `content` is kept.
 */
export function withContentMarkdown<T extends { content: schema.NodeJSON | null }>(
	row: T
): T & { contentMarkdown: string | null } {
	return { ...row, contentMarkdown: toMarkdown(row.content) };
}

/**
 * A task as it appears inside a release: enough to list and link it, without
 * the description or the 1024-dim `embedding` vector a full task row carries.
 */
export type ReleaseTaskSummary = Pick<
	schema.taskType,
	"id" | "shortId" | "title" | "status" | "priority" | "category" | "visible" | "createdAt" | "updatedAt"
>;

/** A linked pull request without its (potentially long) `body` text, which a release view never shows. */
export type ReleasePullRequestSummary = Omit<schema.githubPullRequestType, "body">;

/**
 * `open` is every task publishing the release would close (see
 * `isOpenTaskStatus`): not done and not canceled. `total` counts every task.
 */
export interface ReleaseTaskCounts {
	total: number;
	open: number;
	done: number;
	canceled: number;
}

/**
 * The single-release response of `GET /v1/me/releases/:release`: the release
 * row, plus its description as Markdown, the people and labels attached to it,
 * its linked pull requests, and a slim task list with progress counts.
 *
 * `createdBy` replaces the row's raw creator id with a user summary (same as
 * the web app's `ReleaseWithTasks`); `leadId` stays as the raw column next to
 * the expanded `lead`.
 */
export type ReleaseDetail = Omit<schema.releaseType, "createdBy"> & {
	descriptionMarkdown: string | null;
	createdBy: schema.UserSummary | null;
	lead: schema.UserSummary | null;
	labels: schema.labelType[];
	githubPullRequests: ReleasePullRequestSummary[];
	tasks: ReleaseTaskSummary[];
	taskCounts: ReleaseTaskCounts;
};

export function toReleaseDetail(input: {
	release: schema.releaseType;
	createdBy: schema.UserSummary | null;
	lead: schema.UserSummary | null;
	labels: schema.labelType[];
	githubPullRequests: ReleasePullRequestSummary[];
	tasks: ReleaseTaskSummary[];
}): ReleaseDetail {
	const { release, createdBy, lead, labels, githubPullRequests, tasks } = input;

	const done = tasks.filter((task) => task.status === "done").length;
	const canceled = tasks.filter((task) => task.status === "canceled").length;
	const open = tasks.filter((task) => isOpenTaskStatus(task.status)).length;

	return {
		...release,
		descriptionMarkdown: toMarkdown(release.description),
		createdBy,
		lead,
		labels,
		githubPullRequests,
		tasks,
		taskCounts: { total: tasks.length, open, done, canceled },
	};
}
