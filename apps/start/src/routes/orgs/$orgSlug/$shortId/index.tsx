import { PublicTaskContent } from "@/components/public/public-task-content";
import { getOrganizationPublic, getTaskByShortId } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getOgImageUrl, seo } from "@/seo";
import {
  IconArrowLeft,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useState } from "react";

const fetchPublicTask = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; shortId: number }) => data)
  .handler(async ({ data }) => {
    const organization = await getOrganizationPublic(data.slug);
    if (!organization) return { task: null, org: null };
    const task = await getTaskByShortId(
      organization.id,
      data.shortId,
      "public",
    );
    return {
      task,
      org: { name: organization.name, logo: organization.logo },
    };
  });

export const Route = createFileRoute("/orgs/$orgSlug/$shortId/")({
  loader: async ({ params, context }) => {
    const slug = context?.systemSlug || params.orgSlug;
    if (Number.isNaN(Number(params.shortId))) {
      throw redirect({
        to: "/orgs/$orgSlug",
        params: { orgSlug: slug }
      })
    }
    return await fetchPublicTask({
      data: {
        slug: slug,
        shortId: Number(params.shortId),
      },
    });
  },
  component: RouteComponent,
  head: ({ loaderData }) => ({
    meta: seo({
      title: loaderData?.task
        ? `#${loaderData.task.shortId} - ${loaderData.task.title} | ${loaderData.org?.name}`
        : "Task Not Available",
      image: loaderData?.task
        ? getOgImageUrl({
          title: loaderData.task.title || undefined,
          subtitle: `#${loaderData.task.shortId}`,
          meta: loaderData.org?.name || undefined,
          logo: loaderData.org?.logo || undefined,
        })
        : undefined,
    }),
  }),
});

function RouteComponent() {
  const { task } = Route.useLoaderData();
  const { orgSlug } = Route.useParams();
  const [panelOpen, setPanelOpen] = useState(true);

  if (!task) {
    return (
      <div className="via-surface to-surface flex min-h-[60vh] items-center justify-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
        <div className="mx-auto max-w-xl text-center text-white">
          <h1 className="text-5xl font-black">Task Not Available</h1>

          <p className="mb-7 mt-3">
            Sorry, this task could not be found or isn't publicly available. It
            may have been removed, or the link is incorrect.
          </p>

          <div className="flex place-content-center items-center gap-3">
            <a href="/">
              <Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">
                Back to organization
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between h-11 shrink-0 border-b px-3">
        <Link to={`/orgs/$orgSlug`} params={{ orgSlug: orgSlug }}>
          <Button
            variant="ghost"
            className="w-fit text-xs p-1 h-auto rounded-lg"
            size="sm"
          >
            <IconArrowLeft className="size-3!" />
            Back
          </Button>
        </Link>
        <Button
          variant="accent"
          className={cn(
            "gap-2 h-6 w-fit bg-accent border-transparent p-1",
            !panelOpen && "bg-transparent",
          )}
          onClick={() => setPanelOpen((v) => !v)}
        >
          {panelOpen ? (
            <IconLayoutSidebarRightFilled className="w-3 h-3" />
          ) : (
            <IconLayoutSidebarRight className="w-3 h-3" />
          )}
        </Button>
      </div>
      {/* Split pane */}
      <div className="flex-1 min-h-0">
        <PublicTaskContent
          task={task}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
        />
      </div>
    </div>
  );
}
