/**
 * Browser-safe catalog of personal API key scopes.
 *
 * NOTE: This file must remain free of Node.js-only imports so it can be
 * used in frontend (Vite/browser) bundles — the settings scope picker
 * renders directly off `API_KEY_SCOPES`.
 *
 * Scopes deliberately reuse the org RBAC vocabulary (`TeamPermissions` in
 * `@repo/database`) rather than inventing a parallel one. Each scope maps to a
 * `PermissionPath` that is checked against the key OWNER's real permissions in
 * the target organization at request time.
 *
 * The security model, in one sentence: a scope is a CEILING, never a grant.
 * Effective access = (key grants the scope) AND (owner holds the permission in
 * that org). A key can never do more than its owner can.
 */

/** Top-level scope groupings. Mirrors the `TeamPermissions` categories we expose. */
export type ApiKeyScopeResource = "tasks" | "content" | "moderation";

/** Wire format used by `@better-auth/api-key`: resource -> actions. */
export type ApiKeyScopeRecord = Record<string, string[]>;

interface ScopeDefinition {
	/**
	 * The org permission this scope maps to — a `PermissionPath` in
	 * `@repo/database`. `"members"` means "any member of the org", which is the
	 * baseline gate the internal task routes use for reads.
	 */
	readonly permission: string;
	readonly label: string;
	readonly description: string;
}

/**
 * The full catalog.
 *
 * `admin.*` permissions (manageMembers, manageTeams, billing, administrator) are
 * PERMANENTLY excluded — not merely deferred. A personal access token must never
 * be able to manage members, teams, or billing. This matters more than it looks:
 * `isPlatformAdmin` treats roles "admin" and "system" as god-mode in every org,
 * so without this exclusion a leaked platform-admin key would be catastrophic.
 */
export const API_KEY_SCOPES = {
	tasks: {
		read: {
			permission: "members",
			label: "Read tasks",
			description: "List, search, and read tasks in your organizations.",
		},
		create: {
			permission: "tasks.create",
			label: "Create tasks",
			description: "Create new tasks.",
		},
		comment: {
			// Commenting only requires org membership in the app, so the API uses the
			// same bar. Kept separate from `create` so a bot that posts status
			// comments doesn't also have to be allowed to open tasks.
			permission: "members",
			label: "Post comments",
			description: "Write comments on tasks. Does not allow editing or deleting anyone else's.",
		},
		editAny: {
			permission: "tasks.editAny",
			label: "Edit tasks",
			description: "Change task title, description, category, release, and visibility.",
		},
		assign: {
			permission: "tasks.assign",
			label: "Assign tasks",
			description: "Add or remove assignees on a task.",
		},
		changeStatus: {
			permission: "tasks.changeStatus",
			label: "Change status",
			description: "Move tasks between backlog, todo, in-progress, done, and canceled.",
		},
		changePriority: {
			permission: "tasks.changePriority",
			label: "Change priority",
			description: "Set task priority.",
		},
	},
	content: {
		manageLabels: {
			permission: "content.manageLabels",
			label: "Manage labels",
			description: "Add or remove labels on tasks.",
		},
		manageCategories: {
			permission: "content.manageCategories",
			label: "Manage categories",
			description: "Read and assign task categories.",
		},
		manageReleases: {
			permission: "content.manageReleases",
			label: "Manage releases",
			description: "Read and assign releases.",
		},
	},
	moderation: {
		manageComments: {
			permission: "moderation.manageComments",
			label: "Moderate comments",
			// Deliberately not "edit or delete": the edit handler rejects anyone who
			// isn't the comment's author, moderators and admins included. Deleting
			// someone else's comment is the only cross-user action available.
			description: "Delete comments written by others.",
		},
	},
} as const satisfies Record<ApiKeyScopeResource, Record<string, ScopeDefinition>>;

type ScopeCatalog = typeof API_KEY_SCOPES;

/** Union of every valid scope string, e.g. `"tasks.create"`. */
export type ApiKeyScope = {
	[R in keyof ScopeCatalog]: `${R & string}.${keyof ScopeCatalog[R] & string}`;
}[keyof ScopeCatalog];

/** Every scope in the catalog, flattened. Stable order: catalog declaration order. */
export const ALL_API_KEY_SCOPES: ApiKeyScope[] = (Object.keys(API_KEY_SCOPES) as (keyof ScopeCatalog)[]).flatMap(
	(resource) => Object.keys(API_KEY_SCOPES[resource]).map((action) => `${resource}.${action}` as ApiKeyScope)
);

const SCOPE_SET = new Set<string>(ALL_API_KEY_SCOPES);

/** Narrows an arbitrary string to a catalog scope. */
export function isApiKeyScope(value: string): value is ApiKeyScope {
	return SCOPE_SET.has(value);
}

/**
 * Splits `"tasks.create"` into its parts. Returns null when the scope is not in
 * the catalog, so unknown input can never be silently treated as valid.
 */
export function parseScope(scope: string): { resource: ApiKeyScopeResource; action: string } | null {
	if (!isApiKeyScope(scope)) return null;
	const dot = scope.indexOf(".");
	return {
		resource: scope.slice(0, dot) as ApiKeyScopeResource,
		action: scope.slice(dot + 1),
	};
}

/** Returns the entries of `scopes` that are not in the catalog. */
export function invalidScopes(scopes: readonly string[]): string[] {
	return scopes.filter((s) => !isApiKeyScope(s));
}

/** Looks up the display metadata for a scope. */
export function scopeDefinition(scope: ApiKeyScope): ScopeDefinition {
	const parsed = parseScope(scope);
	if (!parsed) throw new Error(`Unknown API key scope: ${scope}`);
	const group = API_KEY_SCOPES[parsed.resource] as Record<string, ScopeDefinition | undefined>;
	const definition = group[parsed.action];
	// Unreachable: parseScope already proved the scope is in the catalog.
	if (!definition) throw new Error(`Unknown API key scope: ${scope}`);
	return definition;
}

/** Looks up the org permission path a scope maps to. */
export function scopeToPermissionPath(scope: ApiKeyScope): string {
	return scopeDefinition(scope).permission;
}

/**
 * `["tasks.create", "content.manageLabels"]`
 *   -> `{ tasks: ["create"], content: ["manageLabels"] }`
 *
 * Unknown scopes are dropped rather than passed through, so a malformed value
 * can never widen a key. Validate with `invalidScopes` first if you need to
 * reject the request instead.
 */
export function scopesToRecord(scopes: readonly string[]): ApiKeyScopeRecord {
	const record: ApiKeyScopeRecord = {};
	for (const scope of scopes) {
		const parsed = parseScope(scope);
		if (!parsed) continue;
		let bucket = record[parsed.resource];
		if (!bucket) {
			bucket = [];
			record[parsed.resource] = bucket;
		}
		if (!bucket.includes(parsed.action)) bucket.push(parsed.action);
	}
	return record;
}

/**
 * `{ tasks: ["create"] }` -> `["tasks.create"]`.
 * Entries not in the catalog are dropped.
 */
export function recordToScopes(record: ApiKeyScopeRecord | null | undefined): ApiKeyScope[] {
	if (!record || typeof record !== "object") return [];
	const scopes: ApiKeyScope[] = [];
	for (const [resource, actions] of Object.entries(record)) {
		if (!Array.isArray(actions)) continue;
		for (const action of actions) {
			const candidate = `${resource}.${action}`;
			if (isApiKeyScope(candidate)) scopes.push(candidate);
		}
	}
	return scopes;
}

/**
 * True iff the key's stored scope record grants `scope`.
 *
 * This is only HALF of an authorization decision — the caller must still verify
 * the key owner holds the mapped permission in the target org. See `keyCan` in
 * the backend, which is the only place both halves are checked together.
 */
export function keyScopeAllows(record: ApiKeyScopeRecord | null | undefined, scope: ApiKeyScope): boolean {
	const parsed = parseScope(scope);
	if (!parsed || !record) return false;
	const actions = record[parsed.resource];
	return Array.isArray(actions) && actions.includes(parsed.action);
}

/**
 * Parses the `permissions` column, which Better Auth stores as a JSON string.
 * Returns null on anything malformed — callers treat null as "grants nothing".
 */
export function parseScopeRecord(raw: string | null | undefined): ApiKeyScopeRecord | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
		return parsed as ApiKeyScopeRecord;
	} catch {
		return null;
	}
}

/** One-click presets offered in the key-creation dialog. */
export const API_KEY_SCOPE_PRESETS: {
	id: string;
	label: string;
	description: string;
	scopes: ApiKeyScope[];
}[] = [
	{
		id: "read-only",
		label: "Read only",
		description: "List, search, and read tasks. Cannot change anything.",
		scopes: ["tasks.read"],
	},
	{
		id: "task-management",
		label: "Task management",
		description: "Read and write tasks, labels, assignees, and comments.",
		scopes: [
			"tasks.read",
			"tasks.create",
			"tasks.comment",
			"tasks.editAny",
			"tasks.assign",
			"tasks.changeStatus",
			"tasks.changePriority",
			"content.manageLabels",
		],
	},
	{
		id: "full-access",
		label: "Full access",
		description: "Every scope available to a personal key. Never includes member, team, or billing management.",
		scopes: [...ALL_API_KEY_SCOPES],
	},
];
