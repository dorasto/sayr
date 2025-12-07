import { HeadlessToastConfig } from "@repo/ui/components/headless-toast";
import { Toaster } from "@repo/ui/components/sonner";
import { IconAlertCircle, IconAlertCircleFilled, IconCheck, IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import NotFound from "@/components/NotFound";
import { SidebarScript } from "@/lib/sidebar/sidebar-script";
import appCss from "../styles.css?url";
export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
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

	notFoundComponent: NotFound,

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<SidebarScript />
			</head>
			<body className="dark relative">
				{/* <Header /> */}
				<HeadlessToastConfig
					icons={{
						success: <IconCheck className="text-success" />,
						info: <IconInfoCircle className="text-primary" />,
						warning: <IconAlertCircle className=" text-amber-500" />,
						error: <IconAlertCircleFilled className="text-destructive" />,
						loading: <IconLoader2 className="animate-spin text-primary" />,
					}}
				/>
				{children}
				<Toaster
					icons={{
						success: <IconCheck />,
						info: <IconInfoCircle />,
						warning: <IconAlertCircle />,
						error: <IconAlertCircleFilled />,
						loading: <IconLoader2 />,
					}}
					toastOptions={{
						unstyled: true,
						duration: 10000,
					}}
				/>
				<TanStackRouterDevtools position="bottom-right" />
				<ReactQueryDevtools buttonPosition="bottom-left" />
				<Scripts />
			</body>
		</html>
	);
}
