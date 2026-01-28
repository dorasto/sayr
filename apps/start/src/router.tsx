import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import NotFound from "./components/NotFound";
import * as Sentry from "@sentry/tanstackstart-react";
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
          isLocalhost && parts.length > 1
            ? parts[0]
            : !isLocalhost && parts.length > 2
              ? parts[0]
              : "";

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

	if (!router.isServer && import.meta.env.VITE_SENTRY_DSN) {
		Sentry.init({
			dsn: import.meta.env.VITE_SENTRY_DSN,

			// Set environment to differentiate between dev and production
			environment: import.meta.env.PROD ? "production" : "development",

			// Set release version for proper source map matching
			release: import.meta.env.VITE_SENTRY_RELEASE || `start@${import.meta.env.npm_package_version || "dev"}`,

			// Adds request headers and IP for users, for more info visit:
			// https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
			sendDefaultPii: true,

		integrations: [
			Sentry.tanstackRouterBrowserTracingIntegration(router),
			Sentry.replayIntegration(),
			Sentry.browserProfilingIntegration(),
			Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
		],

		// Set tracesSampleRate to 1.0 to capture 100%
		// of transactions for tracing.
		// We recommend adjusting this value in production.
		// Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
		tracesSampleRate: 1.0,

		// Set profileSessionSampleRate to 1.0 to profile during every session.
		// The decision, whether to profile or not, is made once per session (when the SDK is initialized).
		profileSessionSampleRate: 1.0,

		// Capture Replay for 10% of all sessions,
		// plus for 100% of sessions with an error.
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		enableLogs: true,
	});
}

return router;
};
