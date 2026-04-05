import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { connections } from "./connections-data";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Label } from "@repo/ui/components/label";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import * as tabler from "@tabler/icons-react";
import { Skeleton } from "@repo/ui/components/skeleton";

interface ConnectionsPageProps {
  connectionStatus?: Record<string, { connected: boolean; detail?: string }>;
  integrations?: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    enabled: boolean;
  }>;
  integrationsLoading?: boolean;
}

export default function SettingsOrganizationConnectionsPage({
  connectionStatus,
  integrations = [],
  integrationsLoading = false,
}: ConnectionsPageProps) {
  const { serverEvents } = useLayoutData();
  const { organization, setOrganization } = useLayoutOrganizationSettings();
  useServerEventsSubscription({
    serverEvents,
    orgId: organization.id,
    organization: organization,
    channel: "admin",
    setOrganization: setOrganization,
  });
  if (!organization) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {connections.map((connection) => {
        const status = connectionStatus?.[connection.id];
        return (
          <Link
            to="/settings/org/$orgId/connections/github"
            params={{ orgId: organization.id }}
            key={connection.id}
            className="h-full w-full"
          >
            <Tile className="md:w-full h-full flex-col gap-1 relative items-start justify-start p-3 hover:bg-accent">
              <TileHeader className="md:w-full flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <TileIcon>
                    <connection.icon />
                  </TileIcon>
                  <TileTitle asChild>
                    <Label variant={"subheading"} className="text-sm">
                      {connection.name}
                    </Label>
                  </TileTitle>
                  {status && (
                    <TileAction className="absolute top-2 right-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center gap-1.5 text-xs">
                            <IconCircleFilled
                              className={
                                status.connected ? "text-success" : "hidden"
                              }
                              size={10}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Enabled</TooltipContent>
                      </Tooltip>
                    </TileAction>
                  )}
                </div>
              </TileHeader>

              <TileDescription className="line-clamp-3 leading-normal! text-xs">
                {connection.description}
              </TileDescription>
            </Tile>
          </Link>
        );
      })}

      {integrationsLoading
        ? Array.from({ length: 2 }).map((_, i) => (
            <Tile
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={`integration-skeleton-${i}`}
              className="md:w-full h-full flex-col gap-1 relative items-start justify-start p-3"
            >
              <TileHeader className="md:w-full flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </TileHeader>
              <Skeleton className="h-3 w-full mt-1" />
              <Skeleton className="h-3 w-3/4 mt-1" />
            </Tile>
          ))
        : integrations.map((integration) => {
            const IconComponent = integration.icon
              ? (tabler as unknown as Record<string, React.ComponentType>)[
                  integration.icon
                ]
              : null;
            return (
              <Link
                to="/settings/org/$orgId/connections/$integrationId"
                params={{
                  orgId: organization.id,
                  integrationId: integration.id,
                }}
                key={integration.id}
                className="h-full w-full"
              >
                <Tile className="md:w-full h-full flex-col gap-1 relative items-start justify-start p-3 hover:bg-accent">
                  <TileHeader className="md:w-full flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <TileIcon>
                        {IconComponent ? (
                          <IconComponent />
                        ) : (
                          <span>{integration.name.charAt(0)}</span>
                        )}
                      </TileIcon>
                      <TileTitle asChild>
                        <Label variant={"subheading"} className="text-sm">
                          {integration.name}
                        </Label>
                      </TileTitle>
                      {integration.enabled && (
                        <TileAction className="absolute top-2 right-2">
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="flex items-center gap-1.5 text-xs">
                                <IconCircleFilled
                                  className="text-success"
                                  size={10}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Enabled</TooltipContent>
                          </Tooltip>
                        </TileAction>
                      )}
                    </div>
                  </TileHeader>

                  <TileDescription className="line-clamp-3 leading-normal! text-xs">
                    {integration.description}
                  </TileDescription>
                </Tile>
              </Link>
            );
          })}
      <a href="https://sayr.io/docs/integrations/building-integrations/">
        <Tile
          className="md:w-full h-full flex-col gap-1 relative items-start justify-start"
          variant={"default"}
        >
          <TileHeader className="md:w-full flex items-center gap-3">
            <div className="flex items-center gap-3">
              <TileIcon>
                <IconPlus />
              </TileIcon>
              <TileTitle asChild>
                <Label variant={"subheading"} className="text-sm">
                  More coming
                </Label>
              </TileTitle>
            </div>
          </TileHeader>

          <TileDescription className="line-clamp-3 leading-normal! text-xs">
            Help build integrations with other tools and services directly from
            the API.
          </TileDescription>
        </Tile>
      </a>
    </div>
  );
}
