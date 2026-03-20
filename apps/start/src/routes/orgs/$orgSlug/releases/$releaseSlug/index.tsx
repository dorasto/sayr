import { getOrganizationPublic, getReleaseBySlug } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { statusConfig } from "@/components/tasks/shared/config";
import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { SubWrapper } from "@/components/generic/wrapper";

const fetchPublicRelease = createServerFn({ method: "GET" })
  .inputValidator((data: { orgSlug: string; releaseSlug: string }) => data)
  .handler(async ({ data }) => {
    // Resolve system org for single-tenant installs
    const { multiTenantEnabled } = getEditionCapabilities();
    let resolvedSlug = data.orgSlug;

    if (!multiTenantEnabled) {
      const systemOrg = await db.query.organization.findFirst({
        where: (o, { eq }) => eq(o.isSystemOrg, true),
        columns: { slug: true },
      });
      if (systemOrg?.slug) resolvedSlug = systemOrg.slug;
    }

    const org = await getOrganizationPublic(resolvedSlug);
    if (!org?.settings?.enablePublicPage) return { release: null, tasks: [] };

    const release = await getReleaseBySlug(org.id, data.releaseSlug);
    if (!release) return { release: null, tasks: [] };

    // Fetch only public tasks for this release
    const rawTasks = await db.query.task.findMany({
      where: and(
        eq(schema.task.releaseId, release.id),
        eq(schema.task.visible, "public"),
      ),
      with: {
        labels: { with: { label: true } },
        assignees: {
          with: {
            user: {
              columns: { id: true, name: true, image: true, createdAt: true },
            },
          },
        },
      },
      orderBy: (t, { asc }) => asc(t.createdAt),
    });

    const tasks = rawTasks.map((task) => ({
      ...task,
      labels: task.labels.map((l) => l.label),
      assignees: task.assignees.map((a) => a.user),
    }));

    return { release, tasks };
  });

export const Route = createFileRoute("/orgs/$orgSlug/releases/$releaseSlug/")({
  loader: async ({ params, context }) =>
    fetchPublicRelease({
      data: {
        orgSlug:
          (context as { systemSlug?: string | null })?.systemSlug ||
          params.orgSlug,
        releaseSlug: params.releaseSlug,
      },
    }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.release?.name ?? "Release" }],
  }),
  component: ReleaseDetailPage,
});

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type PublicTask = schema.taskType & {
  labels: schema.labelType[];
  assignees: Array<{
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
  }>;
};

const TASK_STATUS_ORDER = [
  "backlog",
  "todo",
  "in-progress",
  "done",
  "canceled",
] as const;

function ReleaseDetailPage() {
  const { release, tasks } = Route.useLoaderData();
  const params = Route.useParams();
  const orgSlug = params.orgSlug;

  if (!release) {
    return (
      <SubWrapper
        backButton={`/orgs/${orgSlug}/releases`}
        backButtonText="Releases"
      >
        <p className="text-muted-foreground">Release not found.</p>
      </SubWrapper>
    );
  }

  const cfg = getReleaseStatusConfig(release.status);

  // Group tasks by status
  const grouped = TASK_STATUS_ORDER.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  })).filter((g) => g.tasks.length > 0);

  return (
    <SubWrapper
      title={release.name}
      descriptionRender={
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge
            variant="outline"
            className={cn("text-xs", cfg?.badgeClassName)}
          >
            {cfg?.label}
          </Badge>
          {release.targetDate && release.status !== "released" && (
            <span className="text-xs text-muted-foreground">
              Target: {formatDate(release.targetDate)}
            </span>
          )}
          {release.releasedAt && (
            <span className="text-xs text-muted-foreground">
              Released: {formatDate(release.releasedAt)}
            </span>
          )}
        </div>
      }
    >
      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No public tasks in this release.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ status, tasks: groupTasks }) => {
            const sc = statusConfig[status as keyof typeof statusConfig];
            return (
              <section key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    {sc?.icon?.("h-4 w-4")}
                    {sc?.label ?? status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({groupTasks.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {groupTasks.map((task) => (
                    <TaskRow key={task.id} task={task} orgSlug={orgSlug} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </SubWrapper>
  );
}

function TaskRow({ task, orgSlug }: { task: PublicTask; orgSlug: string }) {
  const sc = statusConfig[task.status as keyof typeof statusConfig];

  return (
    <Link
      to={`/orgs/${orgSlug}/${task.shortId}`}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-accent/50 transition-colors group"
    >
      {sc?.icon && (
        <span className="shrink-0 text-muted-foreground">
          {sc.icon("h-4 w-4")}
        </span>
      )}
      <span className="flex-1 min-w-0 text-sm font-medium truncate group-hover:text-foreground">
        {task.title}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        #{task.shortId}
      </span>
    </Link>
  );
}
