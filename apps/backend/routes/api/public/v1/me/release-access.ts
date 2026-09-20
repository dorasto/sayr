import { db, getRelease, type schema } from "@repo/database";
import type { ApiKeyScope } from "@repo/util";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv } from "@/index";
import { type ApiKeyPrincipal, assertApiAccess, denyApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId, resolveReleaseId } from "../../../../../lib/apiRefs";
import { ReleaseServiceError } from "../../../../../lib/releases/errors";
import { asBodyObject } from "../../../../../lib/releases/input";
import { errorResponse } from "../../../../../responses";

/**
 * Shared request plumbing for the `/v1/me` release routes, so each handler
 * doesn't repeat ~15 lines of "who is calling, which org, are they allowed,
 * which release". The order is deliberate: principal (401), organization
 * (404), key scope + owner's team permission (403), then the release (404) —
 * so a caller who isn't allowed never learns whether a given release exists.
 *
 * Every lookup that follows a guard must stay scoped to the org the guard
 * resolved (or, for comment ids, the org read off the row itself): a slug or
 * id from another organization must never reach a row in this one.
 */

type Denied = { ok: false; response: Response };

export type OrgGuard = Denied | { ok: true; principal: ApiKeyPrincipal; orgId: string };

export type ReleaseGuard =
	| Denied
	| { ok: true; principal: ApiKeyPrincipal; orgId: string; release: schema.releaseType };

export type ReleaseCommentGuard =
	| Denied
	| {
			ok: true;
			principal: ApiKeyPrincipal;
			orgId: string;
			comment: schema.releaseCommentType;
			release: schema.releaseType;
	  };

type GuardOptions = {
	/** Organization slug or id, as the caller sent it. */
	orgRef: unknown;
	/** The scope the route needs; the key's owner must also hold the mapped team permission. */
	scope: ApiKeyScope;
	/** Completes "You don't have permission to ...", e.g. "publish releases". */
	action: string;
};

const ORG_NOT_FOUND_HINT = 'Pass the organization slug (e.g. "platform") or its id.';

export function guardReleaseRoute(c: Context<AppEnv>, options: GuardOptions): Promise<OrgGuard>;
export function guardReleaseRoute(
	c: Context<AppEnv>,
	options: GuardOptions & {
		/** Release slug or id, as the caller sent it. Resolved within the organization. */
		releaseRef: unknown;
	}
): Promise<ReleaseGuard>;
export async function guardReleaseRoute(
	c: Context<AppEnv>,
	options: GuardOptions & { releaseRef?: unknown }
): Promise<OrgGuard | ReleaseGuard> {
	const principal = c.get("apiKeyPrincipal");
	if (!principal) return { ok: false, response: c.json(errorResponse("Unauthorized"), 401) };

	const orgId = await resolveOrganizationId(options.orgRef);
	if (!orgId) {
		return { ok: false, response: c.json(errorResponse("Organization not found", ORG_NOT_FOUND_HINT), 404) };
	}

	const allowed = await assertApiAccess(c, orgId, options.scope);
	if (!allowed) return { ok: false, response: denyApiAccess(c, options.action, options.scope) };

	if (!("releaseRef" in options)) return { ok: true, principal, orgId };

	const releaseId = await resolveReleaseId(orgId, options.releaseRef);
	const release = releaseId ? await getRelease(releaseId) : null;
	if (!release || release.organizationId !== orgId) {
		return {
			ok: false,
			response: c.json(errorResponse("Release not found", 'Pass the release slug (e.g. "v1.2.0") or its id.'), 404),
		};
	}

	return { ok: true, principal, orgId, release };
}

/**
 * Guard for the routes addressed by a release comment id alone
 * (`/release-comments/:commentId`). There's no org in the request, so the org
 * is read off the comment row itself and the permission check runs against
 * THAT org — a comment id from an organization the key can't act in is refused,
 * never acted on.
 *
 * `scopeFor` picks the scope after the row is known, because it can depend on
 * who wrote the comment: the author only needs `tasks.comment`, anyone else
 * needs `moderation.manageComments` (stricter than task comments, mirroring
 * the web app's release comment rules).
 */
export async function guardReleaseCommentRoute(
	c: Context<AppEnv>,
	options: {
		commentId: string;
		action: string;
		scopeFor: (comment: schema.releaseCommentType, principal: ApiKeyPrincipal) => ApiKeyScope;
	}
): Promise<ReleaseCommentGuard> {
	const principal = c.get("apiKeyPrincipal");
	if (!principal) return { ok: false, response: c.json(errorResponse("Unauthorized"), 401) };

	const comment = await db.query.releaseComment.findFirst({
		where: (t) => eq(t.id, options.commentId),
	});
	if (!comment) {
		return {
			ok: false,
			response: c.json(errorResponse("Comment not found", "No release comment found with the provided id."), 404),
		};
	}

	const scope = options.scopeFor(comment, principal);
	const allowed = await assertApiAccess(c, comment.organizationId, scope);
	if (!allowed) return { ok: false, response: denyApiAccess(c, options.action, scope) };

	const release = await getRelease(comment.releaseId);
	if (!release || release.organizationId !== comment.organizationId) {
		return { ok: false, response: c.json(errorResponse("Release not found"), 404) };
	}

	return { ok: true, principal, orgId: comment.organizationId, comment, release };
}

/** The JSON object body of a request, or `null` if it's missing, malformed, or not an object. */
export async function readJsonBody(c: Context<AppEnv>): Promise<Record<string, unknown> | null> {
	return asBodyObject(await c.req.json().catch(() => null));
}

export function invalidBody(c: Context<AppEnv>) {
	return c.json(errorResponse("Invalid request body", "Send a JSON object as the request body."), 400);
}

export function invalidRequest(c: Context<AppEnv>, message: string) {
	return c.json(errorResponse("Invalid request", message), 400);
}

/**
 * Maps a thrown error to a response: a `ReleaseServiceError` becomes its own
 * status and message (slug taken, plan limit, bad PR link, ...); anything else
 * is an unexpected failure, recorded and returned as a generic 500 so no
 * internals reach the caller.
 */
export async function releaseErrorResponse(
	c: Context<AppEnv>,
	err: unknown,
	failure: { name: string; code: string; message: string; contextData?: Record<string, unknown> }
) {
	if (err instanceof ReleaseServiceError) {
		return c.json(errorResponse(err.title, err.message), err.status);
	}

	await c.get("recordWideError")({
		name: failure.name,
		error: err,
		code: failure.code,
		message: failure.message,
		contextData: failure.contextData,
	});
	return c.json(errorResponse(failure.message), 500);
}
