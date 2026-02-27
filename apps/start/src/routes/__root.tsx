import type { schema } from "@repo/database";
import { HeadlessToastConfig } from "@repo/ui/components/headless-toast";
import { Toaster } from "@repo/ui/components/sonner";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import {
  IconAlertCircle,
  IconAlertCircleFilled,
  IconCheck,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react";
import type { QueryClient } from "@tanstack/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import NotFound from "@/components/NotFound";
import { SidebarScript } from "@/lib/sidebar/sidebar-script";
import appCss from "../styles.css?url";
import { DefaultCatchBoundary } from "@/components/Error";
import { seo } from "@/seo";
import {
  initClickTracking,
  initOpenTel,
  patchGlobalFetch,
} from "@repo/opentelemetry/client";
import { initPostHog } from "@/components/PostHogProvider";
import { NavigationProgress } from "@/components/NavigationProgress";
import { HydrationProvider } from "@/contexts/HydrationContext";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemeServerFn } from "@/lib/theme";

const isSayrCloud = typeof window !== "undefined" && (
  window.location.hostname === "sayr.io" ||
  window.location.hostname.endsWith(".sayr.io")
);

if (typeof window !== "undefined") {
  // Initialize PostHog for analytics, session recordings, and web vitals
  initPostHog();

  // Initialize OpenTelemetry client-side tracing (Sayr Cloud only)
  if (isSayrCloud) {
    initOpenTel("sayr-admin", import.meta.env.PROD === true);
    patchGlobalFetch({
      excludeUrls: [
        /\/api\/traces/,
        /\/api\/auth/, // blocks /api/auth, /api/auth/login, /api/auth/callback, etc.
        /_server/,
        /__manifest/,
        /@vite/,
        /@react-refresh/,
        /__tsd\/console-pipe/,
        /node_modules/,
        /\.hot-update\./,
      ],
      logBody: true,
    });
    initClickTracking();
  }
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  account?: schema.userType;
  permissions?: NonNullable<(typeof schema.team.$inferSelect)["permissions"]>;
}>()({
  loader: () => getThemeServerFn(),
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
  const theme = Route.useLoaderData();
  return (
    <html className={theme} lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <SidebarScript />
      </head>
      <body className="relative">
        <ThemeProvider theme={theme}>
          <HydrationProvider>
            {/* <Header /> */}
            <NavigationProgress />
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
                duration: 5000, // lasts for 5 seconds
              }}
            />
          </HydrationProvider>
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
        {/*<TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />*/}
        <Scripts />
      </body>
    </html>
  );
}
