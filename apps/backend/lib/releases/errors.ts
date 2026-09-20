/**
 * Errors thrown by the release services (`lifecycle.ts`, `githubPr.ts`) for
 * failures a caller should see as a specific HTTP response, rather than a
 * generic 500. Each code carries its own status and a short title; the
 * `message` passed at the throw site is the human-readable detail.
 *
 * The services never format a response themselves — permission checks and
 * response shaping stay in the route (same split as `lib/tasks/*`), which
 * catches this class and maps it via `releaseErrorResponse`
 * (`routes/api/public/v1/me/release-access.ts`).
 */
const ERROR_DEFINITIONS = {
	SLUG_TAKEN: { status: 409, title: "Release slug already in use" },
	PLAN_LIMIT_REACHED: { status: 403, title: "Release limit reached" },
	INVALID_LEAD: { status: 400, title: "Invalid release lead" },
	INVALID_PR_URL: { status: 400, title: "Invalid pull request URL" },
	PR_ALREADY_LINKED: { status: 400, title: "Pull request already linked" },
	REPOSITORY_NOT_CONNECTED: { status: 404, title: "Repository not connected" },
	PR_NOT_FOUND: { status: 404, title: "Pull request not found" },
	CONFLICT: { status: 409, title: "Conflicting change" },
	GITHUB_REQUEST_FAILED: { status: 502, title: "GitHub request failed" },
} as const;

export type ReleaseServiceErrorCode = keyof typeof ERROR_DEFINITIONS;

export class ReleaseServiceError extends Error {
	readonly code: ReleaseServiceErrorCode;
	readonly status: (typeof ERROR_DEFINITIONS)[ReleaseServiceErrorCode]["status"];
	readonly title: string;

	constructor(code: ReleaseServiceErrorCode, message: string) {
		super(message);
		this.name = "ReleaseServiceError";
		this.code = code;
		this.status = ERROR_DEFINITIONS[code].status;
		this.title = ERROR_DEFINITIONS[code].title;
	}
}

/** The Postgres error code on a driver error. The ORM can wrap the driver error, leaving it on `cause`. */
function pgErrorCode(err: unknown): unknown {
	return typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
}

/** True for a Postgres `unique_violation` (23505), whether or not the ORM wrapped it. */
export function isUniqueViolation(err: unknown): boolean {
	return pgErrorCode(err) === "23505" || (err instanceof Error && pgErrorCode(err.cause) === "23505");
}
