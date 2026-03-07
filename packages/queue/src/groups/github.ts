/* ============================================================
   GitHub Job Types
   ============================================================ */

export type TraceContext = {
	traceId?: string;
	spanId?: string;
	traceFlags?: number;
};

/* ============================================================
   Shared Context
   ============================================================ */

export type GithubRepoContext = {
	owner: string;
	repo: string;
	repoId: number;
	repo_private: boolean;
	organizationId?: string | null;
};

/* ============================================================
   Issue Events
   ============================================================ */

export type GithubIssueOpenedPayload = GithubRepoContext & {
	number: number;
	title: string;
	body: string;
	user: string;
};

export type GithubIssueCommentPayload = GithubRepoContext & {
	number: number;
	commentId: number;
	commentBody: string;
	user: string;
	userId?: number;
	pull_request?: boolean;
};

/* ============================================================
   Keyword Parsing (Issues / PRs / Comments)
   ============================================================ */

export type GithubSayrKeywordParsePayload = GithubRepoContext & {
	text: string;
	title: string;
	eventType: "issue" | "comment" | "pull_request";
	number: number;
	installationId: number;
	categoryId?: string | null;
	merged?: boolean;
};

/* ============================================================
   Push Commit Reference (from push event)
   ============================================================ */

export type GithubCommitRefPayload = {
	organizationId: string;

	repoOwner: string;
	repoName: string;
	repoPrivate: boolean;

	commitSha: string;
	commitUrl: string;
	commitMessage: string;

	userId?: number;
	authorLogin?: string | null;
	authorEmail?: string | null;

	matches: {
		keyword: string;
		taskKey: number;
		taskID?: string;
	}[];
};

/* ============================================================
   Pull Request Events
   ============================================================ */

export type GithubPullRequestLinkPayload = GithubRepoContext & {
	linkedId: string;

	number: number;
	title: string;
	body: string;

	headSha: string;
	baseRef: string;
	headRef: string;
	headBranch: string;
	baseBranch: string;

	userId?: number;
	author: string;
	draft: boolean;
	state: "open" | "closed" | "all"

	matches: {
		keyword: string;
		taskKey: number;
	}[];
};

export type GithubPullRequestSyncPayload = GithubRepoContext & {
	linkedId: string;

	number: number;

	headSha: string;
	headBranch: string;

	before?: string;
	after?: string;
	userId?: number;
};

export type GithubPullRequestClosedPayload = GithubRepoContext & {
	linkedId: string;

	number: number;
	merged: boolean;
	mergedAt?: string | null;
	mergeCommitSha?: string | null;
	userId?: number;
};

export type GithubBranchCreatePayload = GithubRepoContext & {
	linkedId: string;
	branch: string;
	userId?: number;
	author: string;
	taskKey: number;
};

/* ============================================================
   Discriminated Union
   ============================================================ */

export type GithubJob =
	| {
		type: "issue_opened";
		traceContext?: TraceContext;
		payload: GithubIssueOpenedPayload;
	}
	| {
		type: "issue_comment";
		traceContext?: TraceContext;
		payload: GithubIssueCommentPayload;
	}
	| {
		type: "sayr_keyword_parse";
		traceContext?: TraceContext;
		payload: GithubSayrKeywordParsePayload;
	}
	| {
		type: "github_commit_ref";
		traceContext?: TraceContext;
		payload: GithubCommitRefPayload;
	}
	| {
		type: "pull_request_link";
		traceContext?: TraceContext;
		payload: GithubPullRequestLinkPayload;
	}
	| {
		type: "pull_request_sync";
		traceContext?: TraceContext;
		payload: GithubPullRequestSyncPayload;
	}
	| {
		type: "pull_request_closed";
		traceContext?: TraceContext;
		payload: GithubPullRequestClosedPayload;
	} | {
		type: "branch_create";
		traceContext?: TraceContext;
		payload: GithubBranchCreatePayload;
	} | {
		type: "branch_delete";
		traceContext?: TraceContext;
		payload: GithubBranchCreatePayload;
	};