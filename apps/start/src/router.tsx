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
			input: ({ url }) => {
				const hostname = url.hostname;
				if (url.pathname.startsWith("/invite")) {
					return url;
				}
				if (url.pathname.startsWith("/api")) {
					return url;
				}
				// 1. Admin Subdomain
				if (hostname.startsWith("admin.")) {
					if (!url.pathname.startsWith("/admin")) {
						url.pathname = `/`;
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
		},
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});
	return router;
};
