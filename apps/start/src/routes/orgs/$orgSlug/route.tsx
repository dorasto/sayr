import { SubWrapper } from '@/components/generic/wrapper';
import { PublicOrganizationProvider } from '@/contexts/publicContextOrg';
import { db, getLabels, getOrganizationPublic } from '@repo/database';
import { Button } from '@repo/ui/components/button';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const organization = await getOrganizationPublic(data.slug);
    if (!organization)
      return { organization: null, labels: [], categories: [] };
    const [labels, categories] = await Promise.all([
      getLabels(organization.id),
      db.query.category.findMany({
        where: (c, { eq }) => eq(c.organizationId, organization.id),
      }),
    ]);
    return { organization, labels, categories };
  });

export const Route = createFileRoute('/orgs/$orgSlug')({
  beforeLoad: ({ location }) => {
    const hostname = new URL(location.url).hostname;
    const parts = hostname.split(".");
    const isLocalhost = parts[parts.length - 1] === "localhost";
    const hasSubdomain =
      (isLocalhost && parts.length > 1) ||
      (!isLocalhost && parts.length > 2);
    const subdomain = hasSubdomain ? parts[0] : "";
    // 🚫 Redirect if no subdomain OR admin subdomain
    if (!hasSubdomain || subdomain === "admin") {
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
  loader: async ({ params }) => {
    return await fetchPublicOrganizationAndTasks({
      data: {
        slug: params.orgSlug,
      },
    });
  },
  component: PublicLayout,
})

function PublicLayout() {
  const { organization, labels, categories } = Route.useLoaderData();
  if (!organization) {
    return (
      <>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <title>Organization Not Available</title>
        <div className="via-surface to-surface flex h-screen items-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
          <div className="mx-auto max-w-xl text-center text-white">
            <h1 className="text-5xl font-black">Organization Not Available</h1>
            <p className="mb-7 mt-3">
              Sorry, this organization could not be found or isn’t available
              right now. It might have been removed or the link is incorrect.
            </p>
            <div className="flex place-content-center items-center gap-3">
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
      </>
    );
  }
  return (
    <PublicOrganizationProvider
      organization={organization}
      labels={labels}
      categories={categories}
    >
      <div className="flex h-dvh flex-col overflow-hidden relative">
        <div className="min-h-0 flex-1 overflow-y-auto relative">
          <SubWrapper
            className="max-w-6xl mx-auto relative p-4!"
            blur={false}
            top={false}
          >
            <Outlet />
          </SubWrapper>
        </div>
      </div>
    </PublicOrganizationProvider>
  );
}
