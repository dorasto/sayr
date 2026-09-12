import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ThemeProvider } from "@/components/theme-provider";
import { seoMeta } from "@/lib/seo";
import { getThemeServerFn } from "@/lib/theme";
import appCss from "../styles.css?url";

// Site-wide fallback metadata — every route's own `head()` overrides these
// (matching keys like `title` replace rather than duplicate), so this only
// shows up for a route that forgets to set its own.
const defaultSeo = seoMeta({
	title: "Sayr",
	description:
		"Transparent, collaborative project management that bridges internal workflows with public collaboration.",
	path: "/",
});

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#18181b" },
			...defaultSeo.meta,
		],
		// Deliberately omits defaultSeo.links: every real route already sets its
		// own canonical link via seoMeta(), and TanStack Start dedupes `meta` by
		// key but not `links` by `rel` — merging the root's here would render two
		// <link rel="canonical"> tags on every page.
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		],
	}),
	loader: () => getThemeServerFn(),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const theme = Route.useLoaderData();
	return (
		<html className={theme} lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider theme={theme}>
					{/* Fumadocs' own next-themes integration is disabled — dark mode is
					    already driven by the cookie-based <html className> above, which
					    Fumadocs' CSS keys off regardless of what sets it. */}
					<RootProvider theme={{ enabled: false }}>{children}</RootProvider>
				</ThemeProvider>
				<TanStackDevtools
					plugins={[
						{
							name: "TanStack Query",
							render: <ReactQueryDevtoolsPanel />,
							defaultOpen: true,
						},
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
							defaultOpen: false,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
