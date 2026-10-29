import { QueryClient } from "@tanstack/react-query";
import { createRouter, defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import NotFound from "./components/not-found";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// better-auth's OAuth provider signs the query it redirects to /auth/login and
// /auth/consent (repeated `ba_param` keys + `sig`), and its client re-reads that
// query from window.location.search. The default serializer JSON-coerces values
// and collapses repeated keys, and SSR 307-redirects to that "canonical" URL —
// which breaks the signature. Pass signed queries through as raw strings.
function isSignedOAuthQuery(params: URLSearchParams) {
	return params.has("sig") && params.has("ba_param");
}

function parseSearch(searchStr: string): Record<string, unknown> {
	const params = new URLSearchParams(searchStr);
	if (!isSignedOAuthQuery(params)) return defaultParseSearch(searchStr);
	const search: Record<string, string | string[]> = {};
	for (const key of new Set(params.keys())) {
		const values = params.getAll(key);
		search[key] = values.length === 1 ? (params.get(key) ?? "") : values;
	}
	return search;
}

function stringifySearch(search: Record<string, unknown>) {
	if (search.sig === undefined || search.ba_param === undefined) return defaultStringifySearch(search);
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (value === undefined) continue;
		for (const v of Array.isArray(value) ? value : [value]) params.append(key, String(v));
	}
	const str = params.toString();
	return str ? `?${str}` : "";
}

// Create a new router instance
export const getRouter = () => {
	const queryClient = new QueryClient();

	// Get origin - on client use window.origin, on server it will be set by TanStack Start from the request
	const clientOrigin =
		typeof window !== "undefined" && window.origin && window.origin !== "null" ? window.origin : undefined;
	const router = createRouter({
		routeTree,
		context: { queryClient },
		defaultPreload: "intent",
		scrollRestoration: true,
		defaultNotFoundComponent: NotFound,
		// Set origin for client-side - TanStack Start will override this on the server with the request origin
		origin: clientOrigin,
		// Cache loader data for 30 seconds to prevent unnecessary refetches
		// during hydration and same-route navigations
		defaultPreloadStaleTime: 1000 * 30,
		parseSearch,
		stringifySearch,
		rewrite: {
			// INPUT: URL → Internal Route
			// Transforms the browser URL to match internal route structure
			input: ({ url }) => {
				try {
					// Safety check - ensure url has required properties
					if (!url || typeof url.hostname !== "string" || typeof url.pathname !== "string") {
						return;
					}

					const hostname = url.hostname;

					if (
						url.pathname.startsWith("/api") ||
						url.pathname.startsWith("/manifest.webmanifest") ||
						url.pathname.startsWith("/invite") ||
						// Skip if already rewritten to /orgs/ path (prevents double-rewrite loop)
						url.pathname.startsWith("/orgs/") ||
						url.pathname.startsWith("/auth/")
					) {
						return;
					}

					// Never rewrite admin or api subdomains
					// Admin host → admin is root
					// Handles: admin.sayr.io, admin.app.localhost, localhost, admin.127.0.0.1.sslip.io
					if (
						hostname.startsWith("admin.") ||
						hostname === "localhost" ||
						hostname.startsWith("localhost:") ||
						hostname === "app.localhost" ||
						hostname.startsWith("app.localhost:")
					) {
						return;
					}

					const parts = hostname.split(".");
					const isLocalhost = parts[parts.length - 1] === "localhost";

					const subdomain =
						isLocalhost && parts.length > 1 ? parts[0] : !isLocalhost && parts.length > 2 ? parts[0] : "";

					if (!subdomain || subdomain === "www" || subdomain === "admin") {
						return;
					}

					const path = url.pathname === "/" ? "" : url.pathname;
					url.pathname = `/orgs/${subdomain}${path}`;
					return url;
				} catch (e) {
					console.error("[rewrite.input] Error:", e, "url:", url);
					return;
				}
			},
			// OUTPUT: Internal Route → Browser URL
			// Transforms internal route paths back to browser-friendly subdomain URLs
			output: ({ url }) => {
				try {
					if (!url || typeof url.hostname !== "string" || typeof url.pathname !== "string") {
						return;
					}

					// Only transform /orgs/$slug paths back to subdomain URLs
					const match = url.pathname.match(/^\/orgs\/([^/]+)(\/.*)?$/);
					if (!match) {
						return;
					}

					const orgSlug = match[1];
					const restOfPath = match[2] || "/";

					// Transform the URL to use subdomain
					// e.g., /orgs/test/tasks → test.app.localhost/tasks
					url.pathname = restOfPath;

					// Update hostname to include subdomain
					const hostname = url.hostname;
					const parts = hostname.split(".");
					const isLocalhost = parts[parts.length - 1] === "localhost";

					if (isLocalhost) {
						// localhost → orgSlug.app.localhost
						// app.localhost → orgSlug.app.localhost
						if (hostname === "localhost" || hostname === "app.localhost") {
							url.hostname = `${orgSlug}.app.localhost`;
						} else if (!hostname.startsWith(`${orgSlug}.`)) {
							// Already has a different subdomain, replace it
							url.hostname = `${orgSlug}.${parts.slice(1).join(".")}`;
						}
					} else {
						// Production: sayr.io → orgSlug.sayr.io
						if (!hostname.startsWith(`${orgSlug}.`)) {
							url.hostname = `${orgSlug}.${hostname}`;
						}
					}

					return url;
				} catch (e) {
					console.error("[rewrite.output] Error:", e, "url:", url);
					return;
				}
			},
		},
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});
	return router;
};
