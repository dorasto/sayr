import { getOrganizationPublic, getReleaseBySlug } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { statusConfig } from "@/components/tasks/shared/config";
import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { SubWrapper, PanelWrapper } from "@/components/generic/wrapper";
import Editor from "@/components/prosekit/editor";
import type { NodeJSON } from "prosekit/core";
import { getOgImageUrl, seo } from "@/seo";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
  IconTrendingUp,
} from "@tabler/icons-react";
import { authClient } from "@repo/auth/client";
import { SimpleAreaChart, type AreaChartSeries } from "@/components/charts";
import { ReleaseStats } from "@/components/releases/ReleaseStats";
import {
  Tile,
  TileHeader,
  TileIcon,
  TileTitle,
  TileDescription,
  TileAction,
} from "@repo/ui/components/doras-ui/tile";
import { Separator } from "@repo/ui/components/separator";
import { extractHslValues, extractTaskText, formatCount } from "@repo/util";
import { InlineLabel } from "@/components/tasks";

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
    if (!org?.settings?.enablePublicPage)
      return { release: null, tasks: [], org: null };

    const release = await getReleaseBySlug(org.id, data.releaseSlug);
    if (!release) return { release: null, tasks: [], org: null };

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

    return {
      release,
      tasks,
      org: { id: org.id, name: org.name, logo: org.logo },
    };
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
  head: ({ loaderData }) => {
    // Build task status counts for OG stats pills
    const statsMap: Record<string, number> = {};
    for (const task of loaderData?.tasks ?? []) {
      if (task.status) {
        statsMap[task.status] = (statsMap[task.status] ?? 0) + 1;
      }
    }
    const stats = Object.entries(statsMap).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      meta: seo({
        title: loaderData?.release?.name ?? "Release",
        image: loaderData?.release
          ? getOgImageUrl({
              title: loaderData.release.name,
              subtitle: loaderData.release.status
                ? getReleaseStatusConfig(loaderData.release.status).label
                : undefined,
              meta: loaderData.org?.name || undefined,
              logo: loaderData.org?.logo || undefined,
              stats: stats.length > 0 ? stats : undefined,
            })
          : undefined,
      }),
    };
  },
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
  const { release, tasks, org } = Route.useLoaderData();
  const params = Route.useParams();
  const orgSlug = params.orgSlug;
  const [panelOpen, setPanelOpen] = useState(true);
  const { data: session } = authClient.useSession();

  const taskStats = useMemo(() => {
    const COMPLETED_STATUSES = ["done", "canceled"];
    const completed = tasks.filter(
      (t) => t.status && COMPLETED_STATUSES.includes(t.status),
    ).length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const total = tasks.length;
    return {
      total,
      completed,
      inProgress,
      todo,
      backlog,
      completionPercentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [tasks]);

  const progressData = useMemo(() => {
    if (tasks.length === 0) return [];
    const COMPLETED_STATUSES = ["done", "canceled"];
    const now = new Date();
    let earliestDate = now;
    for (const task of tasks) {
      if (task.createdAt) {
        const created = new Date(task.createdAt);
        if (created < earliestDate) earliestDate = created;
      }
    }
    const minStartDate = new Date(now);
    minStartDate.setDate(minStartDate.getDate() - 7);
    if (earliestDate > minStartDate) earliestDate = minStartDate;
    earliestDate.setHours(0, 0, 0, 0);
    const days = Math.ceil(
      (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dataPoints: Array<{
      date: string;
      completed: number;
      total: number;
    }> = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(earliestDate);
      date.setDate(date.getDate() + i);
      date.setHours(23, 59, 59, 999);
      let totalTasks = 0;
      let completedTasks = 0;
      for (const task of tasks) {
        if (!task.createdAt) continue;
        const taskCreated = new Date(task.createdAt);
        if (taskCreated <= date) {
          totalTasks++;
          if (
            task.status &&
            COMPLETED_STATUSES.includes(task.status) &&
            task.updatedAt
          ) {
            const taskCompleted = new Date(task.updatedAt);
            if (taskCompleted <= date) completedTasks++;
          }
        }
      }
      dataPoints.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        completed: completedTasks,
        total: totalTasks,
      });
    }
    return dataPoints;
  }, [tasks]);

  const areaSeries: AreaChartSeries[] = [
    {
      key: "total",
      label: "Total Tasks",
      color: "hsl(240, 5%, 64%)",
      type: "area",
    },
    {
      key: "completed",
      label: "Completed",
      color: "hsl(142, 76%, 36%)",
      type: "area",
    },
  ];

  const daysUntilTarget = useMemo(() => {
    if (!release?.targetDate) return null;
    const target = new Date(release.targetDate);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.round(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [release?.targetDate]);

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
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between h-11 shrink-0 border-b px-3">
        <Link to={`/orgs/${orgSlug}/releases`}>
          <Button
            variant="ghost"
            className="w-fit text-xs p-1 h-auto rounded-lg"
            size="sm"
          >
            <IconArrowLeft className="size-3!" />
            Releases
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
        <PanelWrapper
          isOpen={panelOpen}
          setOpen={setPanelOpen}
          panelDefaultSize={28}
          panelMinSize={20}
          panelHeader={
            <div className="flex items-center gap-2 justify-between w-full">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Details</Label>
              </div>
              {session?.user && org && (
                <a
                  href={`${import.meta.env.VITE_URL_ROOT}/${org.id}/releases/${params.releaseSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs text-muted-foreground"
                  >
                    <IconArrowUpRight />
                    Open internally
                  </Button>
                </a>
              )}
            </div>
          }
          panelBody={
            tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-4 text-center">
                No public tasks in this release.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Progress chart */}
                <Tile className="md:w-full flex-col items-start gap-3">
                  <TileHeader className="w-full">
                    <TileIcon>
                      <IconTrendingUp />
                    </TileIcon>
                    <TileTitle>Release Progress</TileTitle>
                    <TileDescription>
                      {taskStats.completed}/{taskStats.total} tasks completed
                    </TileDescription>
                  </TileHeader>
                  <div className="w-full flex flex-col gap-2">
                    <SimpleAreaChart
                      data={progressData}
                      xKey="date"
                      series={areaSeries}
                      size="md"
                      stacked={false}
                      gradient={true}
                      showGrid={true}
                      formatXAxis={() => ""}
                    />
                    <ReleaseStats
                      items={[
                        {
                          label: "Completed",
                          value: taskStats.completed,
                          cssVar: "success",
                        },
                        {
                          label: "In Progress",
                          value: taskStats.inProgress,
                          cssVar: "primary",
                        },
                        {
                          label: "To Do",
                          value: taskStats.todo,
                          cssVar: "foreground",
                        },
                        {
                          label: "Backlog",
                          value: taskStats.backlog,
                          cssVar: "muted-foreground",
                        },
                      ]}
                    />
                    {daysUntilTarget !== null && (
                      <div className="pt-2 border-t">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">
                            Target Date
                          </span>
                          <span className="font-medium text-sm">
                            {daysUntilTarget > 0
                              ? `${daysUntilTarget} days remaining`
                              : daysUntilTarget === 0
                                ? "Due today"
                                : `${Math.abs(daysUntilTarget)} days overdue`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Tile>
              </div>
            )
          }
          className="h-full"
        >
          {/* Left: scrollable content */}
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col gap-6 p-6">
              {/* Title + meta */}
              <div className="flex flex-col gap-2">
                <Badge
                  variant="outline"
                  className={cn("w-fit text-xs", cfg?.badgeClassName)}
                >
                  {cfg?.label}
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight">
                  {release.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {release.targetDate && release.status !== "released" && (
                    <span className="text-sm text-muted-foreground">
                      Target: {formatDate(release.targetDate)}
                    </span>
                  )}
                  {release.releasedAt && (
                    <span className="text-sm text-muted-foreground">
                      Released: {formatDate(release.releasedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {release.description && (
                <Editor
                  readonly
                  defaultContent={release.description as NodeJSON}
                  hideBlockHandle
                />
              )}
              <div className="flex flex-col gap-3">
                <Label>Tasks</Label>
                <Separator />
              </div>
              {/* Task list grouped by status */}
              <div className="flex flex-col gap-1">
                {grouped.flatMap(({ tasks: groupTasks }) =>
                  groupTasks.map((task) => (
                    <TaskRow key={task.id} task={task} orgSlug={orgSlug} />
                  )),
                )}
              </div>
            </div>
          </div>
        </PanelWrapper>
      </div>
    </div>
  );
}

function TaskRow({ task, orgSlug }: { task: PublicTask; orgSlug: string }) {
  const sc = statusConfig[task.status as keyof typeof statusConfig];
  const descriptionPreview = extractTaskText(task.description);

  return (
    <Link
      to={`/orgs/${orgSlug}/${task.shortId}`}
      className="transition-colors group"
    >
      <Tile
        className="md:w-full hover:bg-accent rounded-xl"
        style={
          {
            // background: `hsla(${extractHslValues(sc.hsla)}, 0.2)`,
            // border: `1px solid hsla(${extractHslValues(sc.hsla)}, 0.2)`,
          }
        }
      >
        <TileHeader className="items-center">
          <TileIcon
            className="bg-transparent"
            style={
              {
                // background: `hsla(${extractHslValues(sc.hsla)}, 0.1)`,
              }
            }
          >
            {sc?.icon && sc.icon(`${sc.className}`)}
          </TileIcon>
          <TileTitle>{task.title}</TileTitle>
          <TileDescription className="line-clamp-1">
            {descriptionPreview}
          </TileDescription>
        </TileHeader>
        <TileAction asChild>
          <Label variant={"description"} className="shrink-0">
            {formatCount(task.voteCount)} votes
          </Label>
        </TileAction>
      </Tile>
      {/*<div className="flex items-center gap-3">
        <span className="flex-1 min-w-0 text-sm font-medium truncate group-hover:text-foreground">
          {task.title} asdoif jasodif jasodif jasodif jasodf ijasodif jasodif
          jaosidjf oasidj fijdf ddddddd
        </span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="shrink-0 text-xs text-muted-foreground">
            #{task.shortId}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{descriptionPreview}</p>
      {sc?.icon && (
        <InlineLabel
          text={sc.label}
          icon={sc.icon(`${sc.className}`)}
          className="rounded-xl pe-2 w-fit"
          style={{
            background: `hsla(${extractHslValues(sc.hsla)}, 0.2)`,
            border: `1px solid ${sc.hsla}`,
          }}
        />
      )}*/}
    </Link>
  );
}
