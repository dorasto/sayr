import { getOrganizationPublic, getReleases } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconArchive, IconChevronDown } from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getReleaseStatusConfig,
  RELEASE_STATUS_ORDER,
} from "@/components/releases/config";
import type { schema } from "@repo/database";
import { SubWrapper } from "@/components/generic/wrapper";

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
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReleaseDateLabel({ release }: { release: schema.releaseType }) {
  if (release.status === "released" && release.releasedAt) {
    return (
      <span className="text-xs text-muted-foreground">
        Released {formatDate(release.releasedAt)}
      </span>
    );
  }
  if (release.targetDate) {
    return (
      <span className="text-xs text-muted-foreground">
        Target {formatDate(release.targetDate)}
      </span>
    );
  }
  const cfg = getReleaseStatusConfig(release.status);
  return (
    <span className="text-xs text-muted-foreground">
      {cfg?.label ?? release.status}
    </span>
  );
}

function ReleasesListPage() {
  const { releases } = Route.useLoaderData();
  const params = Route.useParams();
  const orgSlug = params.orgSlug;

  const [archivedOpen, setArchivedOpen] = useState(false);

  const nonArchived = releases.filter((r) => r.status !== "archived");
  const archived = releases.filter((r) => r.status === "archived");

  // Group non-archived by status in display order
  const grouped = RELEASE_STATUS_ORDER.filter((s) => s !== "archived")
    .map((status) => ({
      status,
      releases: nonArchived.filter((r) => r.status === status),
    }))
    .filter((g) => g.releases.length > 0);

  if (releases.length === 0) {
    return (
      <SubWrapper title="Releases" top={false}>
        <p className="text-muted-foreground">No releases yet.</p>
      </SubWrapper>
    );
  }

  return (
    <SubWrapper title="Releases" top={false}>
      <div className="space-y-8">
        {grouped.map(({ status, releases: groupReleases }) => {
        const cfg = getReleaseStatusConfig(
          status as schema.releaseType["status"],
        );
        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold",
                  cfg?.className,
                )}
              >
                {cfg?.icon("h-4 w-4")}
                {cfg?.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({groupReleases.length})
              </span>
            </div>
            <div className="space-y-2">
              {groupReleases.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  orgSlug={orgSlug}
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
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
            onClick={() => setArchivedOpen((v) => !v)}
          >
            <IconArchive className="h-4 w-4" />
            Archived
            <span className="text-xs text-muted-foreground">
              ({archived.length})
            </span>
            <IconChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                archivedOpen && "rotate-180",
              )}
            />
          </button>
          {archivedOpen && (
            <div className="space-y-2 opacity-60">
              {archived.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  orgSlug={orgSlug}
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

function ReleaseCard({
  release,
  orgSlug,
}: {
  release: schema.releaseType;
  orgSlug: string;
}) {
  const cfg = getReleaseStatusConfig(release.status);

  return (
    <Link
      to={`/orgs/${orgSlug}/releases/${release.slug}`}
      className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:bg-accent/50 transition-colors group"
    >
      {/* Status icon with color */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: release.color ? `${release.color}20` : undefined }}
      >
        <span style={{ color: release.color || cfg?.color }}>
          {cfg?.icon("h-4 w-4")}
        </span>
      </span>

      {/* Name + description */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="font-semibold text-sm group-hover:text-foreground">
          {release.name}
        </span>
      </div>

      {/* Date + status */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <ReleaseDateLabel release={release} />
        <Badge variant="outline" className={cn("text-xs", cfg?.badgeClassName)}>
          {cfg?.label}
        </Badge>
      </div>
    </Link>
  );
}
