export type GithubIssueOpenedPayload = {
	owner: string;
	repo: string;
	number: number;
	title: string;
	body: string;
	user: string;
};

export type GithubIssueCommentPayload = {
	owner: string;
	repo: string;
	organizationId?: string | null;
	number: number;
	commentId: number;
	commentBody: string;
	user: string;
};

export type GithubSayrKeywordParsePayload = {
	text: string;
	title: string;
	eventType: string;
	number: number;
	owner: string;
	repo: string;
	repoId: number;
	merged?: boolean;
	installationId: number;
	organizationId?: string | null;
	categoryId?: string | null;
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
	};
