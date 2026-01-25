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

				if (
					url.pathname.startsWith("/api") ||
					url.pathname.startsWith("/login") ||
					url.pathname.startsWith("/manifest.webmanifest") ||
					url.pathname.startsWith("/invite")
				) {
					return;
				}

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
			},
		},
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});
	return router;
};
