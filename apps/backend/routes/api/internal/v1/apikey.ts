import { auth } from "@repo/auth";
import { db, invalidScopes, parseScopeRecord, recordToScopes, schema, scopesToRecord } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { errorResponse, successResponse } from "../../../../responses";

/**
 * Personal API keys — self-serve CRUD for the signed-in user.
 *
 * Mounted at `/api/internal/v1/api-keys`. Every handler is scoped to the
 * session user; there is deliberately NO admin role gate here (that is what
 * `/console/system-api-keys` is for).
 *
 * Two rules this file exists to enforce:
 *  1. The hashed secret (`apikey.key`) is NEVER selected or returned. Responses
 *     are built field by field so a future column can't leak by accident.
 *  2. Ownership is always part of the WHERE clause, never a separate read —
 *     that removes the TOCTOU window between "is this mine?" and "delete it".
 */
export const apiRouteUserApiKeys = new Hono<AppEnv>();

const MAX_USER_API_KEYS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 120;
const MAX_KEY_NAME_LENGTH = 32; // hard limit from @better-auth/api-key
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 365;

const SECONDS_PER_DAY = 86_400;

/** Explicit allowlist — `key` (the hashed secret) is intentionally absent. */
const listColumns = {
	id: schema.apikey.id,
	name: schema.apikey.name,
	start: schema.apikey.start,
	prefix: schema.apikey.prefix,
	enabled: schema.apikey.enabled,
	permissions: schema.apikey.permissions,
	expiresAt: schema.apikey.expiresAt,
	createdAt: schema.apikey.createdAt,
	lastRequest: schema.apikey.lastRequest,
	requestCount: schema.apikey.requestCount,
	rateLimitMax: schema.apikey.rateLimitMax,
	rateLimitTimeWindow: schema.apikey.rateLimitTimeWindow,
};

/**
 * `banned` is a real field on the session user — `admin()` declares it and the
 * `user` table stores it — but it is absent from `auth.$Infer.Session.user`
 * because `packages/auth` builds its plugin list as `const plugins = [...]` plus
 * conditional `.push(...)`, which widens the array and collapses per-plugin
 * field inference. Narrowed with `in` rather than cast, so this keeps compiling
 * (and starts checking properly) if that inference is ever restored.
 */
function isBannedUser(user: AppEnv["Variables"]["user"]): boolean {
	return !!user && "banned" in user && user.banned === true;
}

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

function validateName(raw: unknown): Validated<string> {
	if (typeof raw !== "string") {
		return { ok: false, error: "API key name is required" };
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return { ok: false, error: "API key name is required" };
	}
	if (trimmed.length > MAX_KEY_NAME_LENGTH) {
		return { ok: false, error: `API key name must be ${MAX_KEY_NAME_LENGTH} characters or fewer` };
	}
	return { ok: true, value: trimmed };
}

function validateScopes(raw: unknown): Validated<string[]> {
	if (!Array.isArray(raw) || raw.length === 0) {
		return { ok: false, error: "At least one scope is required" };
	}
	if (!raw.every((scope): scope is string => typeof scope === "string")) {
		return { ok: false, error: "Scopes must be an array of strings" };
	}
	const invalid = invalidScopes(raw);
	if (invalid.length > 0) {
		return { ok: false, error: `Unknown scope(s): ${invalid.join(", ")}` };
	}
	return { ok: true, value: raw };
}

function validateExpiresInDays(raw: unknown): Validated<number | null> {
	if (raw === undefined || raw === null) {
		return { ok: true, value: null };
	}
	if (typeof raw !== "number" || !Number.isInteger(raw) || raw < MIN_EXPIRY_DAYS || raw > MAX_EXPIRY_DAYS) {
		return {
			ok: false,
			error: `Expiry must be a whole number of days between ${MIN_EXPIRY_DAYS} and ${MAX_EXPIRY_DAYS}`,
		};
	}
	return { ok: true, value: raw };
}

// ──────────────────────────────────────────────
// GET / — list the session user's keys
// ──────────────────────────────────────────────
apiRouteUserApiKeys.get("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (isBannedUser(user)) {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	try {
		const rows = await traceAsync(
			"apikey.user.list",
			() =>
				db
					.select(listColumns)
					.from(schema.apikey)
					.where(eq(schema.apikey.referenceId, session.userId))
					.orderBy(desc(schema.apikey.createdAt)),
			{
				description: "Listing personal API keys",
				data: { userId: session.userId },
			}
		);

		// Built field by field: `permissions` is translated into `scopes` and the
		// raw column never reaches the client.
		const data = rows.map((row) => ({
			id: row.id,
			name: row.name,
			start: row.start,
			prefix: row.prefix,
			enabled: row.enabled,
			scopes: recordToScopes(parseScopeRecord(row.permissions)),
			expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
			createdAt: row.createdAt.toISOString(),
			lastRequest: row.lastRequest ? row.lastRequest.toISOString() : null,
			requestCount: row.requestCount,
			rateLimitMax: row.rateLimitMax,
			rateLimitTimeWindow: row.rateLimitTimeWindow,
		}));

		return c.json(successResponse(data));
	} catch (err) {
		await recordWideError({
			name: "apikey.user.list.failed",
			error: err,
			code: "USER_API_KEY_LIST_FAILED",
			message: "Failed to list personal API keys",
			contextData: { userId: session.userId },
		});
		return c.json(errorResponse("Failed to list API keys"), 500);
	}
});

// ──────────────────────────────────────────────
// POST / — create a key (plaintext secret returned exactly once)
// ──────────────────────────────────────────────
apiRouteUserApiKeys.post("/", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (isBannedUser(user)) {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return c.json(errorResponse("Invalid request body"), 400);
	}

	const name = validateName(body.name);
	if (!name.ok) {
		return c.json(errorResponse(name.error), 400);
	}

	const scopes = validateScopes(body.scopes);
	if (!scopes.ok) {
		return c.json(errorResponse(scopes.error), 400);
	}

	const expiresInDays = validateExpiresInDays(body.expiresInDays);
	if (!expiresInDays.ok) {
		return c.json(errorResponse(expiresInDays.error), 400);
	}

	try {
		const [existing] = await traceAsync(
			"apikey.user.count",
			() => db.select({ value: count() }).from(schema.apikey).where(eq(schema.apikey.referenceId, session.userId)),
			{
				description: "Counting personal API keys against the per-user cap",
				data: { userId: session.userId },
			}
		);

		if ((existing?.value ?? 0) >= MAX_USER_API_KEYS) {
			return c.json(
				errorResponse(`You can have at most ${MAX_USER_API_KEYS} API keys. Delete one before creating another.`),
				409
			);
		}

		// No `headers` — a header-bearing call is treated as client-originated by
		// the plugin, which then rejects `permissions`/`rateLimit*` outright.
		const created = await traceAsync(
			"apikey.user.create",
			() =>
				auth.api.createApiKey({
					body: {
						name: name.value,
						userId: session.userId,
						permissions: scopesToRecord(scopes.value),
						rateLimitEnabled: true,
						rateLimitTimeWindow: DEFAULT_RATE_LIMIT_WINDOW_MS,
						rateLimitMax: DEFAULT_RATE_LIMIT_MAX,
						...(expiresInDays.value ? { expiresIn: expiresInDays.value * SECONDS_PER_DAY } : {}),
						metadata: { source: "user-settings" },
					},
				}),
			{
				description: "Creating a personal API key",
				data: { userId: session.userId, scopeCount: scopes.value.length },
			}
		);

		// Field by field on purpose — spreading the plugin result would echo the
		// hashed secret back to the client.
		return c.json(
			successResponse({
				id: created.id,
				name: created.name,
				start: created.start,
				prefix: created.prefix,
				scopes: recordToScopes(created.permissions),
				expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
				createdAt: created.createdAt.toISOString(),
				key: created.key,
			})
		);
	} catch (err) {
		await recordWideError({
			name: "apikey.user.create.failed",
			error: err,
			code: "USER_API_KEY_CREATE_FAILED",
			message: "Failed to create personal API key",
			contextData: { userId: session.userId, scopeCount: scopes.value.length },
		});
		return c.json(errorResponse("Failed to create API key"), 500);
	}
});

// ──────────────────────────────────────────────
// POST /:keyId/regenerate — rotate the secret, keep the key's identity
// ──────────────────────────────────────────────
apiRouteUserApiKeys.post("/:keyId/regenerate", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (isBannedUser(user)) {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const keyId = c.req.param("keyId");
	if (!keyId) {
		return c.json(errorResponse("API key ID is required"), 400);
	}

	try {
		const [previous] = await traceAsync(
			"apikey.user.regenerate.lookup",
			() =>
				db
					.select({
						id: schema.apikey.id,
						name: schema.apikey.name,
						permissions: schema.apikey.permissions,
						enabled: schema.apikey.enabled,
						expiresAt: schema.apikey.expiresAt,
						rateLimitEnabled: schema.apikey.rateLimitEnabled,
						rateLimitMax: schema.apikey.rateLimitMax,
						rateLimitTimeWindow: schema.apikey.rateLimitTimeWindow,
					})
					.from(schema.apikey)
					.where(and(eq(schema.apikey.id, keyId), eq(schema.apikey.referenceId, session.userId)))
					.limit(1),
			{
				description: "Loading the API key being regenerated",
				data: { userId: session.userId, keyId },
			}
		);

		if (!previous) {
			return c.json(errorResponse("API key not found"), 404);
		}

		// Carry the remaining lifetime over. Rotating a key must never quietly
		// change its terms, so the two edge cases are handled explicitly rather
		// than falling through to "no expiry":
		//   - already expired -> refuse; the key is dead, create a new one
		//   - under a day left -> clamp up to the plugin's one-day minimum
		// Letting either case fall through would hand back a key that never
		// expires, silently discarding the expiry the user chose.
		let expiresIn: number | undefined;
		if (previous.expiresAt) {
			const remainingSeconds = Math.floor((previous.expiresAt.getTime() - Date.now()) / 1000);
			if (remainingSeconds <= 0) {
				return c.json(
					errorResponse(
						"API key has expired",
						"This key has already expired and cannot be regenerated. Create a new key instead."
					),
					400
				);
			}
			expiresIn = Math.max(remainingSeconds, SECONDS_PER_DAY);
		}

		const previousScopeRecord = parseScopeRecord(previous.permissions);

		// Create BEFORE delete: a failure here leaves the old key working, and a
		// failure in the delete below leaves a spare revocable key. Neither order
		// is atomic, but only this one keeps the user from losing access.
		const created = await traceAsync(
			"apikey.user.regenerate",
			() =>
				auth.api.createApiKey({
					body: {
						...(previous.name ? { name: previous.name } : {}),
						userId: session.userId,
						...(previousScopeRecord ? { permissions: previousScopeRecord } : {}),
						rateLimitEnabled: previous.rateLimitEnabled,
						rateLimitTimeWindow: previous.rateLimitTimeWindow ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
						rateLimitMax: previous.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX,
						...(expiresIn ? { expiresIn } : {}),
						metadata: { source: "user-settings" },
					},
				}),
			{
				description: "Regenerating a personal API key",
				data: { userId: session.userId, keyId },
			}
		);

		// createApiKey always enables the new key. Rotating a secret is not the
		// same as lifting a revocation, so carry a disabled state forward.
		if (previous.enabled === false) {
			await traceAsync(
				"apikey.user.regenerate.restore_disabled",
				() =>
					db
						.update(schema.apikey)
						.set({ enabled: false, updatedAt: new Date() })
						.where(and(eq(schema.apikey.id, created.id), eq(schema.apikey.referenceId, session.userId))),
				{
					description: "Restoring the disabled state onto the regenerated key",
					data: { userId: session.userId, keyId, replacementKeyId: created.id },
				}
			);
		}

		try {
			await traceAsync(
				"apikey.user.regenerate.revoke",
				() =>
					db
						.delete(schema.apikey)
						.where(and(eq(schema.apikey.id, keyId), eq(schema.apikey.referenceId, session.userId))),
				{
					description: "Revoking the superseded API key",
					data: { userId: session.userId, keyId },
				}
			);
		} catch (revokeErr) {
			// The new key is live and must still be handed to the caller; surface the
			// stale row so it can be cleaned up out of band.
			await recordWideError({
				name: "apikey.user.regenerate.orphan",
				error: revokeErr,
				code: "USER_API_KEY_ORPHANED",
				message: "Regenerated an API key but failed to revoke the superseded one",
				contextData: { userId: session.userId, keyId, replacementKeyId: created.id },
			});
		}

		return c.json(
			successResponse({
				id: created.id,
				name: created.name,
				start: created.start,
				prefix: created.prefix,
				scopes: recordToScopes(created.permissions),
				expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
				createdAt: created.createdAt.toISOString(),
				key: created.key,
			})
		);
	} catch (err) {
		await recordWideError({
			name: "apikey.user.regenerate.failed",
			error: err,
			code: "USER_API_KEY_REGENERATE_FAILED",
			message: "Failed to regenerate personal API key",
			contextData: { userId: session.userId, keyId },
		});
		return c.json(errorResponse("Failed to regenerate API key"), 500);
	}
});

// ──────────────────────────────────────────────
// PATCH /:keyId — rename, enable/disable, or re-scope
// ──────────────────────────────────────────────
apiRouteUserApiKeys.patch("/:keyId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (isBannedUser(user)) {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const keyId = c.req.param("keyId");
	if (!keyId) {
		return c.json(errorResponse("API key ID is required"), 400);
	}

	const body = await c.req.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return c.json(errorResponse("Invalid request body"), 400);
	}

	const updates: { name?: string; enabled?: boolean; permissions?: string; updatedAt: Date } = {
		updatedAt: new Date(),
	};

	if (body.name !== undefined) {
		const name = validateName(body.name);
		if (!name.ok) {
			return c.json(errorResponse(name.error), 400);
		}
		updates.name = name.value;
	}

	if (body.enabled !== undefined) {
		if (typeof body.enabled !== "boolean") {
			return c.json(errorResponse("`enabled` must be a boolean"), 400);
		}
		updates.enabled = body.enabled;
	}

	if (body.scopes !== undefined) {
		const scopes = validateScopes(body.scopes);
		if (!scopes.ok) {
			return c.json(errorResponse(scopes.error), 400);
		}
		updates.permissions = JSON.stringify(scopesToRecord(scopes.value));
	}

	try {
		// Ownership lives in the WHERE clause, so a non-owner gets an empty
		// `returning()` and the same 404 a missing key would produce.
		const [updated] = await traceAsync(
			"apikey.user.update",
			() =>
				db
					.update(schema.apikey)
					.set(updates)
					.where(and(eq(schema.apikey.id, keyId), eq(schema.apikey.referenceId, session.userId)))
					.returning({ id: schema.apikey.id }),
			{
				description: "Updating a personal API key",
				data: { userId: session.userId, keyId, fields: Object.keys(updates) },
			}
		);

		if (!updated) {
			return c.json(errorResponse("API key not found"), 404);
		}

		return c.json(successResponse({ id: updated.id }));
	} catch (err) {
		await recordWideError({
			name: "apikey.user.update.failed",
			error: err,
			code: "USER_API_KEY_UPDATE_FAILED",
			message: "Failed to update personal API key",
			contextData: { userId: session.userId, keyId, fields: Object.keys(updates) },
		});
		return c.json(errorResponse("Failed to update API key"), 500);
	}
});

// ──────────────────────────────────────────────
// DELETE /:keyId — revoke
// ──────────────────────────────────────────────
apiRouteUserApiKeys.delete("/:keyId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (isBannedUser(user)) {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const keyId = c.req.param("keyId");
	if (!keyId) {
		return c.json(errorResponse("API key ID is required"), 400);
	}

	try {
		// Single statement: the ownership predicate IS the delete's WHERE clause,
		// so there is no window between checking and deleting. A miss returns 404
		// rather than 403 to avoid confirming that someone else's key ID exists.
		const [deleted] = await traceAsync(
			"apikey.user.delete",
			() =>
				db
					.delete(schema.apikey)
					.where(and(eq(schema.apikey.id, keyId), eq(schema.apikey.referenceId, session.userId)))
					.returning({ id: schema.apikey.id }),
			{
				description: "Deleting a personal API key",
				data: { userId: session.userId, keyId },
			}
		);

		if (!deleted) {
			return c.json(errorResponse("API key not found"), 404);
		}

		return c.json(successResponse({ id: deleted.id }));
	} catch (err) {
		await recordWideError({
			name: "apikey.user.delete.failed",
			error: err,
			code: "USER_API_KEY_DELETE_FAILED",
			message: "Failed to delete personal API key",
			contextData: { userId: session.userId, keyId },
		});
		return c.json(errorResponse("Failed to delete API key"), 500);
	}
});
