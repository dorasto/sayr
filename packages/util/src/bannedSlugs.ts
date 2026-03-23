/**
 * Reserved/banned organization slugs.
 *
 * These slugs cannot be used as organization identifiers because they:
 * - Conflict with application URL routes (e.g. /admin, /api, /login)
 * - Are common Unix/system names that could cause confusion
 * - Are Sayr brand or product names
 * - Are generic terms that should not be owned by a single organization
 */
export const BANNED_SLUGS: ReadonlySet<string> = new Set([
	// ── Sayr brand & product ─────────────────────────────────────────────────
	"sayr",
	"sayr-io",
	"sayr-app",
	"sayr-admin",
	"sayr-api",
	"sayr-cloud",
	"sayr-community",
	"sayr-enterprise",
	"sayr-support",

	// ── Application URL routes ────────────────────────────────────────────────
	"admin",
	"api",
	"app",
	"assets",
	"auth",
	"backend",
	"cdn",
	"console",
	"dashboard",
	"dev",
	"docs",
	"download",
	"downloads",
	"email",
	"feed",
	"files",
	"frontend",
	"graphql",
	"health",
	"help",
	"hooks",
	"internal",
	"login",
	"logout",
	"mail",
	"marketing",
	"media",
	"metrics",
	"oauth",
	"onboarding",
	"ping",
	"public",
	"register",
	"rss",
	"s3",
	"settings",
	"signup",
	"sitemap",
	"static",
	"status",
	"support",
	"system",
	"webhook",
	"webhooks",
	"well-known",
	"ws",

	// ── Unix / OS reserved names ──────────────────────────────────────────────
	"bin",
	"boot",
	"daemon",
	"etc",
	"home",
	"lib",
	"null",
	"proc",
	"root",
	"srv",
	"sys",
	"tmp",
	"usr",
	"var",

	// ── Security / privileged roles ───────────────────────────────────────────
	"god",
	"master",
	"moderator",
	"operator",
	"owner",
	"postmaster",
	"security",
	"superadmin",
	"superuser",
	"sysadmin",
	"webmaster",

	// ── Generic reserved / abuse-prone terms ─────────────────────────────────
	"about",
	"abuse",
	"account",
	"accounts",
	"anonymous",
	"billing",
	"blog",
	"careers",
	"contact",
	"copyright",
	"default",
	"demo",
	"error",
	"errors",
	"example",
	"explore",
	"forbidden",
	"ghost",
	"guest",
	"info",
	"invite",
	"invites",
	"jobs",
	"legal",
	"me",
	"new",
	"nobody",
	"noreply",
	"no-reply",
	"official",
	"press",
	"pricing",
	"privacy",
	"search",
	"server",
	"team",
	"terms",
	"test",
	"tester",
	"undefined",
	"unknown",
	"void",
]);

/**
 * Returns `true` if the given slug is reserved and cannot be used as an
 * organization identifier.
 *
 * The check is case-insensitive: "Admin" and "ADMIN" are both banned.
 *
 * @example
 * isSlugBanned("admin")  // true
 * isSlugBanned("acme")   // false
 */
export function isSlugBanned(slug: string): boolean {
	return BANNED_SLUGS.has(slug.toLowerCase().trim());
}
