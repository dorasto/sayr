import { getOrganizationPublic, getReleases } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { cn } from "@repo/ui/lib/utils";
import { IconArchive, IconChevronDown, IconRocket } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getReleaseStatusConfig,
  RELEASE_STATUS_ORDER,
} from "@/components/releases/config";
import type { schema } from "@repo/database";
import { SubWrapper } from "@/components/generic/wrapper";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileHeader,
  TileIcon,
  TileTitle,
  TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import RenderIcon from "@/components/generic/RenderIcon";
import { extractTaskText } from "@repo/util";

const fetchPublicReleases = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    // Resolve system org for single-tenant installs
    const { multiTenantEnabled } = getEditionCapabilities();
    let resolvedSlug = data.slug;

    if (!multiTenantEnabled) {
      const { db } = await import("@repo/database");
      const systemOrg = await db.query.organization.findFirst({
        where: (o, { eq }) => eq(o.isSystemOrg, true),
        columns: { slug: true },
      });
      if (systemOrg?.slug) resolvedSlug = systemOrg.slug;
    }

    const org = await getOrganizationPublic(resolvedSlug);
    if (!org?.settings?.enablePublicPage) return { releases: [] };

    const all = await getReleases(org.id);
    // Non-archived first, archived last
    const sorted = [
      ...all.filter((r) => r.status !== "archived"),
      ...all.filter((r) => r.status === "archived"),
    ];
    return { releases: sorted };
  });

export const Route = createFileRoute("/orgs/$orgSlug/releases/")({
  loader: async ({ params, context }) =>
    fetchPublicReleases({
      data: {
        slug:
          (context as { systemSlug?: string | null })?.systemSlug ||
          params.orgSlug,
      },
    }),
  head: () => ({ meta: [{ title: "Releases" }] }),
  component: ReleasesListPage,
});

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

type FilterTab = "all" | schema.releaseType["status"];

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All Releases" },
  { key: "planned", label: "Planned" },
  { key: "in-progress", label: "In Progress" },
  { key: "released", label: "Released" },
  { key: "archived", label: "Archived" },
];

function ReleasesListPage() {
  const { releases } = Route.useLoaderData();
  const params = Route.useParams();
  const orgSlug = params.orgSlug;

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [archivedOpen, setArchivedOpen] = useState(false);

  if (releases.length === 0) {
    return (
      <SubWrapper title="Releases" top={false}>
        <p className="text-muted-foreground">No releases yet.</p>
      </SubWrapper>
    );
  }

  const visibleTabs = FILTER_TABS.filter(({ key }) => {
    if (key === "all") return true;
    return releases.some((r) => r.status === key);
  });

  const filtered =
    activeFilter === "all"
      ? releases
      : releases.filter((r) => r.status === activeFilter);

  const nonArchived = filtered.filter((r) => r.status !== "archived");
  const archived = filtered.filter((r) => r.status === "archived");

  // Group non-archived by status in display order
  const grouped = RELEASE_STATUS_ORDER.filter((s) => s !== "archived")
    .map((status) => ({
      status,
      releases: nonArchived.filter((r) => r.status === status),
    }))
    .filter((g) => g.releases.length > 0);

  return (
    <SubWrapper title="Releases" top={false} className="md:pt-6">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {visibleTabs.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            variant="primary"
            className={cn(
              activeFilter === key
                ? "bg-primary text-primary-foreground hover:bg-primary/80"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            // className={cn(
            //   "px-4 py-1.5 rounded-full text-sm border transition-colors",
            //   activeFilter === key
            //     ? "bg-foreground text-background border-foreground"
            //     : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
            // )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-10">
        {grouped.map(({ status, releases: groupReleases }) => {
          const cfg = getReleaseStatusConfig(
            status as schema.releaseType["status"],
          );
          return (
            <section key={status}>
              <div className="space-y-4">
                {groupReleases.map((release) => (
                  <TimelineRow
                    key={release.id}
                    release={release}
                    orgSlug={orgSlug}
                    statusLabel={cfg?.label ?? status}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {archived.length > 0 && (
          <section>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
              onClick={() => setArchivedOpen((v) => !v)}
            >
              <IconArchive className="h-4 w-4" />
              Archived
              <span className="text-xs">({archived.length})</span>
              <IconChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  archivedOpen && "rotate-180",
                )}
              />
            </button>
            {archivedOpen && (
              <div className="space-y-4 opacity-60">
                {archived.map((release) => (
                  <TimelineRow
                    key={release.id}
                    release={release}
                    orgSlug={orgSlug}
                    statusLabel="Archived"
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </SubWrapper>
  );
}

function TimelineRow({
  release,
  orgSlug,
  statusLabel,
}: {
  release: schema.releaseType;
  orgSlug: string;
  statusLabel: string;
}) {
  const cfg = getReleaseStatusConfig(release.status);

  const dateValue =
    release.status === "released" && release.releasedAt
      ? release.releasedAt
      : (release.targetDate ?? "");

  const descriptionPreview = extractTaskText(release.description);

  return (
    <div className="flex gap-4 md:gap-8 items-stretch">
      {/* Left: date + status label */}
      <div className="hidden md:flex flex-col items-end justify-start pt-4 w-28 shrink-0 gap-0.5">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            cfg?.className,
          )}
        >
          {statusLabel}
        </span>
        {dateValue && (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(dateValue)}
          </span>
        )}
      </div>

      {/* Divider line */}
      <div className="hidden md:flex flex-col items-center pt-4">
        <div
          className="w-px flex-1 bg-border"
          style={{
            borderLeft: `2px solid ${cfg?.color ?? "hsl(var(--border))"}`,
            opacity: 0.35,
          }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0">
        <Tile
          asChild
          className="md:w-full hover:bg-secondary cursor-pointer p-6 rounded-xl"
        >
          <Link
            to="/orgs/$orgSlug/releases/$releaseSlug"
            params={{ orgSlug, releaseSlug: release.slug }}
          >
            <TileHeader className="items-start">
              <TileIcon
                className="h-7 w-7 rounded-xl bg-transparent p-0 flex items-center justify-center"
                style={{
                  // background: cfg?.color ? `${cfg.color}20` : undefined,
                  background: release.color ? `${release.color}20` : undefined,
                  color:
                    release.color && release.color !== "hsla(0, 0%, 0%, 1)"
                      ? release.color
                      : cfg?.color,
                }}
              >
                {release.icon ? (
                  <RenderIcon
                    iconName={release.icon}
                    color={release.color || "#ffffff"}
                    button
                    className={cn("size-5! [&_svg]:size-4! border-0")}
                  />
                ) : (
                  <div
                    className="size-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: release.color || "#cccccc",
                    }}
                  >
                    <IconRocket className="size-4 text-white" />
                  </div>
                )}
              </TileIcon>
              <TileTitle className="text-xl">{release.name}</TileTitle>
              <TileDescription>{descriptionPreview}</TileDescription>
              {/* Mobile: show status + date inline */}
              <TileDescription className="flex md:hidden items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest",
                    cfg?.className,
                  )}
                >
                  {statusLabel}
                </span>
                {dateValue && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(dateValue)}
                  </span>
                )}
              </TileDescription>
            </TileHeader>
            {/* Status icon top-right */}
            {/*<TileAction>
              <TileIcon
                className="h-7 w-7 rounded-full bg-transparent p-0 flex items-center justify-center"
                style={{
                  background: cfg?.color ? `${cfg.color}20` : undefined,
                  color:
                    release.color && release.color !== "hsla(0, 0%, 0%, 1)"
                      ? release.color
                      : cfg?.color,
                }}
              >
                {cfg?.icon("h-4 w-4")}
              </TileIcon>
            </TileAction>*/}
          </Link>
        </Tile>
      </div>
    </div>
  );
}
