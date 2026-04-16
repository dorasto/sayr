import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconRocket, IconSettings, IconUsers } from "@tabler/icons-react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import {
  RELEASE_STATUS_ORDER,
  releaseStatusConfig,
} from "@/components/releases/config";

type ReleaseSearch = {
  status?: string;
  targetDateFrom?: string;
  targetDateTo?: string;
  releasedFrom?: string;
  releasedTo?: string;
};

function ReleasesListPanelHeader() {
  const { organization } = useLayoutOrganization();

  return (
    <div className="flex items-center gap-2 w-full flex-1 min-w-0">
      <Avatar className="h-4 w-4 shrink-0">
        <AvatarImage
          src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
          alt={organization.name}
        />
        <AvatarFallback className="rounded-md uppercase text-[10px]">
          <IconUsers className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium truncate">{organization.name}</span>
      <div className="ml-auto shrink-0">
        <Link to={"/settings/org/$orgId"} params={{ orgId: organization.id }}>
          <Button variant={"ghost"} size={"icon"} className="p-0 h-6 w-6">
            <IconSettings className="size-3.5!" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ReleasesListPanelContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as ReleaseSearch;
  const { organization, releases } = useLayoutOrganization();

  const activeStatus = search.status;

  const toggleStatus = (status: string) => {
    navigate({
      to: "/$orgId/releases",
      params: { orgId: organization.id },
      search: (prev: ReleaseSearch) => ({
        status: prev.status === status ? undefined : status,
        targetDateFrom: prev.targetDateFrom,
        targetDateTo: prev.targetDateTo,
        releasedFrom: prev.releasedFrom,
        releasedTo: prev.releasedTo,
      }),
    });
  };

  return (
    <div className="flex flex-col gap-3 w-full relative">
      {/* Overview tiles - count per status */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {RELEASE_STATUS_ORDER.map((status) => {
          const config = releaseStatusConfig[status];
          const count = releases.filter((r) => r.status === status).length;
          const isActive = activeStatus === status;
          return (
            <Tile
              key={status}
              className={cn(
                "cursor-pointer select-none md:w-full",
                isActive ? "bg-accent" : "bg-card hover:bg-accent",
              )}
              onClick={() => toggleStatus(status)}
            >
              <TileHeader>
                <TileTitle className="flex items-center gap-2">
                  <TileIcon
                    className={cn(
                      isActive
                        ? "text-foreground bg-muted-foreground/20"
                        : "text-muted-foreground",
                      config.className,
                    )}
                  >
                    {config.icon("size-3.5")}
                  </TileIcon>
                  {config.label}
                </TileTitle>
                <TileDescription>
                  {count} {count === 1 ? "release" : "releases"}
                </TileDescription>
              </TileHeader>
            </Tile>
          );
        })}
      </div>

      {/* Tabs: status filter + date filters */}
      <Tabs
        defaultValue="status"
        className="w-full p-1 relative bg-card rounded-lg"
      >
        <div className="flex items-center gap-2 shrink-0 sticky top-0 w-full bg-card z-50 p-1">
          <TabsList className="justify-start w-full p-0 sticky top-0 bg-card transition-colors gap-2 h-auto overflow-x-scroll">
            <TabsTrigger asChild value="status">
              <Button
                variant={"accent"}
                className="data-[state=active]:bg-accent bg-transparent rounded-lg border-transparent text-xs w-auto px-2 py-1 h-auto"
                size={"sm"}
              >
                <IconRocket className="w-3! h-3!" />
                Status
              </Button>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="status" className="mt-0">
          <div className="flex flex-col gap-0.5">
            {releases.length === 0 ? (
              <div className="p-3 text-muted-foreground text-sm text-center">
                No releases yet
              </div>
            ) : (
              releases.map((release) => {
                const config = releaseStatusConfig[release.status];
                return (
                  <Tile
                    key={release.id}
                    className="md:w-full cursor-pointer transition-colors group p-0 justify-baseline gap-0 hover:bg-accent bg-transparent"
                  >
                    <Link
                      to="/$orgId/releases/$releaseSlug"
                      params={{
                        orgId: organization.id,
                        releaseSlug: release.slug,
                      }}
                      className="flex-1 p-3 min-w-0 flex items-center gap-2"
                    >
                      <TileHeader className="h-fit p-0 flex-1 min-w-0">
                        <TileTitle className="flex items-center gap-2 min-w-0">
                          <span className="truncate min-w-0 text-xs">
                            {release.name}
                          </span>
                        </TileTitle>
                      </TileHeader>
                      <Badge
                        className={cn(
                          "border rounded-lg text-xs gap-1.5 shrink-0",
                          config.badgeClassName,
                        )}
                      >
                        {config.icon("w-3 h-3")}
                        {config.label}
                      </Badge>
                    </Link>
                  </Tile>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ReleasesListPanelHeader, ReleasesListPanelContent };
