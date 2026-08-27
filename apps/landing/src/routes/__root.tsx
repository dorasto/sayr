import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemeServerFn } from "@/lib/theme";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Sayr" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
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
				<Scripts />
			</body>
		</html>
	);
}
