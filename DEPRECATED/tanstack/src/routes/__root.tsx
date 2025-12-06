import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarScript } from "@/lib/sidebar/sidebar-script";
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

	notFoundComponent: () => {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
				<h1 className="text-4xl font-bold">404</h1>
				<p className="text-muted-foreground">Page not found</p>
				<a href="/" className="text-primary underline underline-offset-4 hover:text-primary/80">
					Go back home
				</a>
			</div>
		);
	},

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<SidebarScript />
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
			<body className="relative">
				<ThemeProvider>
					{/* <Header /> */}
					{children}
					{/* {process.env.NODE_ENV !== "production" && ( */}
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
					{/* )} */}
					<Scripts />
				</ThemeProvider>
			</body>
		</html>
	);
}
