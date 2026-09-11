import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";

/**
 * Reference resolution for the public API.
 *
 * Callers of `/v1/me/*` are humans writing scripts, and the only identifiers they
 * can actually see are the ones the UI shows them: an organization's slug
 * (`platform`, straight out of the URL) and a task's short id (`123`, the number
 * in `SAY-123`). Requiring internal UUIDs made the API effectively unusable
 * without first querying for ids.
 *
 * Both resolvers also accept the raw UUID so existing integrations keep working.
 *
 * Note the `SAY-` prefix is deliberately NOT parsed: `organization.short_id` is a
 * plain text column defaulting to "SAY" with no unique constraint, so the prefix
 * identifies nothing on its own — the org half of the pair is what disambiguates.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

/**
 * Resolves an organization reference to its id.
 *
 * Accepts a slug (`"platform"`) or a UUID. Returns null when nothing matches.
 * Deliberately selects only the id — `getOrganizationPublic` also resolves by
 * slug but eagerly loads the whole member and team graph, which is far more than
 * a reference lookup needs.
 */
export async function resolveOrganizationId(ref: unknown): Promise<string | null> {
	if (typeof ref !== "string") return null;

	const trimmed = ref.trim();
	if (!trimmed) return null;

	// A UUID is unambiguous, so try it first. Fall through to a slug lookup if it
	// matches nothing, which keeps a (pathological) UUID-shaped slug reachable.
	if (looksLikeUuid(trimmed)) {
		const [byId] = await db
			.select({ id: schema.organization.id })
			.from(schema.organization)
			.where(eq(schema.organization.id, trimmed))
			.limit(1);
		if (byId) return byId.id;
	}

	const [bySlug] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.slug, trimmed))
		.limit(1);

	return bySlug?.id ?? null;
}

/**
 * Resolves a task reference to its id, scoped to an organization.
 *
 * Accepts a short id (`123`, or `"123"` as a string) or a UUID. The org scope is
 * required and enforced in the query: task short ids are unique only per
 * organization (`task_organization_shortid_unique`), and scoping the UUID branch
 * too stops a caller reading a task from an org they passed a different id for.
 */
export async function resolveTaskId(orgId: string, ref: unknown): Promise<string | null> {
	if (typeof ref === "number") {
		return Number.isInteger(ref) ? await taskIdByShortId(orgId, ref) : null;
	}

	if (typeof ref !== "string") return null;

	const trimmed = ref.trim();
	if (!trimmed) return null;

	if (looksLikeUuid(trimmed)) {
		const [byId] = await db
			.select({ id: schema.task.id })
			.from(schema.task)
			.where(and(eq(schema.task.id, trimmed), eq(schema.task.organizationId, orgId)))
			.limit(1);
		return byId?.id ?? null;
	}

	// Bare digits are a short id. Anything else (including "SAY-123") is rejected
	// rather than guessed at, so a malformed reference fails loudly.
	if (!/^\d+$/.test(trimmed)) return null;

	const shortId = Number.parseInt(trimmed, 10);
	return Number.isSafeInteger(shortId) ? await taskIdByShortId(orgId, shortId) : null;
}

async function taskIdByShortId(orgId: string, shortId: number): Promise<string | null> {
	const [row] = await db
		.select({ id: schema.task.id })
		.from(schema.task)
		.where(and(eq(schema.task.organizationId, orgId), eq(schema.task.shortId, shortId)))
		.limit(1);

	return row?.id ?? null;
}
