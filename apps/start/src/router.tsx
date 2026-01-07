import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import NotFound from "./components/NotFound";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	const queryClient = new QueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		defaultPreload: "intent",
		scrollRestoration: true,
		defaultNotFoundComponent: NotFound,
		// Cache loader data for 30 seconds to prevent unnecessary refetches
		// during hydration and same-route navigations
		defaultPreloadStaleTime: 1000 * 30,
		rewrite: {
			// INPUT: URL → Internal Route
			// Transforms the browser URL to match internal route structure
			input: ({ url }) => {
				const hostname = url.hostname;
				// These routes exist outside /admin and should not be prefixed
				if (url.pathname.startsWith("/invite")) {
					return url;
				}
				if (url.pathname.startsWith("/api")) {
					return url;
				}
				if (url.pathname.startsWith("/login")) {
					return url;
				}
				// 1. Admin Subdomain - prepend /admin to paths
				// admin.sayr.io/ → /admin/
				// admin.sayr.io/orgid/tasks → /admin/orgid/tasks
				// Also works with admin.localhost:3000 for local dev
				// Plain localhost:3000 also treated as admin for convenience
				const isAdminSubdomain = hostname.startsWith("admin.");
				const isPlainLocalhost = hostname === "localhost" || hostname.startsWith("localhost:");
				if (isAdminSubdomain || isPlainLocalhost) {
					if (!url.pathname.startsWith("/admin")) {
						url.pathname = `/admin${url.pathname}`;
						return url;
					}
				}

				// 2. Organization Subdomains (anything else that is a subdomain)
				// We need to exclude 'admin', 'www', and 'localhost' (if testing locally without subdomains)
				// Adjust this regex/logic to match your domain structure
				const parts = hostname.split(".");
				const isLocalhost = parts[parts.length - 1] === "localhost";
				let subdomain = "";

				if (isLocalhost) {
					// localhost:3000 -> no subdomain
					// org.localhost:3000 -> subdomain = org
					if (parts.length > 1 && parts[0] !== "www") {
						subdomain = parts[0] || "";
					}
				} else {
					// production logic (e.g. app.com)
					// org.app.com -> subdomain = org
					if (parts.length > 2 && parts[0] !== "www") {
						subdomain = parts[0] || "";
					}
				}

				if (subdomain && subdomain !== "admin") {
					if (!url.pathname.startsWith("/orgs")) {
						// Rewrite to /orgs/$orgSlug/...
						// We need to inject the orgSlug into the path
						// Original: /dashboard -> /orgs/my-org/dashboard

						const path = url.pathname === "/" ? "" : url.pathname;
						url.pathname = `/orgs/${subdomain}${path}`;
						return url;
					}
				}

				// 3. Root Domain (Home)
				// If no subdomain, rewrite to /home
				if (!subdomain && !hostname.startsWith("admin.")) {
					if (
						!url.pathname.startsWith("/") &&
						!url.pathname.startsWith("/admin") &&
						!url.pathname.startsWith("/orgs")
					) {
						url.pathname = `/${url.pathname === "/" ? "" : url.pathname}`;
						return url;
					}
				}

				return undefined;
			},
			// OUTPUT: Internal Route → URL
			// Transforms generated links to match the clean URL structure
			output: ({ url }) => {
				const hostname = url.hostname;
				const isAdminSubdomain = hostname.startsWith("admin.");
				const isPlainLocalhost = hostname === "localhost" || hostname.startsWith("localhost:");

				// On admin subdomain or localhost, strip /admin from URLs
				if (isAdminSubdomain || isPlainLocalhost) {
					if (url.pathname.startsWith("/admin")) {
						url.pathname = url.pathname.replace(/^\/admin/, "") || "/";
						return url;
					}
				}

				// On org subdomains, strip /orgs/$orgSlug from URLs
				const parts = hostname.split(".");
				const isLocalhost = parts[parts.length - 1] === "localhost";
				let subdomain = "";

				if (isLocalhost) {
					if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "admin") {
						subdomain = parts[0] || "";
					}
				} else {
					if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "admin") {
						subdomain = parts[0] || "";
					}
				}

				if (subdomain && url.pathname.startsWith(`/orgs/${subdomain}`)) {
					url.pathname = url.pathname.replace(`/orgs/${subdomain}`, "") || "/";
					return url;
				}

				return undefined;
			},
		},
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});
	return router;
};
