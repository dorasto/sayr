import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "../components/Header";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: This script prevents FOUC
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								var storageKey = "site-theme";
								var defaultTheme = "dark";
								try {
									var theme = localStorage.getItem(storageKey) || defaultTheme;
									var root = document.documentElement;
									root.classList.remove("light", "dark");
									if (theme === "system") {
										var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
										root.classList.add(systemTheme);
									} else {
										root.classList.add(theme);
									}
								} catch (e) {}
							})()
						`,
					}}
				/>
			</head>
			<body>
				<ThemeProvider>
					{/* <Header /> */}
					{children}
					{process.env.NODE_ENV !== "production" && (
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					)}
					<Scripts />
				</ThemeProvider>
			</body>
		</html>
	);
}
