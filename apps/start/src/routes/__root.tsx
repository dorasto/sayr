import type { schema } from "@repo/database";
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
import { DefaultCatchBoundary } from "@/components/Error";
import { seo } from "@/seo";
import { initClickTracking, initOpenTel, patchGlobalFetch } from "@repo/opentelemetry/client"
const isSayrCloud = import.meta.env.VITE_SAYR_CLOUD?.toLowerCase() === "true";
if (typeof window !== "undefined" && isSayrCloud) {
	initOpenTel("sayr-admin", import.meta.env.PROD === true);
	patchGlobalFetch({
		excludeUrls: [
			/\/api\/traces/,
			/\/api\/auth/, // blocks /api/auth, /api/auth/login, /api/auth/callback, etc.
			/_server/,
			/__manifest/,
			/@vite/,
			/@react-refresh/,
			/node_modules/,
			/\.hot-update\./,
		],
		logBody: true,
	});
	initClickTracking();
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	account?: schema.userType;
	permissions?: NonNullable<(typeof schema.team.$inferSelect)["permissions"]>;
}>()({
	head: (ctx) => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({}),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				//@ts-expect-error
				href: ctx.params?.orgSlug
					? //@ts-expect-error
					`/manifest.webmanifest?org=${encodeURIComponent(ctx.params.orgSlug)}`
					: "/manifest.webmanifest",
			},
		],
	}),
	notFoundComponent: NotFound,
	errorComponent: DefaultCatchBoundary,
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
