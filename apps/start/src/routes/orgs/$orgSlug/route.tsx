import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";
import PublicNavigation from "@/components/public/navigation";
import PublicSidebar from "@/components/public/side";
import {
  db,
  getIssueTemplates,
  getLabels,
  getOrganizationPublic,
} from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
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
      meta: [{ title: `${loaderData.organization.name} | Sayr.io` }],
    };
  },
  component: PublicLayout,
});

function PublicLayout() {
  const { organization, labels, categories, issueTemplates } =
    Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Release detail pages manage their own internal scroll via PanelWrapper
  const isReleasePage = /\/releases\/[^/]+/.test(pathname);

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
      <div className="flex h-dvh flex-col overflow-hidden bg-sidebar">
        <PublicNavigation />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PublicSidebar />
          <div className="flex-1 min-h-0 w-full">
            <div className="flex flex-1 h-full w-full transition-all pb-2 pt-0 pr-2">
              <div
                className={isReleasePage
                  ? "h-full w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout border dark:border-transparent overflow-hidden"
                  : "h-full overflow-y-auto w-full mx-auto flex flex-col rounded-2xl bg-background contain-layout border dark:border-transparent"
                }
                id="public-scroll-container"
              >
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicOrganizationProvider>
  );
}

function OrganizationUnavailable() {
  return (
    <div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
      <div className="mx-auto max-w-xl text-center text-white">
        <h1 className="text-5xl font-black">Organization Not Available</h1>

        <p className="mb-7 mt-3">
          Sorry, this organization could not be found or isn't available right
          now. It might have been removed or the link is incorrect.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a href="/">
            <Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">
              Back home
            </Button>
          </a>

          <a href="https://doras.to/discord">
            <Button className="border-surface-100! text-surface-100 flex w-full gap-2 p-4 font-bold">
              Report an issue
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

function PublicLayoutPending() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sidebar">
      <div className="bg-sidebar h-11 w-full shrink-0" />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="bg-sidebar w-52 shrink-0" />
        <div className="flex-1 min-h-0 w-full">
          <div className="flex flex-1 h-full w-full pb-2 pt-2 pr-2">
            <div className="h-full w-full rounded-2xl bg-background border dark:border-transparent p-6">
              <div className="mx-auto max-w-3xl space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
