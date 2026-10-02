import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";
import PublicNavigation from "@/components/public/navigation";
import { OrganizationUnavailable } from "@/components/public/organization-unavailable";
import { MobileTabBar } from "@/components/public/portal/nav/MobileTabBar";
import { PublicLayoutPending } from "@/components/public/public-layout-pending";
import {
  db,
  getIssueTemplates,
  getLabels,
  getOrganizationPublic,
} from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { getOgImageUrl, seo } from "@/seo";
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

let cachedSystemOrgSlug: string | null | undefined = undefined;
let lastFetch = 0;

const TTL = 1000 * 60 * 60; // 1 hour

async function getSystemOrgSlug() {
  const now = Date.now();

  if (cachedSystemOrgSlug !== undefined && now - lastFetch < TTL) {
    return cachedSystemOrgSlug;
  }

  const org = await db.query.organization.findFirst({
    where: (o, { eq }) => eq(o.isSystemOrg, true),
    columns: { slug: true },
  });

  if (!org?.slug) {
    return null;
  }

  cachedSystemOrgSlug = org.slug;
  lastFetch = now;

  return cachedSystemOrgSlug;
}

export const fetchSystemOrgSlug = createServerFn({ method: "GET" }).handler(
  async () => {
    const { multiTenantEnabled } = getEditionCapabilities();

    if (multiTenantEnabled) {
      return { systemSlug: null };
    }

    const systemSlug = await getSystemOrgSlug();
    return { systemSlug };
  },
);

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const organization = await getOrganizationPublic(data.slug);

    if (!organization) {
      return {
        organization: null,
        labels: [],
        categories: [],
        issueTemplates: [],
      };
    }

    const [labels, categories, issueTemplates] = await Promise.all([
      getLabels(organization.id, "public"),
      db.query.category.findMany({
        where: (c, { eq }) => eq(c.organizationId, organization.id),
      }),
      getIssueTemplates(organization.id),
    ]);

    return { organization, labels, categories, issueTemplates };
  });

export const Route = createFileRoute("/orgs/$orgSlug")({
  beforeLoad: async () => {
    const { systemSlug } = await fetchSystemOrgSlug();

    if (!systemSlug) {
      return null;
    }

    return { systemSlug };
  },

  loader: async ({ params, context }) =>
    fetchPublicOrganizationAndTasks({
      data: { slug: context.systemSlug || params.orgSlug },
    }),

  pendingComponent: PublicLayoutPending,
  head: ({ loaderData }) => {
    if (!loaderData?.organization?.settings?.enablePublicPage) {
      return {
        meta: [{ title: "Organization Not Available" }],
        links: [{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" }],
      };
    }

    return {
      meta: seo({
        title: loaderData.organization.name,
        image: getOgImageUrl({
          type: "simple",
          title: loaderData.organization.name,
          subtitle: loaderData.organization.description,
          logo: loaderData.organization.logo || undefined,
        }),
      }),
    };
  },
  component: PublicLayout,
});

function PublicLayout() {
  const { organization, labels, categories, issueTemplates } =
    Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Every public page is a portal page: it renders its own `Page` (which owns the scroll container and any side
  // panel) directly on the canvas, with no card chrome around it. The board is `/orgs/x`, a post is `/orgs/x/123`.
  const isPortalPage =
    /^\/orgs\/[^/]+\/?$/.test(pathname) ||
    /^\/orgs\/[^/]+\/(\d+|new|roadmap|activity|releases)(\/|$)/.test(pathname);

  if (!organization?.settings?.enablePublicPage) {
    return <OrganizationUnavailable />;
  }

  return (
    <PublicOrganizationProvider
      organization={organization}
      labels={labels}
      categories={categories}
      issueTemplates={issueTemplates}
    >
      <div className="portal flex h-dvh flex-col overflow-hidden bg-backgroud text-foreground">
        <PublicNavigation />
        {isPortalPage ? (
          <div
            className="isolate min-h-0 w-full flex-1 overflow-hidden"
            id="public-scroll-container"
          >
            <Outlet />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto">
              <div className="flex flex-1 h-full w-full transition-all pb-2 pt-0 pr-2 pl-2">
                <div
                  className="h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout border dark:border-transparent"
                  id="public-scroll-container"
                >
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        )}
        <MobileTabBar />
      </div>
    </PublicOrganizationProvider>
  );
}
