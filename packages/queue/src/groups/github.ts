export type GithubIssueOpenedPayload = {
	owner: string;
	repo: string;
	repo_private: boolean;
	number: number;
	title: string;
	body: string;
	user: string;
};

export type GithubIssueCommentPayload = {
	owner: string;
	repo: string;
	organizationId?: string | null;
	repo_private: boolean;
	number: number;
	commentId: number;
	commentBody: string;
	user: string;
	userId?: number;
};

export type GithubSayrKeywordParsePayload = {
	text: string;
	title: string;
	eventType: string;
	number: number;
	owner: string;
	repo: string;
	repoId: number;
	repo_private: boolean;
	merged?: boolean;
	installationId: number;
	organizationId?: string | null;
	categoryId?: string | null;
};
export type GithubCommitRefPayload = {
	organizationId: string;

	repoOwner: string;
	repoName: string;
	repoPrivate: boolean;

	commitSha: string;
	commitUrl: string;
	commitMessage: string;

	authorLogin?: string | null;
	authorEmail?: string | null;

	matches: {
		keyword: string;
		taskKey: number;
	}[];
};
// 🔹 Union for GitHub group
export type GithubJob =
	| {
		type: "issue_opened";
		traceContext?: { traceId?: string; spanId?: string; traceFlags?: number };
		payload: GithubIssueOpenedPayload;
	}
	| {
		type: "issue_comment";
		traceContext?: { traceId?: string; spanId?: string; traceFlags?: number };
		payload: GithubIssueCommentPayload;
	}
	| {
		type: "sayr_keyword_parse";
		traceContext?: { traceId?: string; spanId?: string; traceFlags?: number };
		payload: GithubSayrKeywordParsePayload;
	} | {
		type: "github_commit_ref";
		traceContext?: { traceId?: string; spanId?: string; traceFlags?: number };
		payload: GithubCommitRefPayload;
	};
