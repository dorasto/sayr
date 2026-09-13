/**
 * Derives the public, org-branded web URL for a task (e.g.
 * `https://platform.sayr.io/71`) from the CLI's own configured API base URL
 * — never hardcoded, since the same plugin has to work against production,
 * a self-hosted instance, and a local dev backend (`sayr-local`).
 *
 * The mapping isn't a guess: it mirrors the real host-based routing in
 * `apps/traefik/dynamic.yml.template` — every subdomain of the root domain
 * except `api.` routes to `apps/start` (the frontend), which reads the
 * subdomain itself as the org slug (`platform.sayr.io` → the `platform`
 * org's public view, task path is just `/<shortId>`, no `/tasks/` prefix —
 * confirmed by the very URL this session started from,
 * `https://platform.sayr.io/71`). The API's own default base URL is
 * `https://api.sayr.io` (`packages/cli/src/lib/config.ts`'s
 * `DEFAULT_BASE_URL`) — so swapping the `api.` label for the org's slug
 * recovers the frontend host for production AND for any self-hosted
 * instance using the same `api.<domain>` / `<org>.<domain>` convention.
 *
 * Local dev doesn't follow that pattern at all — `sayr-local`'s base URL is
 * the bare backend port (`http://localhost:5468`, no `api.` subdomain, see
 * `packages/cli/README.md`), and the frontend runs on a completely
 * different port behind `VITE_ROOT_DOMAIN=app.localhost` (`.env.example`) —
 * so `localhost`/`127.0.0.1` gets its own special-cased mapping instead of
 * the general `api.` → `<org>.` swap.
 */

/** `{org}`/`{shortId}` template placeholders — see `deriveTaskWebUrl`'s `template` param. */
export function applyWebUrlTemplate(template: string, orgSlug: string, shortId: number): string {
	return template.replaceAll("{org}", orgSlug).replaceAll("{shortId}", String(shortId));
}

function deriveWebBase(baseApiUrl: string, orgSlug: string): string | undefined {
	let url: URL;
	try {
		url = new URL(baseApiUrl);
	} catch {
		return undefined;
	}

	const host = url.hostname;

	// Local dev: the API has no `api.` subdomain at all (it's just the bare
	// backend port), and the frontend runs on an entirely different port —
	// `apps/start`'s own known dev port, not derivable from the API's.
	if (host === "localhost" || host === "127.0.0.1") {
		return `${url.protocol}//${orgSlug}.app.localhost:3000`;
	}

	if (host.startsWith("api.")) {
		const port = url.port ? `:${url.port}` : "";
		return `${url.protocol}//${orgSlug}.${host.slice(4)}${port}`;
	}

	// Unknown shape (a self-hosted API with no `api.` subdomain) — best
	// effort: prepend the org slug rather than assume nothing works.
	const port = url.port ? `:${url.port}` : "";
	return `${url.protocol}//${orgSlug}.${host}${port}`;
}

/**
 * `template`, if non-empty, overrides the derivation entirely (an escape
 * hatch for self-hosted setups that don't follow the `api.<domain>` /
 * `<org>.<domain>` convention at all) — see `shared/settings.ts`'s
 * `webUrlTemplate`. Returns `undefined` if `baseApiUrl` isn't a parseable
 * URL (shouldn't happen for anything `sayr login --base-url` accepted), or if
 * an expanded `template` doesn't produce a valid `http(s)` URL — the caller
 * only renders the "Open on Sayr" button when this is truthy, so `undefined`
 * just hides the button instead of handing `Linking.openURL()` garbage.
 */
export function deriveTaskWebUrl({
	baseApiUrl,
	orgSlug,
	shortId,
	template,
}: {
	baseApiUrl: string;
	orgSlug: string;
	shortId: number;
	template?: string;
}): string | undefined {
	if (template?.trim()) {
		const expanded = applyWebUrlTemplate(template.trim(), orgSlug, shortId);
		try {
			const parsed = new URL(expanded);
			if (parsed.protocol === "http:" || parsed.protocol === "https:") {
				return expanded;
			}
		} catch {
			// A typo'd template (e.g. missing the scheme/host entirely) isn't a
			// usable URL — fall through to `undefined` below rather than handing
			// something unopenable to `Linking.openURL()`.
		}
		return undefined;
	}
	const base = deriveWebBase(baseApiUrl, orgSlug);
	return base ? `${base}/${shortId}` : undefined;
}
