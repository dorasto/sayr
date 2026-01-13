import { Button } from "@repo/ui/components/button";
import { createServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  db,
  getOrganizationPublic,
  getTasksByOrganizationId,
  getLabels,
} from "@repo/database";
import PublicOrgHomePage from "@/components/public";
import PublicNavigation from "@/components/public/navigation";
import { PublicOrganizationProvider } from "@/contexts/publicContextOrg";
import { SubWrapper } from "@/components/generic/wrapper";

const fetchPublicOrganizationAndTasks = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const organization = await getOrganizationPublic(data.slug);
    if (!organization)
      return { organization: null, tasks: [], labels: [], categories: [] };

    const [allTasks, labels, categories] = await Promise.all([
      getTasksByOrganizationId(organization.id),
      getLabels(organization.id),
      db.query.category.findMany({
        where: (c, { eq }) => eq(c.organizationId, organization.id),
      }),
    ]);

    // Filter to public tasks and only include public comments
    const tasks = allTasks
      .filter((t) => t.visible === "public")
      .map((t) => ({
        ...t,
        comments: t.comments?.filter((c) => c.visibility === "public"),
      }));

    return { organization, tasks, labels, categories };
  });

export const Route = createFileRoute("/orgs/$orgSlug/")({
  loader: async ({ params }) => {
    return await fetchPublicOrganizationAndTasks({
      data: {
        slug: params.orgSlug,
      },
    });
  },
  component: OrgDashboard,
});

function OrgDashboard() {
  const { organization, tasks, labels, categories } = Route.useLoaderData();
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
      tasks={tasks}
      labels={labels}
      categories={categories}
    >
      <div className="flex h-dvh flex-col overflow-hidden relative">
        <div className="min-h-0 flex-1 overflow-y-auto relative">
          <SubWrapper
            className="max-w-6xl mx-auto relative"
            blur={false}
            top={false}
          >
            <PublicNavigation />
            <PublicOrgHomePage />
          </SubWrapper>
        </div>
      </div>
    </PublicOrganizationProvider>
  );
}
