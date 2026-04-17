import type { schema } from "@repo/database";
import { useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  IconLoader2,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import {
  RELEASE_STATUS_ORDER,
  getReleaseStatusConfig,
  type ReleaseStatusKey,
} from "@/components/releases/config";
import { PanelWrapper } from "@/components/generic/wrapper";
import { ReleaseGroup } from "./release-group";

type FilterTab = "all" | schema.releaseType["status"];

const basePublicApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/public/v1"
    : "/api/public/v1";

interface ReleasesChangelogProps {
  orgSlug: string;
}

export function ReleasesChangelog({ orgSlug }: ReleasesChangelogProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    value: {
      data: pages,
      isLoading,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    },
  } = useStateManagementInfiniteFetch<{
    data: {
      releases: schema.releaseType[];
      pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasMore: boolean;
      };
    };
  }>({
    key: ["public-releases", orgSlug, activeFilter],
    fetch: {
      url: `${basePublicApiUrl}/organization/${orgSlug}/releases`,
      custom: async (url, page) => {
        const pageParam = page ?? 1;
        const fullUrl = `${url}?page=${pageParam}&limit=20&status=${activeFilter}`;
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error("Failed to fetch releases");
        return res.json();
      },
      getNextPageParam: (lastPage) =>
        lastPage.data.pagination.hasMore
          ? lastPage.data.pagination.page + 1
          : undefined,
    },
    staleTime: 1000 * 30,
  });

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allFetchedReleases = pages?.flatMap((p) => p.data.releases) ?? [];
  const filtered =
    activeFilter === "all"
      ? allFetchedReleases
      : allFetchedReleases.filter((r) => r.status === activeFilter);
  const nonArchived = filtered.filter((r) => r.status !== "archived");
  const archived = filtered.filter((r) => r.status === "archived");

  const grouped = (RELEASE_STATUS_ORDER as string[])
    .filter((s) => s !== "archived")
    .map((s) => s as Exclude<ReleaseStatusKey, "archived">)
    .map((status) => ({
      status,
      releases: nonArchived.filter((r) => r.status === status),
    }))
    .filter((g) => g.releases.length > 0);

  // Per-status counts for the filter panel
  const totalCount = allFetchedReleases.filter(
    (r) => r.status !== "archived",
  ).length;
  const statusCounts = RELEASE_STATUS_ORDER.map((status) => ({
    status,
    count: allFetchedReleases.filter((r) => r.status === status).length,
  })).filter(({ count }) => count > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — matches release detail page pattern */}
      <div className="flex items-center justify-between h-11 shrink-0 border-b px-3">
        <span className="text-sm font-semibold">Releases</span>
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
          panelDefaultSize={22}
          panelMinSize={16}
          panelHeader={
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Filter</Label>
            </div>
          }
          panelBody={
            <div className="flex flex-col gap-0.5">
              <FilterButton
                label="All Releases"
                count={totalCount}
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
              />
              {statusCounts.map(({ status, count }) => {
                const cfg = getReleaseStatusConfig(status as ReleaseStatusKey);
                return (
                  <FilterButton
                    key={status}
                    label={cfg?.label ?? status}
                    count={count}
                    active={activeFilter === status}
                    color={cfg?.color}
                    onClick={() => setActiveFilter(status as FilterTab)}
                  />
                );
              })}
            </div>
          }
        >
          {/* Main changelog content */}
          <div className="flex-1 overflow-y-auto h-full p-6 pt-0">
            {isLoading ? (
              <div className="flex h-48 w-full items-center justify-center">
                <IconLoader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {grouped.map(({ status, releases: groupReleases }) => (
                    <ReleaseGroup
                      key={status}
                      status={status as ReleaseStatusKey}
                      releases={groupReleases}
                      orgSlug={orgSlug}
                      defaultOpen={true}
                    />
                  ))}

                  {archived.length > 0 && (
                    <ReleaseGroup
                      status="archived"
                      releases={archived}
                      orgSlug={orgSlug}
                      defaultOpen={false}
                    />
                  )}
                </div>

                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No releases match this filter.
                  </p>
                )}

                <div ref={sentinelRef} className="h-8" />

                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <IconLoader2 className="animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>
        </PanelWrapper>
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onClick: () => void;
}

function FilterButton({
  label,
  count,
  active,
  color,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      {color && (
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          "text-xs tabular-nums",
          active ? "text-foreground" : "text-muted-foreground/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}
